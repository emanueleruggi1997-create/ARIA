import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Recupera e aggiorna username Instagram per la connessione dell'utente corrente
// Usa solo GET graph.instagram.com/v21.0/me con Authorization: Bearer
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Trova connessione dell'utente
  let conns = [];
  const allBiz    = await base44.asServiceRole.entities.Business.filter({});
  const myBusiness = allBiz.find(b => b.created_by === user.email || b.created_by === user.id);
  if (myBusiness) {
    conns = await base44.asServiceRole.entities.MetaConnection.filter({ business_id: myBusiness.id });
  }
  if (!conns.length) {
    conns = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: user.id });
  }

  console.log('[resolveIGUsername] user.id:', user.id, '| business:', myBusiness?.id, '| conns:', conns.length);
  if (!conns.length) return Response.json({ error: 'Nessuna connessione trovata' }, { status: 404 });

  const conn = conns[0];
  if (!conn.access_token) return Response.json({ error: 'Token mancante' }, { status: 400 });

  // GET graph.instagram.com/v21.0/me — unico endpoint corretto per Instagram Business Login
  // NON usare /permissions, /debug_token, o graph.facebook.com
  const meUrl = 'https://graph.instagram.com/v21.0/me?fields=id,username,name,profile_picture_url,account_type';
  console.log('[resolveIGUsername] GET', meUrl);

  const meRes  = await fetch(meUrl, {
    headers: { 'Authorization': `Bearer ${conn.access_token}` },
  });
  const meData = await meRes.json();
  console.log('[resolveIGUsername] /me response (status', meRes.status, '):', JSON.stringify(meData));

  if (meData.error) {
    const errMsg = `Meta error ${meData.error.code}: ${meData.error.message}`;
    console.error('[resolveIGUsername] Errore:', errMsg);
    // Aggiorna sync_error nel DB
    await base44.asServiceRole.entities.MetaConnection.update(conn.id, { sync_error: errMsg });
    return Response.json({ success: false, message: errMsg });
  }

  const resolvedUsername = meData.username || '';
  const resolvedName     = meData.name || '';
  const resolvedPic      = meData.profile_picture_url || conn.ig_profile_picture_url || '';
  const resolvedId       = meData.id || conn.ig_account_id;
  const displayName      = resolvedUsername || resolvedName;

  if (!displayName) {
    return Response.json({ success: false, message: 'Username e nome non disponibili nella risposta Meta' });
  }

  console.log('[resolveIGUsername] ✅ Risolto → username:', resolvedUsername, '| name:', resolvedName);

  // Aggiorna DB
  await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
    ig_account_id:          resolvedId,
    ig_account_name:        displayName,
    meta_user_id:           resolvedId,
    meta_user_name:         displayName,
    ig_profile_picture_url: resolvedPic,
    sync_error:             '',
    has_basic_scope:        true,
  });

  if (conn.business_id) {
    await base44.asServiceRole.entities.Business.update(conn.business_id, {
      ig_username: displayName,
    });
  }

  return Response.json({
    success:      true,
    resolvedName: displayName,
    username:     resolvedUsername,
    name:         resolvedName,
    profile_pic:  resolvedPic,
  });
});