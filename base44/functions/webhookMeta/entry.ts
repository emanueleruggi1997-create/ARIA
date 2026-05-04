import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = 'emaral2026';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Webhook verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[webhookMeta] Webhook verified ✅');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json().catch(() => ({}));
  const base44 = createClientFromRequest(req);
  const entries = body.entry || [];

  console.log('[webhookMeta] POST received | Entries:', entries.length);

  for (const entry of entries) {
    // Process DMs
    for (const event of (entry.messaging || [])) {
      if (event.read || event.delivery || event.message?.is_echo) continue;
      
      const senderId = event.sender?.id;
      const text = event.message?.text || event.postback?.title || '';
      if (!senderId || !text) continue;

      (async () => {
        try {
          // Find connection
          let conns = await base44.asServiceRole.entities.MetaConnection.filter({ fb_page_id: entry.id });
          if (!conns.length) conns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entry.id });
          if (!conns.length) {
            console.log('[webhookMeta] No connection for entry:', entry.id);
            return;
          }

          const conn = conns[0];
          let businessId = conn.business_id;

          // Resolve business_id
          if (!businessId && conn.user_id) {
            const bizList = await base44.asServiceRole.entities.Business.filter({});
            const biz = bizList.find(b => b.created_by === conn.user_id);
            if (biz) {
              businessId = biz.id;
              await base44.asServiceRole.entities.MetaConnection.update(conn.id, { business_id: businessId });
            }
          }
          if (!businessId) return;

          // Get or create contact
          let contacts = await base44.asServiceRole.entities.Contact.filter({ business_id: businessId, numero: senderId, canale: 'instagram' });
          let contact = contacts[0];
          if (!contact) {
            contact = await base44.asServiceRole.entities.Contact.create({
              business_id: businessId,
              nome: `User_${senderId}`,
              numero: senderId,
              canale: 'instagram',
              stato: 'lead',
            });
          }

          // Save message
          await base44.asServiceRole.entities.Message.create({
            business_id: businessId,
            contact_id: contact.id,
            canale: 'instagram',
            ruolo: 'user',
            testo: text,
            letto: false,
          });

          // Create lead if new
          const leads = await base44.asServiceRole.entities.Lead.filter({ business_id: businessId, contact_id: contact.id });
          if (!leads.length) {
            await base44.asServiceRole.entities.Lead.create({
              business_id: businessId,
              contact_id: contact.id,
              contact_nome: contact.nome,
              canale: 'instagram',
              stato: 'nuovo',
            });
          }

          console.log('[webhookMeta] ✅ Message saved | Contact:', contact.nome);
        } catch (e) {
          console.error('[webhookMeta] Error:', e.message);
        }
      })();
    }

    // Process comments
    for (const change of (entry.changes || [])) {
      if (change.field !== 'comments') continue;
      const val = change.value || {};
      if (val.parent_id || val.from?.id === entry.id) continue;

      const text = val.text || '';
      const senderId = val.from?.id || '';
      const senderName = val.from?.name || senderId;
      if (!text) continue;

      (async () => {
        try {
          let conns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entry.id });
          const conn = conns[0];
          if (!conn) return;

          let businessId = conn.business_id;
          if (!businessId && conn.user_id) {
            const bizList = await base44.asServiceRole.entities.Business.filter({});
            const biz = bizList.find(b => b.created_by === conn.user_id);
            if (biz) businessId = biz.id;
          }
          if (!businessId) return;

          let contacts = await base44.asServiceRole.entities.Contact.filter({ business_id: businessId, numero: senderId, canale: 'instagram' });
          let contact = contacts[0];
          if (!contact) {
            contact = await base44.asServiceRole.entities.Contact.create({
              business_id: businessId,
              nome: senderName,
              numero: senderId,
              canale: 'instagram',
              stato: 'lead',
            });
          }

          await base44.asServiceRole.entities.Message.create({
            business_id: businessId,
            contact_id: contact.id,
            canale: 'instagram',
            ruolo: 'user',
            testo: text,
            letto: false,
            tipo: 'commento',
          });

          console.log('[webhookMeta] ✅ Comment saved | Contact:', senderName);
        } catch (e) {
          console.error('[webhookMeta] Comment error:', e.message);
        }
      })();
    }
  }

  return Response.json({ ok: true });
});