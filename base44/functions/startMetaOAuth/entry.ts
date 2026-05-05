import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Instagram Direct Login (nuova API luglio 2024) ──
// Usa api.instagram.com — NON graph.facebook.com
// NON richiede Facebook Page collegata
const IG_APP_ID     = Deno.env.get('IG_APP_ID') || Deno.env.get('META_APP_ID') || '';
const REDIRECT_URI  = (Deno.env.get('META_REDIRECT_URI') || '').trim();

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!REDIRECT_URI || !REDIRECT_URI.startsWith('http')) {
    console.error('[startMetaOAuth] META_REDIRECT_URI non valido:', REDIRECT_URI);
    return Response.json({ error: 'Configurazione META_REDIRECT_URI non valida' }, { status: 500 });
  }

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const businessId = body.businessId || '';

  const state = btoa(JSON.stringify({ userId: user.id, businessId }));

  // Scopes per messaggi DM Instagram Business
  // NOTA: instagram_business_manage_comments rimosso — non approvato (Not approved)
  const scope = [
    'instagram_business_basic',
    'instagram_business_manage_messages',
  ].join(',');

  // URL OAuth Instagram Direct Login (api.instagram.com)
  const params = new URLSearchParams({
    client_id:     IG_APP_ID,
    redirect_uri:  REDIRECT_URI,
    scope,
    response_type: 'code',
    state:         state,
  });

  const authUrl = `https://api.instagram.com/oauth/authorize?${params.toString()}`;

  console.log('[startMetaOAuth] ════════════════════════════');
  console.log('[startMetaOAuth] IG_APP_ID:', IG_APP_ID);
  console.log('[startMetaOAuth] REDIRECT_URI:', REDIRECT_URI);
  console.log('[startMetaOAuth] scope:', scope);
  console.log('[startMetaOAuth] userId:', user.id, '| businessId:', businessId);
  console.log('[startMetaOAuth] authUrl:', authUrl);
  console.log('[startMetaOAuth] ════════════════════════════');

  return Response.json({ url: authUrl });
});