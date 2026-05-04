import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const IG_APP_ID     = Deno.env.get('IG_APP_ID') || '';
const IG_APP_SECRET = Deno.env.get('IG_APP_SECRET') || '';
const VERIFY_TOKEN  = 'emaral2026';

// URL app — funziona sia su dominio custom che su base44
function getAppBaseUrl(req) {
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  // Se arriva da emaral.it usa quello, altrimenti usa il base44 app url
  if (origin.includes('emaral.it')) return 'https://emaral.it';
  // fallback al dominio base44 dell'app
  return 'https://emaral-agent-ai.base44.app';
}

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

  const redirectBase = 'https://emaral.it';
  const SUCCESS_URL = `${redirectBase}/settings?meta=success&tab=connections`;
  const ERROR_URL   = `${redirectBase}/settings?meta=error&tab=connections`;

  console.log('[metaOAuthCallback] code:', code ? 'PRESENTE' : 'ASSENTE', '| error:', error || 'nessuno');

  if (error || !code || !state) {
    console.error('[metaOAuthCallback] OAuth negato o parametri mancanti:', error);
    return Response.redirect(ERROR_URL, 302);
  }

  // Decodifica state
  let userId = '';
  let businessId = '';
  try {
    const decoded = JSON.parse(atob(state));
    userId     = decoded.userId || '';
    businessId = decoded.businessId || '';
    console.log('[metaOAuthCallback] state → userId:', userId, '| businessId:', businessId);
  } catch (e) {
    console.error('[metaOAuthCallback] State non valido:', e.message);
    return Response.redirect(ERROR_URL, 302);
  }

  const redirectUri = (Deno.env.get('META_REDIRECT_URI') || '').trim();
  console.log('[metaOAuthCallback] redirectUri:', redirectUri);

  // 1. Scambio code → token short-lived
  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: IG_APP_ID,
      client_secret: IG_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  console.log('[metaOAuthCallback] short-lived token:', tokenData.access_token ? 'OK' : 'FALLITO', '| err:', JSON.stringify(tokenData.error_message || tokenData.error || ''));

  if (!tokenData.access_token) {
    console.error('[metaOAuthCallback] Token exchange FALLITO:', JSON.stringify(tokenData));
    return Response.redirect(ERROR_URL, 302);
  }

  const shortToken = tokenData.access_token;
  const igUserId   = String(tokenData.user_id || '');

  // 2. Scambio short-lived → long-lived (60 giorni)
  const llRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortToken}`
  );
  const llData = await llRes.json();
  const longToken = llData.access_token || shortToken;
  console.log('[metaOAuthCallback] long-lived token:', llData.access_token ? 'OK' : 'fallback a short-lived');

  // 3. Info utente Instagram (con profile_picture_url grazie a instagram_business_basic)
  const meRes  = await fetch(`https://graph.instagram.com/v21.0/me?fields=id,name,username,profile_picture_url,account_type&access_token=${longToken}`);
  const meData = await meRes.json();
  console.log('[metaOAuthCallback] IG user:', JSON.stringify({ id: meData.id, username: meData.username, account_type: meData.account_type }));

  const igAccountId   = meData.id || igUserId || '';
  // username può essere numerico se il permesso non è concesso — in quel caso usa name
  const rawUsername = meData.username || '';
  const igAccountName = (/^\d+$/.test(rawUsername) ? '' : rawUsername) || meData.name || '';
  const igProfilePic  = meData.profile_picture_url || '';
  console.log('[metaOAuthCallback] igAccountName resolved:', igAccountName, '| profilePic:', igProfilePic ? 'presente' : 'assente');

  // Calcola scadenza token: long-lived = 60 giorni da ora
  const tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

  // 4. Se non abbiamo businessId dallo state, cercalo nel DB tramite userId
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
      console.log('[metaOAuthCallback] Impossibile trovare business:', e.message);
    }
  }

  // 5. Salvataggio su DB
  const payload = {
    user_id:                  userId,
    business_id:              businessId,
    access_token:             longToken,
    meta_user_id:             igAccountId,
    meta_user_name:           igAccountName,
    ig_connected:             true,
    ig_account_id:            igAccountId,
    ig_account_name:          igAccountName,
    ig_profile_picture_url:   igProfilePic,
    ig_token_expires_at:      tokenExpiresAt,
    status:                   'connected',
    connected_at:             new Date().toISOString(),
  };

  try {
    const existing = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: userId });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.MetaConnection.update(existing[0].id, payload);
      console.log('[metaOAuthCallback] DB aggiornato, id:', existing[0].id);
    } else {
      const created = await base44.asServiceRole.entities.MetaConnection.create(payload);
      console.log('[metaOAuthCallback] DB creato, id:', created?.id);
    }
  } catch (dbErr) {
    console.error('[metaOAuthCallback] DB FALLITO:', dbErr.message);
    return Response.redirect(ERROR_URL, 302);
  }

  // 6. Aggiorna anche il Business con ig_connesso: true
  if (businessId) {
    try {
      await base44.asServiceRole.entities.Business.update(businessId, {
        ig_connesso: true,
        ig_username: igAccountName,
      });
      console.log('[metaOAuthCallback] Business aggiornato con ig_connesso: true');
    } catch (e) {
      console.log('[metaOAuthCallback] Aggiornamento business non riuscito:', e.message);
    }
  }

  console.log('[metaOAuthCallback] ✅ Connessione completata → redirect a SUCCESS');
  return Response.redirect(SUCCESS_URL, 302);
});