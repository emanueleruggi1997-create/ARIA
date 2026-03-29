import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const APP_SUCCESS_URL = 'https://emaral.it/settings?meta=success&tab=connections';
const APP_ERROR_URL   = 'https://emaral.it/settings?meta=error&tab=connections';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  console.log('[metaOAuthCallback] method:', req.method);
  console.log('[metaOAuthCallback] code:', code ? 'PRESENT' : 'MISSING');
  console.log('[metaOAuthCallback] state:', state ? 'PRESENT' : 'MISSING');
  console.log('[metaOAuthCallback] error:', error || 'none');

  if (error || !code || !state) {
    console.error('[metaOAuthCallback] OAuth denied or missing params. error:', error);
    return Response.redirect(APP_ERROR_URL, 302);
  }

  // Decode state
  let userId = '';
  let businessId = '';
  let intentType = 'facebook'; // 'facebook' | 'instagram'
  try {
    const decoded = JSON.parse(atob(state));
    userId = decoded.userId;
    businessId = decoded.businessId || '';
    intentType = decoded.type || 'facebook';
    console.log('[metaOAuthCallback] state decoded — userId:', userId, 'businessId:', businessId, 'type:', intentType);
  } catch (e) {
    console.error('[metaOAuthCallback] Invalid state:', e.message);
    return Response.redirect(APP_ERROR_URL, 302);
  }

  const appId      = (Deno.env.get('META_APP_ID') || '').trim();
  const appSecret  = (Deno.env.get('META_APP_SECRET') || '').trim();
  const rawUri     = (Deno.env.get('META_REDIRECT_URI') || '').trim();
  // Guard against accidental "KEY = value" format
  const redirectUri = rawUri.includes('=') ? rawUri.split('=').slice(1).join('=').trim() : rawUri;

  // 1. Exchange code → short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token` +
    `?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&client_secret=${appSecret}&code=${code}`
  );
  const tokenData = await tokenRes.json();
  console.log('[metaOAuthCallback] token exchange result:', JSON.stringify({ access_token: tokenData.access_token ? 'PRESENT' : 'MISSING', error: tokenData.error }));

  if (!tokenData.access_token) {
    console.error('[metaOAuthCallback] Token exchange FAILED:', JSON.stringify(tokenData));
    return Response.redirect(APP_ERROR_URL, 302);
  }
  console.log('[metaOAuthCallback] Token exchange SUCCESS');

  // 2. Exchange short-lived → long-lived token
  const llRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token` +
    `?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}` +
    `&fb_exchange_token=${tokenData.access_token}`
  );
  const llData = await llRes.json();
  const longToken = llData.access_token || tokenData.access_token;
  console.log('[metaOAuthCallback] long-lived token:', llData.access_token ? 'obtained' : 'fallback to short-lived');

  // 3. Fetch Meta user info
  const meRes  = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${longToken}`);
  const meData = await meRes.json();
  console.log('[metaOAuthCallback] meData:', JSON.stringify({ id: meData.id, name: meData.name, email: meData.email }));

  // 4. Fetch channel-specific data based on intent
  const payload = {
    user_id: userId,
    business_id: businessId,
    access_token: longToken,
    meta_user_id: meData.id || '',
    meta_user_name: meData.name || '',
    status: 'connected',
    connected_at: new Date().toISOString(),
  };

  if (intentType === 'facebook') {
    // Fetch Facebook Pages with explicit fields
    try {
      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${longToken}`);
      const pagesData = await pagesRes.json();
      console.log('[metaOAuthCallback] /me/accounts response:', JSON.stringify(pagesData));
      const page = pagesData.data?.[0];
      if (page && page.id && page.access_token) {
        payload.fb_connected = true;
        payload.fb_page_id = page.id;
        payload.fb_page_name = page.name || 'Unnamed Page';
        payload.fb_page_token = page.access_token;
        console.log('[metaOAuthCallback] FB page found:', page.name, 'id:', page.id);
      } else {
        payload.fb_connected = false;
        console.log('[metaOAuthCallback] No FB pages found or missing required fields');
      }
    } catch (e) {
      console.error('[metaOAuthCallback] FB pages fetch error:', e.message);
      payload.fb_connected = false;
    }
  } else if (intentType === 'instagram') {
    // Fetch Instagram Business accounts via Facebook Pages
    try {
      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${longToken}`);
      const pagesData = await pagesRes.json();
      console.log('[metaOAuthCallback] /me/accounts response (IG intent):', JSON.stringify(pagesData));
      const page = pagesData.data?.[0];
      if (page && page.id) {
        // Use user token (longToken) to read instagram_business_account from page
        const igRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${longToken}`);
        const igData = await igRes.json();
        console.log('[metaOAuthCallback] page instagram_business_account response:', JSON.stringify(igData));
        const igId = igData.instagram_business_account?.id;
        if (igId) {
          const igInfoRes = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=id,name,username&access_token=${longToken}`);
          const igInfo = await igInfoRes.json();
          console.log('[metaOAuthCallback] IG account info response:', JSON.stringify(igInfo));
          payload.ig_connected = true;
          payload.ig_account_id = igId;
          payload.ig_account_name = igInfo.username || igInfo.name || igId;
          // Store page info for future publishing
          payload.fb_page_token = page.access_token;
          payload.fb_page_id = page.id;
          payload.fb_page_name = page.name || 'Unnamed Page';
          console.log('[metaOAuthCallback] IG account found:', payload.ig_account_name, 'id:', igId);
        } else {
          payload.ig_connected = false;
          console.log('[metaOAuthCallback] No IG Business account linked to FB page:', page.id);
        }
      } else {
        payload.ig_connected = false;
        console.log('[metaOAuthCallback] No FB pages found for IG lookup');
      }
    } catch (e) {
      console.error('[metaOAuthCallback] IG fetch error:', e.message);
      payload.ig_connected = false;
    }
  }

  // 5. Save MetaConnection to database
  const base44 = createClientFromRequest(req);
  try {
    const existing = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: userId });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.MetaConnection.update(existing[0].id, payload);
      console.log('[metaOAuthCallback] DB save SUCCESS (update) id:', existing[0].id);
    } else {
      const created = await base44.asServiceRole.entities.MetaConnection.create(payload);
      console.log('[metaOAuthCallback] DB save SUCCESS (create) id:', created?.id);
    }
  } catch (dbErr) {
    console.error('[metaOAuthCallback] DB save FAILED:', dbErr.message);
    return Response.redirect(APP_ERROR_URL, 302);
  }

  console.log('[metaOAuthCallback] Redirecting to:', APP_SUCCESS_URL);
  return Response.redirect(APP_SUCCESS_URL, 302);
});