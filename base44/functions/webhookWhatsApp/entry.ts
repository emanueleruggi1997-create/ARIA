import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = 'emaral_whatsapp_webhook_2026';

async function processMessage({ base44, businessId, phoneNumberId, fromNumber, senderName, text }) {
  if (!businessId || !text?.trim()) return;

  // Fetch business config
  const business = await base44.asServiceRole.entities.Business.get(businessId);
  if (!business || business.auto_risposta === false) {
    console.log('[webhookWA] auto_risposta disabled');
    return;
  }

  // Find or create contact
  const contacts = await base44.asServiceRole.entities.Contact.filter({
    business_id: businessId,
    numero: fromNumber,
    canale: 'whatsapp',
  });
  let contact = contacts[0];
  if (!contact) {
    contact = await base44.asServiceRole.entities.Contact.create({
      business_id: businessId,
      nome: senderName || `WA_${fromNumber}`,
      numero: fromNumber,
      canale: 'whatsapp',
      stato: 'lead',
    });
  }

  // Create Lead if not exists
  try {
    const existingLeads = await base44.asServiceRole.entities.Lead.filter({
      business_id: businessId,
      contact_id: contact.id,
    });
    if (!existingLeads.length) {
      await base44.asServiceRole.entities.Lead.create({
        business_id: businessId,
        contact_id: contact.id,
        contact_nome: contact.nome,
        canale: 'whatsapp',
        stato: 'nuovo',
        note_ai: `Primo messaggio: "${text.slice(0, 200)}"`,
      });
    }
  } catch (e) {
    console.log('[webhookWA] Lead creation error:', e.message);
  }

  // Save incoming message
  await base44.asServiceRole.entities.Message.create({
    contact_id: contact.id,
    business_id: businessId,
    canale: 'whatsapp',
    ruolo: 'user',
    testo: text,
    letto: false,
  });

  // Check if AI is disabled for this contact
  if (contact.ai_disabled) {
    console.log('[webhookWA] AI disabled for contact:', contact.nome);
    return;
  }

  // Check operating hours
  const nowRome = new Date();
  const romeDateStr = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(nowRome);
  const [romeHour, romeMinute] = romeDateStr.split(':').map(n => parseInt(n, 10));
  const currentMinutes = (romeHour % 24) * 60 + romeMinute;

  const [startH, startM] = (business.orario_inizio || '08:00').split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const [endH, endM] = (business.orario_fine || '20:00').split(':').map(Number);
  const endMinutes = endH * 60 + endM;

  // is24h: start==end (00:00-00:00) oppure copre tutta la giornata (00:00-23:59)
  const is24h = startMinutes === endMinutes || (startMinutes === 0 && endMinutes >= 1439);
  const withinHours = is24h || (currentMinutes >= startMinutes && currentMinutes < endMinutes);

  // Giorno: confronta abbreviazioni ('lun','mar',...) con nome lungo localizzato
  const giornoLungoWA = new Intl.DateTimeFormat('it-IT', { weekday: 'long', timeZone: 'Europe/Rome' }).format(nowRome).toLowerCase();
  const abbrMapWA = { 'lunedì': 'lun', 'martedì': 'mar', 'mercoledì': 'mer', 'giovedì': 'gio', 'venerdì': 'ven', 'sabato': 'sab', 'domenica': 'dom' };
  const giornoAbbrWA = abbrMapWA[giornoLungoWA] || giornoLungoWA.slice(0, 3);
  const giorniWA = business.giorni_attivi || [];
  const withinDayWA = giorniWA.length === 0 || giorniWA.includes(giornoAbbrWA) || giorniWA.includes(giornoLungoWA);

  console.log(`[webhookWA] ⏰ ORA ROME: ${romeHour}:${String(romeMinute).padStart(2,'0')} | orario: ${business.orario_inizio}–${business.orario_fine} (${startMinutes}-${endMinutes}) | is24h=${is24h} withinHours=${withinHours} | giorno="${giornoLungoWA}"→"${giornoAbbrWA}" giorni_attivi=${JSON.stringify(giorniWA)} withinDay=${withinDayWA} | fuori_orario_attivo=${business.fuori_orario_attivo}`);

  const outsideHours = !withinHours || !withinDayWA;
  if (outsideHours && business.fuori_orario_attivo) {
    console.log(`[webhookWA] Fuori orario — withinHours=${withinHours} withinDay=${withinDayWA} → invio messaggio fuori orario`);
    await sendWhatsAppMessage(phoneNumberId, fromNumber, business.messaggio_fuori_orario || 'Siamo fuori orario. Ti risponderemo non appena possibile!');
    return;
  }
  if (outsideHours && !business.fuori_orario_attivo) {
    console.log(`[webhookWA] Fuori orario ma fuori_orario_attivo=false → nessuna risposta`);
    return;
  }

  // Fetch recent messages for context
  const recentMessages = await base44.asServiceRole.entities.Message.filter(
    { business_id: businessId, contact_id: contact.id },
    '-created_date',
    12
  );
  const historyText = recentMessages.reverse()
    .map(m => `${m.ruolo === 'assistant' ? 'ARIA' : 'Cliente'}: ${m.testo}`)
    .join('\n');

  const isFirstMessage = recentMessages.filter(m => m.ruolo === 'assistant').length === 0;
  const agentName = business.nome_agente || 'ARIA';

  // ── Prompt ARIA segretaria autonoma ──
  const ariaPrompt = buildAriaPromptWA({ business, agentName, history: historyText, text, isFirstMsg: isFirstMessage });

  const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: ariaPrompt,
    response_json_schema: {
      type: 'object',
      properties: {
        intent: { type: 'string' },
        needs_human: { type: 'boolean' },
        reply: { type: 'string' },
        create_appointment: { type: 'boolean' },
        appointment_data: { type: 'object' },
      },
      required: ['intent', 'needs_human', 'reply'],
    },
    model: 'gpt_5_mini',
  });

  const parsed  = typeof aiRes === 'object' ? aiRes : {};
  const aiReply = parsed.reply || '';
  const intent  = parsed.intent || 'unknown';
  const needsHuman = !!parsed.needs_human;

  console.log(`[webhookWA] ARIA intent="${intent}" needs_human=${needsHuman} | reply: ${aiReply?.slice(0, 120)}`);

  if (!aiReply) {
    console.error('[webhookWA] Empty AI reply');
    return;
  }

  // ── Azioni post-classificazione ──
  if (needsHuman && intent !== 'spam_or_solicitation') {
    const existing = await base44.asServiceRole.entities.HumanRequest.filter({ business_id: businessId, contact_id: contact.id, stato: 'nuovo' });
    if (!existing.length) {
      await base44.asServiceRole.entities.HumanRequest.create({ business_id: businessId, contact_id: contact.id, contact_nome: contact.nome, canale: 'whatsapp', motivo: text.slice(0, 200), stato: 'nuovo' }).catch(() => {});
    }
  }

  if (intent === 'appointment_request' && parsed.create_appointment && parsed.appointment_data) {
    const ad = parsed.appointment_data || {};
    const aptPayload = buildSafeAppointmentPayload({
      ad, businessId, contactId: contact.id,
      contactName: contact.nome, source: 'whatsapp', rawMessage: text,
    });
    const { _requested_date_text, _requested_time_text, _raw_message, _validation_status, ...cleanPayload } = aptPayload;
    console.log(`[webhookWA] Creating appointment | validation_status=${_validation_status} | date="${aptPayload.data}" | dateText="${_requested_date_text}"`);
    await base44.asServiceRole.entities.Appointment.create(cleanPayload).catch(e => {
      console.error('[webhookWA] Appointment create failed:', e.message);
    });
    // Notifica team: crea UrgentAction per approvazione
    await base44.asServiceRole.entities.UrgentAction.create({
      business_id: businessId,
      contact_id: contact.id,
      contact_nome: contact.nome,
      contact_canale: 'whatsapp',
      trigger: 'appuntamento',
      messaggio_originale: `Richiesta appuntamento: ${ad.servizio || ''} — ${ad.data || ''} ${ad.ora || ''}`.trim(),
      stato: 'nuovo',
    }).catch(() => {});
  }

  if (intent === 'complaint' || (needsHuman && intent === 'urgent_request')) {
    await base44.asServiceRole.entities.UrgentAction.create({ business_id: businessId, contact_id: contact.id, contact_nome: contact.nome, contact_canale: 'whatsapp', trigger: intent === 'complaint' ? 'reclamo' : 'urgenza', messaggio_originale: text.slice(0, 500), stato: 'nuovo' }).catch(() => {});
  }

  // Save AI reply and send WA message
  await Promise.all([
    base44.asServiceRole.entities.Message.create({
      contact_id: contact.id,
      business_id: businessId,
      canale: 'whatsapp',
      ruolo: 'assistant',
      testo: aiReply,
      letto: true,
    }),
    sendWhatsAppMessage(phoneNumberId, fromNumber, aiReply),
  ]);

  console.log('[webhookWA] AI reply sent:', aiReply.slice(0, 100));
}

