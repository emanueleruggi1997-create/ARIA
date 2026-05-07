import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * testMetaConnection — verifica reale della connessione Meta/Instagram Business Login.
 *
 * Esegue chiamate API REALI a Meta e restituisce risultato veritiero.
 * Non afferma MAI che la connessione è operativa senza prova API concreta.
 *
 * Endpoint corretto Instagram Business Login:
 *   GET https://graph.instagram.com/v21.0/{ig_account_id}?fields=...&access_token={TOKEN}
 *   ❌ NON: Authorization: Bearer header → error 100
 *   ❌ NON: graph.facebook.com (richiede diversi token)
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const { connector_id } = body;
  if (!connector_id) return Response.json({ error: 'Missing connector_id' }, { status: 400 });

  let rows = [];
  try {
    rows = await base44.asServiceRole.entities.MetaConnection.filter({ id: connector_id });
  } catch (e) {
    console.error('[testMetaConnection] DB error:', e.message);
  }
  const conn = rows[0];
  if (!conn) return Response.json({ success: false, error: `Connection not found for id: ${connector_id}` }, { status: 404 });

  const token       = conn.access_token;
  const igAccountId = conn.ig_account_id;

  console.log('[testMetaConnection] ═══════════════════════════════');
  console.log('[testMetaConnection] connector_id:', connector_id);
  console.log('[testMetaConnection] ig_account_id:', igAccountId);
  console.log('[testMetaConnection] has_basic_scope (in DB):', conn.has_basic_scope);
  console.log('[testMetaConnection] has_messages_scope (in DB):', conn.has_messages_scope);
  console.log('[testMetaConnection] granted_scopes (in DB):', conn.granted_scopes);
  console.log('[testMetaConnection] token prefix:', token?.slice(0, 20) + '***');

  if (!token) return Response.json({ success: false, error: 'Token mancante — riconnetti Instagram' });
  if (!igAccountId) return Response.json({ success: false, error: 'ig_account_id mancante — riconnetti Instagram' });

  const results = {};

  // ── TEST 1: GET /me (Instagram Business Login — access_token as query param) ──
  // Endpoint ufficiale per Instagram Business Login token:
  //   https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user
  const fields = 'id,username,name,profile_picture_url,account_type,followers_count';
  const apiUrl = `https://graph.instagram.com/v21.0/${igAccountId}?fields=${fields}&access_token=${token}`;
  const logUrl = `https://graph.instagram.com/v21.0/${igAccountId}?fields=${fields}&access_token=***REDACTED***`;

  console.log('[testMetaConnection] ─── TEST 1: Profilo account ───');
  console.log('[testMetaConnection] METHOD: GET');
  console.log('[testMetaConnection] URL:', logUrl);
  console.log('[testMetaConnection] NOTE: access_token come query param, NESSUN header Authorization');

  const r1 = await fetch(apiUrl, { method: 'GET' });
  const d1 = await r1.json();

  console.log('[testMetaConnection] HTTP status:', r1.status);
  console.log('[testMetaConnection] Response:', JSON.stringify(d1));

  results.profile = {
    endpoint: logUrl,
    method: 'GET',
    http_status: r1.status,
    success: !d1.error && !!d1.id,
    data: d1.error ? null : { id: d1.id, username: d1.username, name: d1.name, account_type: d1.account_type },
    error: d1.error ? {
      code: d1.error.code,
      message: d1.error.message,
      type: d1.error.type,
      subcode: d1.error.error_subcode,
      fbtrace_id: d1.error.fbtrace_id,
    } : null,
  };

  // ── TEST 2: Verifica token debug (per vedere scopes REALI approvati da Meta) ──
  // https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
  const appId     = Deno.env.get('META_APP_ID') || '';
  const appSecret = Deno.env.get('META_APP_SECRET') || '';
  let tokenDebugResult = null;

  if (appId && appSecret) {
    const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`;
    const logDebugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=***TOKEN***&access_token=${appId}|***SECRET***`;

    console.log('[testMetaConnection] ─── TEST 2: Token debug (scopes reali) ───');
    console.log('[testMetaConnection] METHOD: GET');
    console.log('[testMetaConnection] URL:', logDebugUrl);

    const r2 = await fetch(debugUrl, { method: 'GET' });
    const d2 = await r2.json();

    console.log('[testMetaConnection] HTTP status:', r2.status);
    console.log('[testMetaConnection] Response:', JSON.stringify(d2).slice(0, 1000));

    const debugData = d2.data || {};
    tokenDebugResult = {
      endpoint: logDebugUrl,
      method: 'GET',
      http_status: r2.status,
      success: !d2.error && !!debugData.app_id,
      is_valid: debugData.is_valid === true,
      scopes: debugData.scopes || [],
      expires_at: debugData.expires_at,
      app_id: debugData.app_id,
      error: d2.error ? {
        code: d2.error.code,
        message: d2.error.message,
        fbtrace_id: d2.error.fbtrace_id,
      } : null,
    };

    console.log('[testMetaConnection] Token valid:', tokenDebugResult.is_valid);
    console.log('[testMetaConnection] Real scopes from Meta:', JSON.stringify(tokenDebugResult.scopes));
  } else {
    console.log('[testMetaConnection] TEST 2: Skipped — META_APP_ID/META_APP_SECRET non configurati');
    tokenDebugResult = { skipped: true, reason: 'META_APP_ID o META_APP_SECRET non configurati' };
  }

  results.token_debug = tokenDebugResult;

  // ── AGGIORNA DB se test profilo ok ──
  if (results.profile.success) {
    const updates = { sync_error: '', has_basic_scope: true, has_messages_scope: true };
    if (d1.username) { updates.ig_account_name = d1.username; updates.meta_user_name = d1.username; }
    if (d1.profile_picture_url) updates.ig_profile_picture_url = d1.profile_picture_url;
    await base44.asServiceRole.entities.MetaConnection.update(conn.id, updates).catch(() => {});
    console.log('[testMetaConnection] ✅ Profilo OK — DB aggiornato');
  } else if (d1.error) {
    // Salva l'errore reale nel DB — non simulare che va tutto bene
    await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
      sync_error: `API error ${d1.error.code}: ${d1.error.message}`,
    }).catch(() => {});
    console.log('[testMetaConnection] ❌ Profilo FALLITO — error salvato in DB');
  }

  // ── RISPOSTA FINALE ──
  const profileOk = results.profile.success;
  const tokenDebugOk = tokenDebugResult?.is_valid === true;
  const realScopesFromMeta = tokenDebugResult?.scopes || [];
  const hasBasicReal = realScopesFromMeta.includes('instagram_business_basic');
  const hasMsgReal   = realScopesFromMeta.includes('instagram_business_manage_messages');

  console.log('[testMetaConnection] ═══ RIEPILOGO ═══');
  console.log('[testMetaConnection] Profile API OK:', profileOk);
  console.log('[testMetaConnection] Token debug OK:', tokenDebugOk);
  console.log('[testMetaConnection] Scopes reali da Meta:', realScopesFromMeta);
  console.log('[testMetaConnection] instagram_business_basic (REALE):', hasBasicReal);
  console.log('[testMetaConnection] instagram_business_manage_messages (REALE):', hasMsgReal);

  return Response.json({
    success:           profileOk,
    // Profilo
    account_name:      d1.username || d1.name || null,
    account_id:        d1.id || igAccountId,
    account_type:      d1.account_type || null,
    resolved_username: d1.username || null,
    // Token debug
    token_valid:       tokenDebugOk,
    real_scopes:       realScopesFromMeta,
    instagram_business_basic_approved:          hasBasicReal,
    instagram_business_manage_messages_approved: hasMsgReal,
    // Raw results per diagnostica
    results,
    // Stato veritiero — NON connectionOperative se l'API fallisce
    api_call_succeeded: profileOk,
    endpoint_called: results.profile.endpoint,
  });
});