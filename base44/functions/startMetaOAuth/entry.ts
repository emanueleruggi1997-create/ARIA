import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const IG_APP_ID = Deno.env.get('IG_APP_ID') || '';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const redirectUri = (Deno.env.get('META_REDIRECT_URI') || '').trim();
  if (!redirectUri || !redirectUri.startsWith('http')) {
    console.error('[startMetaOAuth] META_REDIRECT_URI invalid:', redirectUri);
    return Response.json({ error: 'Configurazione META_REDIRECT_URI non valida', received: redirectUri || '(vuota)' }, { status: 500 });
  }

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const businessId = body.businessId || '';

  const scopes = 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_manage_insights';
  const state = btoa(JSON.stringify({ userId: user.id, businessId }));

  const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${encodeURIComponent(state)}&response_type=code`;

  console.log('[startMetaOAuth] userId:', user.id, '| businessId:', businessId);
  console.log('[startMetaOAuth] redirectUri:', redirectUri);

  return Response.json({ url: authUrl });
});