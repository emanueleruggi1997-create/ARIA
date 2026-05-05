import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const META_APP_ID    = Deno.env.get('META_APP_ID') || Deno.env.get('IG_APP_ID') || '';
const CONFIG_ID      = '989192803616440'; // Facebook Login for Business Configuration ID

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

  const state = btoa(JSON.stringify({ userId: user.id, businessId }));

  // Instagram OAuth via config_id — gli scope sono gestiti da Meta nella configurazione
  const authUrl = `https://www.instagram.com/oauth/authorize?client_id=2005884836806776&redirect_uri=https://emaral.it/api/apps/69bfc400a0538988ee3a6cfd/functions/metaOAuthCallback&response_type=code&config_id=989192803616440&state=${encodeURIComponent(state)}`;

  console.log('[startMetaOAuth] ════════════════════════════');
  console.log('[startMetaOAuth] REDIRECT_URI:', redirectUri);
  console.log('[startMetaOAuth] userId:', user.id, '| businessId:', businessId);
  console.log('[startMetaOAuth] authUrl:', authUrl);
  console.log('[startMetaOAuth] ════════════════════════════');

  return Response.json({ url: authUrl });
});