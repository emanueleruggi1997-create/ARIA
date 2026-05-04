import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const META_APP_ID     = Deno.env.get('META_APP_ID') || Deno.env.get('IG_APP_ID') || '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || Deno.env.get('IG_APP_SECRET') || '';
const VERIFY_TOKEN    = 'emaral2026';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── Webhook verification (GET da Meta) ──
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      console.log('[metaOAuthCallback] Webhook verified OK');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  }

  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const SUCCESS_URL = `https://emaral.it/settings?meta=success&tab=connections`;
  const ERROR_URL   = `https://emaral.it/settings?meta=error&tab=connections`;

  console.log('[metaOAuthCallback] code:', code ? 'PRESENTE' : 'ASSENTE', '| error:', error || 'nessuno');

  if (error || !code || !state) {
    console.error('[metaOAuthCallback] OAuth negato o parametri mancanti:', error);
    return Response.redirect(ERROR_URL, 302);
  }

  // Decodifica state
  let userId = '';
  let businessId = '';
  try {
    const decoded = JSON.parse(atob(state));
    userId     = decoded.userId || '';
    businessId = decoded.businessId || '';
    console.log('[metaOAuthCallback] state → userId:', userId, '| businessId:', businessId);
  } catch (e) {
    console.error('[metaOAuthCallback] State non valido:', e.message);
    return Response.redirect(ERROR_URL, 302);
  }

  const redirectUri = (Deno.env.get('META_REDIRECT_URI') || '').trim();
  console.log('[metaOAuthCallback] redirectUri:', redirectUri);

  // 1. Scambio code → User Access Token (Facebook)
  const tokenRes = await fetch('https://graph.facebook.com/v20.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  console.log('[metaOAuthCallback] FB token exchange:', tokenData.access_token ? 'OK' : 'FALLITO', '| err:', JSON.stringify(tokenData.error || ''));

  if (!tokenData.access_token) {
    console.error('[metaOAuthCallback] Token exchange FALLITO:', JSON.stringify(tokenData));
    return Response.redirect(ERROR_URL, 302);
  }

  const userAccessToken = tokenData.access_token;

  // 2. Scambio short-lived → long-lived User Access Token
  const llRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${userAccessToken}`
  );
  const llData = await llRes.json();
  const longUserToken = llData.access_token || userAccessToken;
  console.log('[metaOAuthCallback] long-lived user token:', llData.access_token ? 'OK' : 'fallback a short-lived');

  // 3. Recupera le Pagine Facebook dell'utente (con Page Access Token)
  const pagesRes = await fetch(
    `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longUserToken}`
  );
  const pagesData = await pagesRes.json();
  console.log('[metaOAuthCallback] FB Pages response:', JSON.stringify(pagesData).slice(0, 500));

  if (!pagesData.data || pagesData.data.length === 0) {
    console.error('[metaOAuthCallback] Nessuna pagina Facebook trovata per questo utente');
    return Response.redirect(ERROR_URL, 302);
  }

  // Trova la pagina con Instagram Business Account collegato
  let fbPage = pagesData.data.find(p => p.instagram_business_account?.id);
  if (!fbPage) {
    // Fallback: usa la prima pagina disponibile
    fbPage = pagesData.data[0];
    console.log('[metaOAuthCallback] Nessuna pagina con IG Business — uso la prima pagina disponibile:', fbPage.name);
  }

  const fbPageId      = fbPage.id;
  const fbPageName    = fbPage.name;
  const fbPageToken   = fbPage.access_token; // Page Access Token (long-lived automaticamente)
  const igAccountId   = fbPage.instagram_business_account?.id || '';

  console.log('[metaOAuthCallback] fbPageId:', fbPageId, '| fbPageName:', fbPageName, '| igAccountId:', igAccountId);

  // 4. Recupera info Instagram Business Account
  let igUsername = '';
  let igName = '';
  let igProfilePic = '';

  if (igAccountId) {
    const igRes = await fetch(
      `https://graph.facebook.com/v20.0/${igAccountId}?fields=id,name,username,profile_picture_url&access_token=${fbPageToken}`
    );
    const igData = await igRes.json();
    console.log('[metaOAuthCallback] IG Business Account info:', JSON.stringify(igData));
    if (!igData.error) {
      igUsername   = igData.username || '';
      igName       = igData.name || '';
      igProfilePic = igData.profile_picture_url || '';
    }
  }

  const igAccountName = igUsername || igName || fbPageName || '';

  // 5. Sottoscrizione webhook della pagina del cliente — CRITICO per ricevere i messaggi
  if (fbPageId && fbPageToken) {
    try {
      const subRes = await fetch(`https://graph.facebook.com/v20.0/${fbPageId}/subscribed_apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: 'messages,messaging_postbacks',
          access_token: fbPageToken,
        }),
      });
      const subData = await subRes.json();
      console.log('[metaOAuthCallback] Webhook subscription:', JSON.stringify(subData));
      if (!subData.success) {
        console.warn('[metaOAuthCallback] Webhook subscription non riuscita:', JSON.stringify(subData));
      }
    } catch (e) {
      console.warn('[metaOAuthCallback] Errore webhook subscription:', e.message);
    }
  }

  // 6. Calcola scadenza token Page (long-lived = ~60 giorni, ma in realtà non scadono per le pagine)
  const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  // 7. Se non abbiamo businessId dallo state, cercalo nel DB tramite userId
  const base44 = createClientFromRequest(req);
  if (!businessId && userId) {
    try {
      const allBiz = await base44.asServiceRole.entities.Business.filter({});
      const match = allBiz.find(b => b.created_by === userId);
      if (match) {
        businessId = match.id;
        console.log('[metaOAuthCallback] businessId ricavato dal DB:', businessId);
      }
    } catch (e) {
      console.log('[metaOAuthCallback] Impossibile trovare business:', e.message);
    }
  }

  // 8. Salvataggio su DB
  console.log('[metaOAuthCallback] Salvo connessione per userId:', userId, '| businessId:', businessId, '| fbPageId:', fbPageId, '| igAccountId:', igAccountId);

  const payload = {
    user_id:                  userId,
    business_id:              businessId,
    access_token:             fbPageToken,       // Page Access Token (usato per rispondere ai messaggi)
    meta_user_id:             igAccountId || fbPageId,
    meta_user_name:           igAccountName,
    fb_connected:             true,
    fb_page_id:               fbPageId,
    fb_page_name:             fbPageName,
    fb_page_token:            fbPageToken,
    ig_connected:             !!igAccountId,
    ig_account_id:            igAccountId,
    ig_account_name:          igAccountName,
    ig_profile_picture_url:   igProfilePic,
    ig_token_expires_at:      tokenExpiresAt,
    status:                   'connected',
    connected_at:             new Date().toISOString(),
  };

  try {
    const existing = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: userId });
    console.log('[metaOAuthCallback] Connessioni esistenti per userId', userId, ':', existing.length);
    if (existing.length > 0) {
      await base44.asServiceRole.entities.MetaConnection.update(existing[0].id, payload);
      console.log('[metaOAuthCallback] DB aggiornato per user', userId, '| ig_account_name:', igAccountName, '| fbPageId:', fbPageId);
    } else {
      const created = await base44.asServiceRole.entities.MetaConnection.create(payload);
      console.log('[metaOAuthCallback] DB creato per user', userId, '| record id:', created?.id);
    }
  } catch (dbErr) {
    console.error('[metaOAuthCallback] DB FALLITO:', dbErr.message);
    return Response.redirect(ERROR_URL, 302);
  }

  // 9. Aggiorna il Business con ig_connesso: true
  if (businessId) {
    try {
      await base44.asServiceRole.entities.Business.update(businessId, {
        ig_connesso: true,
        ig_username: igAccountName,
        fb_connesso: true,
        fb_username: fbPageName,
      });
      console.log('[metaOAuthCallback] Business aggiornato con ig_connesso + fb_connesso: true');
    } catch (e) {
      console.log('[metaOAuthCallback] Aggiornamento business non riuscito:', e.message);
    }
  }

  console.log('[metaOAuthCallback] ✅ Connessione completata → redirect a SUCCESS');
  return Response.redirect(SUCCESS_URL, 302);
});