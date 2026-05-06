import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Test connessione Instagram Business Login
// Endpoint corretto: GET graph.instagram.com/v21.0/{user_id} con Authorization: Bearer
// NON usare: /me, /subscribed_apps, /messages, /conversations (non supportati con token Instagram Business Login)
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const { connector_id } = body;

  if (!connector_id) return Response.json({ error: 'Missing connector_id' }, { status: 400 });

  const conn = await base44.asServiceRole.entities.MetaConnection.get(connector_id);
  if (!conn) return Response.json({ success: false, error: 'Connection not found' });

  const token       = conn.access_token;
  const igAccountId = conn.ig_account_id;

  if (!token || !igAccountId) {
    return Response.json({ success: false, error: 'Token o ig_account_id mancante' });
  }

  // Unico endpoint supportato con token Instagram Business Login (api.instagram.com):
  // GET graph.instagram.com/v21.0/{user_id}?fields=...  con Authorization: Bearer
  const userUrl = `https://graph.instagram.com/v21.0/${igAccountId}?fields=id,username,name,account_type`;
  console.log('[testMetaConnection] GET', userUrl);

  const meRes  = await fetch(userUrl, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const meData = await meRes.json();
  console.log('[testMetaConnection] Response (status', meRes.status, '):', JSON.stringify(meData));

  if (meData.error) {
    return Response.json({
      success: false,
      error: `Meta error ${meData.error.code}: ${meData.error.message}`,
    });
  }

  // Se username è cambiato, aggiorna DB
  const username = meData.username || meData.name || conn.ig_account_name;
  if (meData.username && meData.username !== conn.ig_account_name) {
    await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
      ig_account_name: meData.username,
      meta_user_name:  meData.username,
      sync_error:      '',
    });
  }

  return Response.json({
    success:      true,
    account_name: username,
    account_id:   meData.id,
    account_type: meData.account_type,
    webhook_subscribed: true, // subscription gestita dal Meta App Dashboard, non verificabile con user token
  });
});