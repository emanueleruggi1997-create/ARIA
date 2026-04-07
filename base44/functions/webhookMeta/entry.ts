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

  // Find or create contact
  const contacts = await base44.asServiceRole.entities.Contact.filter({
    business_id: businessId, numero: senderId, canale: 'instagram',
  });
  let contact = contacts[0];
  if (!contact) {
    contact = await base44.asServiceRole.entities.Contact.create({
      business_id: businessId, nome: `IG_${senderId}`,
      numero: senderId, canale: 'instagram', stato: 'lead',
    });
  }

  // Save incoming message
  await base44.asServiceRole.entities.Message.create({
    business_id: businessId, contact_id: contact.id,
    canale: 'instagram', ruolo: 'user', testo: text, letto: false,
  });
  console.log('[webhookMeta] Message saved for business:', businessId);

  // Get business config
  const business = await base44.asServiceRole.entities.Business.get(businessId);
  console.log('[webhookMeta] Business:', business?.nome, '| auto_risposta:', business?.auto_risposta);
  if (!business || business.auto_risposta === false) {
    console.log('[webhookMeta] auto_risposta disabled — skipping AI reply');
    return;
  }

  // Build prompt with history
  const recentMessages = await base44.asServiceRole.entities.Message.filter(
    { business_id: businessId, contact_id: contact.id }, '-created_date', 10
  );
  const historyText = recentMessages.reverse()
    .map(m => `${m.ruolo === 'assistant' ? 'ARIA' : 'Cliente'}: ${m.testo}`)
    .join('\n');

  const systemPrompt = `Sei ${business.nome_agente || 'ARIA'}, assistente AI di "${business.nome}".
${business.ai_prompt || ''}
Tono: ${business.tono || 'professionale'}.
${business.servizi ? `Servizi: ${business.servizi}` : ''}
${business.prezzi ? `Prezzi: ${business.prezzi}` : ''}
${business.cose_da_non_fare ? `Non fare mai: ${business.cose_da_non_fare}` : ''}
Rispondi in modo breve e naturale in italiano. Massimo 2-3 frasi.`;

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

  // ── GET: Webhook verification ──
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

  // ── POST: Incoming events ──
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    console.log('[webhookMeta] Event received:', JSON.stringify(body).slice(0, 400));

    const base44 = createClientFromRequest(req);
    const entries = body.entry || [];

    // Risposta immediata a Meta (< 20s requirement) — processa in background
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

    // Avvia il processing in background senza aspettare
    Promise.all(processingPromises).catch(() => {});

    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
});