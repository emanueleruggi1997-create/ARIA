import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Instagram Business Login OAuth Callback ──
// Flusso: api.instagram.com (token) + graph.instagram.com (dati account)
const IG_APP_ID     = Deno.env.get('IG_APP_ID') || '';
const IG_APP_SECRET = Deno.env.get('IG_APP_SECRET') || '';
const VERIFY_TOKEN  = 'emaral2026';
const WEBHOOK_URL   = 'https://emaral-smart-flow.base44.app/api/functions/webhookMeta';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Webhook verification (GET da Meta) — questo endpoint è anche callback OAuth
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

  // 2. Token exchange: code → short-lived (api.instagram.com)
  console.log('[metaOAuthCallback] STEP 1: Token exchange');
  const tokenRes  = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     IG_APP_ID,
      client_secret: IG_APP_SECRET,
      grant_type:    'authorization_code',
      redirect_uri:  REDIRECT_URI,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  console.log('[metaOAuthCallback] Token exchange result:', JSON.stringify(tokenData));

  if (!tokenData.access_token) {
    console.error('[metaOAuthCallback] Token exchange FALLITO:', JSON.stringify(tokenData));
    return Response.redirect(`${ERROR_URL}&reason=token_exchange_failed`, 302);
  }

  const shortToken       = tokenData.access_token;
  const igUserIdFromToken = tokenData.user_id ? String(tokenData.user_id) : '';

  // 3. Short-lived → Long-lived token (graph.instagram.com)
  console.log('[metaOAuthCallback] STEP 2: Long-lived token');
  const llRes  = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortToken}`
  );
  const llData = await llRes.json();
  console.log('[metaOAuthCallback] Long-lived token result:', JSON.stringify(llData));

  const longToken      = llData.access_token || shortToken;
  const expiresIn      = llData.expires_in || (60 * 24 * 60 * 60);
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // 4. Debug token — verifica scopes concessi
  console.log('[metaOAuthCallback] STEP 3: Debug token + verifica scopes');
  let grantedScopes = '';
  let hasBasicScope = false;
  let hasMessagesScope = false;
  let debugTokenData = {};

  try {
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${longToken}&access_token=${IG_APP_ID}|${IG_APP_SECRET}`
    );
    debugTokenData = await debugRes.json();
    console.log('[metaOAuthCallback] DEBUG TOKEN:', JSON.stringify(debugTokenData));

    const scopes = debugTokenData?.data?.scopes || [];
    grantedScopes = scopes.join(',');
    hasBasicScope    = scopes.includes('instagram_business_basic');
    hasMessagesScope = scopes.includes('instagram_business_manage_messages');
    console.log('[metaOAuthCallback] Scopes concessi:', grantedScopes);
    console.log('[metaOAuthCallback] instagram_business_basic:', hasBasicScope, '| instagram_business_manage_messages:', hasMessagesScope);
  } catch (e) {
    console.warn('[metaOAuthCallback] Debug token fallito:', e.message);
    // Prova fallback via /permissions
    try {
      const permRes  = await fetch(
        `https://graph.instagram.com/v21.0/${igUserIdFromToken}/permissions`,
        { headers: { 'Authorization': `Bearer ${longToken}` } }
      );
      const permData = await permRes.json();
      console.log('[metaOAuthCallback] Permissions fallback:', JSON.stringify(permData));
      if (permData.data) {
        const granted = permData.data.filter(p => p.status === 'granted').map(p => p.permission);
        grantedScopes    = granted.join(',');
        hasBasicScope    = granted.includes('instagram_business_basic');
        hasMessagesScope = granted.includes('instagram_business_manage_messages');
      }
    } catch (e2) {
      console.warn('[metaOAuthCallback] Permissions fallback fallito:', e2.message);
    }
  }

  // 5. Recupera info account Instagram (instagram_business_basic)
  console.log('[metaOAuthCallback] STEP 4: Recupero account info (instagram_business_basic)');
  let igUserId = igUserIdFromToken;
  let igUsername = '', igName = '', igProfilePic = '', syncError = '';

  try {
    const meRes  = await fetch(
      'https://graph.instagram.com/v21.0/me?fields=id,username,name,profile_picture_url,account_type',
      { headers: { 'Authorization': `Bearer ${longToken}` } }
    );
    const meData = await meRes.json();
    console.log('[metaOAuthCallback] /me result:', JSON.stringify(meData));

    if (meData.error) {
      syncError = `Meta API error: ${meData.error.message} (code ${meData.error.code})`;
      console.error('[metaOAuthCallback] /me error:', syncError);
    } else {
      igUserId    = meData.id || igUserIdFromToken;
      igUsername  = meData.username || '';
      igName      = meData.name || '';
      igProfilePic = meData.profile_picture_url || '';
    }
  } catch (e) {
    syncError = e.message;
    console.error('[metaOAuthCallback] /me exception:', e.message);
  }

  // Se username ancora vuoto, prova con ID esplicito
  if (!igUsername && igUserId) {
    try {
      const meRes2  = await fetch(
        `https://graph.instagram.com/v21.0/${igUserId}?fields=id,username,name,profile_picture_url`,
        { headers: { 'Authorization': `Bearer ${longToken}` } }
      );
      const meData2 = await meRes2.json();
      console.log('[metaOAuthCallback] /me by ID result:', JSON.stringify(meData2));
      if (!meData2.error) {
        igUsername  = meData2.username || igUsername;
        igName      = meData2.name || igName;
        igProfilePic = meData2.profile_picture_url || igProfilePic;
      }
    } catch (e) {
      console.warn('[metaOAuthCallback] /me by ID fallito:', e.message);
    }
  }

  console.log('[metaOAuthCallback] igUserId:', igUserId, '| igUsername:', igUsername, '| hasBasic:', hasBasicScope);

  // 6. Sottoscrizione webhook
  console.log('[metaOAuthCallback] STEP 5: Webhook subscription');
  try {
    const subRes  = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${longToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ subscribed_fields: 'messages,message_reactions,message_edit' }),
    });
    const subData = await subRes.json();
    console.log('[metaOAuthCallback] Webhook subscription:', JSON.stringify(subData));
    if (subData.success) {
      console.log('[metaOAuthCallback] ✅ Webhook sottoscritto');
    } else {
      console.warn('[metaOAuthCallback] ⚠️ Webhook subscription fallita:', JSON.stringify(subData.error || subData));
    }
  } catch (e) {
    console.warn('[metaOAuthCallback] Webhook subscription exception:', e.message);
  }

  // 7. Risolvi businessId
  const base44 = createClientFromRequest(req);
  if (!businessId && userId) {
    try {
      const allBiz = await base44.asServiceRole.entities.Business.filter({});
      const match  = allBiz.find(b => b.created_by === userId);
      if (match) { businessId = match.id; console.log('[metaOAuthCallback] businessId risolto:', businessId); }
    } catch (e) { console.warn('[metaOAuthCallback] businessId lookup fallito:', e.message); }
  }

  // 8. Salva MetaConnection — schema pulito Instagram Business Login
  const payload = {
    user_id:                userId,
    business_id:            businessId,
    // Token
    access_token:           longToken,
    ig_token_expires_at:    tokenExpiresAt,
    granted_scopes:         grantedScopes,
    // Account Instagram
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
    // Meta
    status:         'connected',
    connected_at:   new Date().toISOString(),
    // Debug
    sync_error:     syncError || '',
    has_basic_scope:    hasBasicScope,
    has_messages_scope: hasMessagesScope,
    login_flow:     'instagram_business_login',
    webhook_url:    WEBHOOK_URL,
  };

  console.log('[metaOAuthCallback] STEP 6: Salvo DB | igUserId:', igUserId, '| igUsername:', igUsername);

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

  // 9. Aggiorna Business
  if (businessId) {
    try {
      await base44.asServiceRole.entities.Business.update(businessId, {
        ig_connesso: true,
        ig_username: igUsername || igName || igUserId,
        fb_connesso: false,
      });
    } catch (e) { console.warn('[metaOAuthCallback] Business update fallito:', e.message); }
  }

  console.log('[metaOAuthCallback] ✅ Instagram connection ready | username:', igUsername || '(non recuperato)', '| scopes:', grantedScopes);
  return Response.redirect(SUCCESS_URL, 302);
});