import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const VERIFY_TOKEN = 'emaral2026';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── Webhook verification (GET) ──
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[webhookMeta] Webhook verified');
      return new Response(challenge, { status: 200 });
    }
    console.error('[webhookMeta] Verification failed — token mismatch');
    return new Response('Forbidden', { status: 403 });
  }

  // ── Incoming events (POST) ──
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    console.log('[webhookMeta] Event received:', JSON.stringify(body).slice(0, 500));

    const base44 = createClientFromRequest(req);

    // Process Instagram message events
    const entries = body.entry || [];
    for (const entry of entries) {
      const messaging = entry.messaging || [];
      for (const event of messaging) {
        if (!event.message || event.message.is_echo) continue;

        const senderId  = event.sender?.id;
        const text      = event.message?.text || '';
        const timestamp = event.timestamp;

        if (!senderId || !text) continue;

        console.log('[webhookMeta] IG message from:', senderId, 'text:', text.slice(0, 100));

        // Find the MetaConnection to get business_id
        try {
          // Try by ig_account_id first, fallback to user_id match
          let connections = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entry.id });
          if (!connections.length) {
            connections = await base44.asServiceRole.entities.MetaConnection.filter({ meta_user_id: entry.id });
          }
          const conn = connections[0];
          if (!conn) { console.log('[webhookMeta] No MetaConnection found for entry.id:', entry.id); continue; }

          // Resolve business_id: stored directly or look up via user_id
          let resolvedBusinessId = conn.business_id || '';
          if (!resolvedBusinessId && conn.user_id) {
            const businesses = await base44.asServiceRole.entities.Business.filter({});
            // Find business owned by this user
            const match = businesses.find(b => b.created_by && b.created_by === conn.user_id);
            if (match) {
              resolvedBusinessId = match.id;
              // Patch the connection so future lookups are fast
              await base44.asServiceRole.entities.MetaConnection.update(conn.id, { business_id: resolvedBusinessId });
              console.log('[webhookMeta] Patched business_id on MetaConnection:', resolvedBusinessId);
            }
          }
          if (!resolvedBusinessId) { console.log('[webhookMeta] Could not resolve business_id for conn:', conn.id); continue; }
          conn.business_id = resolvedBusinessId;

          // Find or create contact
          const contacts = await base44.asServiceRole.entities.Contact.filter({
            business_id: conn.business_id,
            numero: senderId,
            canale: 'instagram',
          });

          let contact;
          if (contacts.length > 0) {
            contact = contacts[0];
          } else {
            contact = await base44.asServiceRole.entities.Contact.create({
              business_id: conn.business_id,
              nome: `IG_${senderId}`,
              numero: senderId,
              canale: 'instagram',
              stato: 'lead',
            });
          }

          // Save message
          await base44.asServiceRole.entities.Message.create({
            business_id: conn.business_id,
            contact_id: contact.id,
            canale: 'instagram',
            ruolo: 'user',
            testo: text,
            letto: false,
          });

          console.log('[webhookMeta] Message saved for business:', conn.business_id);

          // Check auto_risposta flag before sending AI reply
          const businesses = await base44.asServiceRole.entities.Business.filter({ id: conn.business_id });
          const business = businesses[0];
          if (!business || business.auto_risposta === false) {
            console.log('[webhookMeta] auto_risposta disabled — skipping AI reply');
            continue;
          }

          // Generate AI reply
          const recentMessages = await base44.asServiceRole.entities.Message.filter(
            { business_id: conn.business_id, contact_id: contact.id },
            '-created_date', 10
          );
          const history = recentMessages.reverse().map(m => ({
            role: m.ruolo === 'assistant' ? 'assistant' : 'user',
            content: m.testo,
          }));

          const systemPrompt = `Sei ${business.nome_agente || 'ARIA'}, assistente AI di ${business.nome}.
${business.ai_prompt || ''}
Tono: ${business.tono || 'professionale'}.
${business.servizi ? `Servizi: ${business.servizi}` : ''}
${business.prezzi ? `Prezzi: ${business.prezzi}` : ''}
${business.cose_da_non_fare ? `Non fare: ${business.cose_da_non_fare}` : ''}
Rispondi in modo breve e naturale.`;

          const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: text,
            model: 'gpt_5_mini',
            response_json_schema: null,
          });

          const aiReply = typeof aiRes === 'string' ? aiRes : aiRes?.text || aiRes?.content || '';
          if (!aiReply) continue;

          // Save AI reply
          await base44.asServiceRole.entities.Message.create({
            business_id: conn.business_id,
            contact_id: contact.id,
            canale: 'instagram',
            ruolo: 'assistant',
            testo: aiReply,
            letto: true,
          });

          // Send reply via Instagram API
          const igToken = conn.access_token;
          const igAccountId = conn.ig_account_id;
          if (igToken && igAccountId) {
            await fetch(`https://graph.instagram.com/v19.0/${igAccountId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${igToken}` },
              body: JSON.stringify({ recipient: { id: senderId }, message: { text: aiReply } }),
            });
            console.log('[webhookMeta] AI reply sent to:', senderId);
          }
        } catch (err) {
          console.error('[webhookMeta] Error processing message:', err.message);
        }
      }
    }

    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
});