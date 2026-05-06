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
        collected_email: { type: 'string' },
        collected_phone: { type: 'string' },
      },
      required: ['intent', 'needs_human', 'reply'],
    },
    model: 'gpt_5_mini',
  });

  const parsed  = typeof aiRes === 'object' ? aiRes : {};
  const aiReply = parsed.reply || '';
  const intent  = parsed.intent || 'unknown';
  const needsHuman = !!parsed.needs_human;

  // ── Salva email/telefono raccolti da ARIA ──
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const collectedEmail = (parsed.collected_email || '').trim();
  const collectedPhone = (parsed.collected_phone || '').replace(/\s/g, '').trim();
  if (collectedEmail && EMAIL_RE.test(collectedEmail)) {
    const existingLeads = await base44.asServiceRole.entities.Lead.filter({ business_id: businessId, contact_id: contact.id });
    if (existingLeads.length > 0) {
      await base44.asServiceRole.entities.Lead.update(existingLeads[0].id, {
        email: collectedEmail,
        stato: existingLeads[0].stato === 'nuovo' ? 'qualificato' : existingLeads[0].stato,
      }).catch(() => {});
    }
    const existing = await base44.asServiceRole.entities.ContactEmail.filter({ business_id: businessId, email: collectedEmail });
    if (!existing.length) {
      await base44.asServiceRole.entities.ContactEmail.create({
        business_id: businessId, nome: contact.nome, email: collectedEmail, fonte: 'whatsapp', stato: 'attivo',
      }).catch(() => {});
    }
  }
  if (collectedPhone && collectedPhone.length >= 8) {
    const existingLeads = await base44.asServiceRole.entities.Lead.filter({ business_id: businessId, contact_id: contact.id });
    if (existingLeads.length > 0) {
      await base44.asServiceRole.entities.Lead.update(existingLeads[0].id, {
        phone: collectedPhone,
        stato: existingLeads[0].stato === 'nuovo' ? 'qualificato' : existingLeads[0].stato,
      }).catch(() => {});
    }
  }

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
    const adNorm = {
      ...ad,
      data: ad.data || ad.data_testo || '',
      ora:  ad.ora  || ad.ora_testo  || '',
      email: ad.email || collectedEmail || '',
      telefono: ad.telefono || collectedPhone || '',
    };
    const aptPayload = buildSafeAppointmentPayload({
      ad: adNorm, businessId, contactId: contact.id,
      contactName: contact.nome, source: 'whatsapp', rawMessage: text,
    });
    const { _requested_date_text, _requested_time_text, _raw_message, _validation_status, ...cleanPayload } = aptPayload;
    console.log(`[webhookWA] Creating appointment | validation_status=${_validation_status} | date="${aptPayload.data}" | time="${aptPayload.ora}" | dateText="${_requested_date_text}"`);
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

// ── Helper: parser data italiana → ISO (Europe/Rome) ──
function parseItalianDateWA(dateText, timeText) {
  if (!dateText) return { isoDate: null, isoTime: null };
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{1,2}:\d{2}$/;
  if (ISO_DATE_RE.test(dateText.trim())) {
    return { isoDate: dateText.trim(), isoTime: TIME_RE.test((timeText||'').trim()) ? timeText.trim() : null };
  }
  const MESI = { gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12 };
  const match = dateText.toLowerCase().match(/(\d{1,2})\s+([a-zà-ú]+)\s*(\d{4})?/);
  if (match) {
    const day   = parseInt(match[1], 10);
    const month = MESI[match[2]];
    const nowRome = new Date();
    const romeYear = parseInt(new Intl.DateTimeFormat('it-IT', { year: 'numeric', timeZone: 'Europe/Rome' }).format(nowRome), 10);
    const year  = match[3] ? parseInt(match[3], 10) : romeYear;
    if (month && day >= 1 && day <= 31) {
      const isoDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const d = new Date(`${isoDate}T12:00:00+02:00`);
      if (!isNaN(d.getTime())) {
        let isoTime = null;
        const tStr = (timeText || '').trim();
        if (TIME_RE.test(tStr)) { isoTime = tStr; }
        else {
          const tMatch = (dateText + ' ' + tStr).match(/(\d{1,2}):(\d{2})/);
          if (tMatch) isoTime = `${tMatch[1].padStart(2,'0')}:${tMatch[2]}`;
        }
        return { isoDate, isoTime };
      }
    }
  }
  return { isoDate: null, isoTime: TIME_RE.test((timeText||'').trim()) ? timeText.trim() : null };
}

