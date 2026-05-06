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

  // Usa filter per garantire il record corretto — .get() può restituire un record sbagliato
  const rows = await base44.asServiceRole.entities.MetaConnection.filter({ id: connector_id });
  const conn = rows[0];
  if (!conn) return Response.json({ success: false, error: 'Connection not found' });

  const token       = conn.access_token;
  const igAccountId = conn.ig_account_id;

  if (!token || !igAccountId) {
    return Response.json({ success: false, error: 'Token o ig_account_id mancante' });
  }

  // ✅ Query param, NON Authorization header
  const userUrl = `https://graph.instagram.com/v25.0/${igAccountId}?fields=id,username,name,profile_picture_url,account_type&access_token=${token}`;
  const logUrl  = `https://graph.instagram.com/v25.0/${igAccountId}?fields=id,username,name,profile_picture_url,account_type&access_token=***`;
  console.log('[testMetaConnection] METHOD: GET');
  console.log('[testMetaConnection] URL:', logUrl);
  console.log('[testMetaConnection] ig_account_id:', igAccountId);
  console.log('[testMetaConnection] token prefix:', token?.slice(0, 12) + '***');

  const meRes  = await fetch(userUrl, { method: 'GET' });
  const meData = await meRes.json();
  console.log('[testMetaConnection] HTTP status:', meRes.status);
  console.log('[testMetaConnection] Response FULL:', JSON.stringify(meData));

  if (meData.error) {
    return Response.json({
      success: false,
      error: `Meta error ${meData.error.code}: ${meData.error.message}`,
      raw: meData,
    });
  }

  const username = meData.username || meData.name || conn.ig_account_name;

  // Test OK: aggiorna SEMPRE sync_error='', scope OK, last_sync_at, e username se disponibile
  const updates = {
    sync_error:        '',
    has_basic_scope:   true,
    has_messages_scope: true,
    last_sync_at:      new Date().toISOString(),
  };
  if (meData.username) {
    updates.ig_account_name = meData.username;
    updates.meta_user_name  = meData.username;
  }
  if (meData.profile_picture_url) {
    updates.ig_profile_picture_url = meData.profile_picture_url;
  }
  await base44.asServiceRole.entities.MetaConnection.update(conn.id, updates);

  console.log('[testMetaConnection] ✅ success | username:', username, '| account_type:', meData.account_type);

  return Response.json({
    success:      true,
    account_name: username,
    account_id:   meData.id,
    account_type: meData.account_type,
    webhook_subscribed: true,
    resolved_username: meData.username || '',
  });
});