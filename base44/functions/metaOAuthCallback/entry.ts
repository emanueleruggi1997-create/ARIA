import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Instagram Business Login OAuth Callback ──
const IG_APP_ID     = Deno.env.get('IG_APP_ID') || '';
const IG_APP_SECRET = Deno.env.get('IG_APP_SECRET') || '';
const VERIFY_TOKEN  = 'emaral2026';
const WEBHOOK_URL   = 'https://emaral-smart-flow.base44.app/api/functions/webhookMeta';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Webhook verification (GET da Meta)
  if (req.method === 'GET' && url.searchParams.has('hub.mode')) {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      console.log('[metaOAuthCallback] Webhook verification OK');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  }

  const code      = url.searchParams.get('code');
  const state     = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  const errorDesc = url.searchParams.get('error_description') || '';

  const REDIRECT_URI = (Deno.env.get('META_REDIRECT_URI') || '').trim();
  const SUCCESS_URL  = 'https://emaral.it/settings?meta=success&tab=connections';
  const ERROR_URL    = 'https://emaral.it/settings?meta=error&tab=connections';

  if (oauthError || !code || !state) {
    console.error('[metaOAuthCallback] OAuth negato:', oauthError, errorDesc);
    return Response.redirect(`${ERROR_URL}&reason=${encodeURIComponent(oauthError || 'missing_code')}`, 302);
  }

  // 1. Decodifica state
  let userId = '', businessId = '';
  try {
    const decoded = JSON.parse(atob(state));
    userId     = decoded.userId || '';
    businessId = decoded.businessId || '';
  } catch (e) {
    console.error('[metaOAuthCallback] State non valido:', e.message);
    return Response.redirect(ERROR_URL, 302);
  }
  console.log('[metaOAuthCallback] userId:', userId, '| businessId:', businessId);

  const oauthStartedAt = new Date().toISOString();

  // ── STEP 1: authorization_code → short-lived token ──
  console.log('[metaOAuthCallback] ─── STEP 1: code → short-lived token ───');
  const tokenUrl = 'https://api.instagram.com/oauth/access_token';
  const tokenBody = new URLSearchParams({
    client_id:     IG_APP_ID,
    client_secret: IG_APP_SECRET,
    grant_type:    'authorization_code',
    redirect_uri:  REDIRECT_URI,
    code,
  });

  const tokenRes  = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody,
  });
  const tokenData = await tokenRes.json();
  console.log('[metaOAuthCallback] STEP 1 HTTP:', tokenRes.status);
  console.log('[metaOAuthCallback] STEP 1 response:', JSON.stringify({ ...tokenData, access_token: tokenData.access_token ? 'TOKEN_REDACTED' : undefined }));

  if (!tokenData.access_token) {
    console.error('[metaOAuthCallback] STEP 1 FALLITO: nessun access_token');
    console.error('[metaOAuthCallback] STEP 1 error_detail:', JSON.stringify(tokenData));
    return Response.redirect(`${ERROR_URL}&reason=token_exchange_failed`, 302);
  }

  const shortToken        = tokenData.access_token;
  const igUserIdFromToken = tokenData.user_id ? String(tokenData.user_id) : '';
  const shortExpiresIn    = tokenData.expires_in || 3600; // short-lived ~1h
  console.log('[metaOAuthCallback] STEP 1 ✅ short-lived token ok | user_id:', igUserIdFromToken, '| expires_in:', shortExpiresIn);

  // ── STEP 2: short-lived → long-lived (60 giorni) ──
  console.log('[metaOAuthCallback] ─── STEP 2: short-lived → long-lived token ───');
  const llUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortToken}`;
  const llUrlLog = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=REDACTED&access_token=REDACTED`;

  const llRes  = await fetch(llUrl);
  const llData = await llRes.json();
  console.log('[metaOAuthCallback] STEP 2 HTTP:', llRes.status);
  console.log('[metaOAuthCallback] STEP 2 response:', JSON.stringify({ ...llData, access_token: llData.access_token ? 'TOKEN_REDACTED' : undefined }));

  if (llData.error) {
    console.error('[metaOAuthCallback] STEP 2 ERRORE Meta:', JSON.stringify(llData.error));
    // Non bloccare: usa short-lived come fallback temporaneo
  }

  const longToken = llData.access_token || shortToken;
  const isLongLived = !!llData.access_token;

  // Calcola scadenza precisa
  // Long-lived: expires_in da Meta (es. 5183944 ≈ 60 giorni)
  // Short-lived fallback: ~1 ora
  const expiresInSec  = llData.expires_in || shortExpiresIn || 5184000;
  const tokenType     = llData.token_type || 'bearer';
  const tokenIssuedAt = new Date().toISOString();
  const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  console.log('[metaOAuthCallback] STEP 2 ✅ long-lived:', isLongLived, '| expires_in:', expiresInSec, 's | expires_at:', tokenExpiresAt, '| token_type:', tokenType);

  // ── STEP 3: Recupera profilo account Instagram ──
  console.log('[metaOAuthCallback] ─── STEP 3: Recupero profilo account ───');
  let igUserId     = igUserIdFromToken;
  let igUsername   = '';
  let igName       = '';
  let igProfilePic = '';
  let syncError    = '';

  if (igUserId) {
    const fields  = 'id,username,name,profile_picture_url,account_type';
    const userUrl = `https://graph.instagram.com/v21.0/${igUserId}?fields=${fields}&access_token=${longToken}`;
    const logUrl  = `https://graph.instagram.com/v21.0/${igUserId}?fields=${fields}&access_token=REDACTED`;
    console.log('[metaOAuthCallback] STEP 3 GET:', logUrl);

    try {
      const meRes  = await fetch(userUrl);
      const meData = await meRes.json();
      console.log('[metaOAuthCallback] STEP 3 HTTP:', meRes.status);
      console.log('[metaOAuthCallback] STEP 3 response:', JSON.stringify(meData));

      if (meData.error) {
        syncError = `Meta error ${meData.error.code}: ${meData.error.message}`;
        console.error('[metaOAuthCallback] STEP 3 ERRORE:', syncError, '| fbtrace:', meData.error.fbtrace_id);
        // Non bloccare — token potrebbe essere valido anche senza profilo (App Review pending)
      } else {
        igUserId     = meData.id || igUserIdFromToken;
        igUsername   = meData.username || '';
        igName       = meData.name || '';
        igProfilePic = meData.profile_picture_url || '';
        console.log('[metaOAuthCallback] STEP 3 ✅ profilo:', igUserId, '@' + igUsername, '| account_type:', meData.account_type);
      }
    } catch (e) {
      syncError = `Fetch exception: ${e.message}`;
      console.error('[metaOAuthCallback] STEP 3 exception:', e.message);
    }
  } else {
    syncError = 'user_id non presente nella risposta del token exchange';
    console.error('[metaOAuthCallback] STEP 3 skip: igUserId mancante');
  }

  // ── STEP 4: Risolvi businessId ──
  const base44 = createClientFromRequest(req);
  if (!businessId && userId) {
    try {
      const allBiz = await base44.asServiceRole.entities.Business.filter({});
      const match  = allBiz.find(b => b.created_by === userId);
      if (match) { businessId = match.id; console.log('[metaOAuthCallback] businessId risolto:', businessId); }
    } catch (e) { console.warn('[metaOAuthCallback] businessId lookup fallito:', e.message); }
  }

  // ── STEP 5: Salva MetaConnection con lifecycle token completo ──
  const payload = {
    user_id:                userId,
    business_id:            businessId,
    login_flow:             'instagram_business_login',

    // ── Token lifecycle ──
    access_token:           longToken,
    token_type:             tokenType,
    ig_token_expires_at:    tokenExpiresAt,
    token_issued_at:        tokenIssuedAt,
    last_refresh_at:        tokenIssuedAt,   // OAuth = fresh token
    refresh_error:          '',              // nessun errore a OAuth appena fatto
    refresh_supported:      true,            // Instagram long-lived supporta refresh

    // ── Scopes (concessi dall'utente durante OAuth) ──
    granted_scopes:         'instagram_business_basic,instagram_business_manage_messages',
    has_basic_scope:        true,
    has_messages_scope:     true,

    // ── Profilo ──
    ig_connected:           true,
    ig_account_id:          igUserId,
    ig_account_name:        igUsername || igName || '',
    ig_profile_picture_url: igProfilePic,
    meta_user_id:           igUserId,
    meta_user_name:         igUsername || igName || igUserId || '',

    // ── Legacy FB (non usato con Business Login) ──
    fb_connected:           false,
    fb_page_id:             '',
    fb_page_name:           '',
    fb_page_token:          '',

    // ── Status ──
    status:                 'connected',
    connected_at:           tokenIssuedAt,
    sync_error:             '',  // pulisci errori precedenti (nuovo token fresco)
    webhook_url:            WEBHOOK_URL,

    // Log OAuth exchange
    oauth_exchange_at:      oauthStartedAt,
    oauth_long_lived:       isLongLived,
    oauth_expires_in_sec:   expiresInSec,
  };

  console.log('[metaOAuthCallback] ─── STEP 5: Salvataggio DB ───');
  console.log('[metaOAuthCallback] ig_account_id:', igUserId, '| ig_account_name:', igUsername || '(non recuperato)', '| expires_at:', tokenExpiresAt, '| is_long_lived:', isLongLived);

  try {
    // Cerca prima per user_id, poi per business_id (robustezza)
    let existing = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: userId });
    if (!existing.length && businessId) {
      existing = await base44.asServiceRole.entities.MetaConnection.filter({ business_id: businessId });
    }

    if (existing.length > 0) {
      await base44.asServiceRole.entities.MetaConnection.update(existing[0].id, payload);
      console.log('[metaOAuthCallback] ✅ DB aggiornato, id:', existing[0].id);
    } else {
      await base44.asServiceRole.entities.MetaConnection.create(payload);
      console.log('[metaOAuthCallback] ✅ DB creato nuovo record');
    }
  } catch (dbErr) {
    console.error('[metaOAuthCallback] DB FALLITO:', dbErr.message);
    return Response.redirect(ERROR_URL, 302);
  }

  // ── STEP 6: Aggiorna Business ──
  if (businessId) {
    try {
      await base44.asServiceRole.entities.Business.update(businessId, {
        ig_connesso: true,
        ig_username: igUsername || igName || igUserId,
        fb_connesso: false,
      });
    } catch (e) { console.warn('[metaOAuthCallback] Business update fallito:', e.message); }
  }

  console.log('[metaOAuthCallback] ✅ OAuth completato | token valido fino al:', tokenExpiresAt);
  return Response.redirect(SUCCESS_URL, 302);
});