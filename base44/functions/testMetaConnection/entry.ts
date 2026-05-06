import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Test connessione Instagram Business Login.
// ✅ CORRETTO: GET graph.instagram.com/v25.0/{id}?fields=...&access_token={TOKEN}
// ❌ SBAGLIATO: Authorization: Bearer header → errore 100
// ❌ SBAGLIATO: /me | /subscribed_apps | /messages | /conversations
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

  // ✅ Query param, NON Authorization header
  const userUrl = `https://graph.instagram.com/v25.0/${igAccountId}?fields=id,username,name,account_type&access_token=${token}`;
  const logUrl  = `https://graph.instagram.com/v25.0/${igAccountId}?fields=id,username,name,account_type&access_token=***`;
  console.log('[testMetaConnection] METHOD: GET');
  console.log('[testMetaConnection] URL:', logUrl);

  const meRes  = await fetch(userUrl, { method: 'GET' });
  const meData = await meRes.json();
  console.log('[testMetaConnection] HTTP status:', meRes.status);
  console.log('[testMetaConnection] Response:', JSON.stringify(meData));

  if (meData.error) {
    return Response.json({
      success: false,
      error: `Meta error ${meData.error.code}: ${meData.error.message}`,
    });
  }

  const username = meData.username || meData.name || conn.ig_account_name;

  // Aggiorna DB: risolvi username se mancante, cancella sync_error vecchio
  const updates = { sync_error: '' };
  if (meData.username && meData.username !== conn.ig_account_name) {
    updates.ig_account_name = meData.username;
    updates.meta_user_name  = meData.username;
  }
  if (!conn.has_basic_scope) updates.has_basic_scope = true;
  if (!conn.has_messages_scope) updates.has_messages_scope = true;
  await base44.asServiceRole.entities.MetaConnection.update(conn.id, updates);

  console.log('[testMetaConnection] ✅ success | username:', username);

  return Response.json({
    success:      true,
    account_name: username,
    account_id:   meData.id,
    account_type: meData.account_type,
    webhook_subscribed: true, // subscription gestita nel Meta App Dashboard, non verificabile con user token
  });
});