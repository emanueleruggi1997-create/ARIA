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

  // Facebook Login for Business con config_id — carica automaticamente i permessi corretti
  // inclusi pages_manage_metadata, instagram_manage_messages, ecc.
  const authUrl = `https://www.facebook.com/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&config_id=${CONFIG_ID}&state=${encodeURIComponent(state)}&response_type=code`;

  console.log('[startMetaOAuth] userId:', user.id, '| businessId:', businessId);
  console.log('[startMetaOAuth] redirectUri:', redirectUri);
  console.log('[startMetaOAuth] authUrl (FB Login for Business):', authUrl);

  return Response.json({ url: authUrl });
});