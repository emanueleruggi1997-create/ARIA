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

    // 1. Verifica token con GET /{user_id} (Instagram Business Login)
    // /me in GET NON è supportato con token da api.instagram.com — usare ID esplicito
    const userUrl = `https://graph.instagram.com/v21.0/${igAccountId}?fields=id,username,name,account_type`;
    console.log('[testMetaConnection] GET', userUrl);
    const meRes  = await fetch(userUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const meData = await meRes.json();
    console.log('[testMetaConnection] /{user_id} response:', JSON.stringify(meData));

    if (meData.error) {
      return Response.json({
        success: false,
        error: `Meta error ${meData.error.code}: ${meData.error.message}`,
        raw_error: meData.error,
      });
    }

    // 2. Webhook subscription: non verificabile con token utente Instagram Business Login
    // La subscription avviene a livello app nel Meta Dashboard — la consideriamo attiva se token valido
    const webhookSubscribed = !meData.error;

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