import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * subscribeIGWebhook — sottoscrive i webhook fields per Instagram Business Login
 *
 * Endpoint corretto: POST graph.instagram.com/v21.0/{ig_account_id}/subscribed_apps
 * con access_token come query param (NON Authorization: Bearer per IG Business Login).
 *
 * Tenta entrambe le modalità (query param e Bearer) per massima compatibilità.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const { ig_account_id, access_token, connector_id } = body;

  // Accetta anche connector_id per recuperare i dati dal DB
  let token = access_token;
  let accountId = ig_account_id;

  if (connector_id && (!token || !accountId)) {
    const rows = await base44.asServiceRole.entities.MetaConnection.filter({ id: connector_id }).catch(() => []);
    const conn = rows[0];
    if (conn) {
      // Security: verify caller owns the connection's business
      if (conn.business_id) {
        const biz = await base44.asServiceRole.entities.Business.get(conn.business_id).catch(() => null);
        const isOwner = biz && (biz.created_by_id === user.id || biz.created_by === user.email || biz.created_by === user.id);
        if (!isOwner && user.role !== 'admin') {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      token = token || conn.access_token;
      accountId = accountId || conn.ig_account_id;
    }
  }

  if (!accountId || !token) {
    return Response.json({ error: 'Missing ig_account_id and access_token (or connector_id)' }, { status: 400 });
  }

  const TARGET_FIELDS = ['messages', 'messaging_postbacks', 'message_reactions', 'messaging_seen'];

  console.log('[subscribeIGWebhook] ─── Inizio sottoscrizione webhook ───');
  console.log('[subscribeIGWebhook] ig_account_id:', accountId);
  console.log('[subscribeIGWebhook] fields richiesti:', TARGET_FIELDS.join(','));

  // STEP 1: verifica sottoscrizioni esistenti
  const checkRes = await fetch(
    `https://graph.instagram.com/v21.0/${accountId}/subscribed_apps?access_token=${token}`
  );
  const checkData = await checkRes.json();
  console.log('[subscribeIGWebhook] GET subscribed_apps HTTP:', checkRes.status);
  console.log('[subscribeIGWebhook] GET subscribed_apps response:', JSON.stringify(checkData));

  const existingFields = checkData.data?.[0]?.subscribed_fields || [];
  const missingFields = TARGET_FIELDS.filter(f => !existingFields.includes(f));

  console.log('[subscribeIGWebhook] Fields già attivi:', JSON.stringify(existingFields));
  console.log('[subscribeIGWebhook] Fields mancanti:', JSON.stringify(missingFields));

  if (missingFields.length === 0 && !checkData.error) {
    return Response.json({
      success: true,
      already_subscribed: true,
      subscribed_fields: existingFields,
      message: 'Tutti i fields già sottoscritti',
    });
  }

  // STEP 2: sottoscrivi via query param (metodo preferito per IG Business Login)
  const allFields = TARGET_FIELDS.join(',');
  const subscribeUrl = `https://graph.instagram.com/v21.0/${accountId}/subscribed_apps?access_token=${token}&subscribed_fields=${allFields}`;
  console.log('[subscribeIGWebhook] POST (query param) subscribed_apps...');
  const postRes = await fetch(subscribeUrl, { method: 'POST' });
  const postData = await postRes.json();
  console.log('[subscribeIGWebhook] POST query param HTTP:', postRes.status);
  console.log('[subscribeIGWebhook] POST query param response:', JSON.stringify(postData));

  if (postData.success) {
    console.log('[subscribeIGWebhook] ✅ Sottoscrizione OK via query param');
    return Response.json({
      success: true,
      method_used: 'query_param',
      subscribed_fields: TARGET_FIELDS,
      previous_fields: existingFields,
      missing_fields_added: missingFields,
    });
  }

  // STEP 3: fallback — Bearer header
  console.log('[subscribeIGWebhook] Fallback: Authorization: Bearer header');
  const bearerRes = await fetch(
    `https://graph.instagram.com/v21.0/${accountId}/subscribed_apps`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ subscribed_fields: allFields }),
    }
  );
  const bearerData = await bearerRes.json();
  console.log('[subscribeIGWebhook] Bearer HTTP:', bearerRes.status);
  console.log('[subscribeIGWebhook] Bearer response:', JSON.stringify(bearerData));

  if (bearerData.success) {
    console.log('[subscribeIGWebhook] ✅ Sottoscrizione OK via Bearer header');
    return Response.json({
      success: true,
      method_used: 'bearer_header',
      subscribed_fields: TARGET_FIELDS,
      previous_fields: existingFields,
      missing_fields_added: missingFields,
    });
  }

  // Entrambi falliti
  console.error('[subscribeIGWebhook] ❌ Entrambi i metodi falliti');
  return Response.json({
    success: false,
    error: postData.error?.message || bearerData.error?.message || 'Subscription failed',
    error_code: postData.error?.code || bearerData.error?.code,
    error_query_param: postData.error || null,
    error_bearer: bearerData.error || null,
    diagnosis: postData.error?.code === 100
      ? 'Error 100: instagram_business_basic non approvato in App Review, oppure account non è Business/Creator, oppure utente non è Tester in modalità sviluppo.'
      : `Error ${postData.error?.code}: ${postData.error?.message}`,
  }, { status: 400 });
});