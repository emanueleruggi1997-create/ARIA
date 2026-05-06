import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = 'emaral2026';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── GET: verifica webhook Meta ──
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[webhookMeta] ✅ Webhook verification OK');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json().catch(() => ({}));

  // ── LOG COMPLETO payload ──
  console.log('[webhookMeta] ═══════════ INCOMING WEBHOOK ═══════════');
  console.log('[webhookMeta] object:', body.object);
  console.log('[webhookMeta] entry count:', (body.entry || []).length);
  console.log('[webhookMeta] FULL BODY:', JSON.stringify(body, null, 2).slice(0, 3000));
  console.log('[webhookMeta] ═══════════════════════════════════════');

  // Supporta object="instagram" (principale) e object="page" (fallback legacy)
  if (body.object !== 'instagram' && body.object !== 'page') {
    console.log('[webhookMeta] object non supportato:', body.object, '— skip');
    return Response.json({ ok: true });
  }

  const base44 = createClientFromRequest(req);

  for (const entry of (body.entry || [])) {
    const entryId = entry.id;
    console.log('[webhookMeta] entry.id:', entryId);

    // ── DM (messaging array) ──
    for (const event of (entry.messaging || [])) {
      if (event.read || event.delivery || event.message?.is_echo) continue;

      const senderId    = event.sender?.id;
      const recipientId = event.recipient?.id;
      const text        = event.message?.text || event.postback?.title || '';
      const messageId   = event.message?.mid || '';
      const timestamp   = event.timestamp || Date.now();

      console.log('[webhookMeta] DM EVENT:', JSON.stringify({ object: body.object, entryId, senderId, recipientId, messageId, text: text?.slice(0, 200), timestamp }));

      if (!senderId || !text) {
        console.log('[webhookMeta] Skip: senderId o text mancante');
        continue;
      }

      // Fire-and-forget async processing
      (async () => {
        try {
          // ── Trova MetaConnection ──
          // Per Instagram Business Login: recipientId = ig_account_id dell'account destinatario (il business)
          const accountId = recipientId || entryId;
          console.log('[webhookMeta] Searching MetaConnection by:', { recipientId, entryId, accountId });

          let conn = null;

          // 1. ig_account_id (priorità — Instagram Business Login)
          let rows = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: accountId });
          if (rows.length) { conn = rows[0]; console.log('[webhookMeta] MetaConnection found by ig_account_id:', conn.id); }

          // 2. meta_user_id
          if (!conn) {
            rows = await base44.asServiceRole.entities.MetaConnection.filter({ meta_user_id: accountId });
            if (rows.length) { conn = rows[0]; console.log('[webhookMeta] MetaConnection found by meta_user_id:', conn.id); }
          }

          // 3. fb_page_id (legacy)
          if (!conn) {
            rows = await base44.asServiceRole.entities.MetaConnection.filter({ fb_page_id: accountId });
            if (rows.length) { conn = rows[0]; console.log('[webhookMeta] MetaConnection found by fb_page_id (legacy):', conn.id); }
          }

          // 4. Fallback: unica connessione IG attiva
          if (!conn) {
            const allActive = await base44.asServiceRole.entities.MetaConnection.filter({ ig_connected: true });
            if (allActive.length === 1) {
              conn = allActive[0];
              console.log('[webhookMeta] MetaConnection found by fallback single active IG conn:', conn.id);
            } else {
              // Salva log unmatched per debug
              console.error('[webhookMeta] MetaConnection NOT FOUND for accountId:', accountId, '| active IG conns:', allActive.length);
              await base44.asServiceRole.entities.MetaWebhookLog.create({
                business_id:   'unknown',
                ig_account_id: accountId,
                event_type:    'error',
                status:        'failed',
                sender_id:     senderId,
                error_message: `No MetaConnection found for accountId: ${accountId}`,
                details:       JSON.stringify({ object: body.object, entryId, senderId, recipientId }),
              }).catch(() => {});
              return;
            }
          }

          let businessId = conn.business_id;

          // Risolvi businessId se mancante
          if (!businessId && conn.user_id) {
            try {
              const allBiz = await base44.asServiceRole.entities.Business.filter({ ig_connesso: true });
              const match  = allBiz.find(b => b.created_by === conn.user_id);
              if (match) {
                businessId = match.id;
                await base44.asServiceRole.entities.MetaConnection.update(conn.id, { business_id: businessId });
                console.log('[webhookMeta] businessId risolto:', businessId);
              }
            } catch (e) { console.warn('[webhookMeta] Errore risoluzione businessId:', e.message); }
          }

          if (!businessId) {
            console.error('[webhookMeta] businessId mancante per conn:', conn.id, '— skip');
            return;
          }

          // ── Trova o crea contatto ──
          let contacts = await base44.asServiceRole.entities.Contact.filter({ business_id: businessId, numero: senderId, canale: 'instagram' });
          let contact  = contacts[0];
          if (!contact) {
            contact = await base44.asServiceRole.entities.Contact.create({
              business_id: businessId, nome: `User_${senderId}`, numero: senderId, canale: 'instagram', stato: 'lead',
            });
          }

          // ── Salva messaggio ──
          console.log('[webhookMeta] Message saved | contact:', contact.nome, '| businessId:', businessId);
          await base44.asServiceRole.entities.Message.create({
            business_id: businessId, contact_id: contact.id,
            canale: 'instagram', ruolo: 'user', testo: text, letto: false,
          });

          // Crea lead se non esiste
          const leads = await base44.asServiceRole.entities.Lead.filter({ business_id: businessId, contact_id: contact.id });
          if (!leads.length) {
            await base44.asServiceRole.entities.Lead.create({
              business_id: businessId, contact_id: contact.id,
              contact_nome: contact.nome, canale: 'instagram', stato: 'nuovo',
            });
          }

          if (contact.ai_disabled) { console.log('[webhookMeta] AI disabilitata per:', contact.nome); return; }

          const business = await base44.asServiceRole.entities.Business.get(businessId);
          if (!business) return;
          if (!business.auto_risposta || business.stato_agente === 'off') {
            console.log('[webhookMeta] Auto-risposta disattivata'); return;
          }

          // ── Controllo orario ──
          const now = new Date();

          // Ora locale Rome
          const romeDateStr = new Intl.DateTimeFormat('it-IT', {
            timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false,
          }).format(now);
          const [rH, rM] = romeDateStr.split(':').map(n => parseInt(n, 10));
          const cur = (rH % 24) * 60 + rM;

          const [sH, sM] = (business.orario_inizio || '08:00').split(':').map(Number);
          const [eH, eM] = (business.orario_fine   || '20:00').split(':').map(Number);
          const sMin = sH * 60 + sM;
          const eMin = eH * 60 + eM;

          // 24/7: start==end (es. 00:00-00:00) OPPURE copre tutta la giornata (00:00-23:59)
          const is24h = sMin === eMin || (sMin === 0 && eMin >= 1439);
          const withinTime = is24h || (cur >= sMin && cur < eMin);

          // Giorno: confronta abbreviazioni ('lun','mar',...) con il nome lungo localizzato
          const giornoLungo = new Intl.DateTimeFormat('it-IT', { weekday: 'long', timeZone: 'Europe/Rome' }).format(now).toLowerCase();
          // Mappa nomi lunghi → abbreviazioni usate in giorni_attivi
          const abbrMap = { 'lunedì': 'lun', 'martedì': 'mar', 'mercoledì': 'mer', 'giovedì': 'gio', 'venerdì': 'ven', 'sabato': 'sab', 'domenica': 'dom' };
          const giornoAbbr = abbrMap[giornoLungo] || giornoLungo.slice(0, 3);
          const giorni = business.giorni_attivi || [];
          const withinDay = giorni.length === 0 || giorni.includes(giornoAbbr) || giorni.includes(giornoLungo);

          console.log(`[webhookMeta] ⏰ ORA ROME: ${rH}:${String(rM).padStart(2,'0')} (cur=${cur}) | orario: ${business.orario_inizio}-${business.orario_fine} (${sMin}-${eMin}) | is24h=${is24h} withinTime=${withinTime} | giorno="${giornoLungo}"→"${giornoAbbr}" giorni_attivi=${JSON.stringify(giorni)} withinDay=${withinDay} | fuori_orario_attivo=${business.fuori_orario_attivo}`);

          if ((!withinTime || !withinDay) && business.fuori_orario_attivo && business.messaggio_fuori_orario) {
            await sendIGReply(conn, senderId, business.messaggio_fuori_orario);
            await base44.asServiceRole.entities.Message.create({ business_id: businessId, contact_id: contact.id, canale: 'instagram', ruolo: 'assistant', testo: business.messaggio_fuori_orario, letto: true });
            return;
          }
          if (!withinTime || !withinDay) { console.log('[webhookMeta] Fuori orario — nessuna risposta'); return; }

          // ── Storico (ultimi 12 messaggi per contesto) ──
          const msgs = await base44.asServiceRole.entities.Message.filter({ business_id: businessId, contact_id: contact.id }, '-created_date', 12);
          const history    = msgs.reverse().map(m => `${m.ruolo === 'user' ? 'Cliente' : 'ARIA'}: ${m.testo}`).join('\n');
          const isFirstMsg = msgs.filter(m => m.ruolo === 'assistant').length === 0;
          const agentName  = business.nome_agente || 'ARIA';

          // ── Prompt ARIA come segretaria autonoma ──
          const ariaPrompt = buildAriaPrompt({ business, agentName, history, text, isFirstMsg });

          console.log('[webhookMeta] Calling ARIA for:', contact.nome);
          const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
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

          const parsed     = typeof llmRes === 'object' ? llmRes : {};
          const ariaResponse = parsed.reply || '';
          const intent       = parsed.intent || 'unknown';
          const needsHuman   = !!parsed.needs_human;

          console.log(`[webhookMeta] ARIA intent="${intent}" needs_human=${needsHuman} | reply: ${ariaResponse?.slice(0, 150)}`);

          if (!ariaResponse) { console.error('[webhookMeta] ARIA non ha generato risposta'); return; }

          // ── Azioni post-classificazione ──
          if (needsHuman && intent !== 'spam_or_solicitation') {
            // Escalation reale: crea HumanRequest
            const ex = await base44.asServiceRole.entities.HumanRequest.filter({ business_id: businessId, contact_id: contact.id, stato: 'nuovo' });
            if (!ex.length) {
              await base44.asServiceRole.entities.HumanRequest.create({ business_id: businessId, contact_id: contact.id, contact_nome: contact.nome, canale: 'instagram', motivo: text.slice(0, 200), stato: 'nuovo' }).catch(() => {});
            }
          }

          if (intent === 'appointment_request' && parsed.create_appointment && parsed.appointment_data) {
            const ad = parsed.appointment_data || {};
            const aptPayload = buildSafeAppointmentPayload({
              ad, businessId, contactId: contact.id,
              contactName: contact.nome, source: 'instagram', rawMessage: text,
            });
            // Rimuovi campi non in schema prima di salvare
            const { _requested_date_text, _requested_time_text, _raw_message, _validation_status, ...cleanPayload } = aptPayload;
            console.log(`[webhookMeta] Creating appointment | validation_status=${_validation_status} | date="${aptPayload.data}" | dateText="${_requested_date_text}"`);
            await base44.asServiceRole.entities.Appointment.create(cleanPayload).catch(e => {
              console.error('[webhookMeta] Appointment create failed:', e.message);
            });
            // Notifica team: crea UrgentAction per approvazione
            await base44.asServiceRole.entities.UrgentAction.create({
              business_id: businessId,
              contact_id: contact.id,
              contact_nome: contact.nome,
              contact_canale: 'instagram',
              trigger: 'appuntamento',
              messaggio_originale: `Richiesta appuntamento: ${ad.servizio || ''} — ${ad.data || ''} ${ad.ora || ''}`.trim(),
              stato: 'nuovo',
            }).catch(() => {});
          }

          if (intent === 'complaint' || (needsHuman && intent === 'urgent_request')) {
            await base44.asServiceRole.entities.UrgentAction.create({ business_id: businessId, contact_id: contact.id, contact_nome: contact.nome, contact_canale: 'instagram', trigger: intent === 'complaint' ? 'reclamo' : 'urgenza', messaggio_originale: text.slice(0, 500), stato: 'nuovo' }).catch(() => {});
          }

          console.log('[webhookMeta] Sending Instagram DM to:', senderId);
          const sent = await sendIGReply(conn, senderId, ariaResponse);
          console.log('[webhookMeta] Send result:', sent ? '✅ OK' : '❌ FAILED');

          if (!sent) return;

          await base44.asServiceRole.entities.Message.create({
            business_id: businessId, contact_id: contact.id,
            canale: 'instagram', ruolo: 'assistant', testo: ariaResponse, letto: true,
          });

        } catch (e) {
          console.error('[webhookMeta] ❌ Errore DM processing:', e.message);
        }
      })();
    }

    // ── Commenti ──
    for (const change of (entry.changes || [])) {
      if (change.field !== 'comments') continue;
      const val      = change.value || {};
      if (val.parent_id || val.from?.id === entryId) continue;
      const text     = val.text || '';
      const senderId = val.from?.id || '';
      const senderName = val.from?.name || senderId;
      if (!text) continue;

      console.log('[webhookMeta] COMMENT:', senderName, '|', text.slice(0, 100));

      (async () => {
        try {
          let rows = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entryId });
          if (!rows.length) rows = await base44.asServiceRole.entities.MetaConnection.filter({ meta_user_id: entryId });
          if (!rows.length) {
            const all = await base44.asServiceRole.entities.MetaConnection.filter({ ig_connected: true });
            if (all.length === 1) rows = all;
          }
          const conn = rows[0];
          if (!conn?.business_id) return;

          const businessId = conn.business_id;
          let contacts = await base44.asServiceRole.entities.Contact.filter({ business_id: businessId, numero: senderId, canale: 'instagram' });
          let contact  = contacts[0];
          if (!contact) {
            contact = await base44.asServiceRole.entities.Contact.create({ business_id: businessId, nome: senderName, numero: senderId, canale: 'instagram', stato: 'lead' });
          }
          await base44.asServiceRole.entities.Message.create({ business_id: businessId, contact_id: contact.id, canale: 'instagram', ruolo: 'user', testo: text, letto: false, tipo: 'commento' });
          console.log('[webhookMeta] ✅ Commento salvato | contatto:', senderName);
        } catch (e) {
          console.error('[webhookMeta] Errore commento:', e.message);
        }
      })();
    }
  }

  return Response.json({ ok: true });
});

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

  // Qualsiasi testo naturale va nelle note, mai in campi Date
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
    data: safeDate,           // null se non è ISO valido
    ora: safeTime,            // null se non è HH:MM valido
    tipo: 'servizio',
    stato: 'in_attesa',
    note: noteLines.join('\n').slice(0, 2000),
    canale_origine: source,
    // Campi extra per tracciabilità (salvati in note se non in schema)
    _requested_date_text: naturalDateText,
    _requested_time_text: naturalTimeText,
    _raw_message: String(rawMessage || '').slice(0, 500),
    _validation_status: (safeDate && safeTime) ? 'ready_for_review' : 'incomplete',
  };
}

// ── Helper: costruisce il prompt ARIA segretaria autonoma ──
function buildAriaPrompt({ business, agentName, history, text, isFirstMsg }) {
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

// ── Helper: invia DM via Instagram Messaging API ──
async function sendIGReply(conn, recipientId, text) {
  const token       = conn.access_token;
  const igAccountId = conn.ig_account_id;

  if (!token || !igAccountId) {
    console.error('[sendIGReply] ❌ Dati mancanti | token:', !!token, '| igAccountId:', igAccountId);
    return false;
  }

  try {
    const res  = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      console.error('[sendIGReply] ❌ Instagram send failed:', JSON.stringify(data));
      return false;
    }
    console.log('[sendIGReply] ✅ message_id:', data.message_id);
    return true;
  } catch (e) {
    console.error('[sendIGReply] ❌ Exception:', e.message);
    return false;
  }
}