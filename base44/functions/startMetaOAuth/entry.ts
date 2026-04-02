import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const IG_APP_ID = '2480637305706304';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rawUri = (Deno.env.get('META_REDIRECT_URI') || '').trim();
  const redirectUri = rawUri.includes('=') ? rawUri.split('=').slice(1).join('=').trim() : rawUri;

  if (!redirectUri || !redirectUri.startsWith('http')) {
    console.error('[startMetaOAuth] META_REDIRECT_URI invalid:', redirectUri);
    return Response.json({ error: 'Invalid META_REDIRECT_URI configuration', received: redirectUri || '(empty)' }, { status: 500 });
  }

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const businessId = body.businessId || req.headers.get('x-business-id') || '';

  // Instagram Business Login API scopes
  const scopes = 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_manage_insights';

  const state = btoa(JSON.stringify({ userId: user.id, businessId, type: 'instagram' }));

  // Use Instagram Business OAuth endpoint
  const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${encodeURIComponent(state)}&response_type=code`;

  console.log('[startMetaOAuth] IG App ID:', IG_APP_ID);
  console.log('[startMetaOAuth] redirectUri:', redirectUri);
  console.log('[startMetaOAuth] authUrl:', authUrl);

  return Response.json({ url: authUrl });
});