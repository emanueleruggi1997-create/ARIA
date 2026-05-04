import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Semplice webhook che riceve e salva messaggi da Instagram/Facebook
Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === 'emaral2026') {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json().catch(() => ({}));
  const base44 = createClientFromRequest(req);

  for (const entry of (body.entry || [])) {
    for (const event of (entry.messaging || [])) {
      if (event.read || event.delivery || event.message?.is_echo) continue;
      const senderId = event.sender?.id;
      const text = event.message?.text || '';
      if (!senderId || !text) continue;

      (async () => {
        try {
          let conns = await base44.asServiceRole.entities.MetaConnection.filter({ fb_page_id: entry.id });
          if (!conns.length) conns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entry.id });
          if (!conns.length) return;

          const conn = conns[0];
          let businessId = conn.business_id;
          if (!businessId && conn.user_id) {
            const bizList = await base44.asServiceRole.entities.Business.filter({});
            businessId = bizList.find(b => b.created_by === conn.user_id)?.id;
            if (businessId) await base44.asServiceRole.entities.MetaConnection.update(conn.id, { business_id: businessId });
          }
          if (!businessId) return;

          let contacts = await base44.asServiceRole.entities.Contact.filter({ business_id: businessId, numero: senderId, canale: 'instagram' });
          let contact = contacts[0];
          if (!contact) {
            contact = await base44.asServiceRole.entities.Contact.create({ business_id: businessId, nome: `User_${senderId}`, numero: senderId, canale: 'instagram', stato: 'lead' });
          }

          await base44.asServiceRole.entities.Message.create({ business_id: businessId, contact_id: contact.id, canale: 'instagram', ruolo: 'user', testo: text, letto: false });

          const leads = await base44.asServiceRole.entities.Lead.filter({ business_id: businessId, contact_id: contact.id });
          if (!leads.length) {
            await base44.asServiceRole.entities.Lead.create({ business_id: businessId, contact_id: contact.id, contact_nome: contact.nome, canale: 'instagram', stato: 'nuovo' });
          }
          console.log('[webhookMetaReceive] ✅ Message saved:', contact.nome);
        } catch (e) {
          console.error('[webhookMetaReceive] Error:', e.message);
        }
      })();
    }
  }

  return Response.json({ ok: true });
});