import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = 'emaral2026';

async function processComment({ base44, entryId, commentId, senderId, text, senderName }) {
  // ── Multi-account routing per commenti ──
  console.log('[webhookMeta] processComment → entryId:', entryId, '| commentId:', commentId, '| sender:', senderName);
  let connections = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entryId });
  console.log('[webhookMeta] Connessioni trovate per ig_account_id (comment):', connections.length);
  if (!connections.length) {
    connections = await base44.asServiceRole.entities.MetaConnection.filter({ meta_user_id: entryId });
    console.log('[webhookMeta] Connessioni trovate per meta_user_id (comment):', connections.length);
  }
  const conn = connections[0];
  if (!conn) {
    console.log('[webhookMeta] ⚠️ NESSUNA MetaConnection per comment entry.id:', entryId, '— commento ignorato.');
    return;
  }
  console.log('[webhookMeta] ✅ Business trovato per commento: conn.id:', conn.id, '| business_id:', conn.business_id);

  // Resolve business_id
  let businessId = conn.business_id || '';
  if (!businessId && conn.user_id) {
    const allBiz = await base44.asServiceRole.entities.Business.filter({});
    const match = allBiz.find(b => b.created_by === conn.user_id);
    if (match) {
      businessId = match.id;
      await base44.asServiceRole.entities.MetaConnection.update(conn.id, { business_id: businessId });
    }
  }
  if (!businessId) { console.error('[webhookMeta] Could not resolve business_id for comment'); return; }

  // Get business config and check auto_commenti flag
  const business = await base44.asServiceRole.entities.Business.get(businessId);
  if (!business || !business.auto_commenti) {
    console.log('[webhookMeta] auto_commenti disabled — skipping comment reply');
    return;
  }

  console.log('[webhookMeta] Processing comment:', commentId, 'from:', senderName, 'text:', text);

  // Build AI reply prompt for comment
  const commentAgentName = business.nome_agente || 'ARIA';
  const commentSystemPrompt = `Sei ${commentAgentName}, assistente di "${business.nome}".
${business.ai_prompt ? business.ai_prompt + '\n' : ''}
LINGUA: Rileva la lingua del commento e rispondi SEMPRE nella stessa lingua del commentatore. Se scrive in italiano → italiano. Se in inglese → inglese. Adattati sempre alla lingua dell'utente.

CONTESTO: Stai rispondendo a un commento PUBBLICO su Instagram — lo vedono tutti.

COME RISPONDI:
- Massimo 1-2 frasi. Breve, caldo, naturale.
- Parla come una persona reale, non come un brand aziendale.
- Se fanno una domanda → rispondi in modo utile e invitali in DM per approfondire.
- Se fanno un complimento → ringrazia con semplicità, senza esagerare.
- Se il commento è critico → rispondi con calma, senza difenderti.
- Non spingere servizi o vendite. Non usare call-to-action come "scopri di più!" o "contattaci!".
- Non rivelare MAI prezzi, tariffe o costi — se chiedono, digli sempre di scriverti in DM per i dettagli.`;

  const fullPrompt = `${commentSystemPrompt}\n\nCommento di @${senderName}: ${text}\n${commentAgentName}:`;

  const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: fullPrompt,
    model: 'gpt_5_mini',
  });
  const aiReply = typeof aiRes === 'string' ? aiRes : aiRes?.text || aiRes?.content || '';
  if (!aiReply) { console.error('[webhookMeta] Empty AI reply for comment'); return; }
  console.log('[webhookMeta] Comment AI reply:', aiReply.slice(0, 120));

  // Save comment + AI reply to DB
  // Find or create contact for the commenter
  const commenterContacts = await base44.asServiceRole.entities.Contact.filter({
    business_id: businessId, numero: senderId, canale: 'instagram',
  });
  let commenterContact = commenterContacts[0];
  if (!commenterContact) {
    commenterContact = await base44.asServiceRole.entities.Contact.create({
      business_id: businessId, nome: senderName,
      numero: senderId, canale: 'instagram', stato: 'lead',
    });
  }
  // Save the comment as a message (tipo: commento)
  await base44.asServiceRole.entities.Message.create({
    business_id: businessId, contact_id: commenterContact.id,
    canale: 'instagram', ruolo: 'user', testo: text, letto: false,
    tipo: 'commento', comment_id: commentId,
  });
  // Save ARIA reply
  await base44.asServiceRole.entities.Message.create({
    business_id: businessId, contact_id: commenterContact.id,
    canale: 'instagram', ruolo: 'assistant', testo: aiReply, letto: true,
    tipo: 'commento', comment_id: commentId,
  });
  console.log('[webhookMeta] Comment saved to DB for contact:', commenterContact.nome);

  // Reply to the comment via Instagram API
  const igToken = conn.access_token;
  if (!igToken) { console.error('[webhookMeta] Missing token for comment reply'); return; }

  const replyRes = await fetch(`https://graph.instagram.com/v21.0/${commentId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${igToken}` },
    body: JSON.stringify({ message: `@${senderName} ${aiReply}` }),
  });
  const replyData = await replyRes.json();
  if (replyData.error) {
    console.error('[webhookMeta] IG comment reply error:', JSON.stringify(replyData.error));
  } else {
    console.log('[webhookMeta] Comment reply sent! id:', replyData.id);
  }
}

