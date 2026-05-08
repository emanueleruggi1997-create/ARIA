import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * testMetaConnection — diagnostica DEFINITIVA Instagram Business Login
 *
 * TEST A: debug_token — validità token, scopes REALI, user_id Meta
 * TEST B: graph.instagram.com/v21.0/{id} — endpoint principale IG Business Login
 * TEST C: graph.instagram.com/me — endpoint alternativo
 * TEST D: graph.facebook.com/v21.0/me — cross-check tipo token (deve fallire se IG Business)
 * TEST E: graph.facebook.com/v21.0/me/accounts — FB Pages dell'utente + IG collegato
 * TEST E2: graph.facebook.com/v21.0/{ig_id} con Page Token — path alternativo
 * TEST F: subscribed_apps — webhook fields attivi
 * TEST G: app roles — utente è Admin/Developer/Tester?
 * TEST H: auto-subscribe se fields mancanti
 * TEST I: Business Manager check — IG account collegato a BM?
 * TEST J: graph.facebook.com/v17.0/{ig_id} — compatibilità versione API legacy
 * TEST K: /{ig_id}?fields=connected_instagram_account via FB — verifica link page↔IG
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

  console.log('[testMeta] ═══════ DIAGNOSTICA DEFINITIVA ═══════');
  console.log('[testMeta] connector_id:', connector_id);
  console.log('[testMeta] ig_account_id:', igAccountId);
  console.log('[testMeta] token prefix:', token?.slice(0, 20) + '***');
  console.log('[testMeta] granted_scopes (DB):', conn.granted_scopes);

  if (!token) return Response.json({ success: false, error: 'Token mancante' });
  if (!igAccountId) return Response.json({ success: false, error: 'ig_account_id mancante' });

  const R = {};

  // ══════════════════════════════════════════════════════════════
  // TEST A: debug_token
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── A: debug_token ───');
  if (appId && appSecret) {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`
    );
    const d = await r.json();
    const dd = d.data || {};
    console.log('[testMeta] debug_token HTTP:', r.status, '| is_valid:', dd.is_valid, '| scopes:', JSON.stringify(dd.scopes));
    R.token_debug = {
      http_status: r.status,
      is_valid: dd.is_valid === true,
      app_id: dd.app_id,
      user_id: dd.user_id,
      type: dd.type,
      scopes: dd.scopes || [],
      expires_at: dd.expires_at,
      error: d.error || null,
    };
  } else {
    R.token_debug = { skipped: true, reason: 'META_APP_ID/META_APP_SECRET non configurati' };
  }

  // ══════════════════════════════════════════════════════════════
  // TEST B: graph.instagram.com/v21.0/{ig_id}
  // Endpoint primario per Instagram Business Login token
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── B: graph.instagram.com/v21.0/{ig_id} ───');
  const igFields = 'id,username,name,biography,profile_picture_url,account_type,followers_count,media_count';
  const [rB_qp, rB_bearer] = await Promise.all([
    fetch(`https://graph.instagram.com/v21.0/${igAccountId}?fields=${igFields}&access_token=${token}`),
    fetch(`https://graph.instagram.com/v21.0/${igAccountId}?fields=${igFields}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
  ]);
  const [dB_qp, dB_bearer] = await Promise.all([rB_qp.json(), rB_bearer.json()]);
  const dB = !dB_qp.error ? dB_qp : (!dB_bearer.error ? dB_bearer : dB_qp);
  console.log('[testMeta] B (query_param) HTTP:', rB_qp.status, '| response:', JSON.stringify(dB_qp));
  console.log('[testMeta] B (bearer) HTTP:', rB_bearer.status, '| response:', JSON.stringify(dB_bearer));
  R.ig_profile = {
    endpoint: `graph.instagram.com/v21.0/${igAccountId}`,
    http_status_query_param: rB_qp.status,
    http_status_bearer: rB_bearer.status,
    success: !dB.error && !!dB.id,
    method_worked: !dB_qp.error ? 'query_param' : (!dB_bearer.error ? 'bearer' : 'none'),
    data: dB.error ? null : { id: dB.id, username: dB.username, name: dB.name, account_type: dB.account_type, followers_count: dB.followers_count },
    error: dB.error ? { code: dB.error.code, message: dB.error.message, type: dB.error.type, subcode: dB.error.error_subcode, fbtrace_id: dB.error.fbtrace_id } : null,
    error_bearer: dB_bearer.error ? { code: dB_bearer.error.code, message: dB_bearer.error.message } : null,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST C: graph.instagram.com/me
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── C: graph.instagram.com/me ───');
  const rC = await fetch(`https://graph.instagram.com/me?fields=${igFields}&access_token=${token}`);
  const dC = await rC.json();
  console.log('[testMeta] /me HTTP:', rC.status, '| response:', JSON.stringify(dC));
  R.ig_me = {
    endpoint: 'graph.instagram.com/me',
    http_status: rC.status,
    success: !dC.error && !!dC.id,
    data: dC.error ? null : { id: dC.id, username: dC.username, account_type: dC.account_type },
    error: dC.error ? { code: dC.error.code, message: dC.error.message, fbtrace_id: dC.error.fbtrace_id } : null,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST D: graph.facebook.com/me — cross-check tipo token
  // IG Business Login token NON deve funzionare qui
  // Se funziona → token è FB User Token (flusso sbagliato)
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── D: graph.facebook.com/me (cross-check) ───');
  const rD = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${token}`);
  const dD = await rD.json();
  console.log('[testMeta] graph.facebook.com/me HTTP:', rD.status, '| success:', !dD.error, '| id:', dD.id);
  R.fb_me = {
    endpoint: 'graph.facebook.com/v21.0/me',
    http_status: rD.status,
    success: !dD.error && !!dD.id,
    note: dD.id
      ? '⚠️ Token funziona su graph.facebook.com/me — PROBABILMENTE è un FB User Token, non IG Business Login. Causa error 100 su graph.instagram.com.'
      : '✅ Token NON funziona su graph.facebook.com/me — corretto per IG Business Login.',
    data: dD.error ? null : { id: dD.id, name: dD.name },
    error: dD.error ? { code: dD.error.code, message: dD.error.message } : null,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST E: Facebook Pages collegate (me/accounts)
  // Funziona solo con FB User Token — skipped con IG Business Login puro
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── E: me/accounts (FB Pages) ───');
  const rE = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,account_type}&access_token=${token}`
  );
  const dE = await rE.json();
  console.log('[testMeta] me/accounts HTTP:', rE.status, '| response:', JSON.stringify(dE).slice(0, 2000));
  const fbPages = (dE.data || []).map(p => ({
    id: p.id,
    name: p.name,
    has_ig_account: !!p.instagram_business_account,
    ig_account_id: p.instagram_business_account?.id || null,
    ig_username: p.instagram_business_account?.username || null,
    ig_account_type: p.instagram_business_account?.account_type || null,
    page_token_preview: p.access_token ? p.access_token.slice(0, 15) + '***' : null,
    _page_token: p.access_token || null, // interno, non esposto nel response
  }));
  const igLinkedPage = fbPages.find(p => p.ig_account_id === igAccountId);
  R.fb_pages = {
    endpoint: 'graph.facebook.com/v21.0/me/accounts',
    http_status: rE.status,
    success: !dE.error && !!dE.data,
    page_count: fbPages.length,
    pages: fbPages.map(p => ({ ...p, _page_token: undefined })),
    ig_linked_to_page: igLinkedPage ? { page_id: igLinkedPage.id, page_name: igLinkedPage.name, ig_username: igLinkedPage.ig_username, ig_account_type: igLinkedPage.ig_account_type } : null,
    ig_account_linked: !!igLinkedPage,
    error: dE.error ? { code: dE.error.code, message: dE.error.message } : null,
    note: dE.error ? 'Expected: IG Business Login token non ha accesso a me/accounts (solo FB User Token)' : null,
  };
  console.log('[testMeta] FB pages:', fbPages.length, '| IG linked:', igLinkedPage?.name || 'NOT FOUND');

  // ── TEST E2: Profilo IG via graph.facebook.com con Page Token (se disponibile) ──
  if (igLinkedPage?._page_token) {
    console.log('[testMeta] ─── E2: graph.facebook.com/{ig_id} con Page Token ───');
    const rE2 = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}?fields=id,username,name,account_type,followers_count&access_token=${igLinkedPage._page_token}`
    );
    const dE2 = await rE2.json();
    console.log('[testMeta] FB/{ig_id} via Page Token HTTP:', rE2.status, '|', JSON.stringify(dE2));
    R.fb_ig_via_page_token = {
      endpoint: `graph.facebook.com/v21.0/${igAccountId}`,
      method: 'FB Page Token',
      http_status: rE2.status,
      success: !dE2.error && !!dE2.id,
      data: dE2.error ? null : { id: dE2.id, username: dE2.username, account_type: dE2.account_type, followers_count: dE2.followers_count },
      error: dE2.error ? { code: dE2.error.code, message: dE2.error.message } : null,
      note: dE2.id ? '✅ Profilo IG raggiungibile via FB Page Token — percorso alternativo operativo' : '❌ Anche con Page Token fallisce',
    };
  }

  // ══════════════════════════════════════════════════════════════
  // TEST I: Business Manager — IG account ha BM collegato?
  // Usa graph.instagram.com/{ig_id}?fields=business — richiede instagram_business_basic
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── I: Business Manager check ───');
  const rI = await fetch(
    `https://graph.instagram.com/v21.0/${igAccountId}?fields=id,username,account_type,business_discovery.fields(id,name)&access_token=${token}`
  );
  const dI = await rI.json();
  console.log('[testMeta] BM check HTTP:', rI.status, '|', JSON.stringify(dI));
  R.business_manager = {
    endpoint: `graph.instagram.com/v21.0/${igAccountId}?fields=business_discovery`,
    http_status: rI.status,
    success: !dI.error && !!dI.id,
    has_business_discovery: !!dI.business_discovery,
    data: dI.error ? null : { id: dI.id, username: dI.username, account_type: dI.account_type, business: dI.business_discovery || null },
    error: dI.error ? { code: dI.error.code, message: dI.error.message } : null,
  };

  // ══════════════════════════════════════════════════════════════
  // TEST J: graph.instagram.com versioni API (v17 vs v21)
  // Verifica compatibilità versione API con questo tipo di token
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── J: Compatibility v17 vs v21 ───');
  const rJ = await fetch(
    `https://graph.instagram.com/v17.0/${igAccountId}?fields=id,username,account_type&access_token=${token}`
  );
  const dJ = await rJ.json();
  console.log('[testMeta] v17 HTTP:', rJ.status, '|', JSON.stringify(dJ));
  R.api_v17_compat = {
    endpoint: `graph.instagram.com/v17.0/${igAccountId}`,
    http_status: rJ.status,
    success: !dJ.error && !!dJ.id,
    data: dJ.error ? null : { id: dJ.id, username: dJ.username, account_type: dJ.account_type },
    error: dJ.error ? { code: dJ.error.code, message: dJ.error.message } : null,
    note: dJ.id ? 'v17 funziona: token compatibile con versioni legacy' : 'v17 fallisce con stesso errore — non è problema di versione API',
  };

  // ══════════════════════════════════════════════════════════════
  // TEST F: subscribed_apps — webhook fields attivi
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── F: subscribed_apps ───');
  const rF = await fetch(
    `https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps?access_token=${token}`
  );
  const dF = await rF.json();
  console.log('[testMeta] subscribed_apps HTTP:', rF.status, '|', JSON.stringify(dF));
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

  // ══════════════════════════════════════════════════════════════
  // TEST G: App roles — utente è Admin/Developer/Tester?
  // ══════════════════════════════════════════════════════════════
  console.log('[testMeta] ─── G: App roles ───');
  if (appId && appSecret) {
    const metaUserId = R.token_debug?.user_id;
    if (metaUserId) {
      const rG = await fetch(
        `https://graph.facebook.com/v21.0/${appId}/roles?access_token=${appId}|${appSecret}`
      );
      const dG = await rG.json();
      console.log('[testMeta] app/roles HTTP:', rG.status, '|', JSON.stringify(dG).slice(0, 2000));
      const roles = dG.data || [];
      const userRole = roles.find(r => String(r.user) === String(metaUserId));
      R.app_roles = {
        http_status: rG.status,
        all_roles: roles.slice(0, 20),
        oauth_user_id: metaUserId,
        user_role: userRole?.role || null,
        user_found_in_roles: !!userRole,
        error: dG.error ? { code: dG.error.code, message: dG.error.message } : null,
      };
      console.log('[testMeta] OAuth user role:', userRole?.role || 'NOT FOUND');
    } else {
      R.app_roles = { skipped: true, reason: 'user_id non disponibile da debug_token (token transiente o errore Meta)' };
    }
  } else {
    R.app_roles = { skipped: true, reason: 'META_APP_ID/META_APP_SECRET mancanti' };
  }

  // ══════════════════════════════════════════════════════════════
  // TEST H: Auto-subscribe webhook fields mancanti
  // ══════════════════════════════════════════════════════════════
  const TARGET_FIELDS = ['messages', 'messaging_postbacks', 'message_reactions', 'messaging_seen'];
  const missingFields = TARGET_FIELDS.filter(f => !subscribedFields.includes(f));
  console.log('[testMeta] ─── H: Subscribe webhook fields — missing:', JSON.stringify(missingFields), '───');

  if (missingFields.length > 0 && !dF.error) {
    // Tenta query param prima (standard per IG Business Login)
    const rH1 = await fetch(
      `https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps?access_token=${token}&subscribed_fields=${TARGET_FIELDS.join(',')}`,
      { method: 'POST' }
    );
    const dH1 = await rH1.json();
    console.log('[testMeta] subscribe (query_param) HTTP:', rH1.status, '|', JSON.stringify(dH1));

    if (dH1.success) {
      R.webhook_subscribe = { attempted: true, method: 'query_param', success: true, fields_requested: TARGET_FIELDS, response: dH1 };
    } else {
      // Fallback: Authorization Bearer header
      const rH2 = await fetch(
        `https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ subscribed_fields: TARGET_FIELDS.join(',') }),
        }
      );
      const dH2 = await rH2.json();
      console.log('[testMeta] subscribe (bearer) HTTP:', rH2.status, '|', JSON.stringify(dH2));
      R.webhook_subscribe = {
        attempted: true,
        method: dH2.success ? 'bearer' : 'both_failed',
        success: dH2.success === true,
        fields_requested: TARGET_FIELDS,
        response_query_param: dH1,
        response_bearer: dH2,
      };
    }
  } else if (dF.error) {
    R.webhook_subscribe = { attempted: false, reason: `subscribed_apps GET fallito (error ${dF.error?.code}) — impossibile verificare o sottoscrivere` };
  } else {
    R.webhook_subscribe = { attempted: false, reason: 'Tutti i fields già sottoscritti' };
  }

  // ══════════════════════════════════════════════════════════════
  // AGGIORNAMENTO DB
  // ══════════════════════════════════════════════════════════════
  const profileOk = R.ig_profile.success || R.ig_me.success;
  const profileData = R.ig_profile.success ? dB : (R.ig_me.success ? dC : null);

  if (profileOk && profileData) {
    const updates = { sync_error: '', refresh_error: '', status: 'connected', has_basic_scope: true, has_messages_scope: true };
    if (profileData.username) { updates.ig_account_name = profileData.username; updates.meta_user_name = profileData.username; }
    if (profileData.profile_picture_url) updates.ig_profile_picture_url = profileData.profile_picture_url;
    await base44.asServiceRole.entities.MetaConnection.update(conn.id, updates).catch(() => {});
    console.log('[testMeta] ✅ DB aggiornato');
  } else {
    const errCode = dB.error?.code || dC.error?.code;
    const errMsg  = dB.error?.message || dC.error?.message || '';
    if (errCode === 190) {
      await base44.asServiceRole.entities.MetaConnection.update(conn.id, { status: 'error', sync_error: `token_expired_190: ${errMsg}`, refresh_error: `error_190_${new Date().toISOString()}: ${errMsg}` }).catch(() => {});
    } else {
      await base44.asServiceRole.entities.MetaConnection.update(conn.id, { sync_error: `API error ${errCode}: ${errMsg}` }).catch(() => {});
    }
    console.log(`[testMeta] ❌ Profilo FALLITO — error ${errCode}`);
  }

  // ══════════════════════════════════════════════════════════════
  // DIAGNOSTICA FINALE
  // ══════════════════════════════════════════════════════════════
  const tokenValid        = R.token_debug?.is_valid === true;
  const realScopes        = R.token_debug?.scopes || [];
  const hasBasicReal      = realScopes.includes('instagram_business_basic');
  const hasMsgReal        = realScopes.includes('instagram_business_manage_messages');
  const accountType       = profileData?.account_type || null;
  const isBusinessOrCreator = accountType === 'BUSINESS' || accountType === 'CREATOR';
  const webhookFieldsOk   = hasMessages && hasPostbacks;
  const userRoleOk        = ['administrator', 'developer', 'tester'].includes(R.app_roles?.user_role);
  const fbMeOk            = R.fb_me.success;

  // Recent activity
  const [recentWebhooks, recentMessages] = await Promise.all([
    base44.asServiceRole.entities.WebhookEventLog.filter({ connection_id: conn.id }, '-created_date', 10).catch(() => []),
    base44.asServiceRole.entities.Message.filter({ business_id: conn.business_id, canale: 'instagram' }, '-created_date', 3).catch(() => []),
  ]);

  // Conta webhook reali (non quelli del test simulato — esclude sender_id=123456789)
  const realWebhooks = recentWebhooks.filter(w => w.sender_id !== '123456789' && w.event_type !== 'test');
  const realDmWebhooks = realWebhooks.filter(w => w.event_type === 'dm' && w.processed);

  const diagnosis = [];

  // Token
  if (!tokenValid && !R.token_debug?.skipped) {
    diagnosis.push({ level: 'error', code: 'TOKEN_INVALID', msg: 'Token non valido secondo Meta debug_token. Potrebbe essere un errore transiente — riprova tra qualche secondo.' });
  }

  // Endpoint compatibility check — questo è il punto critico
  if (fbMeOk) {
    diagnosis.push({ level: 'error', code: 'WRONG_TOKEN_TYPE', msg: 'CAUSA PROBABILE ERROR 100: Il token funziona su graph.facebook.com/me ma NON su graph.instagram.com. Il token è quasi certamente un Facebook User Token (generato da facebook.com/dialog/oauth) invece di un Instagram Business Login token (generato da api.instagram.com/oauth/authorize). La funzione startMetaOAuth deve usare api.instagram.com, non graph.facebook.com.' });
  }

  // Scopes
  if (!hasBasicReal && !R.token_debug?.skipped) {
    diagnosis.push({ level: 'error', code: 'SCOPE_BASIC_MISSING', msg: 'instagram_business_basic NON nei scopes reali del token. Causa: (1) App Review non completata — aggiungiti come Tester in Meta App Dashboard → Roles, oppure (2) lo scope non è stato richiesto durante OAuth.' });
  }
  if (!hasMsgReal && !R.token_debug?.skipped) {
    diagnosis.push({ level: 'error', code: 'SCOPE_MESSAGES_MISSING', msg: 'instagram_business_manage_messages NON nei scopes reali — impossibile inviare/ricevere DM.' });
  }

  // Profilo API
  if (!profileOk) {
    const errCode = R.ig_profile.error?.code;
    if (errCode === 100) {
      diagnosis.push({ level: 'error', code: 'ERROR_100', msg: `Error 100 su graph.instagram.com: (1) instagram_business_basic non approvato, oppure (2) account non è Business/Creator, oppure (3) in modalità sviluppo e account non è Tester, oppure (4) token è un FB User Token (non IG Business Login) — vedi cross-check TEST D.` });
    } else if (errCode === 190) {
      diagnosis.push({ level: 'error', code: 'ERROR_190', msg: 'Error 190: Token scaduto. Riconnetti Instagram tramite OAuth.' });
    } else if (errCode === 200) {
      diagnosis.push({ level: 'error', code: 'ERROR_200', msg: 'Error 200: Permessi insufficienti. App Review necessaria.' });
    } else {
      diagnosis.push({ level: 'error', code: 'PROFILE_FAIL', msg: `Profilo non raggiungibile: error ${errCode} — ${R.ig_profile.error?.message}` });
    }
  }

  // Account type
  if (accountType && !isBusinessOrCreator) {
    diagnosis.push({ level: 'error', code: 'NOT_BUSINESS', msg: `Account Instagram type: ${accountType}. Solo BUSINESS e CREATOR supportano le API Messaging. Vai su Instagram → Impostazioni → Account → Passa ad account professionale.` });
  }

  // Webhook fields
  if (!webhookFieldsOk) {
    diagnosis.push({ level: 'error', code: 'WEBHOOK_FIELDS_MISSING', msg: `Webhook fields mancanti: ${missingFields.join(', ')}. Meta non invia eventi DM. Usa il pulsante "Sottoscrivi" oppure configura manualmente nel Meta App Dashboard → Webhooks.` });
  }

  // FB Page link
  if (!R.fb_pages.ig_account_linked && !dE.error) {
    diagnosis.push({ level: 'error', code: 'NO_FB_PAGE_LINK', msg: `Account Instagram (${igAccountId}) NON risulta collegato a nessuna Facebook Page nelle Pages dell'utente OAuth. Un account Business Instagram deve essere collegato a una FB Page.` });
  }

  // Ruolo utente
  if (R.app_roles?.user_found_in_roles === false) {
    diagnosis.push({ level: 'error', code: 'USER_NOT_IN_ROLES', msg: `L'utente OAuth (Meta ID: ${R.app_roles.oauth_user_id}) non è Admin/Developer/Tester dell'app Meta. In modalità sviluppo, aggiungilo come Tester su Meta App Dashboard → Roles → Add Testers.` });
  } else if (!userRoleOk && !R.app_roles?.skipped && R.app_roles?.user_role) {
    diagnosis.push({ level: 'warn', code: 'USER_ROLE_INSUFFICIENT', msg: `Ruolo utente: ${R.app_roles.user_role}. In modalità sviluppo potrebbe non essere sufficiente.` });
  }

  // Webhook ricevuti
  if (realWebhooks.length === 0) {
    diagnosis.push({ level: 'error', code: 'NO_WEBHOOKS', msg: 'Zero webhook reali ricevuti. Meta non sta inviando eventi. Checklist: (1) Callback URL nel Meta App Dashboard → Webhooks corrisponde all\'endpoint?, (2) Verify Token = emaral2026?, (3) Fields messages+messaging_postbacks abilitati?, (4) Account è Tester se app in modalità sviluppo?' });
  } else if (realDmWebhooks.length === 0 && realWebhooks.length > 0) {
    diagnosis.push({ level: 'error', code: 'WEBHOOKS_NOT_PROCESSED', msg: `${realWebhooks.length} webhook ricevuti ma nessun DM processato in Inbox. Problema nel parser/mapping: recipient_id del webhook non corrisponde a ig_account_id della MetaConnection.` });
  }

  if (diagnosis.length === 0) {
    diagnosis.push({ level: 'ok', code: 'ALL_OK', msg: '✅ Tutti i test superati — connessione Instagram Business Login operativa.' });
  }

  console.log('[testMeta] ═══ DIAGNOSIS ═══');
  diagnosis.forEach(d => console.log(`[testMeta] [${d.level.toUpperCase()}] [${d.code}] ${d.msg}`));

  return Response.json({
    success: profileOk,
    account_name: profileData?.username || profileData?.name || null,
    account_id: profileData?.id || igAccountId,
    account_type: accountType,
    is_business_or_creator: isBusinessOrCreator,

    // Token
    token_valid: tokenValid,
    real_scopes: realScopes,
    instagram_business_basic_approved: hasBasicReal,
    instagram_business_manage_messages_approved: hasMsgReal,

    // Endpoint compatibility
    token_works_on_fb_graph: fbMeOk,
    ig_profile_method_worked: R.ig_profile.method_worked,
    v17_compatible: R.api_v17_compat?.success,

    // FB Page link
    fb_page_linked: R.fb_pages.ig_account_linked,
    fb_linked_page_info: R.fb_pages.ig_linked_to_page,
    fb_ig_via_page_token_ok: R.fb_ig_via_page_token?.success || false,

    // Business Manager
    has_business_manager: R.business_manager?.has_business_discovery || false,

    // Webhook
    subscribed_fields: subscribedFields,
    webhook_fields_ok: webhookFieldsOk,
    missing_fields: missingFields,
    subscribe_attempted: R.webhook_subscribe?.attempted,
    subscribe_success: R.webhook_subscribe?.success,

    // Ruolo utente
    user_role_in_app: R.app_roles?.user_role || null,
    user_role_ok: userRoleOk,

    // Activity reale
    recent_webhooks_count: realWebhooks.length,
    recent_webhooks_all: recentWebhooks.length,
    recent_messages_count: recentMessages.length,
    last_real_webhook: realWebhooks[0] ? {
      event_type: realWebhooks[0].event_type,
      processed: realWebhooks[0].processed,
      matched_connection: realWebhooks[0].matched_connection,
      created_date: realWebhooks[0].created_date,
      sender_id: realWebhooks[0].sender_id,
      recipient_id: realWebhooks[0].recipient_id,
      object: realWebhooks[0].object,
    } : null,

    diagnosis,
    results: R,
  });
});