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
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json().catch(() => ({}));
  const base44 = createClientFromRequest(req);

  const entries = body.entry || [];

  for (const entry of entries) {
    // Process DMs
    for (const event of (entry.messaging || [])) {
      if (event.read || event.delivery || event.message?.is_echo) continue;
      
      const senderId = event.sender?.id;
      const text = event.message?.text || event.postback?.title || '';
      if (!senderId || !text) continue;

      try {
        // Find connection by page ID or account ID
        let conns = await base44.asServiceRole.entities.MetaConnection.filter({ fb_page_id: entry.id });
        if (!conns.length) {
          conns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entry.id });
        }
        if (!conns.length) {
          console.log('[webhookMetaSimple] No connection found for entry:', entry.id);
          continue;
        }

        const conn = conns[0];
        let businessId = conn.business_id;

        // Resolve business_id if missing
        if (!businessId && conn.user_id) {
          const biz = await base44.asServiceRole.entities.Business.filter({});
          const match = biz.find(b => b.created_by === conn.user_id);
          if (match) {
            businessId = match.id;
            await base44.asServiceRole.entities.MetaConnection.update(conn.id, { business_id: businessId });
          }
        }

        if (!businessId) {
          console.log('[webhookMetaSimple] Could not resolve business_id for:', conn.id);
          continue;
        }

        // Get or create contact
        let contacts = await base44.asServiceRole.entities.Contact.filter({
          business_id: businessId,
          numero: senderId,
          canale: 'instagram',
        });

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

        // Save message to inbox
        await base44.asServiceRole.entities.Message.create({
          business_id: businessId,
          contact_id: contact.id,
          canale: 'instagram',
          ruolo: 'user',
          testo: text,
          letto: false,
        });

        // Create lead if new
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
            note_ai: `Primo messaggio: "${text.slice(0, 100)}"`,
          });
        }

        console.log('[webhookMetaSimple] ✅ Saved message from', contact.nome, 'in business:', businessId);
      } catch (e) {
        console.error('[webhookMetaSimple] Error processing message:', e.message);
      }
    }

    // Process comments (simplified)
    for (const change of (entry.changes || [])) {
      if (change.field !== 'comments') continue;
      const val = change.value || {};
      if (val.parent_id || val.from?.id === entry.id) continue;

      const text = val.text || '';
      const senderId = val.from?.id || '';
      const senderName = val.from?.name || senderId;
      if (!text) continue;

      try {
        let conns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entry.id });
        const conn = conns[0];
        if (!conn) continue;

        let businessId = conn.business_id;
        if (!businessId && conn.user_id) {
          const biz = await base44.asServiceRole.entities.Business.filter({});
          const match = biz.find(b => b.created_by === conn.user_id);
          if (match) businessId = match.id;
        }
        if (!businessId) continue;

        let contacts = await base44.asServiceRole.entities.Contact.filter({
          business_id: businessId,
          numero: senderId,
          canale: 'instagram',
        });

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

        console.log('[webhookMetaSimple] ✅ Saved comment from', senderName, 'in business:', businessId);
      } catch (e) {
        console.error('[webhookMetaSimple] Error processing comment:', e.message);
      }
    }
  }

  return Response.json({ ok: true });
});