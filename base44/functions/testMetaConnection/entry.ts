import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * testMetaConnection — diagnostica COMPLETA Instagram Business Login
 *
 * Copre tutti i livelli del problema:
 * 1. Token debug (scopes reali, validità, user_id)
 * 2. Profilo account via graph.instagram.com (Instagram Business Login token)
 * 3. Profilo account via graph.facebook.com/me (stesso token — cross-check)
 * 4. Verifica che sia un Business/Creator account, non Personal
 * 5. Facebook Pages collegate all'utente OAuth
 * 6. Webhook subscribed_fields attivi (via /subscribed_apps)
 * 7. App roles: l'utente è Admin/Developer/Tester dell'app Meta?
 * 8. Messaggio di test webhook (verifica endpoint raggiungibile)
 * 9. Endpoint compatibility: graph.instagram.com vs graph.facebook.com
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const { connector_id } = body;
  if (!connector_id) return Response.json({ error: 'Missing connector_id' }, { status: 400 });

  let conn = null;
  try {
    const rows = await base44.asServiceRole.entities.MetaConnection.filter({ id: connector_id });
    conn = rows[0];
  } catch (e) {
    console.error('[testMeta] DB error:', e.message);
  }
  if (!conn) return Response.json({ success: false, error: `Connection not found: ${connector_id}` }, { status: 404 });

  const token       = conn.access_token;
  const igAccountId = conn.ig_account_id;
  const appId       = Deno.env.get('META_APP_ID') || '';
  const appSecret   = Deno.env.get('META_APP_SECRET') || '';

  console.log('[testMeta] ═══════ DIAGNOSTICA COMPLETA ═══════');
  console.log('[testMeta] connector_id:', connector_id);
  console.log('[testMeta] ig_account_id:', igAccountId);
  console.log('[testMeta] token prefix:', token?.slice(0, 20) + '***');
  console.log('[testMeta] granted_scopes (DB):', conn.granted_scopes);

  if (!token) return Response.json({ success: false, error: 'Token mancante' });
  if (!igAccountId) return Response.json({ success: false, error: 'ig_account_id mancante' });

  const R = {}; // raccoglie tutti i risultati

  // ══════════════════════════════════════════════════════════════
  // TEST A: debug_token — validità, scopes reali, user_id di Meta
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── A: debug_token ───');
  if (appId && appSecret) {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`
    );
    const d = await r.json();
    const dd = d.data || {};
    console.log('[testMeta] debug_token HTTP:', r.status);
    console.log('[testMeta] debug_token response:', JSON.stringify(d).slice(0, 1500));
    R.token_debug = {
      http_status: r.status,
      is_valid: dd.is_valid === true,
      app_id: dd.app_id,
      user_id: dd.user_id,          // Meta user ID che ha fatto OAuth
      type: dd.type,                 // USER | PAGE | APP
      scopes: dd.scopes || [],
      expires_at: dd.expires_at,
      issued_at: dd.issued_at,
      error: d.error || null,
    };
    console.log('[testMeta] Token valid:', R.token_debug.is_valid);
    console.log('[testMeta] Meta user_id:', R.token_debug.user_id);
    console.log('[testMeta] Token type:', R.token_debug.type);
    console.log('[testMeta] Real scopes:', JSON.stringify(R.token_debug.scopes));
  } else {
    R.token_debug = { skipped: true, reason: 'META_APP_ID/META_APP_SECRET non configurati' };
    console.log('[testMeta] debug_token: SKIP — credenziali app mancanti');
  }

  // ══════════════════════════════════════════════════════════════
  // TEST B: graph.instagram.com — endpoint Instagram Business Login
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── B: graph.instagram.com/v21.0/{id} ───');
  const igFields = 'id,username,name,biography,profile_picture_url,account_type,followers_count,media_count';
  const igUrl = `https://graph.instagram.com/v21.0/${igAccountId}?fields=${igFields}&access_token=${token}`;
  const rB = await fetch(igUrl);
  const dB = await rB.json();
  console.log('[testMeta] graph.instagram.com HTTP:', rB.status);
  console.log('[testMeta] graph.instagram.com response:', JSON.stringify(dB));
  R.ig_profile = {
    endpoint: `graph.instagram.com/v21.0/${igAccountId}`,
    http_status: rB.status,
    success: !dB.error && !!dB.id,
    data: dB.error ? null : {
      id: dB.id,
      username: dB.username,
      name: dB.name,
      account_type: dB.account_type,
      followers_count: dB.followers_count,
    },
    error: dB.error ? {
      code: dB.error.code,
      message: dB.error.message,
      type: dB.error.type,
      subcode: dB.error.error_subcode,
      fbtrace_id: dB.error.fbtrace_id,
    } : null,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST C: graph.instagram.com/me — alternativa per IG Business Login
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── C: graph.instagram.com/me ───');
  const rC = await fetch(
    `https://graph.instagram.com/me?fields=${igFields}&access_token=${token}`
  );
  const dC = await rC.json();
  console.log('[testMeta] /me HTTP:', rC.status);
  console.log('[testMeta] /me response:', JSON.stringify(dC));
  R.ig_me = {
    endpoint: 'graph.instagram.com/me',
    http_status: rC.status,
    success: !dC.error && !!dC.id,
    data: dC.error ? null : {
      id: dC.id,
      username: dC.username,
      account_type: dC.account_type,
    },
    error: dC.error ? {
      code: dC.error.code,
      message: dC.error.message,
      fbtrace_id: dC.error.fbtrace_id,
    } : null,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST D: graph.facebook.com/me — stesso token su FB endpoint
  // Cross-check: IG Business Login token NON funziona su graph.facebook.com
  // Se funziona → il token è un FB User Token (login classico), non IG Business
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── D: graph.facebook.com/me (cross-check token type) ───');
  const rD = await fetch(
    `https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${token}`
  );
  const dD = await rD.json();
  console.log('[testMeta] graph.facebook.com/me HTTP:', rD.status);
  console.log('[testMeta] graph.facebook.com/me response:', JSON.stringify(dD));
  R.fb_me = {
    endpoint: 'graph.facebook.com/v21.0/me',
    http_status: rD.status,
    success: !dD.error && !!dD.id,
    note: dD.id ? 'Token funziona su graph.facebook.com → potrebbe essere FB User Token (non IG Business)' : 'Token non funziona su graph.facebook.com → corretto per IG Business Login',
    data: dD.error ? null : { id: dD.id, name: dD.name },
    error: dD.error ? { code: dD.error.code, message: dD.error.message } : null,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST E: Facebook Pages dell'utente (per verifica collegamento page)
  // graph.facebook.com/me/accounts richiede FB User Token — potrebbe fallire
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── E: Facebook Pages collegate ───');
  const rE = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}`
  );
  const dE = await rE.json();
  console.log('[testMeta] me/accounts HTTP:', rE.status);
  console.log('[testMeta] me/accounts response:', JSON.stringify(dE).slice(0, 2000));
  R.fb_pages = {
    endpoint: 'graph.facebook.com/v21.0/me/accounts',
    http_status: rE.status,
    success: !dE.error && !!dE.data,
    pages: (dE.data || []).map(p => ({
      id: p.id,
      name: p.name,
      has_ig_account: !!p.instagram_business_account,
      ig_account_id: p.instagram_business_account?.id || null,
    })),
    error: dE.error ? { code: dE.error.code, message: dE.error.message } : null,
    note: dE.error ? 'Normale se il token è IG Business Login (non ha accesso a me/accounts)' : null,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST F: Webhook subscribed_apps — verifica subscribed_fields attivi
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── F: subscribed_apps (webhook fields attivi) ───');
  const rF = await fetch(
    `https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps?access_token=${token}`
  );
  const dF = await rF.json();
  console.log('[testMeta] subscribed_apps HTTP:', rF.status);
  console.log('[testMeta] subscribed_apps response:', JSON.stringify(dF));
  R.webhook_subscriptions = {
    endpoint: `graph.instagram.com/v21.0/${igAccountId}/subscribed_apps`,
    http_status: rF.status,
    success: !dF.error,
    subscribed_fields: dF.data?.[0]?.subscribed_fields || [],
    all_subscriptions: dF.data || [],
    error: dF.error ? { code: dF.error.code, message: dF.error.message } : null,
  };
  const subscribedFields = R.webhook_subscriptions.subscribed_fields;
  const hasMessages = subscribedFields.includes('messages');
  const hasPostbacks = subscribedFields.includes('messaging_postbacks');
  console.log('[testMeta] subscribed_fields:', JSON.stringify(subscribedFields));
  console.log('[testMeta] has messages:', hasMessages, '| has messaging_postbacks:', hasPostbacks);

  // ══════════════════════════════════════════════════════════════
  // TEST G: App roles — se l'utente è Tester/Developer/Admin dell'app
  // Richiede app access token (appId|appSecret)
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── G: App roles ───');
  if (appId && appSecret) {
    const metaUserId = R.token_debug?.user_id;
    if (metaUserId) {
      const rG = await fetch(
        `https://graph.facebook.com/v21.0/${appId}/roles?access_token=${appId}|${appSecret}`
      );
      const dG = await rG.json();
      console.log('[testMeta] app/roles HTTP:', rG.status);
      console.log('[testMeta] app/roles response:', JSON.stringify(dG).slice(0, 2000));
      const roles = (dG.data || []);
      const userRole = roles.find(r => r.user === parseInt(metaUserId));
      R.app_roles = {
        http_status: rG.status,
        all_roles: roles.slice(0, 20),
        oauth_user_id: metaUserId,
        user_role: userRole?.role || null,
        user_found_in_roles: !!userRole,
        error: dG.error ? { code: dG.error.code, message: dG.error.message } : null,
      };
      console.log('[testMeta] OAuth user role in app:', userRole?.role || 'NOT FOUND');
    } else {
      R.app_roles = { skipped: true, reason: 'user_id non disponibile da debug_token' };
    }
  } else {
    R.app_roles = { skipped: true, reason: 'META_APP_ID/META_APP_SECRET mancanti' };
  }

  // ══════════════════════════════════════════════════════════════
  // TEST H: POST /subscribed_apps — sottoscrivi ora se mancano fields
  //         (messages + messaging_postbacks + message_reactions)
  // ══════════════════════════════════════════════════════════════
  const TARGET_FIELDS = ['messages', 'messaging_postbacks', 'message_reactions', 'messaging_seen'];
  const missingFields = TARGET_FIELDS.filter(f => !subscribedFields.includes(f));
  console.log('[testMeta] ─── H: Subscribe webhook fields ───');
  console.log('[testMeta] Missing fields:', JSON.stringify(missingFields));

  if (missingFields.length > 0 && !dF.error) {
    // Tenta sottoscrizione via query param (IG Business Login compatibile)
    const subscribeUrl = `https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps?access_token=${token}&subscribed_fields=${TARGET_FIELDS.join(',')}`;
    const rH = await fetch(subscribeUrl, { method: 'POST' });
    const dH = await rH.json();
    console.log('[testMeta] subscribe POST HTTP:', rH.status);
    console.log('[testMeta] subscribe POST response:', JSON.stringify(dH));

    if (dH.error) {
      // Fallback: prova con Authorization: Bearer
      console.log('[testMeta] subscribe fallback: Authorization: Bearer header');
      const rH2 = await fetch(
        `https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ subscribed_fields: TARGET_FIELDS.join(',') }),
        }
      );
      const dH2 = await rH2.json();
      console.log('[testMeta] subscribe Bearer HTTP:', rH2.status);
      console.log('[testMeta] subscribe Bearer response:', JSON.stringify(dH2));
      R.webhook_subscribe = {
        attempted: true,
        method: 'Bearer header',
        success: dH2.success === true,
        fields_requested: TARGET_FIELDS,
        response: dH2,
      };
    } else {
      R.webhook_subscribe = {
        attempted: true,
        method: 'query param',
        success: dH.success === true,
        fields_requested: TARGET_FIELDS,
        response: dH,
      };
    }
  } else if (dF.error) {
    R.webhook_subscribe = { attempted: false, reason: `subscribed_apps GET fallito (${dF.error?.code}), skip subscribe` };
  } else {
    R.webhook_subscribe = { attempted: false, reason: 'Tutti i fields già sottoscritti' };
  }

  // ══════════════════════════════════════════════════════════════
  // AGGIORNA DB
  // ══════════════════════════════════════════════════════════════
  const profileOk = R.ig_profile.success || R.ig_me.success;
  const profileData = R.ig_profile.success ? (dB) : (R.ig_me.success ? dC : null);

  if (profileOk && profileData) {
    const updates = {
      sync_error: '', refresh_error: '', status: 'connected',
      has_basic_scope: true, has_messages_scope: true,
    };
    if (profileData.username) {
      updates.ig_account_name = profileData.username;
      updates.meta_user_name = profileData.username;
    }
    if (profileData.profile_picture_url) updates.ig_profile_picture_url = profileData.profile_picture_url;
    await base44.asServiceRole.entities.MetaConnection.update(conn.id, updates).catch(() => {});
    console.log('[testMeta] ✅ DB aggiornato, status=connected');
  } else if (!profileOk) {
    const errCode = (dB.error?.code) || (dC.error?.code);
    const errMsg  = (dB.error?.message) || (dC.error?.message) || '';
    if (errCode === 190) {
      await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
        status: 'error',
        sync_error: `token_expired_190: ${errMsg}`,
        refresh_error: `error_190_${new Date().toISOString()}: ${errMsg}`,
      }).catch(() => {});
    } else {
      await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
        sync_error: `API error ${errCode}: ${errMsg}`,
      }).catch(() => {});
    }
    console.log(`[testMeta] ❌ Profilo FALLITO — error ${errCode}`);
  }

  // ══════════════════════════════════════════════════════════════
  // DIAGNOSTICA FINALE — analisi automatica del problema
  // ══════════════════════════════════════════════════════════════
  const tokenValid      = R.token_debug?.is_valid === true;
  const realScopes      = R.token_debug?.scopes || [];
  const hasBasicReal    = realScopes.includes('instagram_business_basic');
  const hasMsgReal      = realScopes.includes('instagram_business_manage_messages');
  const igProfileOk     = R.ig_profile.success;
  const igMeOk          = R.ig_me.success;
  const fbMeOk          = R.fb_me.success;
  const accountType     = profileData?.account_type || null;
  const isBusinessOrCreator = accountType === 'BUSINESS' || accountType === 'CREATOR';
  const webhookFieldsOk = hasMessages && hasPostbacks;
  const userRoleOk      = ['administrator', 'developer', 'tester'].includes(R.app_roles?.user_role);

  const diagnosis = [];

  if (!tokenValid) {
    diagnosis.push({ level: 'error', msg: 'Token non valido secondo Meta debug_token' });
  }
  if (!hasBasicReal) {
    diagnosis.push({ level: 'error', msg: 'instagram_business_basic NON approvato in App Review — questo causa error 100' });
  }
  if (!hasMsgReal) {
    diagnosis.push({ level: 'error', msg: 'instagram_business_manage_messages NON approvato — i messaggi non possono essere letti/inviati' });
  }
  if (!igProfileOk && !igMeOk) {
    const errCode = R.ig_profile.error?.code;
    if (errCode === 100) {
      diagnosis.push({ level: 'error', msg: 'Error 100: Il token non ha accesso a questo endpoint. Cause: (1) instagram_business_basic non approvato in App Review, oppure (2) account non è Business/Creator, oppure (3) app in modalità sviluppo e account non è Tester.' });
    } else if (errCode === 190) {
      diagnosis.push({ level: 'error', msg: 'Error 190: Token scaduto — riconnettere OAuth' });
    } else {
      diagnosis.push({ level: 'error', msg: `Profilo API non raggiungibile — error ${errCode}: ${R.ig_profile.error?.message}` });
    }
  }
  if (fbMeOk) {
    diagnosis.push({ level: 'warn', msg: 'Il token funziona su graph.facebook.com/me: potrebbe essere un FB User Token invece di un IG Business Login token. Verifica che l\'app usi api.instagram.com/oauth/authorize (non facebook.com/dialog/oauth).' });
  }
  if (!isBusinessOrCreator && accountType) {
    diagnosis.push({ level: 'error', msg: `Account type: ${accountType}. Solo account BUSINESS o CREATOR supportano Instagram Business Login e le API Messaging.` });
  }
  if (!hasMessages || !hasPostbacks) {
    diagnosis.push({ level: 'error', msg: `Webhook fields mancanti: ${missingFields.join(', ')}. L'account non riceve eventi DM da Meta.` });
  }
  if (!userRoleOk && R.app_roles?.user_role !== undefined && !R.app_roles?.skipped) {
    diagnosis.push({ level: 'warn', msg: `L'utente OAuth non è Admin/Developer/Tester dell'app Meta (ruolo trovato: ${R.app_roles?.user_role || 'nessuno'}). In modalità sviluppo solo Tester possono inviare DM.` });
  }
  if (R.app_roles?.user_found_in_roles === false) {
    diagnosis.push({ level: 'error', msg: 'L\'utente che ha fatto OAuth non è tra i ruoli dell\'app Meta (non è Developer/Tester/Admin). Aggiungilo su Meta App Dashboard → Roles.' });
  }

  // Conta webhook e messaggi reali
  const recentWebhooks = await base44.asServiceRole.entities.WebhookEventLog.filter(
    { connection_id: conn.id }, '-created_date', 5
  ).catch(() => []);
  const recentMessages = await base44.asServiceRole.entities.Message.filter(
    { business_id: conn.business_id, canale: 'instagram' }, '-created_date', 3
  ).catch(() => []);

  if (recentWebhooks.length === 0) {
    diagnosis.push({ level: 'error', msg: 'ZERO webhook ricevuti. Meta non sta inviando eventi. Verifica: (1) Webhook configurato nel Meta App Dashboard, (2) subscribed_fields attivi, (3) account IG è tester dell\'app in modalità sviluppo.' });
  }
  if (recentMessages.length === 0 && recentWebhooks.length > 0) {
    diagnosis.push({ level: 'error', msg: 'Webhook ricevuti ma nessun messaggio in Inbox: problema nel parser webhookMeta (mapping contact/business).' });
  }

  if (diagnosis.length === 0) {
    diagnosis.push({ level: 'ok', msg: 'Tutti i test superati — connessione Instagram Business Login operativa.' });
  }

  console.log('[testMeta] ═══ DIAGNOSIS ═══');
  diagnosis.forEach(d => console.log(`[testMeta] [${d.level.toUpperCase()}] ${d.msg}`));

  return Response.json({
    success:        profileOk,
    account_name:   profileData?.username || profileData?.name || null,
    account_id:     profileData?.id || igAccountId,
    account_type:   accountType,
    is_business_or_creator: isBusinessOrCreator,

    // Token
    token_valid:    tokenValid,
    real_scopes:    realScopes,
    instagram_business_basic_approved: hasBasicReal,
    instagram_business_manage_messages_approved: hasMsgReal,

    // Webhook
    subscribed_fields:    subscribedFields,
    webhook_fields_ok:    webhookFieldsOk,
    missing_fields:       missingFields,
    subscribe_attempted:  R.webhook_subscribe?.attempted,
    subscribe_success:    R.webhook_subscribe?.success,

    // Ruolo utente nell'app
    user_role_in_app:   R.app_roles?.user_role || null,
    user_role_ok:       userRoleOk,

    // Recent activity
    recent_webhooks_count: recentWebhooks.length,
    recent_messages_count: recentMessages.length,
    last_webhook: recentWebhooks[0] ? {
      event_type: recentWebhooks[0].event_type,
      processed: recentWebhooks[0].processed,
      created_date: recentWebhooks[0].created_date,
      sender_id: recentWebhooks[0].sender_id,
    } : null,

    // Diagnosis
    diagnosis,

    // Raw results per debug avanzato
    results: R,
  });
});