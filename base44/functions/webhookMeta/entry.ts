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
          const connections = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entry.id });
          const conn = connections[0];
          if (!conn?.business_id) continue;

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
        } catch (err) {
          console.error('[webhookMeta] Error processing message:', err.message);
        }
      }
    }

    return Response.json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405 });
});