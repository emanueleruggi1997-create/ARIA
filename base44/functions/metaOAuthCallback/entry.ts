import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Instagram Business Login OAuth Callback ──
// Endpoint ufficiali: api.instagram.com (token) + graph.instagram.com/me (dati)
// NON usare: /permissions GET, /debug_token, endpoint Facebook Messenger legacy
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
  const error     = url.searchParams.get('error');
  const errorDesc = url.searchParams.get('error_description') || '';

  const REDIRECT_URI = (Deno.env.get('META_REDIRECT_URI') || '').trim();
  const SUCCESS_URL  = 'https://emaral.it/settings?meta=success&tab=connections';
  const ERROR_URL    = 'https://emaral.it/settings?meta=error&tab=connections';

  if (error || !code || !state) {
    console.error('[metaOAuthCallback] OAuth negato:', error, errorDesc);
    return Response.redirect(`${ERROR_URL}&reason=${encodeURIComponent(error || 'missing_code')}`, 302);
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

  // ── STEP 1: code → short-lived token (api.instagram.com POST) ──
  console.log('[metaOAuthCallback] STEP 1: Token exchange');
  const tokenUrl = 'https://api.instagram.com/oauth/access_token';
  const tokenBody = new URLSearchParams({
    client_id:     IG_APP_ID,
    client_secret: IG_APP_SECRET,
    grant_type:    'authorization_code',
    redirect_uri:  REDIRECT_URI,
    code,
  });
  console.log('[metaOAuthCallback] POST', tokenUrl);
  const tokenRes  = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody,
  });
  const tokenData = await tokenRes.json();
  console.log('[metaOAuthCallback] Token exchange response:', JSON.stringify(tokenData));

  if (!tokenData.access_token) {
    console.error('[metaOAuthCallback] Token exchange FALLITO');
    return Response.redirect(`${ERROR_URL}&reason=token_exchange_failed`, 302);
  }

  const shortToken        = tokenData.access_token;
  const igUserIdFromToken = tokenData.user_id ? String(tokenData.user_id) : '';

  // ── STEP 2: short-lived → long-lived (graph.instagram.com GET) ──
  // NOTA: questo è un GET corretto — è l'unico GET supportato per il token exchange
  console.log('[metaOAuthCallback] STEP 2: Long-lived token');
  const llUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortToken}`;
  console.log('[metaOAuthCallback] GET', llUrl.replace(IG_APP_SECRET, '***'));
  const llRes  = await fetch(llUrl);
  const llData = await llRes.json();
  console.log('[metaOAuthCallback] Long-lived token response:', JSON.stringify(llData));

  const longToken      = llData.access_token || shortToken;
  const expiresIn      = llData.expires_in || (60 * 24 * 60 * 60);
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // ── STEP 3: Recupera info account Instagram ──
  // Con Instagram Business Login (api.instagram.com), l'endpoint /me NON è supportato in GET.
  // Bisogna usare graph.instagram.com/v21.0/{user-id} con l'ID numerico già presente in tokenData.user_id
  // fields: username, name, profile_picture_url — NON usare /me
  console.log('[metaOAuthCallback] STEP 3: GET graph.instagram.com/v21.0/{user_id}');
  let igUserId     = igUserIdFromToken;
  let igUsername   = '';
  let igName       = '';
  let igProfilePic = '';
  let syncError    = '';

  if (igUserId) {
    const userUrl = `https://graph.instagram.com/v21.0/${igUserId}?fields=id,username,name,profile_picture_url,account_type`;
    console.log('[metaOAuthCallback] GET', userUrl, '| Authorization: Bearer ***');
    try {
      const meRes  = await fetch(userUrl, {
        headers: { 'Authorization': `Bearer ${longToken}` },
      });
      const meData = await meRes.json();
      console.log('[metaOAuthCallback] /{user_id} response (status', meRes.status, '):', JSON.stringify(meData));

      if (meData.error) {
        syncError = `Meta error ${meData.error.code}: ${meData.error.message}`;
        console.error('[metaOAuthCallback] /{user_id} ERRORE:', syncError);
      } else {
        igUserId    = meData.id || igUserIdFromToken;
        igUsername  = meData.username || '';
        igName      = meData.name || '';
        igProfilePic = meData.profile_picture_url || '';
        console.log('[metaOAuthCallback] Account info OK | id:', igUserId, '| username:', igUsername, '| account_type:', meData.account_type);
      }
    } catch (e) {
      syncError = `Fetch exception: ${e.message}`;
      console.error('[metaOAuthCallback] /{user_id} exception:', e.message);
    }
  } else {
    syncError = 'user_id non presente nella risposta del token exchange';
    console.error('[metaOAuthCallback] STEP 3 skip: igUserId mancante');
  }

  // ── STEP 4: Webhook subscription ──
  // NOTA: con Instagram Business Login (api.instagram.com), /subscribed_apps NON è supportato.
  // La webhook subscription avviene tramite Meta App Dashboard o Graph API con app-level token.
  // Skippiamo questa chiamata — il webhook funziona tramite la configurazione nel Meta Dashboard.
  console.log('[metaOAuthCallback] STEP 4: Webhook subscription skip (non supportato con Instagram Business Login token)');

  // ── STEP 5: Risolvi businessId ──
  const base44 = createClientFromRequest(req);
  if (!businessId && userId) {
    try {
      const allBiz = await base44.asServiceRole.entities.Business.filter({});
      const match  = allBiz.find(b => b.created_by === userId);
      if (match) { businessId = match.id; console.log('[metaOAuthCallback] businessId risolto:', businessId); }
    } catch (e) { console.warn('[metaOAuthCallback] businessId lookup fallito:', e.message); }
  }

  // ── STEP 6: Salva MetaConnection ──
  // Scopes: non usiamo /permissions GET (non supportato), assumiamo concessi se OAuth completato
  const payload = {
    user_id:                userId,
    business_id:            businessId,
    login_flow:             'instagram_business_login',
    access_token:           longToken,
    ig_token_expires_at:    tokenExpiresAt,
    granted_scopes:         'instagram_business_basic,instagram_business_manage_messages',
    has_basic_scope:        !syncError, // se /me è andato a buon fine, basic è ok
    has_messages_scope:     !syncError,
    ig_connected:           true,
    ig_account_id:          igUserId,
    ig_account_name:        igUsername || igName || '',
    ig_profile_picture_url: igProfilePic,
    meta_user_id:           igUserId,
    meta_user_name:         igUsername || igName || igUserId,
    // Facebook fields vuoti — flusso Instagram puro
    fb_connected:   false,
    fb_page_id:     '',
    fb_page_name:   '',
    fb_page_token:  '',
    status:         'connected',
    connected_at:   new Date().toISOString(),
    sync_error:     syncError,
    webhook_url:    WEBHOOK_URL,
  };

  console.log('[metaOAuthCallback] STEP 6: Salvo DB | igUserId:', igUserId, '| igUsername:', igUsername, '| syncError:', syncError || 'nessuno');

  try {
    const existing = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: userId });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.MetaConnection.update(existing[0].id, payload);
      console.log('[metaOAuthCallback] ✅ DB aggiornato');
    } else {
      await base44.asServiceRole.entities.MetaConnection.create(payload);
      console.log('[metaOAuthCallback] ✅ DB creato');
    }
  } catch (dbErr) {
    console.error('[metaOAuthCallback] DB FALLITO:', dbErr.message);
    return Response.redirect(ERROR_URL, 302);
  }

  // ── STEP 7: Aggiorna Business ──
  if (businessId) {
    try {
      await base44.asServiceRole.entities.Business.update(businessId, {
        ig_connesso: true,
        ig_username: igUsername || igName || igUserId,
        fb_connesso: false,
      });
    } catch (e) { console.warn('[metaOAuthCallback] Business update fallito:', e.message); }
  }

  console.log('[metaOAuthCallback] ✅ Instagram connection ready | username:', igUsername || '(non recuperato)', '| syncError:', syncError || 'nessuno');
  return Response.redirect(SUCCESS_URL, 302);
});