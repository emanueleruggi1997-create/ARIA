import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const appId = Deno.env.get('META_APP_ID');
  const redirectUri = (Deno.env.get('META_REDIRECT_URI') || '').trim();

  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'business_management',
    'public_profile',
  ].join(',');

  const state = btoa(JSON.stringify({ userId: user.id, businessId: req.headers.get('x-business-id') || '' }));

  const url = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${encodeURIComponent(state)}&response_type=code`;

  return Response.json({ url });
});