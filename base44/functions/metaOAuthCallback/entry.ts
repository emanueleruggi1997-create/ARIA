import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Instagram Direct Login Callback ──
// Flusso corretto per Instagram Platform API (luglio 2024+)
// Token exchange su api.instagram.com, info su graph.instagram.com
const IG_APP_ID     = Deno.env.get('IG_APP_ID') || Deno.env.get('META_APP_ID') || '';
const IG_APP_SECRET = Deno.env.get('IG_APP_SECRET') || Deno.env.get('META_APP_SECRET') || '';
const VERIFY_TOKEN  = 'emaral2026';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── Webhook verification (GET da Meta) ──
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      console.log('[metaOAuthCallback] Webhook verified OK');
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
  }

  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDesc = url.searchParams.get('error_description') || '';

  const REDIRECT_URI  = (Deno.env.get('META_REDIRECT_URI') || '').trim();
  const SUCCESS_URL   = 'https://emaral.it/settings?meta=success&tab=connections';
  const ERROR_URL     = 'https://emaral.it/settings?meta=error&tab=connections';

  console.log('[metaOAuthCallback] code:', code ? 'PRESENTE' : 'ASSENTE', '| error:', error || 'nessuno', errorDesc);

  if (error || !code || !state) {
    console.error('[metaOAuthCallback] OAuth negato:', error, errorDesc);
    return Response.redirect(ERROR_URL, 302);
  }

  // 1. Decodifica state
  let userId = '';
  let businessId = '';
  try {
    const decoded = JSON.parse(atob(state));
    userId     = decoded.userId || '';
    businessId = decoded.businessId || '';
  } catch (e) {
    console.error('[metaOAuthCallback] State non valido:', e.message);
    return Response.redirect(ERROR_URL, 302);
  }

  // 2. Scambio code → Short-lived Token (Instagram Direct Login)
  // CRITICO: usa api.instagram.com, NON graph.facebook.com
  console.log('[metaOAuthCallback] ── STEP 1: Token exchange su api.instagram.com');
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
  console.log('[metaOAuthCallback] Token exchange result:', JSON.stringify(tokenData));

  if (!tokenData.access_token) {
    console.error('[metaOAuthCallback] Token exchange FALLITO:', JSON.stringify(tokenData));
    return Response.redirect(ERROR_URL, 302);
  }

  const shortToken = tokenData.access_token;
  const igUserId   = tokenData.user_id ? String(tokenData.user_id) : '';

  // 3. Scambio short-lived → Long-lived Token (60 giorni)
  // Instagram Business Login: usa graph.instagram.com/access_token con GET + ig_exchange_token
  console.log('[metaOAuthCallback] ── STEP 2: Long-lived token su graph.instagram.com (GET)');
  const llRes = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortToken}`);
  const llData = await llRes.json();
  console.log('[metaOAuthCallback] Long-lived token result:', JSON.stringify(llData));

  // Se il long-lived token fallisce, usa lo short token
  const longToken    = llData.access_token || shortToken;
  const expiresIn    = llData.expires_in || (60 * 24 * 60 * 60);
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // 4. Recupera info account via api.instagram.com (Instagram Business Login usa questa API)
  console.log('[metaOAuthCallback] ── STEP 3: Info account | igUserId:', igUserId);
  let igData = {};
  try {
    const igRes = await fetch(`https://graph.instagram.com/v21.0/me?fields=user_id,username,name,profile_picture_url`, {
      headers: { 'Authorization': `Bearer ${longToken}` },
    });
    igData = await igRes.json();
    console.log('[metaOAuthCallback] /me result:', JSON.stringify(igData));
    if (igData.error) {
      // Fallback: usa l'ID numerico dal token exchange direttamente
      console.warn('[metaOAuthCallback] /me fallito, uso igUserId come fallback:', igUserId);
      igData = {};
    }
  } catch (e) {
    console.warn('[metaOAuthCallback] /me eccezione:', e.message);
  }
  console.log('[metaOAuthCallback] IG account info finale:', JSON.stringify(igData));

  // igUserId dal token exchange è l'app-scoped ID (quello che arriva come entry.id nel webhook)
  // igData.id è l'Instagram-scoped ID (può differire)
  const igAccountId   = String(igUserId) || igData.id || '';
  const igUsername    = igData.username || '';
  const igName        = igData.name || igUsername;
  const igProfilePic  = igData.profile_picture_url || '';
  const igAccountName = igUsername || igName || '';
  console.log('[metaOAuthCallback] igUserId (app-scoped):', igAccountId, '| igData.id:', igData.id || 'N/A');

  if (!igAccountId) {
    console.error('[metaOAuthCallback] Impossibile ottenere IG account ID');
    return Response.redirect(ERROR_URL, 302);
  }

  // 5. Sottoscrizione webhook — Instagram Business Login usa access_token come query param per subscribed_apps
  console.log('[metaOAuthCallback] ── STEP 4: Webhook subscription per', igAccountId);
  let webhookSuccess = false;
  try {
    // Prova prima con Authorization: Bearer
    let subRes = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${longToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ subscribed_fields: 'messages' }),
    });
    let subData = await subRes.json();
    console.log('[metaOAuthCallback] Webhook subscription result (Bearer):', JSON.stringify(subData));

    // Se fallisce con Bearer, prova con access_token nel body
    if (!subData.success) {
      subRes = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          subscribed_fields: 'messages',
          access_token: longToken,
        }),
      });
      subData = await subRes.json();
      console.log('[metaOAuthCallback] Webhook subscription result (body token):', JSON.stringify(subData));
    }

    if (subData.success) {
      webhookSuccess = true;
      console.log('[metaOAuthCallback] ✅ Webhook sottoscritto');
    } else {
      console.warn('[metaOAuthCallback] ⚠️ Webhook subscription non riuscita:', JSON.stringify(subData.error || subData));
    }
  } catch (e) {
    console.warn('[metaOAuthCallback] Errore subscribe webhook:', e.message);
  }

  // 6. Risolvi businessId se mancante
  const base44 = createClientFromRequest(req);
  if (!businessId && userId) {
    try {
      const allBiz = await base44.asServiceRole.entities.Business.filter({});
      const match = allBiz.find(b => b.created_by === userId);
      if (match) {
        businessId = match.id;
        console.log('[metaOAuthCallback] businessId ricavato dal DB:', businessId);
      }
    } catch (e) {
      console.warn('[metaOAuthCallback] businessId lookup fallito:', e.message);
    }
  }

  // 7. Salva connessione nel DB
  console.log('[metaOAuthCallback] ── STEP 5: Salvo connessione DB | userId:', userId, '| igAccountId:', igAccountId);
  const payload = {
    user_id:                userId,
    business_id:            businessId,
    access_token:           longToken,
    meta_user_id:           igAccountId,
    meta_user_name:         igAccountName,
    fb_connected:           false,        // Non usiamo Facebook in questo flusso
    fb_page_id:             '',
    fb_page_name:           '',
    fb_page_token:          longToken,    // Compatibilità con codice esistente
    ig_connected:           true,
    ig_account_id:          igAccountId,
    ig_account_name:        igAccountName,
    ig_profile_picture_url: igProfilePic,
    ig_token_expires_at:    tokenExpiresAt,
    status:                 'connected',
    connected_at:           new Date().toISOString(),
  };

  try {
    const existing = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: userId });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.MetaConnection.update(existing[0].id, payload);
      console.log('[metaOAuthCallback] ✅ DB aggiornato | ig_account_name:', igAccountName);
    } else {
      const created = await base44.asServiceRole.entities.MetaConnection.create(payload);
      console.log('[metaOAuthCallback] ✅ DB creato | id:', created?.id);
    }
  } catch (dbErr) {
    console.error('[metaOAuthCallback] DB FALLITO:', dbErr.message);
    return Response.redirect(ERROR_URL, 302);
  }

  // 8. Aggiorna Business
  if (businessId) {
    try {
      await base44.asServiceRole.entities.Business.update(businessId, {
        ig_connesso:  true,
        ig_username:  igAccountName,
        fb_connesso:  false,
      });
      console.log('[metaOAuthCallback] Business aggiornato con ig_connesso: true');
    } catch (e) {
      console.warn('[metaOAuthCallback] Business update fallito:', e.message);
    }
  }

  console.log('[metaOAuthCallback] ✅ Connessione completata → redirect SUCCESS');
  return Response.redirect(SUCCESS_URL, 302);
});