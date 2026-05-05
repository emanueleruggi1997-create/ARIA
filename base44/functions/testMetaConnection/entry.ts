import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const { connector_id } = body;

  if (!connector_id) {
    return Response.json({ error: 'Missing connector_id' }, { status: 400 });
  }

  try {
    const conn = await base44.asServiceRole.entities.MetaConnection.get(connector_id);
    if (!conn) {
      return Response.json({ success: false, error: 'Connection not found' });
    }

    const token = conn.fb_page_token || conn.access_token;
    const igAccountId = conn.ig_account_id;
    const fbPageId = conn.fb_page_id;

    if (!token || (!igAccountId && !fbPageId)) {
      return Response.json({ success: false, error: 'Missing token or account ID' });
    }

    // 1. Test token validità
    const accountId = igAccountId || fbPageId;
    const testRes = await fetch(`https://graph.instagram.com/v21.0/${accountId}?access_token=${token}`);
    const testData = await testRes.json();

    if (testData.error) {
      return Response.json({ success: false, error: testData.error.message });
    }

    // 2. Controlla webhook subscription
    let webhookSubscribed = false;
    if (igAccountId) {
      try {
        const subRes = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/subscribed_apps?access_token=${token}`);
        const subData = await subRes.json();
        console.log('[testMetaConnection] Webhook subscription status:', JSON.stringify(subData));
        webhookSubscribed = !!(subData.data && subData.data.length > 0);
      } catch (e) {
        console.log('[testMetaConnection] Errore check webhook:', e.message);
      }
    }

    return Response.json({
      success: true,
      account_name: conn.ig_account_name || testData.name || 'Connected',
      webhook_subscribed: webhookSubscribed,
    });
  } catch (e) {
    return Response.json({ success: false, error: e.message });
  }
});