// ── Helper: valida e costruisce payload appuntamento sicuro ──
function buildSafeAppointmentPayload({ ad, businessId, contactId, contactName, source, rawMessage }) {
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{1,2}:\d{2}$/;

  const rawDate = (ad.data || '').trim();
  const rawTime = (ad.ora || '').trim();

  const isValidDate = ISO_DATE_RE.test(rawDate) && !isNaN(new Date(rawDate).getTime());
  const isValidTime = TIME_RE.test(rawTime);

  const safeDate = isValidDate ? rawDate : null;
  const safeTime = isValidTime ? rawTime : null;

  const naturalDateText = !isValidDate && rawDate ? rawDate : null;
  const naturalTimeText = !isValidTime && rawTime ? rawTime : null;

  const noteLines = [
    `⏳ DA CONFERMARE — Richiesto via ${source === 'instagram' ? 'Instagram' : 'WhatsApp'}`,
    naturalDateText ? `Data richiesta: "${naturalDateText}"` : null,
    naturalTimeText ? `Fascia oraria: "${naturalTimeText}"` : null,
    ad.note || null,
  ].filter(Boolean);

  return {
    business_id: businessId,
    contact_id: contactId,
    contact_nome: String(contactName || '').slice(0, 200) || null,
    titolo: String(ad.servizio || 'Richiesta appuntamento').slice(0, 500),
    data: safeDate,
    ora: safeTime,
    tipo: 'servizio',
    stato: 'in_attesa',
    note: noteLines.join('\n').slice(0, 2000),
    canale_origine: source,
    _requested_date_text: naturalDateText,
    _requested_time_text: naturalTimeText,
    _raw_message: String(rawMessage || '').slice(0, 500),
    _validation_status: (safeDate && safeTime) ? 'ready_for_review' : 'incomplete',
  };
}

