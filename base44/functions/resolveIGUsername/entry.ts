import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Risolve e aggiorna l'username Instagram per la connessione dell'utente corrente
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Cerca prima per business (univoco per utente), poi fallback per user_id
  let conns = [];
  // Trova il business dell'utente loggato
  const allBiz = await base44.asServiceRole.entities.Business.filter({});
  const myBusiness = allBiz.find(b => b.created_by === user.email || b.created_by === user.id);
  if (myBusiness) {
    conns = await base44.asServiceRole.entities.MetaConnection.filter({ business_id: myBusiness.id });
  }
  if (!conns.length) {
    conns = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: user.id });
  }
  console.log('[resolveIGUsername] user.id:', user.id, '| business:', myBusiness?.id, '| connessioni trovate:', conns.length);
  if (!conns.length) return Response.json({ error: 'Nessuna connessione trovata' }, { status: 404 });

  const conn = conns[0];
  if (!conn.access_token || !conn.ig_account_id) {
    return Response.json({ error: 'Token o account ID mancante' }, { status: 400 });
  }

  // Instagram Platform API: Authorization: Bearer SEMPRE, no ?access_token=
  const igHeaders = { 'Authorization': `Bearer ${conn.access_token}` };
  const attempts = [
    // Instagram Business Login: usa graph.instagram.com/me con fields=user_id,username,name
    `https://graph.instagram.com/v21.0/me?fields=user_id,username,name,profile_picture_url`,
    // Fallback con ID esplicito
    `https://graph.instagram.com/v21.0/${conn.ig_account_id}?fields=user_id,username,name,profile_picture_url`,
  ];

  let resolvedUsername = '';
  let resolvedName = '';
  let resolvedProfilePic = conn.ig_profile_picture_url || '';

  for (const url of attempts) {
    const res = await fetch(url, { headers: igHeaders });
    const data = await res.json();
    console.log('[resolveIGUsername] attempt:', url.split('?')[0], '→', JSON.stringify(data));
    if (data.error) {
      console.log('[resolveIGUsername] error:', JSON.stringify(data.error));
      continue;
    }
    const u = data.username || '';
    const n = data.name || '';
    if (u && !/^\d+$/.test(u)) resolvedUsername = u;
    if (n && !/^\d+$/.test(n)) resolvedName = n;
    if (data.profile_picture_url) resolvedProfilePic = data.profile_picture_url;
    if (resolvedUsername || resolvedName) break;
  }

  const displayName = resolvedUsername || resolvedName;

  if (!displayName) {
    console.log('[resolveIGUsername] Nessun username/nome trovato — token probabilmente non valido');
    return Response.json({ success: false, resolved: false, message: 'Impossibile recuperare il nome account — riconnetti l\'account Instagram' });
  }

  console.log('[resolveIGUsername] Risolto → username:', resolvedUsername, '| name:', resolvedName, '| pic:', resolvedProfilePic ? 'sì' : 'no');

  // Aggiorna DB
  const dbUpdate = {
    ig_account_name: resolvedUsername || resolvedName,
    meta_user_name: resolvedUsername || resolvedName,
  };
  if (resolvedProfilePic) dbUpdate.ig_profile_picture_url = resolvedProfilePic;
  await base44.asServiceRole.entities.MetaConnection.update(conn.id, dbUpdate);

  // Aggiorna anche Business
  if (conn.business_id) {
    await base44.asServiceRole.entities.Business.update(conn.business_id, {
      ig_username: resolvedUsername || resolvedName,
    });
  }

  return Response.json({ success: true, resolvedName: displayName, username: resolvedUsername, name: resolvedName, profile_pic: resolvedProfilePic });
});