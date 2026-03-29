import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const appId = (Deno.env.get('META_APP_ID') || '').trim();
  const redirectUri = (Deno.env.get('META_REDIRECT_URI') || '').trim();

  // --- Guard: validate secrets before doing anything ---
  if (!appId) {
    console.error('[startMetaOAuth] META_APP_ID is missing or empty');
    return Response.json({ error: 'Invalid META_APP_ID configuration' }, { status: 500 });
  }

  // Clean up accidental "KEY = value" format (the value was stored as "META_REDIRECT_URI = https://...")
  const cleanRedirectUri = redirectUri.includes('=')
    ? redirectUri.split('=').slice(1).join('=').trim()
    : redirectUri;

  if (
    !cleanRedirectUri ||
    cleanRedirectUri === 'META_REDIRECT_URI' ||
    cleanRedirectUri === 'undefined' ||
    cleanRedirectUri === 'null' ||
    !cleanRedirectUri.startsWith('http')
  ) {
    console.error('[startMetaOAuth] META_REDIRECT_URI is missing or invalid:', JSON.stringify(cleanRedirectUri));
    return Response.json({
      error: 'Invalid META_REDIRECT_URI configuration',
      received: cleanRedirectUri || '(empty)',
      hint: 'Set META_REDIRECT_URI secret to just the URL value, e.g.: https://emaral.it/api/meta/callback'
    }, { status: 500 });
  }

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const intentType = body.type || 'facebook'; // 'facebook' | 'instagram'

  // Instagram needs pages_show_list to find linked IG Business accounts
  const scopes = intentType === 'instagram'
    ? 'email,public_profile,pages_show_list,instagram_basic'
    : 'email,public_profile,pages_show_list';

  const state = btoa(JSON.stringify({ userId: user.id, businessId: req.headers.get('x-business-id') || '', type: intentType }));

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(cleanRedirectUri)}&scope=${scopes}&state=${encodeURIComponent(state)}&response_type=code`;

  // Log the exact URL so you can verify it in the backend function logs
  console.log('[startMetaOAuth] appId:', appId);
  console.log('[startMetaOAuth] redirectUri (raw from secret):', redirectUri);
  console.log('[startMetaOAuth] redirectUri (cleaned):', cleanRedirectUri);
  console.log('[startMetaOAuth] redirectUri (encoded):', encodeURIComponent(cleanRedirectUri));
  console.log('[startMetaOAuth] final authUrl:', authUrl);

  return Response.json({ url: authUrl, debug: { appId, redirectUri: cleanRedirectUri } });
});