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

          // ── Salva email/telefono se ARIA li ha raccolti ──
          // (gestito nel JSON response di ARIA sotto)

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
                collected_email: { type: 'string' },
                collected_phone: { type: 'string' },
              },
              required: ['intent', 'needs_human', 'reply'],
            },
            model: 'gpt_5_mini',
          });

          const parsed       = typeof llmRes === 'object' ? llmRes : {};
          const ariaResponse = parsed.reply || '';
          const intent       = parsed.intent || 'unknown';
          const needsHuman   = !!parsed.needs_human;

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
            // Aggiungi a mailing list se non esiste
            const existing = await base44.asServiceRole.entities.ContactEmail.filter({ business_id: businessId, email: collectedEmail });
            if (!existing.length) {
              await base44.asServiceRole.entities.ContactEmail.create({
                business_id: businessId, nome: contact.nome, email: collectedEmail, fonte: 'instagram', stato: 'attivo',
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
            const adNorm = {
              ...ad,
              data: ad.data || ad.data_testo || '',
              ora:  ad.ora  || ad.ora_testo  || '',
              email: ad.email || collectedEmail || '',
              telefono: ad.telefono || collectedPhone || '',
            };
            const aptPayload = buildSafeAppointmentPayload({
              ad: adNorm, businessId, contactId: contact.id,
              contactName: contact.nome, source: 'instagram', rawMessage: text,
            });
            const { _requested_date_text, _requested_time_text, _raw_message, _validation_status, ...cleanPayload } = aptPayload;
            // Aggiungi campi canale per invio messaggio automatico alla conferma
            cleanPayload.customer_channel_id = senderId;
            cleanPayload.service_requested = ad.servizio || '';
            cleanPayload.email = adNorm.email || '';
            cleanPayload.phone = adNorm.telefono || collectedPhone || '';
            cleanPayload.requested_date_text = _requested_date_text || adNorm.data;
            cleanPayload.requested_time_text = _requested_time_text || adNorm.ora;
            cleanPayload.needs_human_confirmation = true;
            cleanPayload.stato = 'pending_confirmation';
            console.log(`[webhookMeta] Creating appointment | validation_status=${_validation_status} | date="${aptPayload.data}" | dateText="${_requested_date_text}" | time="${aptPayload.ora}" | customer_channel_id="${senderId}"`);
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

// ── Helper: converte testo data italiano → ISO date Europe/Rome ──
function parseItalianDate(dateText, timeText) {
  if (!dateText) return { isoDate: null, isoTime: null };

  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{1,2}:\d{2}$/;

  // Se già ISO valido
  if (ISO_DATE_RE.test(dateText.trim())) {
    const safeTime = TIME_RE.test((timeText || '').trim()) ? timeText.trim() : null;
    return { isoDate: dateText.trim(), isoTime: safeTime };
  }

  // Mesi italiani
  const MESI = { gennaio:1,febbraio:2,marzo:3,aprile:4,maggio:5,giugno:6,luglio:7,agosto:8,settembre:9,ottobre:10,novembre:11,dicembre:12 };

  // Pattern: "giovedì 7 maggio 2026" o "7 maggio 2026" o "7 maggio"
  const match = dateText.toLowerCase().match(/(\d{1,2})\s+([a-zà-ú]+)\s*(\d{4})?/);
  if (match) {
    const day   = parseInt(match[1], 10);
    const month = MESI[match[2]];
    const nowRome = new Date();
    const romeYear = parseInt(new Intl.DateTimeFormat('it-IT', { year: 'numeric', timeZone: 'Europe/Rome' }).format(nowRome), 10);
    const year  = match[3] ? parseInt(match[3], 10) : romeYear;

    if (month && day >= 1 && day <= 31) {
      const isoDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      // Valida la data
      const d = new Date(`${isoDate}T12:00:00+02:00`);
      if (!isNaN(d.getTime())) {
        // Orario
        let isoTime = null;
        const tStr = (timeText || '').trim();
        if (TIME_RE.test(tStr)) {
          isoTime = tStr;
        } else {
          // Estrai orario dal testo (es. "alle 16:00")
          const tMatch = (dateText + ' ' + tStr).match(/(\d{1,2}):(\d{2})/);
          if (tMatch) isoTime = `${tMatch[1].padStart(2,'0')}:${tMatch[2]}`;
        }
        return { isoDate, isoTime };
      }
    }
  }

  // Non riesco a parsare: ritorno null e conservo testo originale
  return { isoDate: null, isoTime: TIME_RE.test((timeText || '').trim()) ? timeText.trim() : null };
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

  const { isoDate, isoTime } = parseItalianDate(rawDateText, rawTimeText);

  const naturalDateText = !isoDate && rawDateText ? rawDateText : null;
  const naturalTimeText = (!isoTime && rawTimeText && rawTimeText !== rawDateText) ? rawTimeText : null;

  console.log('[buildAppointment] 🕐 server_time:', now.toISOString());
  console.log('[buildAppointment] business_timezone: Europe/Rome');
  console.log('[buildAppointment] business_local_time:', romeNow);
  console.log('[buildAppointment] user_requested_date:', rawDateText);
  console.log('[buildAppointment] user_requested_time:', rawTimeText);
  console.log('[buildAppointment] parsed_isoDate:', isoDate);
  console.log('[buildAppointment] parsed_isoTime:', isoTime);

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

// ── Helper: costruisce il prompt ARIA segretaria autonoma ──
function buildAriaPrompt({ business, agentName, history, text, isFirstMsg }) {
  const orari = `${business.orario_inizio || '09:00'}–${business.orario_fine || '18:00'}`;
  const giorni = (business.giorni_attivi || []).join(', ') || 'lun–ven';

  // Ora corrente business in Europe/Rome — da passare esplicitamente ad ARIA
  const now = new Date();
  const romeFormatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const romeDatetime = romeFormatter.format(now);
  // Data ISO Rome per riferimento nel parsing
  const romeDateISO = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(now); // YYYY-MM-DD

  return `Sei ${agentName}, segretaria AI professionale di "${business.nome}".
Il tuo obiettivo è gestire la conversazione in autonomia: rispondere, qualificare, raccogliere dati per appuntamenti e gestire richieste senza dipendere dal team per ogni messaggio.

━━━ DATA E ORA ATTUALE ━━━
Data e ora business (Europe/Rome): ${romeDatetime}
Data ISO oggi: ${romeDateISO}
Timezone: Europe/Rome
⚠️ Usa SEMPRE questa data come riferimento per interpretare richieste come "domani", "giovedì prossimo", ecc.

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

**INFORMAZIONI** → Rispondi direttamente usando la knowledge base.

**APPUNTAMENTO** → Raccogli: nome cliente, servizio richiesto, data/ora preferita, email o telefono.
Chiedi UN dato alla volta solo se manca.
DATI MINIMI per creare la richiesta: nome + data/ora + (email o telefono). Il servizio è opzionale se non specificato.

Quando hai i dati minimi:
- Imposta create_appointment=true
- Nel campo appointment_data includi: servizio, data (ISO YYYY-MM-DD se possibile), ora (HH:MM se possibile), data_testo (testo originale), ora_testo (testo originale), email, telefono
- La reply deve essere PRECISA con i dati raccolti:
  "Perfetto [nome], ho registrato la tua richiesta per [giorno completo] alle [ora]. Ti contatteremo per confermare definitivamente."
  MAI usare frasi vaghe come "ti faremo sapere" o "appena possibile" se hai già tutti i dati.
  MAI dire "appuntamento confermato" o "sei prenotato".

Se mancano dati → chiedi solo il dato mancante, niente altro:
- Manca nome → "Come ti chiami?"
- Manca data/ora → "Che giorno e orario preferisci?"
- Manca contatto → "Mi lasci un'email o numero di telefono per la conferma?"
- Manca servizio (opzionale) → puoi procedere con "Richiesta appuntamento" come titolo

**PREVENTIVO** → Fai le domande necessarie, poi dai un'indicazione con i dati disponibili.

**SPAM** → "No grazie, al momento non siamo interessati." Intent=spam_or_solicitation. NON creare lead.

**RECLAMO** → Mostra comprensione. Escala solo se serio.

**RICHIESTA OPERATORE** → "Certo, ti passo a un operatore." needs_human=true.

━━━ ESCALATION (needs_human=true) SOLO SE ━━━
- Cliente chiede esplicitamente operatore umano
- Reclamo grave o urgenza non gestibile
- Serve decisione aziendale (sconto importante, contratto)

━━━ FRASI VIETATE ━━━
MAI: "avviso il team", "inoltro la richiesta", "un operatore ti risponderà", "ho girato la richiesta" — SALVO needs_human=true.
MAI frasi vaghe sull'appuntamento se hai già i dati: usa sempre nome, data e ora specifici nella risposta.

━━━ STORICO CONVERSAZIONE ━━━
${history || '(nessun messaggio precedente)'}

━━━ MESSAGGIO CLIENTE ━━━
${text}

━━━ RACCOLTA DATI CONTATTO ━━━
Per appuntamenti/preventivi: raccogli email o telefono.
Chiedi naturalmente: "Per la conferma, mi lascia un'email o un numero?"
Estrai e metti in collected_email / collected_phone.
Email valida: contiene @. Telefono: cifre e +.

━━━ RISPOSTA JSON RICHIESTA ━━━
Campi obbligatori:
- intent: appointment_request | information_request | quote_request | complaint | urgent_request | spam_or_solicitation | human_request | unknown
- needs_human: boolean
- reply: testo risposta al cliente (lingua del cliente, max 3 frasi, PRECISA con nome/data/ora se appuntamento)
- create_appointment: true se dati minimi raccolti (nome + data/ora + contatto)
- appointment_data: { servizio, data, ora, data_testo, ora_testo, email, telefono, note } — solo se create_appointment=true. data=ISO YYYY-MM-DD se riesci a calcolarla da "${romeDateISO}", ora=HH:MM 24h
- collected_email: stringa vuota se non disponibile
- collected_phone: stringa vuota se non disponibile`;
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