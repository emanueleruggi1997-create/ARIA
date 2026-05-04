import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const { connector_id } = body;

  if (!connector_id) {
    return Response.json({ error: 'Missing connector_id' }, { status: 400 });
  }

  try {
    const conn = await base44.asServiceRole.entities.MetaConnection.get(connector_id);
    if (!conn) {
      return Response.json({ success: false, error: 'Connection not found' });
    }

    const token = conn.fb_page_token || conn.access_token;
    const accountId = conn.ig_account_id || conn.fb_page_id;

    if (!token || !accountId) {
      return Response.json({ success: false, error: 'Missing token or account ID' });
    }

    // Quick test
    const res = await fetch(`https://graph.instagram.com/v21.0/${accountId}?access_token=${token}`);
    const data = await res.json();

    if (data.error) {
      return Response.json({ success: false, error: data.error.message });
    }

    return Response.json({ 
      success: true, 
      account_name: conn.ig_account_name || data.name || 'Connected'
    });
  } catch (e) {
    return Response.json({ success: false, error: e.message });
  }
});