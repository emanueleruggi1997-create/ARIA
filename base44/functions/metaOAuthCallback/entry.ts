import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const APP_SUCCESS_URL = 'https://emaral.it/settings?meta=success&tab=connections';
const APP_ERROR_URL   = 'https://emaral.it/settings?meta=error&tab=connections';
const IG_APP_ID     = Deno.env.get('IG_APP_ID') || '';
const IG_APP_SECRET = Deno.env.get('IG_APP_SECRET') || '';

const VERIFY_TOKEN = 'emaral2026';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── Webhook verification (GET from Meta) ──
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    console.log('[metaOAuthCallback] GET verify — mode:', mode, '| token match:', token === VERIFY_TOKEN);
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    // Fall through: could be an OAuth redirect (has code/state params)
  }

  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  console.log('[metaOAuthCallback] code:', code ? 'PRESENT' : 'MISSING', '| error:', error || 'none');

  if (error || !code || !state) {
    console.error('[metaOAuthCallback] OAuth denied or missing params:', error);
    return Response.redirect(APP_ERROR_URL, 302);
  }

  // Decode state
  let userId = '';
  let businessId = '';
  try {
    const decoded = JSON.parse(atob(state));
    userId     = decoded.userId;
    businessId = decoded.businessId || '';
    console.log('[metaOAuthCallback] state decoded — userId:', userId, 'businessId:', businessId);
  } catch (e) {
    console.error('[metaOAuthCallback] Invalid state:', e.message);
    return Response.redirect(APP_ERROR_URL, 302);
  }

  const rawUri = (Deno.env.get('META_REDIRECT_URI') || '').trim();
  const redirectUri = rawUri.includes('=') ? rawUri.split('=').slice(1).join('=').trim() : rawUri;
  console.log('[metaOAuthCallback] redirectUri used:', redirectUri);

  // 1. Exchange code → short-lived token (Instagram Business Login API)
  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: IG_APP_ID,
      client_secret: IG_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  console.log('[metaOAuthCallback] short-lived token:', tokenData.access_token ? 'PRESENT' : 'MISSING', '| error:', JSON.stringify(tokenData.error_message || tokenData.error || ''));

  if (!tokenData.access_token) {
    console.error('[metaOAuthCallback] Token exchange FAILED:', JSON.stringify(tokenData));
    return Response.redirect(APP_ERROR_URL, 302);
  }

  const shortToken = tokenData.access_token;
  const igUserId   = tokenData.user_id || '';

  // 2. Exchange short-lived → long-lived token (60 giorni)
  const llRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortToken}`
  );
  const llData = await llRes.json();
  const longToken = llData.access_token || shortToken;
  console.log('[metaOAuthCallback] long-lived token:', llData.access_token ? 'obtained' : 'fallback to short-lived');

  // 3. Fetch Instagram user info
  const meRes  = await fetch(`https://graph.instagram.com/v19.0/me?fields=id,name,username&access_token=${longToken}`);
  const meData = await meRes.json();
  console.log('[metaOAuthCallback] IG user info:', JSON.stringify({ id: meData.id, username: meData.username, name: meData.name }));

  // 4. Build payload
  const payload = {
    user_id: userId,
    business_id: businessId,
    access_token: longToken,
    meta_user_id: meData.id || igUserId || '',
    meta_user_name: meData.username || meData.name || '',
    ig_connected: true,
    ig_account_id: meData.id || igUserId || '',
    ig_account_name: meData.username || meData.name || '',
    status: 'connected',
    connected_at: new Date().toISOString(),
  };

  // 5. Save to DB
  const base44 = createClientFromRequest(req);
  try {
    const existing = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: userId });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.MetaConnection.update(existing[0].id, payload);
      console.log('[metaOAuthCallback] DB update SUCCESS id:', existing[0].id);
    } else {
      const created = await base44.asServiceRole.entities.MetaConnection.create(payload);
      console.log('[metaOAuthCallback] DB create SUCCESS id:', created?.id);
    }
  } catch (dbErr) {
    console.error('[metaOAuthCallback] DB save FAILED:', dbErr.message);
    return Response.redirect(APP_ERROR_URL, 302);
  }

  console.log('[metaOAuthCallback] Redirecting to:', APP_SUCCESS_URL);
  return Response.redirect(APP_SUCCESS_URL, 302);
});