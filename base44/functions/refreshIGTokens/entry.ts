import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * refreshIGTokens — rinnova token Instagram long-lived in scadenza.
 *
 * Instagram long-lived token lifecycle:
 * - Durata: 60 giorni (5184000 secondi)
 * - Rinnovabile con: GET /refresh_access_token?grant_type=ig_refresh_token&access_token={TOKEN}
 * - Rinnovabile SOLO se non scaduto (se già scaduto → error 190 → serve OAuth completo)
 * - Soglia rinnovo: entro 15 giorni dalla scadenza
 *
 * Gestione error 190 (Session has expired / token scaduto):
 * - Marca il record come status="error" e sync_error="token_expired_190"
 * - NON cancella il token (utile per log/diagnosi)
 * - Richiede OAuth completo da parte dell'utente per riottenere un token valido
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Sicurezza: solo admin o chiamata interna (scheduled automation)
  try {
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (_) {
    // Chiamata da automation senza utente — ok, procedi
  }

  const IG_APP_SECRET = Deno.env.get('IG_APP_SECRET') || '';
  if (!IG_APP_SECRET) {
    console.error('[refreshIGTokens] IG_APP_SECRET non configurato');
    return Response.json({ error: 'IG_APP_SECRET non configurato' }, { status: 500 });
  }

  const now = new Date();
  const results = { refreshed: 0, skipped: 0, expired: 0, errors: [], timestamp: now.toISOString() };

  let connections = [];
  try {
    connections = await base44.asServiceRole.entities.MetaConnection.filter({ ig_connected: true });
    console.log(`[refreshIGTokens] ${now.toISOString()} — trovate ${connections.length} connessioni IG attive`);
  } catch (e) {
    console.error('[refreshIGTokens] DB filter error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }

  for (const conn of connections) {
    const logId = conn.ig_account_id || conn.id;

    if (!conn.access_token) {
      console.log(`[refreshIGTokens] Skip ${logId}: nessun access_token`);
      results.skipped++;
      continue;
    }

    // ── Determina se rinnovare ──
    let shouldRefresh = false;
    let daysLeft = null;

    // Se già marcato come error 190 in DB — tenta comunque refresh per confermare stato
    const alreadyExpired = (conn.sync_error || '').includes('token_expired_190') ||
                           (conn.refresh_error || '').includes('error_190') ||
                           conn.status === 'error';

    if (alreadyExpired) {
      // Token già segnato come scaduto: tenta refresh per vedere se nel frattempo è stato riconnesso
      shouldRefresh = true;
      console.log(`[refreshIGTokens] ${logId}: già marcato come scaduto (error_190) — tentativo refresh per confermare`);
    } else if (!conn.ig_token_expires_at) {
      // Nessuna scadenza salvata → rinnova subito per registrare la scadenza reale
      shouldRefresh = true;
      console.log(`[refreshIGTokens] ${logId}: ig_token_expires_at mancante — rinnovo forzato`);
    } else {
      const expiresAt = new Date(conn.ig_token_expires_at);
      daysLeft = (expiresAt - now) / (1000 * 60 * 60 * 24);
      shouldRefresh = daysLeft <= 15; // rinnova se scade entro 15 giorni

      if (daysLeft < 0) {
        // Token già scaduto secondo il DB — potrebbe essere error 190
        console.log(`[refreshIGTokens] ${logId}: token scaduto da ${Math.abs(Math.round(daysLeft))} giorni secondo DB`);
        shouldRefresh = true;
      }
    }

    if (!shouldRefresh) {
      console.log(`[refreshIGTokens] ${logId}: token valido ancora ${Math.round(daysLeft)} giorni — skip`);
      results.skipped++;
      continue;
    }

    console.log(`[refreshIGTokens] ${logId}: tentativo refresh...`);

    // ── Chiama Instagram API refresh ──
    let refreshData = {};
    try {
      const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${conn.access_token}`;
      const refreshRes = await fetch(refreshUrl);
      refreshData = await refreshRes.json();

      console.log(`[refreshIGTokens] ${logId}: HTTP ${refreshRes.status} | response: ${JSON.stringify({ ...refreshData, access_token: refreshData.access_token ? 'TOKEN_REDACTED' : undefined })}`);
    } catch (fetchErr) {
      console.error(`[refreshIGTokens] ${logId}: fetch exception: ${fetchErr.message}`);
      results.errors.push({ id: conn.id, ig_account_id: logId, error: fetchErr.message });
      await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
        refresh_error: `fetch_exception: ${fetchErr.message}`,
      }).catch(() => {});
      continue;
    }

    // ── Gestisci errori Meta ──
    if (refreshData.error) {
      const errCode    = refreshData.error.code;
      const errMsg     = refreshData.error.message || 'unknown error';
      const errType    = refreshData.error.type || '';
      const fbtrace    = refreshData.error.fbtrace_id || '';

      console.error(`[refreshIGTokens] ${logId}: Meta error ${errCode} — ${errMsg} (fbtrace: ${fbtrace})`);

      // Error 190 = token scaduto/invalidato da Meta — richiede OAuth completo
      if (errCode === 190) {
        console.error(`[refreshIGTokens] ${logId}: ⚠️ TOKEN SCADUTO (error 190) — OAuth completo necessario`);
        results.expired++;
        results.errors.push({ id: conn.id, ig_account_id: logId, error: `error_190_token_expired: ${errMsg}` });

        // Marca come scaduto nel DB — la UI lo mostrerà chiaramente
        await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
          status:       'error',
          sync_error:   `token_expired_190: ${errMsg}`,
          refresh_error: `error_190_${new Date().toISOString()}: ${errMsg}`,
        }).catch(e => console.error('[refreshIGTokens] DB update error:', e.message));
      } else {
        // Altro errore Meta (es. 4 = rate limit, 10 = permissions) — non marcare come scaduto
        results.errors.push({ id: conn.id, ig_account_id: logId, error: `error_${errCode}: ${errMsg}` });
        await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
          refresh_error: `error_${errCode}_${new Date().toISOString()}: ${errMsg}`,
        }).catch(() => {});
      }
      continue;
    }

    // ── Successo: salva nuovo token ──
    if (!refreshData.access_token) {
      console.error(`[refreshIGTokens] ${logId}: risposta senza access_token`);
      results.errors.push({ id: conn.id, ig_account_id: logId, error: 'empty_access_token_in_response' });
      continue;
    }

    const expiresInSec = refreshData.expires_in || 5184000; // 60 giorni default
    const newExpiry = new Date(now.getTime() + expiresInSec * 1000).toISOString();

    await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
      access_token:         refreshData.access_token,
      token_type:           refreshData.token_type || 'bearer',
      ig_token_expires_at:  newExpiry,
      last_refresh_at:      now.toISOString(),
      refresh_error:        '',   // pulisci errori precedenti
      status:               'connected',
      sync_error:           '',   // pulisci errori precedenti
    }).catch(e => console.error('[refreshIGTokens] DB update error:', e.message));

    console.log(`[refreshIGTokens] ✅ ${logId}: token rinnovato — nuova scadenza: ${newExpiry} (tra ${Math.round(expiresInSec / 86400)} giorni)`);
    results.refreshed++;
  }

  console.log(`[refreshIGTokens] ═══ FINE ═══ refreshed:${results.refreshed} skipped:${results.skipped} expired:${results.expired} errors:${results.errors.length}`);
  return Response.json(results);
});