import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const VERIFY_TOKEN = 'emaral2026';

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
        body: JSON.stringify({ recipient: { id: senderId }, message: { text: business.messaggio_fuori_orario || 'Siamo fuori orario. Ti risponderemo non appena possibile!' } }),
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
    ? '\n\nAZIONE COMPLETATA: L\'appuntamento di questo cliente è stato ANNULLATO automaticamente dal sistema. Rispondi SOLO con qualcosa tipo "Ho annullato il tuo appuntamento, sei libero/a." — NON dire che stai inoltrando nulla al responsabile.'
    : '';

  const systemPrompt = [
    `Sei ${business.nome_agente || 'ARIA'}, assistente di "${business.nome}".`,
    business.ai_prompt || '',
    `Tono: ${business.tono || 'professionale'}.`,
    business.servizi ? `Servizi offerti: ${business.servizi}` : '',
    business.prezzi ? `Prezzi (da condividere SOLO se esplicitamente richiesti): ${business.prezzi}` : '',
    business.cose_da_non_fare ? `Non fare mai: ${business.cose_da_non_fare}` : '',
    availabilityContext,
    '',
    'REGOLE FONDAMENTALI:',
    '- Rispondi SEMPRE, a qualsiasi ora del giorno o della notte. Non esistono orari di chiusura per te.',
    '- Presentati con il tuo nome UNA SOLA VOLTA, solo se è il primissimo messaggio della conversazione. MAI ripetere "ciao sono ARIA" o simili nelle risposte successive.',
    isFirstMessage
      ? '- Questo è il PRIMO messaggio: presentati brevemente con nome e chiedi come puoi aiutare.'
      : '- NON presentarti di nuovo, sei già stato presentato. Vai dritto al punto.',
    '- NON menzionare prezzi, costi o tariffe a meno che il cliente non lo chieda esplicitamente.',
    '- GESTIONE APPUNTAMENTI: Se il cliente vuole prenotare:',
    '  1. Chiedi in UN SOLO messaggio: tipo di chiamata (WhatsApp, telefono normale o Zoom), il suo numero/email, e il giorno+orario preferito. Tutto in una volta sola.',
    `  2. Informa che il responsabile è disponibile nei giorni: ${giorniAttivi}, orario ${orarioInizio}–${orarioFine}.`,
    '  3. Se il cliente propone un orario LIBERO in agenda → accettalo SEMPRE senza cambiarlo. NON proporre orari diversi da quello scelto dal cliente.',
    '  4. Se il cliente propone un orario OCCUPATO o fuori orario → digli che quello slot non è disponibile e proponi UNO slot libero specifico.',
    '  5. Non chiedere più volte le stesse cose. Se hai già tutti i dati (tipo, contatto, data, ora) → NON chiedere altro, conferma e basta.',
    '  6. NON DIRE MAI "ho confermato" o "appuntamento confermato" — è l\'admin che lo farà.',
    '- ANNULLAMENTO APPUNTAMENTO: Se il cliente vuole annullare o ha già detto di voler annullare:',
    '  - Di\' SEMPRE e DIRETTAMENTE "Ho annullato il tuo appuntamento" (niente "inoltro la richiesta", niente "l\'amministrazione ti contatterà").',
    '  - Se nella cronologia hai già detto "inoltro la richiesta", quella era un errore: ora di\' semplicemente "Sì, ho annullato — sei libero/a."',
    '  - Non menzionare MAI il responsabile o l\'amministrazione per le cancellazioni.',
    '- Prima di rispondere, capisci cosa vuole il cliente: cosa lo ha spinto a scrivere? Cosa cerca?',
    '',
    '- Risposte brevi, naturali, umane. Massimo 2-3 frasi. Niente elenchi puntati a meno che non servano davvero.',
    '- Non usare frasi robotiche come "come posso assisterti?", "non esitare a contattarci", "sarò felice di aiutarti".',
    '- Parla come una persona reale, non come un bot.',
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

    const processingPromises = [];
    for (const entry of entries) {
      for (const event of (entry.messaging || [])) {
        if (!event.message || event.message.is_echo) continue;
        const senderId = event.sender?.id;
        const text = event.message?.text || '';
        if (!senderId || !text) continue;
        console.log('[webhookMeta] Queuing message from:', senderId);
        processingPromises.push(
          processMessage({ base44, entryId: entry.id, senderId, text })
            .catch(err => console.error('[webhookMeta] Processing error:', err.message))
        );
      }
    }

    Promise.all(processingPromises).catch(() => {});

    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
});