// ── Helper: valida e costruisce payload appuntamento sicuro ──
function buildSafeAppointmentPayload({ ad, businessId, contactId, contactName, source, rawMessage }) {
  const now = new Date();
  const romeNow = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,
  }).format(now);

  const rawDateText = (ad.data || '').trim();
  const rawTimeText = (ad.ora || '').trim();

  const { isoDate, isoTime } = parseItalianDateWA(rawDateText, rawTimeText);

  const naturalDateText = !isoDate && rawDateText ? rawDateText : null;
  const naturalTimeText = (!isoTime && rawTimeText && rawTimeText !== rawDateText) ? rawTimeText : null;

  console.log('[buildAppointmentWA] server_time:', now.toISOString(), '| business_local_time:', romeNow);
  console.log('[buildAppointmentWA] user_requested_date:', rawDateText, '| user_requested_time:', rawTimeText);
  console.log('[buildAppointmentWA] parsed_isoDate:', isoDate, '| parsed_isoTime:', isoTime);

  const noteLines = [
    `⏳ DA CONFERMARE — Richiesto via ${source === 'instagram' ? 'Instagram' : 'WhatsApp'}`,
    rawDateText ? `Data richiesta: "${rawDateText}"` : null,
    rawTimeText ? `Ora richiesta: "${rawTimeText}"` : null,
    (ad.email || ad.cliente_email) ? `Email cliente: ${ad.email || ad.cliente_email}` : null,
    (ad.telefono || ad.cliente_phone) ? `Telefono: ${ad.telefono || ad.cliente_phone}` : null,
    ad.note || null,
  ].filter(Boolean);

  return {
    business_id: businessId,
    contact_id: contactId,
    contact_nome: String(contactName || '').slice(0, 200) || null,
    titolo: String(ad.servizio || 'Richiesta appuntamento').slice(0, 500),
    data: isoDate,
    ora: isoTime,
    tipo: 'servizio',
    stato: 'in_attesa',
    note: noteLines.join('\n').slice(0, 2000),
    canale_origine: source,
    _requested_date_text: rawDateText,
    _requested_time_text: rawTimeText,
    _raw_message: String(rawMessage || '').slice(0, 500),
    _validation_status: (isoDate && isoTime) ? 'ready_for_review' : 'incomplete',
  };
}

function buildAriaPromptWA({ business, agentName, history, text, isFirstMsg }) {
  const orari = `${business.orario_inizio || '09:00'}–${business.orario_fine || '18:00'}`;
  const giorni = (business.giorni_attivi || []).join(', ') || 'lun–ven';

  const now = new Date();
  const romeFormatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const romeDatetime = romeFormatter.format(now);
  const romeDateISO  = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(now);

  return `Sei ${agentName}, segretaria AI professionale di "${business.nome}".

━━━ DATA E ORA ATTUALE ━━━
Data e ora business (Europe/Rome): ${romeDatetime}
Data ISO oggi: ${romeDateISO}
Timezone: Europe/Rome
⚠️ Usa SEMPRE questa data come riferimento per "domani", "giovedì prossimo", ecc.

━━━ IDENTITÀ E STILE ━━━
- Parli come una persona reale: naturale, diretta, calda ma professionale.
- Risposte brevi: 1–3 frasi al massimo. Mai lunghi elenchi puntati.
- ${isFirstMsg ? 'È il PRIMO messaggio: presentati brevemente con il tuo nome.' : 'Non ripresentarti, vai al punto.'}
- Rispondi SEMPRE nella stessa lingua del cliente.
- Non usare frasi robotiche come "Come posso assisterti?", "Ottima domanda!".

━━━ BUSINESS ━━━
${business.servizi ? `Servizi: ${business.servizi}` : ''}
${business.prezzi ? `Prezzi disponibili: ${business.prezzi}` : ''}
${business.faq ? `FAQ: ${business.faq}` : ''}
${business.cose_da_non_fare ? `Non fare mai: ${business.cose_da_non_fare}` : ''}
${business.ai_prompt ? `Istruzioni aggiuntive: ${business.ai_prompt}` : ''}
Orari: ${orari}, giorni: ${giorni}

━━━ GESTIONE RICHIESTE ━━━

**INFORMAZIONI** → Rispondi direttamente.

**APPUNTAMENTO** → Raccogli: nome, servizio (opzionale), data/ora, email o telefono. Un dato alla volta.
DATI MINIMI per creare richiesta: nome + data/ora + (email o telefono).

Quando hai dati minimi → create_appointment=true. Reply PRECISA:
"Perfetto [nome], ho registrato la tua richiesta per [giorno esteso] alle [ora]. Ti contatteremo per confermare definitivamente."
MAI frasi vaghe. MAI "ti faremo sapere" se hai i dati. MAI "confermato" o "prenotato".

Se mancano dati, chiedi SOLO quello che manca:
- Nome mancante → "Come ti chiami?"
- Data/ora mancante → "Che giorno e orario preferisci?"
- Contatto mancante → "Email o numero per la conferma?"

**SPAM** → "No grazie." intent=spam_or_solicitation.
**RECLAMO** → Comprensione. Escala solo se grave.
**OPERATORE** → needs_human=true.

━━━ FRASI VIETATE ━━━
MAI: "avviso il team", "inoltro la richiesta", "un operatore ti risponderà" — SALVO needs_human=true.
MAI frasi vaghe sull'appuntamento se hai nome+data+ora.

━━━ STORICO ━━━
${history || '(nessun messaggio precedente)'}

━━━ MESSAGGIO CLIENTE ━━━
${text}

━━━ RACCOLTA CONTATTO ━━━
Raccogli email o telefono per appuntamenti. Chiedi naturalmente.
Email valida: contiene @. Telefono: cifre e +.

━━━ JSON ━━━
- intent: appointment_request | information_request | quote_request | complaint | urgent_request | spam_or_solicitation | human_request | unknown
- needs_human: boolean
- reply: risposta (lingua cliente, max 3 frasi, PRECISA con nome/data/ora)
- create_appointment: true se dati minimi presenti
- appointment_data: { servizio, data, ora, data_testo, ora_testo, email, telefono, note } — data=ISO YYYY-MM-DD calcolata da "${romeDateISO}", ora=HH:MM 24h
- collected_email: stringa vuota se non disponibile
- collected_phone: stringa vuota se non disponibile`;
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