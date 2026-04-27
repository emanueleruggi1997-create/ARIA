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
  console.log(`[webhookWA] Orari: ${business.orario_inizio}–${business.orario_fine} | ora Roma: ${romeHour}:${String(romeMinute).padStart(2,'0')} | currentMin=${currentMinutes} startMin=${startMinutes} endMin=${endMinutes} | is24h=${is24h} withinHours=${withinHours} fuori_orario_attivo=${business.fuori_orario_attivo}`);

  if (!withinHours && business.fuori_orario_attivo) {
    console.log('[webhookWA] Outside operating hours, sending out-of-hours message');
    await sendWhatsAppMessage(phoneNumberId, fromNumber, business.messaggio_fuori_orario || 'Siamo fuori orario. Ti risponderemo non appena possibile!');
    return;
  }

  // Fetch recent messages for context
  const recentMessages = await base44.asServiceRole.entities.Message.filter(
    { business_id: businessId, contact_id: contact.id },
    '-created_date',
    10
  );
  const historyText = recentMessages.reverse()
    .map(m => `${m.ruolo === 'assistant' ? 'ARIA' : 'Cliente'}: ${m.testo}`)
    .join('\n');

  const isFirstMessage = recentMessages.filter(m => m.ruolo === 'assistant').length === 0;
  const agentName = business.nome_agente || 'ARIA';

  // Detect language
  const allTexts = recentMessages
    .filter(m => m.ruolo === 'user')
    .map(m => m.testo)
    .concat([text])
    .slice(-3)
    .join(' ');

  const clientLangDetect = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Detect the language of this text and reply with ONLY the language name in English (e.g. "Italian", "English", "Spanish"). Text: "${allTexts.slice(0, 300)}"`,
    model: 'gpt_5_mini',
  });
  const detectedLang = (typeof clientLangDetect === 'string' ? clientLangDetect : clientLangDetect?.text || '').trim().split('\n')[0];

  const systemPrompt = `Sei ${agentName}, assistente di "${business.nome}".
${business.ai_prompt ? business.ai_prompt + '\n' : ''}
LINGUA: Rileva in che lingua sta scrivendo il cliente e rispondi SEMPRE nella sua stessa lingua.

CONTESTO BUSINESS:
${business.servizi ? `- Servizi: ${business.servizi}` : ''}
${business.prezzi ? `- Prezzi: ${business.prezzi}` : ''}
${business.cose_da_non_fare ? `- Non fare mai: ${business.cose_da_non_fare}` : ''}

COME SEI:
- Sei una persona reale che chatta, non un bot.
- Parli in modo naturale, caldo, diretto. Come un amico esperto.
- Risposte brevi: 1-3 frasi al massimo.
- Non usi mai frasi come "come posso assisterti?", "non esitare a contattarci".
${isFirstMessage ? `- È il PRIMO messaggio: presentati brevemente con il tuo nome e sii accogliente. Una frase, non un paragrafo.` : `- Non ripresentarti, la conversazione è già iniziata.`}

COSA NON FAI MAI:
- Non spingi a vendere, non usi call-to-action aggressivi.
- Non menzioni prezzi se il cliente non li ha chiesti.
- Se qualcuno vuole solo fare due chiacchiere, stai al gioco.
- Se il cliente dice "no grazie", "no", "non mi interessa" → rispondi con qualcosa di cordiale e brevissimo tipo "Ok, figurati! 😊" o "Nessun problema, sono qui se cambii idea." Fine.`;

  const langLine = detectedLang ? `\n\nCRITICAL: You MUST reply in ${detectedLang} ONLY.` : '';
  const fullPrompt = `${systemPrompt}${langLine}\n\nStorico conversazione:\n${historyText}\n\nCliente: ${text}\n${agentName}:`;

  const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: fullPrompt,
    model: 'gpt_5_mini',
  });
  const aiReply = typeof aiRes === 'string' ? aiRes : aiRes?.text || '';
  if (!aiReply) {
    console.error('[webhookWA] Empty AI reply');
    return;
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