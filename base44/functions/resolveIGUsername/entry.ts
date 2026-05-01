import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Risolve e aggiorna l'username Instagram per la connessione dell'utente corrente
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const conns = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: user.id });
  if (!conns.length) return Response.json({ error: 'Nessuna connessione trovata' }, { status: 404 });

  const conn = conns[0];
  if (!conn.access_token || !conn.ig_account_id) {
    return Response.json({ error: 'Token o account ID mancante' }, { status: 400 });
  }

  // Prova vari endpoint e campi per trovare l'username
  const attempts = [
    `https://graph.instagram.com/v21.0/me?fields=id,name,username&access_token=${conn.access_token}`,
    `https://graph.instagram.com/v21.0/me?fields=id,name&access_token=${conn.access_token}`,
    `https://graph.instagram.com/v21.0/${conn.ig_account_id}?fields=id,name,username&access_token=${conn.access_token}`,
  ];

  let resolvedName = '';
  let resolvedData = null;

  for (const url of attempts) {
    const res = await fetch(url);
    const data = await res.json();
    console.log('[resolveIGUsername] attempt:', url.split('?')[0], '→', JSON.stringify(data));
    if (data.error) continue;
    resolvedData = data;
    // Prendi username se non numerico, altrimenti name
    const u = data.username || '';
    const n = data.name || '';
    resolvedName = (!u || /^\d+$/.test(u)) ? n : u;
    if (resolvedName) break;
  }

  if (!resolvedName) {
    return Response.json({ error: 'Impossibile risolvere il nome', raw: resolvedData }, { status: 422 });
  }

  // Aggiorna DB
  await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
    ig_account_name: resolvedName,
    meta_user_name: resolvedName,
  });

  // Aggiorna anche Business
  if (conn.business_id) {
    await base44.asServiceRole.entities.Business.update(conn.business_id, {
      ig_username: resolvedName,
    });
  }

  return Response.json({ success: true, resolvedName });
});