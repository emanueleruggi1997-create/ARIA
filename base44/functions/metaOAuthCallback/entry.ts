import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// This function is called directly by Meta as a GET redirect after OAuth consent.
// The META_REDIRECT_URI secret must be set to THIS function's public URL.
// e.g. https://api.base44.com/api/apps/<APP_ID>/functions/metaOAuthCallback
//
// The app UI redirect target after success/failure:
const APP_SUCCESS_URL = 'https://emaral.it/settings?meta=connected';
const APP_ERROR_URL = 'https://emaral.it/settings?meta=error';

Deno.serve(async (req) => {
  // Meta sends a GET request with ?code=...&state=...
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  console.log('[metaOAuthCallback] method:', req.method);
  console.log('[metaOAuthCallback] code:', code ? 'present' : 'missing');
  console.log('[metaOAuthCallback] state:', state ? 'present' : 'missing');
  console.log('[metaOAuthCallback] error:', error || 'none');

  // User denied or Meta returned an error
  if (error || !code || !state) {
    console.error('[metaOAuthCallback] OAuth error or missing params:', error);
    return Response.redirect(APP_ERROR_URL + '_denied', 302);
  }

  let userId = '';
  let businessId = '';
  try {
    const decoded = JSON.parse(atob(state));
    userId = decoded.userId;
    businessId = decoded.businessId;
  } catch (e) {
    console.error('[metaOAuthCallback] Invalid state:', e.message);
    return Response.redirect(APP_ERROR_URL + '_state', 302);
  }

  const appId = (Deno.env.get('META_APP_ID') || '').trim();
  const appSecret = (Deno.env.get('META_APP_SECRET') || '').trim();
  const rawRedirectUri = (Deno.env.get('META_REDIRECT_URI') || '').trim();
  // Clean up accidental "KEY = value" format
  const redirectUri = rawRedirectUri.includes('=')
    ? rawRedirectUri.split('=').slice(1).join('=').trim()
    : rawRedirectUri;

  // 1. Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
  );
  const tokenData = await tokenRes.json();
  console.log('[metaOAuthCallback] tokenData:', JSON.stringify(tokenData));

  if (!tokenData.access_token) {
    console.error('[metaOAuthCallback] Token exchange failed:', JSON.stringify(tokenData));
    return Response.redirect(APP_ERROR_URL + '_token', 302);
  }

  // 2. Exchange for long-lived token
  const llRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
  );
  const llData = await llRes.json();
  const longToken = llData.access_token || tokenData.access_token;

  // 3. Get Meta user info
  const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${longToken}`);
  const meData = await meRes.json();
  console.log('[metaOAuthCallback] meData:', JSON.stringify(meData));

  // 4. Upsert MetaConnection (basic user-level connection, no pages/IG yet)
  const base44 = createClientFromRequest(req);
  const existing = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: userId });
  const payload = {
    user_id: userId,
    business_id: businessId || '',
    access_token: longToken,
    meta_user_id: meData.id || '',
    meta_user_name: meData.name || '',
    status: 'connected',
    connected_at: new Date().toISOString(),
    fb_connected: false,
    ig_connected: false,
  };

  if (existing.length > 0) {
    await base44.asServiceRole.entities.MetaConnection.update(existing[0].id, payload);
  } else {
    await base44.asServiceRole.entities.MetaConnection.create(payload);
  }

  console.log('[metaOAuthCallback] MetaConnection saved. Redirecting to app...');
  return Response.redirect(APP_SUCCESS_URL, 302);
});