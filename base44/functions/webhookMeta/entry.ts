import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const VERIFY_TOKEN = 'emaral2026';

async function processComment({ base44, entryId, commentId, senderId, text, senderName }) {
  // Find MetaConnection
  let connections = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entryId });
  if (!connections.length) {
    connections = await base44.asServiceRole.entities.MetaConnection.filter({ meta_user_id: entryId });
  }
  const conn = connections[0];
  if (!conn) { console.log('[webhookMeta] No MetaConnection for comment entry.id:', entryId); return; }

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
  const replyLang = business.lingua || 'Italiano';
  const isEnglish = replyLang.toLowerCase().includes('english') || replyLang.toLowerCase() === 'en';
  const systemPrompt = [
    isEnglish
      ? `You are ${business.nome_agente || 'ARIA'}, assistant of "${business.nome}".`
      : `Sei ${business.nome_agente || 'ARIA'}, assistente di "${business.nome}".`,
    business.ai_prompt || '',
    isEnglish ? `Tone: ${business.tono || 'professional'}.` : `Tono: ${business.tono || 'professionale'}.`,
    business.servizi ? (isEnglish ? `Services offered: ${business.servizi}` : `Servizi offerti: ${business.servizi}`) : '',
    `LANGUAGE: Always reply in ${replyLang}.`,
    '',
    isEnglish ? 'COMMENT REPLY RULES:' : 'REGOLE PER I COMMENTI:',
    isEnglish
      ? '- You are replying to a PUBLIC Instagram comment, visible to everyone.'
      : '- Stai rispondendo a un COMMENTO su un post Instagram, NON a un DM.',
    isEnglish
      ? '- Be friendly, brief and professional. Max 1-2 sentences.'
      : '- La risposta sarà PUBBLICA e visibile a tutti. Sii cordiale, breve. Massimo 1-2 frasi.',
    isEnglish
      ? '- Do not share private info or detailed prices — invite to DM for details.'
      : '- Non rivelare informazioni private o prezzi dettagliati — invita a scrivere in DM per dettagli.',
    isEnglish
      ? '- Reply like a real person, not a bot.'
      : '- Non usare frasi robotiche. Parla come una persona reale.',
    isEnglish
      ? '- If the comment is negative, reply calmly and professionally.'
      : '- Se il commento è negativo o offensivo, rispondi con calma e professionalità.',
  ].filter(Boolean).join('\n');

  const fullPrompt = `${systemPrompt}\n\nCommento di @${senderName}: ${text}\n${business.nome_agente || 'ARIA'}:`;

  const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: fullPrompt,
    model: 'gpt_5_mini',
  });
  const aiReply = typeof aiRes === 'string' ? aiRes : aiRes?.text || aiRes?.content || '';
  if (!aiReply) { console.error('[webhookMeta] Empty AI reply for comment'); return; }
  console.log('[webhookMeta] Comment AI reply:', aiReply.slice(0, 120));

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
  // Find MetaConnection
  let connections = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entryId });
  if (!connections.length) {
    connections = await base44.asServiceRole.entities.MetaConnection.filter({ meta_user_id: entryId });
  }
  const conn = connections[0];
  if (!conn) { console.log('[webhookMeta] No MetaConnection for entry.id:', entryId); return; }

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

  // Fetch sender's Instagram username
  let senderName = `IG_${senderId}`;
  try {
    const igToken = conn.access_token;
    const profileRes = await fetch(`https://graph.instagram.com/v21.0/${senderId}?fields=name,username&access_token=${igToken}`);
    const profileData = await profileRes.json();
    if (profileData.username) senderName = `@${profileData.username}`;
    else if (profileData.name) senderName = profileData.name;
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
  const romeHour = parseInt(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: 'numeric', hour12: false }).format(nowRome), 10);
  const romeMinute = parseInt(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', minute: 'numeric' }).format(nowRome), 10);
  const currentMinutes = romeHour * 60 + romeMinute;

  const [startH, startM] = (business.orario_inizio || '08:00').split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const [endH, endM] = (business.orario_fine || '20:00').split(':').map(Number);
  const endMinutes = endH * 60 + endM;

  const is24h = (startMinutes === 0 && endMinutes === 1439);
  const withinHours = is24h || (currentMinutes >= startMinutes && currentMinutes < endMinutes);

  if (!withinHours && business.fuori_orario_attivo) {
    console.log('[webhookMeta] Outside operating hours, sending out-of-hours message');
    const igToken = conn.access_token;
    const igAccountId = conn.ig_account_id;
    if (igToken && igAccountId) {
      await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${igToken}` },
        body: JSON.stringify({ recipient: { id: senderId }, message: { text: business.messaggio_fuori_orario || (dmIsEn ? 'We are currently out of hours. We will reply as soon as possible!' : 'Siamo fuori orario. Ti risponderemo non appena possibile!') } }),
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

  const cancellationNote = cancellationHandled
  ? (dmIsEn
      ? '\n\nACTION DONE: The appointment has been CANCELLED automatically. Reply ONLY with something like "I have cancelled your appointment, you\'re free." — Do NOT say you\'re forwarding anything.'
      : '\n\nAZIONE COMPLETATA: L\'appuntamento di questo cliente è stato ANNULLATO automaticamente dal sistema. Rispondi SOLO con qualcosa tipo "Ho annullato il tuo appuntamento, sei libero/a." — NON dire che stai inoltrando nulla al responsabile.')
  : '';

  const dmLang = business.lingua || 'Italiano';
  const dmIsEn = dmLang.toLowerCase().includes('english') || dmLang.toLowerCase() === 'en';

  const systemPrompt = [
    dmIsEn
      ? `You are ${business.nome_agente || 'ARIA'}, assistant of "${business.nome}".`
      : `Sei ${business.nome_agente || 'ARIA'}, assistente di "${business.nome}".`,
    business.ai_prompt || '',
    dmIsEn ? `Tone: ${business.tono || 'professional'}.` : `Tono: ${business.tono || 'professionale'}.`,
    `LANGUAGE: Always reply in ${dmLang}. Never switch language.`,
    business.servizi ? (dmIsEn ? `Services offered: ${business.servizi}` : `Servizi offerti: ${business.servizi}`) : '',
    business.prezzi ? (dmIsEn ? `Prices (share ONLY if explicitly asked): ${business.prezzi}` : `Prezzi (da condividere SOLO se esplicitamente richiesti): ${business.prezzi}`) : '',
    business.cose_da_non_fare ? (dmIsEn ? `Never do: ${business.cose_da_non_fare}` : `Non fare mai: ${business.cose_da_non_fare}`) : '',
    availabilityContext,
    '',
    dmIsEn ? 'CORE RULES:' : 'REGOLE FONDAMENTALI:',
    dmIsEn ? '- Reply at any time, day or night. You have no closing hours.' : '- Rispondi SEMPRE, a qualsiasi ora del giorno o della notte. Non esistono orari di chiusura per te.',
    dmIsEn
      ? '- Introduce yourself with your name ONLY ONCE, on the very first message. Never repeat "hi I\'m ARIA" again.'
      : '- Presentati con il tuo nome UNA SOLA VOLTA, solo se è il primissimo messaggio della conversazione. MAI ripetere "ciao sono ARIA" o simili nelle risposte successive.',
    isFirstMessage
      ? (dmIsEn ? '- This is the FIRST message: introduce yourself briefly and ask how you can help.' : '- Questo è il PRIMO messaggio: presentati brevemente con nome e chiedi come puoi aiutare.')
      : (dmIsEn ? '- Do NOT introduce yourself again. Go straight to the point.' : '- NON presentarti di nuovo, sei già stato presentato. Vai dritto al punto.'),
    dmIsEn ? '- Do NOT mention prices unless the client explicitly asks.' : '- NON menzionare prezzi, costi o tariffe a meno che il cliente non lo chieda esplicitamente.',
    dmIsEn ? '- APPOINTMENTS: If the client wants to book:' : '- GESTIONE APPUNTAMENTI: Se il cliente vuole prenotare:',
    dmIsEn
      ? `  1. Ask in ONE message: type (WhatsApp, phone or Zoom), their number/email, preferred day+time. All at once.`
      : '  1. Chiedi in UN SOLO messaggio: tipo di chiamata (WhatsApp, telefono normale o Zoom), il suo numero/email, e il giorno+orario preferito. Tutto in una volta sola.',
    dmIsEn
      ? `  2. Inform that the manager is available: ${giorniAttivi}, hours ${orarioInizio}–${orarioFine}.`
      : `  2. Informa che il responsabile è disponibile nei giorni: ${giorniAttivi}, orario ${orarioInizio}–${orarioFine}.`,
    dmIsEn
      ? '  3. If the client proposes a FREE slot → always accept it. Do NOT suggest a different time.'
      : '  3. Se il cliente propone un orario LIBERO in agenda → accettalo SEMPRE senza cambiarlo. NON proporre orari diversi da quello scelto dal cliente.',
    dmIsEn
      ? '  4. If the slot is BUSY or out of hours → say it\'s unavailable and propose ONE specific free slot.'
      : '  4. Se il cliente propone un orario OCCUPATO o fuori orario → digli che quello slot non è disponibile e proponi UNO slot libero specifico.',
    dmIsEn
      ? '  5. If you already have all data (type, contact, date, time) → do NOT ask again, just confirm.'
      : '  5. Non chiedere più volte le stesse cose. Se hai già tutti i dati (tipo, contatto, data, ora) → NON chiedere altro, conferma e basta.',
    dmIsEn
      ? '  6. NEVER say "confirmed" or "appointment confirmed" — the admin will do that.'
      : '  6. NON DIRE MAI "ho confermato" o "appuntamento confermato" — è l\'admin che lo farà.',
    dmIsEn ? '- CANCELLATION: If the client wants to cancel:' : '- ANNULLAMENTO APPUNTAMENTO: Se il cliente vuole annullare o ha già detto di voler annullare:',
    dmIsEn
      ? '  - Always say directly "I have cancelled your appointment" (never "I\'ll forward the request").'
      : '  - Di\' SEMPRE e DIRETTAMENTE "Ho annullato il tuo appuntamento" (niente "inoltro la richiesta", niente "l\'amministrazione ti contatterà").',
    dmIsEn
      ? '  - Never mention the admin or management for cancellations.'
      : '  - Non menzionare MAI il responsabile o l\'amministrazione per le cancellazioni.',
    dmIsEn ? '- Understand what the client really wants before replying.' : '- Prima di rispondere, capisci cosa vuole il cliente: cosa lo ha spinto a scrivere? Cosa cerca?',
    '',
    dmIsEn ? '- Short, natural, human replies. Max 2-3 sentences. No bullet points unless truly needed.' : '- Risposte brevi, naturali, umane. Massimo 2-3 frasi. Niente elenchi puntati a meno che non servano davvero.',
    dmIsEn ? '- Avoid robotic phrases. Talk like a real person, not a bot.' : '- Non usare frasi robotiche come "come posso assisterti?", "non esitare a contattarci", "sarò felice di aiutarti".',
    cancellationNote,
  ].filter(Boolean).join('\n');

  const fullPrompt = `${systemPrompt}\n\nStorico:\n${historyText}\n\nCliente: ${text}\nARIA:`;

  const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: fullPrompt,
    model: 'gpt_5_mini',
  });
  const aiReply = typeof aiRes === 'string' ? aiRes : aiRes?.text || aiRes?.content || '';
  console.log('[webhookMeta] AI reply:', aiReply ? aiReply.slice(0, 120) : 'EMPTY');
  if (!aiReply) { console.error('[webhookMeta] Empty AI reply'); return; }

  // Save AI reply to DB
  await base44.asServiceRole.entities.Message.create({
    business_id: businessId, contact_id: contact.id,
    canale: 'instagram', ruolo: 'assistant', testo: aiReply, letto: true,
  });

  // Detect new appointment creation (post-reply)
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

  // Send via Instagram API
  const igToken = conn.access_token;
  const igAccountId = conn.ig_account_id;
  if (!igToken || !igAccountId) { console.error('[webhookMeta] Missing token or account ID'); return; }

  const sendRes = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${igToken}` },
    body: JSON.stringify({ recipient: { id: senderId }, message: { text: aiReply } }),
  });
  const sendData = await sendRes.json();
  if (sendData.error) {
    console.error('[webhookMeta] IG API error:', JSON.stringify(sendData.error));
  } else {
    console.log('[webhookMeta] Reply sent! message_id:', sendData.message_id);
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
    console.log('[webhookMeta] Event received:', JSON.stringify(body).slice(0, 400));

    const base44 = createClientFromRequest(req);
    const entries = body.entry || [];

    // Collect DMs and comments separately
    const messages = [];
    const comments = [];

    for (const entry of entries) {
      // DMs — entry.messaging
      for (const event of (entry.messaging || [])) {
        if (!event.message || event.message.is_echo) continue;
        const senderId = event.sender?.id;
        const text = event.message?.text || '';
        if (!senderId || !text) continue;
        messages.push({ entryId: entry.id, senderId, text });
      }

      // Comments — entry.changes
      for (const change of (entry.changes || [])) {
        if (change.field !== 'comments') continue;
        const val = change.value || {};
        // Only process top-level comments (not replies by the page itself)
        if (val.parent_id) continue; // skip replies
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