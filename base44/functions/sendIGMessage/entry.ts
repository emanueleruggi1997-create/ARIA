import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Manual Instagram message sender
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const { contact_id, business_id, message_text } = body;

  if (!contact_id || !business_id || !message_text) {
    return Response.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Security: verify caller owns the business
  const biz = await base44.asServiceRole.entities.Business.get(business_id).catch(() => null);
  if (!biz) return Response.json({ error: 'Business not found' }, { status: 404 });
  const isOwner = biz.created_by_id === user.id || biz.created_by === user.email || biz.created_by === user.id;
  if (!isOwner && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Get contact and connection
    const contact = await base44.asServiceRole.entities.Contact.get(contact_id);
    if (!contact) return Response.json({ error: 'Contact not found' }, { status: 404 });

    const conns = await base44.asServiceRole.entities.MetaConnection.filter({ business_id });
    if (!conns.length) return Response.json({ error: 'No Instagram connection' }, { status: 400 });

    const conn = conns[0];
    const token = conn.access_token || conn.fb_page_token;
    const accountId = conn.ig_account_id || conn.fb_page_id;

    if (!token || !accountId) {
      return Response.json({ error: 'Invalid connection token or account ID' }, { status: 400 });
    }

    // Try to send via Instagram API
    const sendUrl = conn.access_token && conn.ig_account_id
      ? `https://graph.instagram.com/v21.0/${conn.ig_account_id}/messages`
      : `https://graph.facebook.com/v20.0/${conn.fb_page_id}/messages`;

    const headers = conn.access_token && conn.ig_account_id
      ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      : { 'Content-Type': 'application/json' };

    const payload = conn.access_token && conn.ig_account_id
      ? { recipient: { id: contact.numero }, message: { text: message_text } }
      : { recipient: { id: contact.numero }, message: { text: message_text }, access_token: token };

    const res = await fetch(sendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.error) {
      console.error('[sendIGMessage] API error:', JSON.stringify(data.error));
      
      // If token expired, suggest renewal
      if (data.error.code === 190 || data.error.message?.includes('Invalid OAuth')) {
        return Response.json({
          success: false,
          error: 'Token expired — user must reconnect Instagram',
          code: 'TOKEN_EXPIRED',
        }, { status: 401 });
      }

      return Response.json({ success: false, error: data.error.message }, { status: 400 });
    }

    // Save to message history
    await base44.asServiceRole.entities.Message.create({
      business_id,
      contact_id,
      canale: 'instagram',
      ruolo: 'assistant',
      testo: message_text,
      letto: true,
    });

    return Response.json({
      success: true,
      message_id: data.message_id,
      note: 'Message sent and saved to conversation',
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});