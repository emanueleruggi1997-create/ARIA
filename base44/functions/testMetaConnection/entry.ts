import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Test connessione Instagram Business Login
// Usa SOLO endpoint supportati: Authorization: Bearer, GET /me, GET /subscribed_apps
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const { connector_id } = body;

  if (!connector_id) return Response.json({ error: 'Missing connector_id' }, { status: 400 });

  try {
    const conn = await base44.asServiceRole.entities.MetaConnection.get(connector_id);
    if (!conn) return Response.json({ success: false, error: 'Connection not found' });

    const token       = conn.access_token;
    const igAccountId = conn.ig_account_id;

    if (!token || !igAccountId) {
      return Response.json({ success: false, error: 'Token o ig_account_id mancante' });
    }

    // 1. Verifica token con GET /me (Instagram Business Login)
    // NON usare ?access_token= — usare sempre Authorization: Bearer
    const meUrl = 'https://graph.instagram.com/v21.0/me?fields=id,username,name,account_type';
    console.log('[testMetaConnection] GET', meUrl);
    const meRes  = await fetch(meUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const meData = await meRes.json();
    console.log('[testMetaConnection] /me response:', JSON.stringify(meData));

    if (meData.error) {
      return Response.json({
        success: false,
        error: `Meta error ${meData.error.code}: ${meData.error.message}`,
        raw_error: meData.error,
      });
    }

    // 2. Verifica webhook subscription con GET /subscribed_apps
    // Authorization: Bearer — NON usare ?access_token=
    let webhookSubscribed = false;
    const subUrl = `https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps`;
    console.log('[testMetaConnection] GET', subUrl);
    try {
      const subRes  = await fetch(subUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const subData = await subRes.json();
      console.log('[testMetaConnection] /subscribed_apps response:', JSON.stringify(subData));
      webhookSubscribed = !!(subData.data && subData.data.length > 0);
    } catch (e) {
      console.warn('[testMetaConnection] subscribed_apps check fallito:', e.message);
    }

    return Response.json({
      success: true,
      account_name: meData.username || meData.name || conn.ig_account_name || 'Connected',
      account_id:   meData.id,
      account_type: meData.account_type,
      webhook_subscribed: webhookSubscribed,
    });

  } catch (e) {
    return Response.json({ success: false, error: e.message });
  }
});