function buildAriaPromptWA({ business, agentName, history, text, isFirstMsg }) {
  const orari = `${business.orario_inizio || '09:00'}–${business.orario_fine || '18:00'}`;
  const giorni = (business.giorni_attivi || []).join(', ') || 'lun–ven';

  return `Sei ${agentName}, segretaria AI professionale di "${business.nome}".
Il tuo obiettivo è gestire la conversazione in autonomia: rispondere, qualificare, raccogliere dati per appuntamenti e gestire richieste senza dipendere dal team per ogni messaggio.

━━━ IDENTITÀ E STILE ━━━
- Parli come una persona reale: naturale, diretta, calda ma professionale.
- Risposte brevi: 1–3 frasi al massimo. Mai lunghi elenchi puntati.
- ${isFirstMsg ? 'È il PRIMO messaggio: presentati brevemente con il tuo nome.' : 'Non ripresentarti, vai al punto.'}
- Rispondi SEMPRE nella stessa lingua del cliente.
- Non usare frasi robotiche come "Come posso assisterti?", "Non esitare a contattarci", "Ottima domanda!".

━━━ BUSINESS ━━━
${business.servizi ? `Servizi: ${business.servizi}` : ''}
${business.prezzi ? `Prezzi disponibili: ${business.prezzi}` : ''}
${business.faq ? `FAQ: ${business.faq}` : ''}
${business.cose_da_non_fare ? `Non fare mai: ${business.cose_da_non_fare}` : ''}
${business.ai_prompt ? `Istruzioni aggiuntive: ${business.ai_prompt}` : ''}
Orari: ${orari}, giorni: ${giorni}

━━━ COME GESTISCI LE RICHIESTE ━━━

**INFORMAZIONI** → Rispondi direttamente usando la knowledge base. Non dire "chiedo al team" se la risposta è già disponibile.

**APPUNTAMENTO** → Guida la conversazione raccogliendo: nome, servizio, giorno preferito, fascia oraria, contatto. Chiedi UN dato alla volta solo se manca. Quando hai abbastanza dati, imposta create_appointment=true e usa SOLO questa frase tipo:
"Perfetto, ho raccolto la tua richiesta per [giorno/fascia]. Ti faremo avere conferma appena possibile."
MAI dire "appuntamento confermato", "sei prenotato", "ti aspettiamo" o promettere disponibilità. La conferma è sempre del team.

**PREVENTIVO** → Fai le domande necessarie per capire il progetto, poi dai un'indicazione se possibile con i dati disponibili. Escala solo se serve approvazione su cifre importanti.

**SPAM / OFFERTA NON RICHIESTA / COLLABORAZIONE FREDDA** → Rispondi brevemente: "No grazie, al momento non siamo interessati." Imposta intent=spam_or_solicitation. NON creare lead, NON escalare.

**RECLAMO / CLIENTE ARRABBIATO** → Mostra comprensione, non scalare subito. Se il problema è serio o si ripete, allora needs_human=true.

**RICHIESTA OPERATORE UMANO** → "Certo, ti passo a un operatore. Intanto dimmi brevemente di cosa hai bisogno così può aiutarti subito." Poi needs_human=true.

**NON SAI** → Fai UNA sola domanda utile o proponi il passo successivo. Non usare "avviso il team" come risposta di default.

━━━ ESCALATION AL TEAM (needs_human=true) SOLO SE ━━━
- Cliente esplicitamente chiede un operatore umano
- Reclamo serio o urgenza reale non gestibile
- Serve una decisione che non puoi prendere (es. sconto importante, accordo contrattuale)
- Dopo 3+ scambi senza risolvere e il cliente è frustrato

━━━ FRASI VIETATE ━━━
MAI usare: "avviso il team", "ti faremo sapere", "inoltro la richiesta", "un operatore ti risponderà", "ho girato la richiesta", "ti ricontatteremo a breve" — A MENO CHE needs_human=true.

━━━ STORICO CONVERSAZIONE ━━━
${history || '(nessun messaggio precedente)'}

━━━ MESSAGGIO CLIENTE ━━━
${text}

━━━ RISPOSTA RICHIESTA (JSON) ━━━
Rispondi con un JSON con questi campi:
- intent: uno tra appointment_request | information_request | quote_request | complaint | urgent_request | spam_or_solicitation | human_request | unknown
- needs_human: true solo nei casi descritti sopra
- reply: il testo della risposta da inviare al cliente (in lingua del cliente, max 3 frasi)
- create_appointment: true se hai raccolto dati sufficienti per creare un appuntamento (nome, servizio, data/preferenza, contatto)
- appointment_data: { servizio, data, ora, note } (solo se create_appointment=true)`;
}

