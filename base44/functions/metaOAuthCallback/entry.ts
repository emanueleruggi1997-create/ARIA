import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Instagram Business Login OAuth Callback ──
// Flusso moderno: api.instagram.com per token exchange, graph.instagram.com per dati account
const IG_APP_ID     = Deno.env.get('IG_APP_ID') || '';
const IG_APP_SECRET = Deno.env.get('IG_APP_SECRET') || '';
const VERIFY_TOKEN  = 'emaral2026';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── Webhook verification (GET da Meta) ──
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      console.log('[metaOAuthCallback] Webhook GET verification OK');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    // OAuth redirect
  }

  const code      = url.searchParams.get('code');
  const state     = url.searchParams.get('state');
  const error     = url.searchParams.get('error');
  const errorDesc = url.searchParams.get('error_description') || '';

  const REDIRECT_URI = (Deno.env.get('META_REDIRECT_URI') || '').trim();
  const SUCCESS_URL  = 'https://emaral.it/settings?meta=success&tab=connections';
  const ERROR_URL    = 'https://emaral.it/settings?meta=error&tab=connections';

  console.log('[metaOAuthCallback] code:', code ? 'PRESENTE' : 'ASSENTE', '| error:', error || 'nessuno');

  if (error || !code || !state) {
    console.error('[metaOAuthCallback] OAuth negato:', error, errorDesc);
    return Response.redirect(ERROR_URL, 302);
  }

  // 1. Decodifica state
  let userId = '', businessId = '';
  try {
    const decoded = JSON.parse(atob(state));
    userId     = decoded.userId || '';
    businessId = decoded.businessId || '';
  } catch (e) {
    console.error('[metaOAuthCallback] State non valido:', e.message);
    return Response.redirect(ERROR_URL, 302);
  }

  // 2. Token exchange: code → short-lived token (api.instagram.com)
  console.log('[metaOAuthCallback] STEP 1: Token exchange');
  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     IG_APP_ID,
      client_secret: IG_APP_SECRET,
      grant_type:    'authorization_code',
      redirect_uri:  REDIRECT_URI,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  console.log('[metaOAuthCallback] Token exchange:', JSON.stringify(tokenData));

  if (!tokenData.access_token) {
    console.error('[metaOAuthCallback] Token exchange FALLITO');
    return Response.redirect(ERROR_URL, 302);
  }

  const shortToken = tokenData.access_token;
  // user_id dal token exchange = Instagram-scoped user ID
  const igUserIdFromToken = tokenData.user_id ? String(tokenData.user_id) : '';

  // 3. Short-lived → Long-lived token (graph.instagram.com)
  console.log('[metaOAuthCallback] STEP 2: Long-lived token');
  const llRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortToken}`
  );
  const llData = await llRes.json();
  console.log('[metaOAuthCallback] Long-lived token:', JSON.stringify(llData));

  const longToken      = llData.access_token || shortToken;
  const expiresIn      = llData.expires_in || (60 * 24 * 60 * 60); // default 60 giorni
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // 4. Verifica token + recupera account info con instagram_business_basic
  // Usa sempre Authorization: Bearer, mai ?access_token=
  console.log('[metaOAuthCallback] STEP 3: Recupero account info');
  let igUserId = '', igUsername = '', igName = '', igProfilePic = '', grantedScopes = '';

  try {
    // Recupera info account
    const meRes = await fetch(
      'https://graph.instagram.com/v21.0/me?fields=id,username,name,profile_picture_url,account_type',
      { headers: { 'Authorization': `Bearer ${longToken}` } }
    );
    const meData = await meRes.json();
    console.log('[metaOAuthCallback] /me result:', JSON.stringify(meData));

    if (!meData.error) {
      igUserId    = meData.id || igUserIdFromToken;
      igUsername  = meData.username || '';
      igName      = meData.name || '';
      igProfilePic = meData.profile_picture_url || '';
    } else {
      console.warn('[metaOAuthCallback] /me error:', JSON.stringify(meData.error));
      igUserId = igUserIdFromToken;
    }

    // Recupera scopes concessi
    const scopeRes = await fetch(
      `https://graph.instagram.com/v21.0/${igUserId || igUserIdFromToken}/permissions`,
      { headers: { 'Authorization': `Bearer ${longToken}` } }
    );
    const scopeData = await scopeRes.json();
    console.log('[metaOAuthCallback] Scopes:', JSON.stringify(scopeData));
    if (scopeData.data) {
      grantedScopes = scopeData.data
        .filter(p => p.status === 'granted')
        .map(p => p.permission)
        .join(',');
    }
  } catch (e) {
    console.warn('[metaOAuthCallback] Errore recupero info:', e.message);
    igUserId = igUserIdFromToken;
  }

  console.log('[metaOAuthCallback] igUserId:', igUserId, '| igUsername:', igUsername, '| scopes:', grantedScopes);

  if (!igUserId) {
    console.error('[metaOAuthCallback] Impossibile ottenere IG user ID');
    return Response.redirect(ERROR_URL, 302);
  }

  // 5. Sottoscrizione webhook per ricevere i DM
  console.log('[metaOAuthCallback] STEP 4: Webhook subscription per', igUserId);
  try {
    const subRes = await fetch(`https://graph.instagram.com/v21.0/${igUserId}/subscribed_apps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${longToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ subscribed_fields: 'messages,message_reactions,message_edit' }),
    });
    const subData = await subRes.json();
    console.log('[metaOAuthCallback] Webhook subscription:', JSON.stringify(subData));
    if (subData.success) {
      console.log('[metaOAuthCallback] ✅ Webhook sottoscritto');
    } else {
      console.warn('[metaOAuthCallback] ⚠️ Webhook subscription fallita:', JSON.stringify(subData.error || subData));
    }
  } catch (e) {
    console.warn('[metaOAuthCallback] Errore subscribe webhook:', e.message);
  }

  // 6. Risolvi businessId se mancante
  const base44 = createClientFromRequest(req);
  if (!businessId && userId) {
    try {
      const allBiz = await base44.asServiceRole.entities.Business.filter({});
      const match  = allBiz.find(b => b.created_by === userId);
      if (match) {
        businessId = match.id;
        console.log('[metaOAuthCallback] businessId ricavato dal DB:', businessId);
      }
    } catch (e) {
      console.warn('[metaOAuthCallback] businessId lookup fallito:', e.message);
    }
  }

  // 7. Salva MetaConnection (schema pulito, solo dati Instagram Business Login)
  const payload = {
    user_id:                userId,
    business_id:            businessId,
    access_token:           longToken,
    meta_user_id:           igUserId,
    meta_user_name:         igUsername || igName || igUserId,
    // Facebook fields vuoti — questo è un flusso Instagram puro
    fb_connected:           false,
    fb_page_id:             '',
    fb_page_name:           '',
    fb_page_token:          '',
    // Instagram fields
    ig_connected:           true,
    ig_account_id:          igUserId,
    ig_account_name:        igUsername || igName || '',
    ig_profile_picture_url: igProfilePic,
    ig_token_expires_at:    tokenExpiresAt,
    // Scopes concessi
    granted_scopes:         grantedScopes,
    status:                 'connected',
    connected_at:           new Date().toISOString(),
  };

  console.log('[metaOAuthCallback] STEP 5: Salvo DB | igUserId:', igUserId, '| igUsername:', igUsername);

  try {
    const existing = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: userId });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.MetaConnection.update(existing[0].id, payload);
      console.log('[metaOAuthCallback] ✅ DB aggiornato');
    } else {
      await base44.asServiceRole.entities.MetaConnection.create(payload);
      console.log('[metaOAuthCallback] ✅ DB creato');
    }
  } catch (dbErr) {
    console.error('[metaOAuthCallback] DB FALLITO:', dbErr.message);
    return Response.redirect(ERROR_URL, 302);
  }

  // 8. Aggiorna Business
  if (businessId) {
    try {
      await base44.asServiceRole.entities.Business.update(businessId, {
        ig_connesso: true,
        ig_username: igUsername || igName || igUserId,
        fb_connesso: false,
      });
    } catch (e) {
      console.warn('[metaOAuthCallback] Business update fallito:', e.message);
    }
  }

  console.log('[metaOAuthCallback] ✅ Flusso completato → redirect SUCCESS');
  return Response.redirect(SUCCESS_URL, 302);
});