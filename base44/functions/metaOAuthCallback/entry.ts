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
  try {
    const decoded = JSON.parse(atob(state));
    userId = decoded.userId;
    businessId = decoded.businessId || '';
    console.log('[metaOAuthCallback] state decoded — userId:', userId, 'businessId:', businessId);
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

  // 4. Save MetaConnection to database
  const base44 = createClientFromRequest(req);
  const payload = {
    user_id: userId,
    business_id: businessId,
    access_token: longToken,
    meta_user_id: meData.id || '',
    meta_user_name: meData.name || '',
    status: 'connected',
    connected_at: new Date().toISOString(),
    fb_connected: false,
    ig_connected: false,
  };

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