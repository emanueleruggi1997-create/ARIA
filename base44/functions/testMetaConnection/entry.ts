import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * testMetaConnection — diagnostica endpoints Instagram Business Login
 *
 * RIFERIMENTO UFFICIALE: Meta "Instagram API with Instagram Login"
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 *
 * ENDPOINT UFFICIALI PER IG BUSINESS LOGIN:
 * - OAuth:         api.instagram.com/oauth/authorize
 * - Token:         api.instagram.com/oauth/access_token
 * - Long-lived:    graph.instagram.com/access_token
 * - Profilo:       graph.instagram.com/v21.0/{user-id}?fields=...
 * - Profilo /me:   graph.instagram.com/v21.0/me?fields=...
 * - Webhook sub:   graph.instagram.com/v21.0/{user-id}/subscribed_apps
 * - Send DM:       graph.instagram.com/v21.0/{ig-user-id}/messages (POST)
 * - Conversations: graph.instagram.com/v21.0/{ig-user-id}/conversations
 *
 * IMPORTANTE: debug_token usa graph.FACEBOOK.com — può fallire con IG Business Login token.
 * IMPORTANTE: graph.FACEBOOK.com/me NON funziona con IG Business Login token (atteso).
 * IMPORTANTE: "Unsupported request - method type: get" = stai chiamando un endpoint POST con GET.
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

  // Security: verify caller owns the connection's business
  if (conn.business_id) {
    const biz = await base44.asServiceRole.entities.Business.get(conn.business_id).catch(() => null);
    const isOwner = biz && (biz.created_by_id === user.id || biz.created_by === user.email || biz.created_by === user.id);
    if (!isOwner && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const token       = conn.access_token;
  const igAccountId = conn.ig_account_id;
  const appId       = Deno.env.get('META_APP_ID') || '';
  const appSecret   = Deno.env.get('META_APP_SECRET') || '';

  console.log('[testMeta] ═══ DIAGNOSTICA IG BUSINESS LOGIN ═══');
  console.log('[testMeta] ig_account_id:', igAccountId);
  console.log('[testMeta] token_type (DB):', conn.token_type);
  console.log('[testMeta] login_flow:', conn.login_flow);
  console.log('[testMeta] granted_scopes:', conn.granted_scopes);
  console.log('[testMeta] oauth_long_lived:', conn.oauth_long_lived);
  console.log('[testMeta] ig_token_expires_at:', conn.ig_token_expires_at);
  console.log('[testMeta] token prefix:', token?.slice(0, 25) + '***');

  if (!token) return Response.json({ success: false, error: 'Token mancante' });
  if (!igAccountId) return Response.json({ success: false, error: 'ig_account_id mancante' });

  const R = {};

  // ══════════════════════════════════════════════════════════════
  // TEST 1: graph.instagram.com/v21.0/me — ENDPOINT UFFICIALE PROFILO
  // Documentazione: "Make API Calls" → GET /{ig-user-id}?fields=...
  // Con IG Business Login token, questo è il path principale.
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── TEST 1: GET graph.instagram.com/v21.0/me ───');
  const profileFields = 'id,username,name,account_type,biography,followers_count,media_count,profile_picture_url';
  const r1 = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=${profileFields}&access_token=${token}`
  );
  const d1 = await r1.json();
  console.log('[testMeta] TEST1 HTTP:', r1.status, '| full response:', JSON.stringify(d1));
  R.test1_ig_me = {
    url: `https://graph.instagram.com/v21.0/me?fields=${profileFields}&access_token=TOKEN`,
    method: 'GET',
    host: 'graph.instagram.com',
    http_status: r1.status,
    success: !d1.error && !!d1.id,
    data: d1.error ? null : d1,
    error: d1.error || null,
    verdict: d1.id ? '✅ FUNZIONA — endpoint corretto per IG Business Login' : `❌ Error ${d1.error?.code}: ${d1.error?.message}`,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST 2: graph.instagram.com/v21.0/{ig-user-id} — ID esplicito
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── TEST 2: GET graph.instagram.com/v21.0/{id} ───');
  const r2 = await fetch(
    `https://graph.instagram.com/v21.0/${igAccountId}?fields=${profileFields}&access_token=${token}`
  );
  const d2 = await r2.json();
  console.log('[testMeta] TEST2 HTTP:', r2.status, '| full response:', JSON.stringify(d2));
  R.test2_ig_profile_by_id = {
    url: `https://graph.instagram.com/v21.0/${igAccountId}?fields=...&access_token=TOKEN`,
    method: 'GET',
    host: 'graph.instagram.com',
    http_status: r2.status,
    success: !d2.error && !!d2.id,
    data: d2.error ? null : d2,
    error: d2.error || null,
    verdict: d2.id ? '✅ FUNZIONA' : `❌ Error ${d2.error?.code}: ${d2.error?.message}`,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST 3: graph.instagram.com/v21.0/{id}/messages — SEND DM endpoint
  // Documentazione: POST /{ig-user-id}/messages
  // IMPORTANTE: GET su questo endpoint → "Unsupported request - method type: get"
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── TEST 3: POST graph.instagram.com/v21.0/{id}/messages ───');
  const r3 = await fetch(
    `https://graph.instagram.com/v21.0/${igAccountId}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: 'TEST_RECIPIENT_ID' },
        message: { text: 'TEST' },
        access_token: token,
      }),
    }
  );
  const d3 = await r3.json();
  console.log('[testMeta] TEST3 HTTP:', r3.status, '| full response:', JSON.stringify(d3));
  // Error 100 subcode 2018109 = recipient non valido (atteso) — ma endpoint funziona
  // Error 551 = non puoi inviare a te stesso (atteso) — endpoint funziona
  // Error 200 = permessi mancanti — instagram_business_manage_messages non approvato
  // Error 10 = app non autorizzata
  // Error 100 generico = parametri sbagliati
  const sendEndpointWorking = r3.status === 200 || [551, 100, 200, 10].includes(d3.error?.code);
  R.test3_send_dm = {
    url: `https://graph.instagram.com/v21.0/${igAccountId}/messages (POST)`,
    method: 'POST',
    host: 'graph.instagram.com',
    http_status: r3.status,
    endpoint_reachable: sendEndpointWorking,
    error_code: d3.error?.code || null,
    error_subcode: d3.error?.error_subcode || null,
    error_message: d3.error?.message || null,
    fbtrace_id: d3.error?.fbtrace_id || null,
    verdict: r3.status === 200 ? '✅ DM inviato (test)' :
             d3.error?.code === 551 ? '✅ Endpoint funziona (error 551 = non puoi inviare a te stesso — atteso)' :
             d3.error?.code === 200 ? '⚠️ Endpoint raggiungibile ma permessi mancanti (instagram_business_manage_messages)' :
             d3.error?.code === 100 ? '⚠️ Endpoint raggiungibile, parametri sbagliati (test recipient non valido — atteso)' :
             d3.error?.code === 10  ? '❌ App non autorizzata (error 10)' :
             `❌ Error ${d3.error?.code}: ${d3.error?.message}`,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST 4: GET graph.instagram.com/v21.0/{id}/messages — SBAGLIATO
  // Questo restituisce "Unsupported request - method type: get"
  // Documentato per capire l'errore originale
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── TEST 4: GET /messages (sbagliato) — aspettasi Unsupported ───');
  const r4 = await fetch(
    `https://graph.instagram.com/v21.0/${igAccountId}/messages?access_token=${token}`
  );
  const d4 = await r4.json();
  console.log('[testMeta] TEST4 HTTP:', r4.status, '| full response:', JSON.stringify(d4));
  R.test4_get_messages_wrong = {
    url: `https://graph.instagram.com/v21.0/${igAccountId}/messages (GET — ERRATO)`,
    method: 'GET',
    host: 'graph.instagram.com',
    http_status: r4.status,
    error: d4.error || null,
    verdict: `⚠️ Atteso: "Unsupported request - method type: get". Errore ricevuto: ${d4.error?.message || 'nessuno'} (code: ${d4.error?.code || '?'})`,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST 5: graph.instagram.com/v21.0/{id}/conversations — Lista conversazioni
  // Documentazione: GET /{ig-user-id}/conversations
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── TEST 5: GET /conversations ───');
  const r5 = await fetch(
    `https://graph.instagram.com/v21.0/${igAccountId}/conversations?platform=instagram&access_token=${token}`
  );
  const d5 = await r5.json();
  console.log('[testMeta] TEST5 HTTP:', r5.status, '| full response:', JSON.stringify(d5));
  R.test5_conversations = {
    url: `https://graph.instagram.com/v21.0/${igAccountId}/conversations?platform=instagram`,
    method: 'GET',
    host: 'graph.instagram.com',
    http_status: r5.status,
    success: !d5.error && !!d5.data,
    conversations_count: d5.data?.length || 0,
    error: d5.error || null,
    verdict: d5.data ? `✅ Funziona — ${d5.data.length} conversazioni trovate` : `❌ Error ${d5.error?.code}: ${d5.error?.message}`,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST 6: graph.instagram.com/v21.0/{id}/subscribed_apps — webhook status
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── TEST 6: GET /subscribed_apps ───');
  const r6 = await fetch(
    `https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps?access_token=${token}`
  );
  const d6 = await r6.json();
  console.log('[testMeta] TEST6 HTTP:', r6.status, '| full response:', JSON.stringify(d6));
  const subscribedFields = d6.data?.[0]?.subscribed_fields || [];
  R.test6_webhook_subscriptions = {
    url: `https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps`,
    method: 'GET',
    host: 'graph.instagram.com',
    http_status: r6.status,
    success: !d6.error,
    subscribed_fields: subscribedFields,
    has_messages: subscribedFields.includes('messages'),
    has_messaging_postbacks: subscribedFields.includes('messaging_postbacks'),
    error: d6.error || null,
    verdict: d6.error ? `❌ Error ${d6.error.code}: ${d6.error.message}` :
             subscribedFields.length > 0 ? `✅ Fields attivi: ${subscribedFields.join(', ')}` : '⚠️ Nessun field sottoscritto',
  };

  // ══════════════════════════════════════════════════════════════
  // TEST 7: POST subscribed_apps — sottoscrivi webhook fields
  // ══════════════════════════════════════════════════════════════
  const TARGET_FIELDS = ['messages', 'messaging_postbacks', 'message_reactions', 'messaging_seen'];
  const missingFields = TARGET_FIELDS.filter(f => !subscribedFields.includes(f));
  if (missingFields.length > 0 && !d6.error) {
    console.log('[testMeta] ─── TEST 7: POST /subscribed_apps ───');
    const r7 = await fetch(
      `https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          subscribed_fields: TARGET_FIELDS.join(','),
          access_token: token,
        }),
      }
    );
    const d7 = await r7.json();
    console.log('[testMeta] TEST7 HTTP:', r7.status, '| full response:', JSON.stringify(d7));
    R.test7_subscribe = {
      url: `https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps (POST)`,
      method: 'POST',
      host: 'graph.instagram.com',
      http_status: r7.status,
      success: d7.success === true,
      fields_requested: TARGET_FIELDS,
      response: d7,
      verdict: d7.success ? '✅ Webhook fields sottoscritti con successo' : `❌ Fallito: ${d7.error?.message || JSON.stringify(d7)}`,
    };
  } else {
    R.test7_subscribe = {
      attempted: false,
      reason: d6.error ? 'subscribed_apps GET fallito — impossibile procedere' : 'Tutti i fields già presenti',
    };
  }

  // ══════════════════════════════════════════════════════════════
  // TEST 8: graph.facebook.com/debug_token — NOTA: usa FB graph, non IG
  // Con IG Business Login token, questo POTREBBE restituire is_valid=false
  // o dati limitati — è NORMALE. Non è indicativo del valore del token.
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── TEST 8: debug_token (FB graph — risultato limitato con IG token) ───');
  if (appId && appSecret) {
    const r8 = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`
    );
    const d8 = await r8.json();
    const dd8 = d8.data || {};
    console.log('[testMeta] TEST8 HTTP:', r8.status, '| full response:', JSON.stringify(d8));
    R.test8_debug_token = {
      url: 'https://graph.facebook.com/v21.0/debug_token (FB graph — NON il canonico per IG token)',
      method: 'GET',
      host: 'graph.facebook.com',
      http_status: r8.status,
      is_valid: dd8.is_valid,
      app_id: dd8.app_id,
      user_id: dd8.user_id,
      type: dd8.type,
      scopes: dd8.scopes || [],
      expires_at: dd8.expires_at,
      error: d8.error || dd8.error || null,
      // Con IG Business Login token, debug_token su FB graph può restituire:
      // - is_valid=false anche con token valido (endpoint non compatibile)
      // - error #2 = servizio non disponibile (transitorio)
      // - dati corretti se l'app è registrata sia su FB che IG
      note: dd8.is_valid === false && !d8.error
        ? '⚠️ debug_token dice is_valid=false — questo è NORMALE per token IG Business Login quando viene verificato su graph.facebook.com. Il token può essere valido per graph.instagram.com.'
        : dd8.is_valid === true
          ? '✅ Token valido anche per FB graph'
          : d8.error ? `Meta service error: ${d8.error.message}` : 'Risposta vuota',
      scopes_note: dd8.scopes?.length > 0
        ? `Scopes nel token: ${dd8.scopes.join(', ')}`
        : 'Scopes non visibili (normale con IG Business Login token su FB debug endpoint)',
    };
    console.log('[testMeta] debug_token is_valid:', dd8.is_valid, '| scopes:', dd8.scopes, '| user_id:', dd8.user_id);
  } else {
    R.test8_debug_token = { skipped: true, reason: 'META_APP_ID/META_APP_SECRET non configurati' };
  }

  // ══════════════════════════════════════════════════════════════
  // TEST 9: graph.facebook.com/v21.0/me — Cross-check tipo token
  // Con IG Business Login token: DEVE FALLIRE (è corretto)
  // Se funziona → probabilmente hai un FB User Token (flow sbagliato)
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── TEST 9: graph.facebook.com/me (cross-check, atteso fallire) ───');
  const r9 = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${token}`);
  const d9 = await r9.json();
  console.log('[testMeta] TEST9 HTTP:', r9.status, '| id:', d9.id, '| error:', d9.error?.code);
  R.test9_fb_crosscheck = {
    url: 'https://graph.facebook.com/v21.0/me (cross-check)',
    method: 'GET',
    host: 'graph.facebook.com',
    http_status: r9.status,
    success: !d9.error && !!d9.id,
    data: d9.error ? null : { id: d9.id, name: d9.name },
    error: d9.error || null,
    verdict: d9.id
      ? '🚨 Token funziona su FB graph.facebook.com/me — PROBABILE PROBLEMA: il token potrebbe essere un FB User Token e non un puro IG Business Login token. Questo è inaspettato.'
      : '✅ CORRETTO: Token non funziona su graph.facebook.com/me — confermato token IG Business Login',
  };

  // ══════════════════════════════════════════════════════════════
  // TEST 10: app roles — utente è Admin/Developer/Tester?
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── TEST 10: App roles ───');
  const metaUserId = R.test8_debug_token?.user_id;
  if (appId && appSecret && metaUserId) {
    const r10 = await fetch(`https://graph.facebook.com/v21.0/${appId}/roles?access_token=${appId}|${appSecret}`);
    const d10 = await r10.json();
    console.log('[testMeta] TEST10 HTTP:', r10.status, '| all roles:', JSON.stringify(d10.data?.slice(0, 20)));
    const roles = d10.data || [];
    const userRole = roles.find(r => String(r.user) === String(metaUserId));
    R.test10_app_roles = {
      http_status: r10.status,
      all_roles_count: roles.length,
      all_roles: roles.slice(0, 20),
      oauth_user_id: metaUserId,
      user_role: userRole?.role || null,
      user_found: !!userRole,
      error: d10.error || null,
      verdict: userRole
        ? `✅ Utente trovato con ruolo: ${userRole.role}`
        : `❌ Utente (${metaUserId}) non trovato nei ruoli dell'app. Aggiungilo come Tester.`,
    };
  } else {
    R.test10_app_roles = { skipped: true, reason: metaUserId ? 'META_APP_ID/SECRET mancanti' : 'user_id non disponibile (debug_token non ha restituito user_id)' };
  }

  // ══════════════════════════════════════════════════════════════
  // AGGIORNAMENTO DB
  // ══════════════════════════════════════════════════════════════
  const profileOk   = R.test1_ig_me.success || R.test2_ig_profile_by_id.success;
  const profileData = R.test1_ig_me.success ? d1 : (R.test2_ig_profile_by_id.success ? d2 : null);
  const accountType = profileData?.account_type || null;

  if (profileOk && profileData) {
    const updates = { sync_error: '', status: 'connected' };
    if (profileData.username) { updates.ig_account_name = profileData.username; updates.meta_user_name = profileData.username; }
    if (profileData.profile_picture_url) updates.ig_profile_picture_url = profileData.profile_picture_url;
    await base44.asServiceRole.entities.MetaConnection.update(conn.id, updates).catch(() => {});
    console.log('[testMeta] ✅ DB aggiornato con profilo');
  } else {
    const errCode = d1.error?.code || d2.error?.code;
    const errMsg  = d1.error?.message || d2.error?.message || '';
    if (errCode === 190) {
      await base44.asServiceRole.entities.MetaConnection.update(conn.id, { status: 'error', sync_error: `token_expired_190: ${errMsg}` }).catch(() => {});
    } else if (errCode) {
      await base44.asServiceRole.entities.MetaConnection.update(conn.id, { sync_error: `API error ${errCode}: ${errMsg}` }).catch(() => {});
    }
  }

  // ══════════════════════════════════════════════════════════════
  // CONTEGGIO ATTIVITA' REALI
  // ══════════════════════════════════════════════════════════════
  const [recentWebhooks, recentMessages] = await Promise.all([
    base44.asServiceRole.entities.WebhookEventLog.filter({ connection_id: conn.id }, '-created_date', 10).catch(() => []),
    base44.asServiceRole.entities.Message.filter({ business_id: conn.business_id, canale: 'instagram' }, '-created_date', 5).catch(() => []),
  ]);
  const realWebhooks  = recentWebhooks.filter(w => w.sender_id !== '123456789');
  const realDmWebhooks = realWebhooks.filter(w => w.event_type === 'dm' && w.processed);

  // ══════════════════════════════════════════════════════════════
  // DIAGNOSI FINALE
  // ══════════════════════════════════════════════════════════════
  const diagnosis = [];
  const isBusinessOrCreator = accountType === 'BUSINESS' || accountType === 'CREATOR';
  const webhookFieldsOk = R.test6_webhook_subscriptions.has_messages && R.test6_webhook_subscriptions.has_messaging_postbacks;
  const userRoleOk = ['administrator', 'developer', 'tester'].includes(R.test10_app_roles?.user_role);

  if (!profileOk) {
    const errCode = d1.error?.code || d2.error?.code;
    const errMsg  = d1.error?.message || d2.error?.message || '';
    if (errCode === 100) {
      diagnosis.push({ level: 'error', code: 'ERROR_100',
        msg: `Error 100 su graph.instagram.com — Cause possibili: (1) app in modalità sviluppo e utente NON è Tester → aggiungi come Tester in Meta App Dashboard → Roles, (2) instagram_business_basic non ancora concesso nel token corrente → fai nuovo OAuth dopo aver aggiunto il Tester. Message: ${errMsg}` });
    } else if (errCode === 190) {
      diagnosis.push({ level: 'error', code: 'ERROR_190', msg: `Token scaduto (190). Riconnetti OAuth.` });
    } else {
      diagnosis.push({ level: 'error', code: 'PROFILE_FAIL', msg: `Profilo non raggiungibile: error ${errCode} — ${errMsg}` });
    }
  } else {
    diagnosis.push({ level: 'ok', code: 'PROFILE_OK', msg: `Profilo OK — @${profileData.username}, type: ${accountType}` });
    if (!isBusinessOrCreator) {
      diagnosis.push({ level: 'error', code: 'NOT_BUSINESS', msg: `Account type ${accountType} — deve essere BUSINESS o CREATOR per usare le Messaging API.` });
    }
  }

  if (R.test9_fb_crosscheck.success) {
    diagnosis.push({ level: 'warn', code: 'FB_TOKEN_WARNING',
      msg: 'Il token funziona su graph.facebook.com/me — questo è inaspettato con un token IG Business Login puro. Verifica che il flow OAuth usi api.instagram.com e non facebook.com/dialog/oauth.' });
  }

  if (!webhookFieldsOk) {
    const fieldsStatus = R.test7_subscribe?.success ? 'Appena sottoscritti' : `Mancanti: ${missingFields.join(', ')}`;
    diagnosis.push({ level: R.test7_subscribe?.success ? 'warn' : 'error', code: 'WEBHOOK_FIELDS',
      msg: `Webhook fields: ${fieldsStatus}. ${R.test6_webhook_subscriptions.error ? `Errore GET subscribed_apps: ${R.test6_webhook_subscriptions.error.message}` : ''}` });
  } else {
    diagnosis.push({ level: 'ok', code: 'WEBHOOK_FIELDS_OK', msg: `Webhook fields attivi: ${subscribedFields.join(', ')}` });
  }

  if (R.test10_app_roles?.user_found === false) {
    diagnosis.push({ level: 'error', code: 'USER_NOT_TESTER',
      msg: `Utente (Meta ID: ${metaUserId || '?'}) NON è nei ruoli dell'app. Aggiungilo come Tester: Meta App Dashboard → Roles → Testers → Add Testers.` });
  } else if (userRoleOk) {
    diagnosis.push({ level: 'ok', code: 'USER_ROLE_OK', msg: `Utente autorizzato: ${R.test10_app_roles.user_role}` });
  }

  if (R.test3_send_dm.error_code === 551 || R.test3_send_dm.http_status === 200) {
    diagnosis.push({ level: 'ok', code: 'SEND_ENDPOINT_OK', msg: 'Endpoint invio DM funzionante (graph.instagram.com/v21.0/{id}/messages POST)' });
  } else if (R.test3_send_dm.error_code === 200) {
    diagnosis.push({ level: 'error', code: 'SEND_PERMISSION_MISSING', msg: 'Endpoint DM raggiungibile ma instagram_business_manage_messages non approvato.' });
  } else if (!R.test3_send_dm.endpoint_reachable) {
    diagnosis.push({ level: 'error', code: 'SEND_ENDPOINT_FAIL', msg: `Endpoint invio DM non raggiungibile. HTTP ${R.test3_send_dm.http_status}: ${R.test3_send_dm.error_message}` });
  }

  if (realWebhooks.length === 0) {
    diagnosis.push({ level: 'error', code: 'NO_WEBHOOKS',
      msg: 'Zero webhook reali ricevuti da Meta. Checklist: (1) Callback URL nel Meta App Dashboard → Webhooks corrisponde? (2) Verify Token = emaral2026? (3) Fields messages+messaging_postbacks abilitati? (4) Utente è Tester dell\'app?' });
  } else if (realDmWebhooks.length > 0) {
    diagnosis.push({ level: 'ok', code: 'WEBHOOKS_OK', msg: `${realDmWebhooks.length} DM reali processati. Sistema operativo.` });
  } else {
    diagnosis.push({ level: 'warn', code: 'WEBHOOKS_NOT_DM',
      msg: `${realWebhooks.length} webhook ricevuti ma nessun DM processato. Tipi: ${[...new Set(realWebhooks.map(w => w.event_type))].join(', ')}` });
  }

  const isOperative = profileOk && isBusinessOrCreator && webhookFieldsOk && realDmWebhooks.length > 0 && recentMessages.length > 0;

  console.log('[testMeta] ═══ SOMMARIO ═══');
  console.log('[testMeta] TEST1 (me):', R.test1_ig_me.verdict);
  console.log('[testMeta] TEST2 (by_id):', R.test2_ig_profile_by_id.verdict);
  console.log('[testMeta] TEST3 (send_dm):', R.test3_send_dm.verdict);
  console.log('[testMeta] TEST4 (get_messages_wrong):', R.test4_get_messages_wrong.verdict);
  console.log('[testMeta] TEST5 (conversations):', R.test5_conversations.verdict);
  console.log('[testMeta] TEST6 (webhook_subs):', R.test6_webhook_subscriptions.verdict);
  console.log('[testMeta] TEST9 (fb_crosscheck):', R.test9_fb_crosscheck.verdict);
  diagnosis.forEach(d => console.log(`[testMeta] [${d.level.toUpperCase()}] [${d.code}] ${d.msg}`));

  return Response.json({
    // Risultato principale
    success: profileOk,
    is_operative: isOperative,
    account_name: profileData?.username || null,
    account_id: profileData?.id || igAccountId,
    account_type: accountType,
    is_business_or_creator: isBusinessOrCreator,

    // Endpoint compatibility summary
    endpoint_summary: {
      'graph.instagram.com/me (GET)': R.test1_ig_me.verdict,
      'graph.instagram.com/{id} (GET)': R.test2_ig_profile_by_id.verdict,
      'graph.instagram.com/{id}/messages (POST)': R.test3_send_dm.verdict,
      'graph.instagram.com/{id}/messages (GET — sbagliato)': R.test4_get_messages_wrong.verdict,
      'graph.instagram.com/{id}/conversations (GET)': R.test5_conversations.verdict,
      'graph.instagram.com/{id}/subscribed_apps (GET)': R.test6_webhook_subscriptions.verdict,
      'graph.facebook.com/me (cross-check)': R.test9_fb_crosscheck.verdict,
    },

    // Webhook
    subscribed_fields: subscribedFields,
    webhook_fields_ok: webhookFieldsOk,
    missing_fields: missingFields,
    subscribe_attempted: R.test7_subscribe?.success !== undefined,
    subscribe_success: R.test7_subscribe?.success,

    // Ruolo
    user_role_in_app: R.test10_app_roles?.user_role || null,
    user_role_ok: userRoleOk,

    // Attività reale
    recent_webhooks_count: realWebhooks.length,
    recent_dm_webhooks: realDmWebhooks.length,
    recent_messages_count: recentMessages.length,
    last_webhook: realWebhooks[0] ? {
      event_type: realWebhooks[0].event_type,
      processed: realWebhooks[0].processed,
      created_date: realWebhooks[0].created_date,
      sender_id: realWebhooks[0].sender_id,
      recipient_id: realWebhooks[0].recipient_id,
    } : null,

    diagnosis,
    results: R,
  });
});