async function processMessage({ base44, entryId, senderId, text }) {
  // ── Multi-account routing: identifica il business tramite ig_account_id o fb_page_id ──
  console.log('[webhookMeta] processMessage → entryId:', entryId, '| senderId:', senderId);
  let connections = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entryId });
  console.log('[webhookMeta] Connessioni trovate per ig_account_id:', connections.length);
  if (!connections.length) {
    connections = await base44.asServiceRole.entities.MetaConnection.filter({ fb_page_id: entryId });
    console.log('[webhookMeta] Connessioni trovate per fb_page_id:', connections.length);
  }
  if (!connections.length) {
    connections = await base44.asServiceRole.entities.MetaConnection.filter({ meta_user_id: entryId });
    console.log('[webhookMeta] Connessioni trovate per meta_user_id:', connections.length);
  }
  const conn = connections[0];
  if (!conn) {
    console.log('[webhookMeta] ⚠️ NESSUNA MetaConnection trovata per entry.id:', entryId, '— messaggio ignorato. Verificare che il business abbia connesso Instagram.');
    return;
  }
  console.log('[webhookMeta] ✅ Business trovato: conn.id:', conn.id, '| business_id:', conn.business_id, '| ig_account_id:', conn.ig_account_id);

  // Resolve business_id
  let businessId = conn.business_id || '';
  if (!businessId && conn.user_id) {
    const allBiz = await base44.asServiceRole.entities.Business.filter({});
    const match = allBiz.find(b => b.created_by === conn.user_id);
    if (match) {
      businessId = match.id;
      await base44.asServiceRole.entities.MetaConnection.update(conn.id, { business_id: businessId });
      console.log('[webhookMeta] Patched business_id:', businessId);
    }
  }
  if (!businessId) { console.error('[webhookMeta] Could not resolve business_id'); return; }
  conn.business_id = businessId;

  // Fetch sender name — usa il Page Access Token specifico del cliente
  const pageToken = conn.fb_page_token || conn.access_token;
  const pageId    = conn.fb_page_id || conn.ig_account_id;
  let senderName = `IG_${senderId}`;
  try {
    const profileRes = await fetch(
      `https://graph.facebook.com/v20.0/${senderId}?fields=name&access_token=${pageToken}`
    );
    const profileData = await profileRes.json();
    if (profileData.name) senderName = profileData.name;
    console.log('[webhookMeta] Sender name resolved:', senderName);
  } catch (e) {
    console.log('[webhookMeta] Could not fetch sender profile:', e.message);
  }

  // Find or create contact
  const contacts = await base44.asServiceRole.entities.Contact.filter({
    business_id: businessId, numero: senderId, canale: 'instagram',
  });
  let contact = contacts[0];
  if (!contact) {
    contact = await base44.asServiceRole.entities.Contact.create({
      business_id: businessId, nome: senderName,
      numero: senderId, canale: 'instagram', stato: 'lead',
    });
  } else if (contact.nome === `IG_${senderId}` && senderName !== `IG_${senderId}`) {
    await base44.asServiceRole.entities.Contact.update(contact.id, { nome: senderName });
    contact.nome = senderName;
  }

  // Create Lead in CRM if contact is new (no existing lead)
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
        canale: 'instagram',
        stato: 'nuovo',
        note_ai: `Primo messaggio: "${text.slice(0, 200)}"`,
      });
      console.log('[webhookMeta] Lead CRM created for:', contact.nome);
    }
  } catch (e) {
    console.log('[webhookMeta] Lead creation error:', e.message);
  }

  // Save incoming message
  await base44.asServiceRole.entities.Message.create({
    business_id: businessId, contact_id: contact.id,
    canale: 'instagram', ruolo: 'user', testo: text, letto: false,
  });
  console.log('[webhookMeta] Message saved for business:', businessId);

  // Check if AI is disabled for this specific contact (modalità manuale)
  // Message is already saved above with letto: false — admin will see it in inbox as unread
  if (contact.ai_disabled) {
    console.log('[webhookMeta] AI disabled for contact:', contact.nome, '— skipping AI reply (manuale mode)');
    return;
  }

  // Get business config
  const business = await base44.asServiceRole.entities.Business.get(businessId);
  if (!business || business.auto_risposta === false) {
    console.log('[webhookMeta] auto_risposta disabled — skipping AI reply');
    return;
  }

  // Check if current time is within ARIA's operating hours
  // Use Intl to get hour/minute in Rome timezone reliably (avoids split locale issues)
  const nowRome = new Date();
  const romeHour = parseInt(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false }).format(nowRome), 10) % 24;
  const romeMinute = parseInt(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', minute: '2-digit' }).format(nowRome), 10);
  const currentMinutes = romeHour * 60 + romeMinute;

  const [startH, startM] = (business.orario_inizio || '08:00').split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const [endH, endM] = (business.orario_fine || '20:00').split(':').map(Number);
  const endMinutes = endH * 60 + endM;

  // is24h: 00:00–23:59, 00:00–00:00, o orario_inizio === orario_fine (tutto il giorno)
  const is24h = startMinutes === endMinutes || (startMinutes === 0 && endMinutes >= 1439);
  const withinHours = is24h || (currentMinutes >= startMinutes && currentMinutes < endMinutes);
  console.log(`[webhookMeta] Orari: ${business.orario_inizio}–${business.orario_fine} | ora Roma: ${romeHour}:${String(romeMinute).padStart(2,'0')} | currentMin=${currentMinutes} startMin=${startMinutes} endMin=${endMinutes} | is24h=${is24h} withinHours=${withinHours} fuori_orario_attivo=${business.fuori_orario_attivo}`);

  // Detect language for out-of-hours message
  const dmLangEarly = business.lingua || 'Italiano';
  const dmIsEn = dmLangEarly.toLowerCase().includes('english') || dmLangEarly.toLowerCase() === 'en';

  if (!withinHours && business.fuori_orario_attivo) {
    console.log('[webhookMeta] Outside operating hours, sending out-of-hours message');
    const oohText = business.messaggio_fuori_orario || (dmIsEn ? 'We are currently out of hours. We will reply as soon as possible!' : 'Siamo fuori orario. Ti risponderemo non appena possibile!');
    if (conn.fb_page_token && conn.fb_page_id) {
      await fetch(`https://graph.facebook.com/v20.0/${conn.fb_page_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { id: senderId }, message: { text: oohText }, access_token: conn.fb_page_token }),
      });
    } else if (conn.access_token && conn.ig_account_id) {
      await fetch(`https://graph.instagram.com/v21.0/${conn.ig_account_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${conn.access_token}` },
        body: JSON.stringify({ recipient: { id: senderId }, message: { text: oohText } }),
      });
    }
    return;
  }

  // Build prompt with history
  const recentMessages = await base44.asServiceRole.entities.Message.filter(
    { business_id: businessId, contact_id: contact.id }, '-created_date', 10
  );
  const historyText = recentMessages.reverse()
    .map(m => `${m.ruolo === 'assistant' ? 'ARIA' : 'Cliente'}: ${m.testo}`)
    .join('\n');

  const isFirstMessage = recentMessages.filter(m => m.ruolo === 'assistant').length === 0;

  // Fetch upcoming appointments for availability context
  let availabilityContext = '';
  try {
    const nowDisplay = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const todayItaly = new Date().toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' });
    const [dd, mm, yyyy] = todayItaly.split('/');
    const today = `${yyyy}-${mm}-${dd}`;
    const upcomingApts = await base44.asServiceRole.entities.Appointment.filter(
      { business_id: businessId }, 'data', 50
    ).catch(() => []);
    const busySlots = upcomingApts
      .filter(a => a.data >= today && (a.stato === 'confermato' || a.stato === 'in_attesa'))
      .map(a => `${a.data}${a.ora ? ` ${a.ora}` : ''}${a.durata_minuti ? ` (${a.durata_minuti} min)` : ''}`)
      .join(', ');

    const giorniAtt = business?.responsabile_giorni_attivi?.length
      ? business.responsabile_giorni_attivi.join(', ')
      : business?.giorni_attivi?.length ? business.giorni_attivi.join(', ') : 'lun, mar, mer, gio, ven';
    const orInizio = business?.responsabile_orario_inizio || '09:00';
    const orFine = business?.responsabile_orario_fine || '18:00';
    const disponibilitaBase = `Giorni disponibili del responsabile: ${giorniAtt}. Orario: ${orInizio}–${orFine}.`;

    if (busySlots) {
      availabilityContext = `\n\nDATA E ORA ATTUALE (fuso orario Italia): ${nowDisplay}\nDISPONIBILITÀ (solo uso interno):\n${disponibilitaBase}\nSlot già occupati in agenda: ${busySlots}\nRegole:\n- Usa la data e ora attuale per capire quali giorni proporre (non proporre date nel passato).\n- Se il cliente chiede un giorno/orario occupato o fuori orario lavorativo, digli che non sei disponibile e proponi SUBITO uno slot libero specifico (giorno + ora) all'interno dei tuoi orari.\n- Non dire mai perché sei occupato né cosa hai in agenda.\n- Sii proattivo e concreto: "purtroppo mercoledì non ho disponibilità, ma venerdì alle 16:00 sono libero — ti va?"`;
    } else {
      availabilityContext = `\n\nDATA E ORA ATTUALE (fuso orario Italia): ${nowDisplay}\nDISPONIBILITÀ (solo uso interno):\n${disponibilitaBase}\nNessun appuntamento in agenda — sei completamente libero nei tuoi orari lavorativi. Usa la data attuale per proporre date future concrete (non nel passato).`;
    }
  } catch (e) {
    console.log('[webhookMeta] Could not fetch agenda:', e.message);
  }

  const giorniAttivi = business?.responsabile_giorni_attivi?.length
    ? business.responsabile_giorni_attivi.join(', ')
    : business?.giorni_attivi?.length ? business.giorni_attivi.join(', ') : 'lun, mar, mer, gio, ven';
  const orarioInizio = business?.responsabile_orario_inizio || '09:00';
  const orarioFine = business?.responsabile_orario_fine || '18:00';

  // ── Pre-detect: trigger URGENTI (appuntamento, documento, preventivo, collaborazione) ──
  const urgentKeywords = /appuntament|call|telefonat|videochiamata|zoom|meet|colloquio|incontr|documento|visura|file|attestato|certificato|preventivo|prez(zo|zi)|cost(o|i)|collaborar|lavorare insieme|contratto|accordo|partnership/i;
  if (urgentKeywords.test(text)) {
    try {
      let triggerType = 'appuntamento';
      if (/documento|visura|file|attestato|certificato/i.test(text)) triggerType = 'documento';
      else if (/preventivo|prezzo|prezzi|costo|costi/i.test(text)) triggerType = 'preventivo';
      else if (/collaborar|lavorare insieme|contratto|accordo|partnership/i.test(text)) triggerType = 'collaborazione';
      await base44.asServiceRole.entities.UrgentAction.create({
        business_id: businessId,
        contact_id: contact.id,
        contact_nome: contact.nome,
        contact_canale: 'instagram',
        trigger: triggerType,
        messaggio_originale: text.slice(0, 500),
        stato: 'nuovo',
      });
      console.log('[webhookMeta] UrgentAction creata per:', contact.nome, '| trigger:', triggerType);
    } catch (e) {
      console.log('[webhookMeta] UrgentAction creation error:', e.message);
    }
  }

  // ── Pre-detect: vuole parlare col titolare? ──
  const humanRequestKeywords = /parla(re)? con (te|voi|il titolare|il responsabile|una persona|qualcuno)|voglio (sentire|parlare con) (te|voi|qualcuno|una persona reale)|mettimi in contatto|chiamami|chiamatemi|richiama(temi)?|pass(ami|atemi) (a qualcuno|al titolare)/i;
  if (humanRequestKeywords.test(text)) {
    try {
      const existing = await base44.asServiceRole.entities.HumanRequest.filter({
        business_id: businessId,
        contact_id: contact.id,
        stato: 'nuovo',
      });
      if (!existing.length) {
        await base44.asServiceRole.entities.HumanRequest.create({
          business_id: businessId,
          contact_id: contact.id,
          contact_nome: contact.nome,
          canale: 'instagram',
          motivo: text.slice(0, 200),
          stato: 'nuovo',
        });
        console.log('[webhookMeta] HumanRequest created for:', contact.nome);
      }
    } catch (e) {
      console.log('[webhookMeta] HumanRequest creation error:', e.message);
    }
  }

  // ── Pre-detect cancellation BEFORE generating AI reply ──
  let cancellationHandled = false;
  const cancellationKeywords = /annull|cancel|non voglio|disdic|non mi interessa più|lasciar perdere|non ho più voglia/i;
  if (cancellationKeywords.test(text)) {
    try {
      const existingApts = await base44.asServiceRole.entities.Appointment.filter({
        business_id: businessId,
        contact_id: contact.id,
      });
      const activeApt = existingApts.find(a => a.stato === 'in_attesa' || a.stato === 'confermato');
      if (activeApt) {
        await base44.asServiceRole.entities.Appointment.update(activeApt.id, {
          stato: 'annullato',
          note: (activeApt.note || '') + ' | ANNULLATO DAL CLIENTE via Instagram DM.',
        });
        cancellationHandled = true;
        console.log('[webhookMeta] Appointment pre-cancelled for:', contact.nome);
      }
    } catch (e) {
      console.log('[webhookMeta] Cancellation pre-detection error:', e.message);
    }
  }

  // cancellationHandled is used directly in the systemPrompt below

  // Detect the language the client is actually writing in — always mirror it
  const dmLang = business.lingua || 'Italiano';

  const systemPrompt = `Sei ${business.nome_agente || 'ARIA'}, assistente di "${business.nome}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGOLE ASSOLUTE — NON DEROGABILI MAI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NON confermare MAI appuntamenti, call o incontri senza approvazione esplicita del titolare. Quando ti chiedono un appuntamento/call rispondi SEMPRE e SOLO: "Perfetto! Ho preso nota della tua richiesta e la giro subito al team. Ti ricontatteremo entro breve per confermare data e orario. 😊"

2. NON promettere MAI l'invio di documenti, file, visure, attestati o materiali. Rispondi SEMPRE: "Certamente! Giro la richiesta al team che ti contatterà direttamente. 😊"

3. NON dare MAI date, orari specifici o numeri di telefono del titolare al posto del team.

4. Se non sei SICURA al 100% di un'informazione, NON inventare e NON assumere. Di': "Ottima domanda! La giro al team che ti risponderà con precisione. 😊"

5. Non parlare MAI a nome del titolare in prima persona (no "ti chiamerò io", "ti mando io"). Usa sempre "il team ti contatterà" o "riceverai risposta dal team".

6. Se il cliente chiede prezzi di servizi non listati → rimanda al team.

7. Non rivelare MAI dati su collaboratori, disponibilità interna, documenti posseduti dall'azienda.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${business.ai_prompt ? business.ai_prompt + '\n' : ''}
LINGUA: Rileva in che lingua sta scrivendo il cliente e rispondi SEMPRE nella sua stessa lingua.

CONTESTO BUSINESS:
${business.servizi ? `- Servizi: ${business.servizi}` : ''}
${business.prezzi ? `- Prezzi (condividi SOLO se il cliente lo chiede esplicitamente e sono già listati): ${business.prezzi}` : ''}
${business.cose_da_non_fare ? `- Non fare mai: ${business.cose_da_non_fare}` : ''}
${availabilityContext}

COME SEI:
- Sei un assistente AI del team, non il titolare.
- Parli in modo naturale, caldo, diretto.
- Risposte brevi: 1-3 frasi al massimo. Niente elenchi puntati.
- Non usi mai frasi come "come posso assisterti?", "non esitare a contattarci", "sarò lieto di aiutarti".
${isFirstMessage ? `- È il PRIMO messaggio: presentati brevemente con il tuo nome e sii accogliente. Una frase.` : `- Non ripresentarti. Vai dritto al punto.`}

COSA NON FAI MAI:
- Non spingi a vendere, non insisti.
- Se il cliente dice "no grazie" o "non mi interessa" → risposta cordiale e brevissima. Fine.

ANNULLAMENTO:
- Se il cliente vuole annullare, di' semplicemente "Ok, ho annullato — sei libero/a." Senza burocrazia.

RICHIESTA DI PARLARE CON PERSONA REALE:
- Rispondi: "Certo! Ho avvisato il team — ti risponderemo personalmente appena possibile 😊"
${cancellationHandled ? '\nATTENZIONE: L\'appuntamento è stato già annullato automaticamente. Dì solo "Ok, annullato — sei libero/a!" in modo naturale.' : ''}`;

  const agentName = business.nome_agente || 'ARIA';

  // Detect language from conversation history + current message for maximum accuracy
  const allTexts = recentMessages
    .filter(m => m.ruolo === 'user')
    .map(m => m.testo)
    .concat([text])
    .slice(-3) // last 3 user messages
    .join(' ');

  const clientLangDetect = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Detect the language of this text and reply with ONLY the language name in English (e.g. "Italian", "English", "Spanish", "French"). Text: "${allTexts.slice(0, 300)}"`,
    model: 'gpt_5_mini',
  });
  const detectedLang = (typeof clientLangDetect === 'string' ? clientLangDetect : clientLangDetect?.text || '').trim().split('\n')[0];
  console.log('[webhookMeta] Detected client language:', detectedLang);

  // Inject language instruction directly into prompt — no retry needed
  const langLine = detectedLang
    ? `\n\nCRITICAL: You MUST reply in ${detectedLang} ONLY. Do NOT use any other language regardless of the system prompt language.`
    : '';

  const fullPrompt = `${systemPrompt}${langLine}\n\nStorico conversazione:\n${historyText}\n\nCliente: ${text}\n${agentName}:`;

  const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: fullPrompt,
    model: 'gpt_5_mini',
  });
  const aiReply = typeof aiRes === 'string' ? aiRes : aiRes?.text || aiRes?.content || '';
  console.log('[webhookMeta] AI reply:', aiReply ? aiReply.slice(0, 120) : 'EMPTY');
  if (!aiReply) { console.error('[webhookMeta] Empty AI reply'); return; }

  // Save AI reply to DB and send message
  // Se c'è fb_page_token usa Facebook Graph API, altrimenti fallback su Instagram API (vecchio flusso)
  const hasFbToken = !!(conn.fb_page_token && conn.fb_page_id);
  const sendPromise = hasFbToken
    ? fetch(`https://graph.facebook.com/v20.0/${conn.fb_page_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { id: senderId }, message: { text: aiReply }, access_token: conn.fb_page_token }),
      }).then(r => r.json()).then(d => {
        if (d.error) console.error('[webhookMeta] FB Graph API error:', JSON.stringify(d.error));
        else console.log('[webhookMeta] Reply sent via FB! message_id:', d.message_id);
      })
    : conn.access_token && conn.ig_account_id
      ? fetch(`https://graph.instagram.com/v21.0/${conn.ig_account_id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${conn.access_token}` },
          body: JSON.stringify({ recipient: { id: senderId }, message: { text: aiReply } }),
        }).then(r => r.json()).then(d => {
          if (d.error) console.error('[webhookMeta] IG API error:', JSON.stringify(d.error));
          else console.log('[webhookMeta] Reply sent via IG! message_id:', d.message_id);
        })
      : Promise.resolve();

  await Promise.all([
    base44.asServiceRole.entities.Message.create({
      business_id: businessId, contact_id: contact.id,
      canale: 'instagram', ruolo: 'assistant', testo: aiReply, letto: true,
    }),
    sendPromise,
  ]);

  // Detect new appointment creation (post-reply, async — does not block response)
  try {
    const nowForAppointment = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const appointmentDetection = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analizza questo messaggio di un cliente e rispondi SOLO con un JSON.
DATA E ORA ATTUALE (fuso orario Italia): ${nowForAppointment}
Messaggio cliente: "${text}"
Risposta ARIA: "${aiReply}"

Determina se il cliente ha richiesto un appuntamento e ha fornito TUTTE le informazioni necessarie:
- Un orario specifico (o giorni/date indicate)
- Un tipo di appuntamento (telefonata, zoom, email, in_persona)
- Dati di contatto (telefono o email per la conferma)

IMPORTANTE: Per il campo data_raw, usa la data corrente fornita per calcolare date relative (es. "mercoledì prossimo", "venerdì", "domani") e restituisci la data nel formato ISO YYYY-MM-DD HH:MM.

Rispondi ESATTAMENTE con questo JSON (niente altro):
{
  "is_appointment": true/false,
  "has_time": true/false,
  "has_contact_method": true/false,
  "has_contact_data": true/false,
  "titolo": "titolo breve o null",
  "data_raw": "data ISO YYYY-MM-DD HH:MM o null",
  "tipo_appuntamento": "whatsapp|telefono|zoom|null",
  "contact_method": "numero_telefono|email|null",
  "note": "dettagli utili o null"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          is_appointment: { type: 'boolean' },
          has_time: { type: 'boolean' },
          has_contact_method: { type: 'boolean' },
          has_contact_data: { type: 'boolean' },
          titolo: { type: 'string' },
          data_raw: { type: 'string' },
          tipo_appuntamento: { type: 'string' },
          contact_method: { type: 'string' },
          note: { type: 'string' },
        },
      },
    });

    if (appointmentDetection?.is_appointment && appointmentDetection?.has_time && appointmentDetection?.has_contact_method && appointmentDetection?.has_contact_data) {
      let appointmentDate = null;
      let appointmentTime = null;
      if (appointmentDetection.data_raw) {
        // data_raw is "YYYY-MM-DD HH:MM" in Rome local time — parse manually to avoid UTC shift
        const rawStr = appointmentDetection.data_raw.trim();
        const dateMatch = rawStr.match(/^(\d{4}-\d{2}-\d{2})/);
        const timeMatch = rawStr.match(/(\d{2}):(\d{2})$/);
        if (dateMatch) appointmentDate = dateMatch[1];
        if (timeMatch) appointmentTime = `${timeMatch[1]}:${timeMatch[2]}`;
        // Fallback: try native parse only if no dateMatch
        if (!dateMatch) {
          const parsed = new Date(rawStr);
          if (!isNaN(parsed.getTime())) {
            // Interpret as Rome time by extracting parts
            appointmentDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(parsed);
            appointmentTime = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false }).format(parsed);
          }
        }
      }
      // Final fallback
      if (!appointmentDate) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        appointmentDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(tomorrow);
      }

      const existingApts = await base44.asServiceRole.entities.Appointment.filter({
        business_id: businessId,
        contact_id: contact.id,
        stato: 'in_attesa',
      });

      if (!existingApts.length) {
        await base44.asServiceRole.entities.Appointment.create({
          business_id: businessId,
          contact_id: contact.id,
          contact_nome: contact.nome,
          titolo: appointmentDetection.titolo || `Appuntamento con ${contact.nome}`,
          data: appointmentDate,
          ora: appointmentTime || '10:00',
          tipo: appointmentDetection.tipo_appuntamento === 'zoom' ? 'riunione' : 'chiamata',
          stato: 'in_attesa',
          canale_origine: 'instagram',
          note: `Tipo: ${appointmentDetection.tipo_appuntamento || 'non specificato'}. Contatto: ${appointmentDetection.contact_method || 'non specificato'}. ${appointmentDetection.note || 'Richiesta via Instagram DM'}`,
        });
        console.log('[webhookMeta] Appointment created for:', contact.nome);
      }
    }
  } catch (e) {
    console.log('[webhookMeta] Appointment detection error:', e.message);
  }

}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[webhookMeta] Webhook verified');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    console.log('[webhookMeta] ═══ WEBHOOK RICEVUTO ═══');
    console.log('[webhookMeta] Entry IDs:', (body.entry || []).map(e => e.id).join(', ') || 'nessuno');
    console.log('[webhookMeta] Full body (troncato):', JSON.stringify(body).slice(0, 500));

    const base44 = createClientFromRequest(req);
    const entries = body.entry || [];

    // Collect DMs and comments separately
    const messages = [];
    const comments = [];

    for (const entry of entries) {
      // DMs, postbacks, reactions — entry.messaging
      for (const event of (entry.messaging || [])) {
        if (event.read || event.delivery) continue; // skip read receipts / delivery events
        if (event.message?.is_echo) continue; // skip echoes

        const senderId = event.sender?.id;
        if (!senderId) continue;

        // Postbacks (button taps)
        if (event.postback) {
          const postbackText = event.postback.title || event.postback.payload || '';
          if (postbackText) messages.push({ entryId: entry.id, senderId, text: postbackText });
          continue;
        }

        // Reactions — log only, no AI reply needed
        if (event.reaction) {
          console.log('[webhookMeta] Reaction from:', senderId, '| reaction:', event.reaction.reaction, '| action:', event.reaction.action);
          continue;
        }

        // Standard text DM
        if (!event.message) continue;
        const text = event.message?.text || '';
        if (!text) continue;
        messages.push({ entryId: entry.id, senderId, text });
      }

      // Comments — entry.changes
      for (const change of (entry.changes || [])) {
        if (change.field !== 'comments') continue;
        const val = change.value || {};
        // Skip replies (have parent_id) and skip comments from the page itself (self_ig_scoped_id)
        if (val.parent_id) continue;
        if (val.from?.self_ig_scoped_id) continue; // skip own page replies
        if (val.from?.id === entry.id) continue; // skip if sender is the IG account itself
        const commentId = val.id;
        const text = val.text || '';
        const senderId = val.from?.id || '';
        const senderName = val.from?.name || val.from?.username || senderId;
        if (!commentId || !text) continue;
        comments.push({ entryId: entry.id, commentId, senderId, senderName, text });
      }
    }

    // Run sequentially — no parallel processing to avoid duplicate contact/lead creation
    (async () => {
      for (const msg of messages) {
        console.log('[webhookMeta] Processing message from:', msg.senderId);
        await processMessage({ base44, entryId: msg.entryId, senderId: msg.senderId, text: msg.text })
          .catch(err => console.error('[webhookMeta] Processing error:', err.message));
      }
      for (const c of comments) {
        console.log('[webhookMeta] Processing comment:', c.commentId, 'from:', c.senderName);
        await processComment({ base44, entryId: c.entryId, commentId: c.commentId, senderId: c.senderId, text: c.text, senderName: c.senderName })
          .catch(err => console.error('[webhookMeta] Comment processing error:', err.message));
      }
    })();

    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
});