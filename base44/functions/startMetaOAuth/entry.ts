import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Instagram Business Login (flusso diretto, NO Facebook Login) ──
const IG_APP_ID    = Deno.env.get('IG_APP_ID') || '';
const REDIRECT_URI = (Deno.env.get('META_REDIRECT_URI') || '').trim();

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!IG_APP_ID) return Response.json({ error: 'IG_APP_ID non configurato' }, { status: 500 });
  if (!REDIRECT_URI || !REDIRECT_URI.startsWith('http')) {
    return Response.json({ error: 'META_REDIRECT_URI non valido: ' + REDIRECT_URI }, { status: 500 });
  }

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const businessId = body.businessId || '';
  const state = btoa(JSON.stringify({ userId: user.id, businessId }));

  // Scopes Instagram Business Login — instagram_business_manage_comments opzionale (se approvato)
  const scope = 'instagram_business_basic,instagram_business_manage_messages';

  const params = new URLSearchParams({
    client_id:     IG_APP_ID,
    redirect_uri:  REDIRECT_URI,
    scope,
    response_type: 'code',
    state,
  });

  const authUrl = `https://api.instagram.com/oauth/authorize?${params.toString()}`;

  console.log('[startMetaOAuth] IG_APP_ID:', IG_APP_ID);
  console.log('[startMetaOAuth] REDIRECT_URI:', REDIRECT_URI);
  console.log('[startMetaOAuth] scope:', scope);
  console.log('[startMetaOAuth] authUrl:', authUrl);

  return Response.json({ url: authUrl });
});