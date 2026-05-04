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
      return Response.json({ error: 'Connection not found' }, { status: 404 });
    }

    const token = conn.fb_page_token || conn.access_token;
    const accountId = conn.ig_account_id || conn.fb_page_id || conn.meta_user_id;

    if (!token || !accountId) {
      return Response.json({ 
        success: false, 
        error: 'Missing token or account ID' 
      }, { status: 400 });
    }

    // Test token
    const meRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,name,username&access_token=${token}`
    );
    const meData = await meRes.json();

    if (meData.error) {
      return Response.json({
        success: false,
        error: meData.error.message || 'Token invalid'
      });
    }

    // Test webhook
    const subRes = await fetch(
      `https://graph.instagram.com/v21.0/${accountId}/subscribed_apps?access_token=${token}`
    );
    const subData = await subRes.json();
    const isSubscribed = subData.data?.length > 0;

    return Response.json({
      success: true,
      token_valid: true,
      account_name: meData.username || meData.name,
      webhook_subscribed: isSubscribed,
    });
  } catch (e) {
    return Response.json({ 
      success: false, 
      error: e.message 
    }, { status: 500 });
  }
});