async function sendWhatsAppMessage(phoneNumberId, toNumber, message) {
  try {
    const token = Deno.env.get('WHATSAPP_BUSINESS_TOKEN');
    if (!token) {
      console.error('[webhookWA] Missing WHATSAPP_BUSINESS_TOKEN');
      return;
    }

    const res = await fetch(`https://graph.instagram.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toNumber,
        type: 'text',
        text: { body: message },
      }),
    });

    const data = await res.json();
    if (data.error) {
      console.error('[webhookWA] Send error:', JSON.stringify(data.error));
    } else {
      console.log('[webhookWA] Message sent! ID:', data.messages[0]?.id);
    }
  } catch (e) {
    console.error('[webhookWA] Send error:', e.message);
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[webhookWA] Webhook verified');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    console.log('[webhookWA] Event received:', JSON.stringify(body).slice(0, 400));

    const base44 = createClientFromRequest(req);
    const entries = body.entry || [];

    (async () => {
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          if (change.field !== 'messages') continue;

          const val = change.value || {};
          const messages = val.messages || [];
          const contacts = val.contacts || [];
          const phoneNumberId = val.metadata?.phone_number_id;

          for (const msg of messages) {
            // Only handle text messages
            if (msg.type !== 'text' || !msg.text?.body) continue;

            const senderId = msg.from;
            const senderName = contacts[0]?.profile?.name || `WA_${senderId}`;
            const text = msg.text.body;

            // Find business by WA number
            const allBiz = await base44.asServiceRole.entities.Business.filter({});
            const business = allBiz.find(b => b.wa_number === val.metadata?.display_phone_number);
            if (!business) {
              console.log('[webhookWA] No business found for phone:', val.metadata?.display_phone_number);
              continue;
            }

            console.log('[webhookWA] Processing message from:', senderName);
            await processMessage({
              base44,
              businessId: business.id,
              phoneNumberId,
              fromNumber: senderId,
              senderName,
              text,
            }).catch(err => console.error('[webhookWA] Error:', err.message));
          }
        }
      }
    })();

    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
});