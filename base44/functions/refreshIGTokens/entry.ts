import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Rinnova automaticamente i token Instagram long-lived in scadenza.
 * Va eseguito ogni giorno — rinnova i token che scadono entro 10 giorni
 * (soglia sicura: token rinnovati dopo 50 gg dalla creazione/ultimo rinnovo).
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
    return Response.json({ error: 'IG_APP_SECRET non configurato' }, { status: 500 });
  }

  // Recupera tutte le connessioni Instagram attive
  const connections = await base44.asServiceRole.entities.MetaConnection.filter({
    ig_connected: true,
  });

  const now = new Date();
  const results = { refreshed: 0, skipped: 0, errors: [] };

  for (const conn of connections) {
    if (!conn.access_token || !conn.ig_account_id) {
      results.skipped++;
      continue;
    }

    // Rinnova se il token scade entro 10 giorni oppure non ha ig_token_expires_at
    let shouldRefresh = false;
    if (!conn.ig_token_expires_at) {
      // Token senza scadenza salvata — rinnova per sicurezza
      shouldRefresh = true;
    } else {
      const expiresAt = new Date(conn.ig_token_expires_at);
      const daysLeft = (expiresAt - now) / (1000 * 60 * 60 * 24);
      shouldRefresh = daysLeft <= 10;
    }

    if (!shouldRefresh) {
      results.skipped++;
      continue;
    }

    console.log(`[refreshIGTokens] Rinnovo token per ig_account_id: ${conn.ig_account_id}`);

    // Chiama Instagram API per rinnovare il token
    const refreshRes = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${conn.access_token}`
    );
    const refreshData = await refreshRes.json();

    if (refreshData.error || !refreshData.access_token) {
      const errMsg = refreshData.error?.message || 'Risposta vuota';
      console.error(`[refreshIGTokens] Errore rinnovo ${conn.ig_account_id}:`, errMsg);
      results.errors.push({ id: conn.id, ig_account_id: conn.ig_account_id, error: errMsg });
      continue;
    }

    // Calcola nuova scadenza: expires_in è in secondi (di solito 5184000 = 60 giorni)
    const expiresInSec = refreshData.expires_in || (60 * 24 * 60 * 60);
    const newExpiry = new Date(now.getTime() + expiresInSec * 1000).toISOString();

    await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
      access_token: refreshData.access_token,
      ig_token_expires_at: newExpiry,
    });

    console.log(`[refreshIGTokens] ✅ Token rinnovato per ${conn.ig_account_id}, nuova scadenza: ${newExpiry}`);
    results.refreshed++;
  }

  console.log(`[refreshIGTokens] Fine — rinnovati: ${results.refreshed}, saltati: ${results.skipped}, errori: ${results.errors.length}`);
  return Response.json(results);
});