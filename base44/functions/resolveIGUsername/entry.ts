import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Recupera username Instagram.
// ENDPOINT CORRETTO: GET graph.instagram.com/v21.0/{id}?fields=...&access_token={TOKEN}
// ❌ NON usare: Authorization: Bearer header → errore 100
// ❌ NON usare: /me, /subscribed_apps, /messages GET, /conversations GET
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Trova connessione
  let conns = [];
  const allBiz = await base44.asServiceRole.entities.Business.filter({});
  const myBusiness = allBiz.find(b => b.created_by === user.email || b.created_by === user.id);
  if (myBusiness) {
    conns = await base44.asServiceRole.entities.MetaConnection.filter({ business_id: myBusiness.id });
  }
  if (!conns.length) {
    conns = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: user.id });
  }

  console.log('[resolveIGUsername] ═══ AVVIO RECUPERO USERNAME ═══');
  console.log('[resolveIGUsername] user.id:', user.id, '| user.email:', user.email);
  console.log('[resolveIGUsername] business:', myBusiness?.id, '| conns trovati:', conns.length);

  if (!conns.length) return Response.json({ error: 'Nessuna connessione trovata' }, { status: 404 });

  const conn = conns[0];
  console.log('[resolveIGUsername] conn.id:', conn.id, '| conn.ig_account_id:', conn.ig_account_id);
  console.log('[resolveIGUsername] conn.has_basic_scope:', conn.has_basic_scope, '| conn.has_messages_scope:', conn.has_messages_scope);
  console.log('[resolveIGUsername] token prefix:', conn.access_token?.slice(0, 16) + '***');

  if (!conn.access_token) return Response.json({ error: 'Token mancante' }, { status: 400 });
  if (!conn.ig_account_id) return Response.json({ error: 'ig_account_id mancante — riconnetti Instagram' }, { status: 400 });

  // ✅ UNICA chiamata corretta: access_token come query param, NON Authorization header
  // L'endpoint /me NON funziona con Instagram Business Login token (errore 100 method:get)
  const fields = 'id,username,name,profile_picture_url,account_type';
  const userUrl = `https://graph.instagram.com/v21.0/${conn.ig_account_id}?fields=${fields}&access_token=${conn.access_token}`;
  const logUrl  = `https://graph.instagram.com/v21.0/${conn.ig_account_id}?fields=${fields}&access_token=TOKEN_REDACTED`;

  console.log('[resolveIGUsername] ─── CHIAMATA META ───');
  console.log('[resolveIGUsername] METODO: GET');
  console.log('[resolveIGUsername] URL:', logUrl);
  console.log('[resolveIGUsername] ig_account_id (user_id):', conn.ig_account_id);
  console.log('[resolveIGUsername] token owner (conn.id):', conn.id);
  console.log('[resolveIGUsername] token prefix:', conn.access_token?.slice(0, 20) + '***');
  console.log('[resolveIGUsername] HEADERS: nessun Authorization header (query param only)');

  const meRes  = await fetch(userUrl, { method: 'GET' });
  const meData = await meRes.json();

  console.log('[resolveIGUsername] ─── RISPOSTA META ───');
  console.log('[resolveIGUsername] HTTP status:', meRes.status);
  console.log('[resolveIGUsername] Response COMPLETA:', JSON.stringify(meData));

  if (meData.error) {
    const errMsg = `Meta error ${meData.error.code}: ${meData.error.message}`;
    console.error('[resolveIGUsername] ❌ ERRORE API Meta:', errMsg);
    console.error('[resolveIGUsername] error.type:', meData.error.type);
    console.error('[resolveIGUsername] error.fbtrace_id:', meData.error.fbtrace_id);

    // Se token e scopes sono validi NON bloccare la connessione
    const scopesOk = conn.has_basic_scope && conn.has_messages_scope;
    if (scopesOk) {
      console.log('[resolveIGUsername] ⚠️ Scopes OK → connessione operativa anche senza username. Non sovrascrivo sync_error.');
      // Non salvare l'errore come sync_error — la connessione è valida per i DM
      return Response.json({
        success: false,
        scopesOk: true,
        connectionOperative: true,
        message: errMsg,
        details: meData.error,
        note: 'Token e scopes validi. ARIA funziona sui DM. Username non recuperabile con questo endpoint.',
      });
    }

    await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
      sync_error: errMsg,
    });
    return Response.json({ success: false, message: errMsg, scopesOk: false });
  }

  const resolvedUsername = meData.username || '';
  const resolvedName     = meData.name || '';
  const resolvedPic      = meData.profile_picture_url || conn.ig_profile_picture_url || '';
  const resolvedId       = meData.id || conn.ig_account_id;
  const displayName      = resolvedUsername || resolvedName;

  console.log('[resolveIGUsername] ✅ SUCCESSO → username:', resolvedUsername, '| name:', resolvedName, '| account_type:', meData.account_type);

  const updatePayload = {
    ig_account_id:   resolvedId,
    meta_user_id:    resolvedId,
    sync_error:      '',
    has_basic_scope: true,
    has_messages_scope: true,
  };
  if (displayName) {
    updatePayload.ig_account_name = displayName;
    updatePayload.meta_user_name  = displayName;
  }
  if (resolvedPic) {
    updatePayload.ig_profile_picture_url = resolvedPic;
  }

  await base44.asServiceRole.entities.MetaConnection.update(conn.id, updatePayload);

  if (conn.business_id && displayName) {
    await base44.asServiceRole.entities.Business.update(conn.business_id, { ig_username: displayName });
  }

  return Response.json({
    success:           true,
    resolvedName:      displayName || conn.ig_account_id,
    username:          resolvedUsername,
    name:              resolvedName,
    profile_pic:       resolvedPic,
    account_type:      meData.account_type,
    connectionValid:   true,
  });
});