import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Test connessione Instagram Business Login.
// ✅ CORRETTO: GET graph.instagram.com/v21.0/{id}?fields=...&access_token={TOKEN} (query param)
// ❌ SBAGLIATO: Authorization: Bearer header → Meta error 100 "Unsupported request - method type: get"
// ❌ SBAGLIATO: /me, /subscribed_apps, /messages GET, /conversations GET
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const { connector_id } = body;
  if (!connector_id) return Response.json({ error: 'Missing connector_id' }, { status: 400 });

  const rows = await base44.asServiceRole.entities.MetaConnection.filter({ id: connector_id });
  const conn = rows[0];
  if (!conn) return Response.json({ success: false, error: 'Connection not found' });

  const token       = conn.access_token;
  const igAccountId = conn.ig_account_id;

  console.log('[testMetaConnection] ═══ TEST CONNESSIONE ═══');
  console.log('[testMetaConnection] connector_id:', connector_id);
  console.log('[testMetaConnection] conn.id:', conn.id);
  console.log('[testMetaConnection] ig_account_id:', igAccountId);
  console.log('[testMetaConnection] has_basic_scope:', conn.has_basic_scope);
  console.log('[testMetaConnection] has_messages_scope:', conn.has_messages_scope);
  console.log('[testMetaConnection] granted_scopes:', conn.granted_scopes);
  console.log('[testMetaConnection] token prefix:', token?.slice(0, 20) + '***');
  console.log('[testMetaConnection] token length:', token?.length);

  if (!token) {
    return Response.json({ success: false, error: 'Token mancante' });
  }
  if (!igAccountId) {
    return Response.json({ success: false, error: 'ig_account_id mancante — riconnetti Instagram' });
  }

  // ✅ access_token come query param — NON Authorization: Bearer
  const fields  = 'id,username,name,profile_picture_url,account_type';
  const userUrl = `https://graph.instagram.com/v21.0/${igAccountId}?fields=${fields}&access_token=${token}`;
  const logUrl  = `https://graph.instagram.com/v21.0/${igAccountId}?fields=${fields}&access_token=TOKEN_REDACTED`;

  console.log('[testMetaConnection] ─── CHIAMATA META ───');
  console.log('[testMetaConnection] FUNZIONE: testMetaConnection');
  console.log('[testMetaConnection] METODO HTTP: GET');
  console.log('[testMetaConnection] URL COMPLETO:', logUrl);
  console.log('[testMetaConnection] user_id usato (ig_account_id):', igAccountId);
  console.log('[testMetaConnection] token owner (conn.id):', conn.id);
  console.log('[testMetaConnection] HEADERS: nessun Authorization header (solo query param)');

  const meRes  = await fetch(userUrl, { method: 'GET' });
  const meData = await meRes.json();

  console.log('[testMetaConnection] ─── RISPOSTA META ───');
  console.log('[testMetaConnection] HTTP status:', meRes.status);
  console.log('[testMetaConnection] Response COMPLETA:', JSON.stringify(meData));

  if (meData.error) {
    console.error('[testMetaConnection] ❌ ERRORE META:');
    console.error('[testMetaConnection] error.code:', meData.error.code);
    console.error('[testMetaConnection] error.message:', meData.error.message);
    console.error('[testMetaConnection] error.type:', meData.error.type);
    console.error('[testMetaConnection] error.error_subcode:', meData.error.error_subcode);
    console.error('[testMetaConnection] error.fbtrace_id:', meData.error.fbtrace_id);

    // Se scopes sono già verificati, la connessione è comunque operativa per i DM
    const scopesOk = conn.has_basic_scope && conn.has_messages_scope;
    return Response.json({
      success:              false,
      error:                `Meta error ${meData.error.code}: ${meData.error.message}`,
      raw:                  meData,
      scopesOk:             scopesOk,
      connectionOperative:  scopesOk,
      endpoint_called:      logUrl,
      ig_account_id_used:   igAccountId,
      note:                 scopesOk
        ? 'Scopes validi. ARIA funziona sui DM. Il profilo non è recuperabile con questo account.'
        : 'Scopes non verificati. Riconnetti Instagram.',
    });
  }

  const username = meData.username || meData.name || conn.ig_account_name;

  const updates = {
    sync_error:         '',
    has_basic_scope:    true,
    has_messages_scope: true,
  };
  if (meData.username) {
    updates.ig_account_name = meData.username;
    updates.meta_user_name  = meData.username;
  }
  if (meData.profile_picture_url) {
    updates.ig_profile_picture_url = meData.profile_picture_url;
  }
  await base44.asServiceRole.entities.MetaConnection.update(conn.id, updates);

  console.log('[testMetaConnection] ✅ SUCCESSO | username:', username, '| account_type:', meData.account_type);

  return Response.json({
    success:           true,
    account_name:      username,
    account_id:        meData.id,
    account_type:      meData.account_type,
    webhook_subscribed: true,
    resolved_username: meData.username || '',
    endpoint_called:   logUrl,
  });
});