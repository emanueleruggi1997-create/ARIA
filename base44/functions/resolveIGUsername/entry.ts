import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Recupera username Instagram per la connessione dell'utente corrente.
// Instagram Business Login (api.instagram.com) token:
//   - CORRETTO: GET graph.instagram.com/v25.0/{id}?fields=...&access_token={TOKEN}
//   - SBAGLIATO: Authorization: Bearer header → errore 100
//   - SBAGLIATO: /me → non supportato
//   - SBAGLIATO: /subscribed_apps, /messages, /conversations → non supportati
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

  console.log('[resolveIGUsername] user.id:', user.id, '| business:', myBusiness?.id, '| conns found:', conns.length);
  if (!conns.length) return Response.json({ error: 'Nessuna connessione trovata' }, { status: 404 });

  const conn = conns[0];
  if (!conn.access_token) return Response.json({ error: 'Token mancante' }, { status: 400 });
  if (!conn.ig_account_id) return Response.json({ error: 'ig_account_id mancante — riconnetti Instagram' }, { status: 400 });

  // ✅ UNICA chiamata corretta per Instagram Business Login:
  // GET https://graph.instagram.com/v25.0/{id}?fields=id,username,account_type&access_token={TOKEN}
  // NON usare: /me | /subscribed_apps | /messages | /conversations | Authorization: Bearer header
  const userUrl = `https://graph.instagram.com/v25.0/${conn.ig_account_id}?fields=id,username,name,profile_picture_url,account_type&access_token=${conn.access_token}`;
  const logUrl  = `https://graph.instagram.com/v25.0/${conn.ig_account_id}?fields=id,username,name,profile_picture_url,account_type&access_token=***`;
  console.log('[resolveIGUsername] METHOD: GET');
  console.log('[resolveIGUsername] URL:', logUrl);

  const meRes  = await fetch(userUrl, { method: 'GET' });
  const meData = await meRes.json();
  console.log('[resolveIGUsername] HTTP status:', meRes.status);
  console.log('[resolveIGUsername] ig_account_id used:', conn.ig_account_id);
  console.log('[resolveIGUsername] token prefix:', conn.access_token?.slice(0, 12) + '***');
  console.log('[resolveIGUsername] Response FULL:', JSON.stringify(meData));

  if (meData.error) {
    const errMsg = `Meta error ${meData.error.code}: ${meData.error.message}`;
    console.error('[resolveIGUsername] ❌ Errore API:', errMsg);
    // Se i scope sono già validi, non sovrascrivere sync_error con questo errore tecnico
    // Aggiorna solo se non era già connesso correttamente
    const hadGoodScopes = conn.has_basic_scope && conn.has_messages_scope;
    await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
      sync_error: hadGoodScopes ? '' : errMsg,
      last_sync_at: new Date().toISOString(),
    });
    return Response.json({ success: false, message: errMsg, scopesOk: hadGoodScopes });
  }

  const resolvedUsername = meData.username || '';
  const resolvedName     = meData.name || '';
  const resolvedPic      = meData.profile_picture_url || conn.ig_profile_picture_url || '';
  const resolvedId       = meData.id || conn.ig_account_id;
  const displayName      = resolvedUsername || resolvedName;

  console.log('[resolveIGUsername] ✅ Risolto → username:', resolvedUsername, '| name:', resolvedName, '| account_type:', meData.account_type, '| displayName:', displayName);

  // Anche se username è vuoto, la connessione è valida — salva sempre sync_error='' e scope OK
  const updatePayload = {
    ig_account_id:   resolvedId,
    meta_user_id:    resolvedId,
    sync_error:      '',
    has_basic_scope: true,
    has_messages_scope: true,
    last_sync_at:    new Date().toISOString(),
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
    success:      true,
    resolvedName: displayName || conn.ig_account_id,
    username:     resolvedUsername,
    name:         resolvedName,
    profile_pic:  resolvedPic,
    account_type: meData.account_type,
    connectionValid: true,
  });
});