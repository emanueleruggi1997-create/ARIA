import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Sottoscrive un account Instagram Business ai webhook
 * Deve essere chiamato DOPO il collegamento OAuth con token valido
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
  const { ig_account_id, access_token } = body;

  if (!ig_account_id || !access_token) {
    return Response.json({ error: 'Missing ig_account_id or access_token' }, { status: 400 });
  }

  console.log('[subscribeIGWebhook] Sottoscrizione webhook per account:', ig_account_id);

  try {
    const subRes = await fetch(`https://graph.instagram.com/v21.0/${ig_account_id}/subscribed_apps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        subscribed_fields: 'messages,messaging_postbacks',
      }),
    });
    const subData = await subRes.json();
    console.log('[subscribeIGWebhook] Response:', JSON.stringify(subData));

    if (subData.success) {
      console.log('[subscribeIGWebhook] ✅ Account', ig_account_id, 'sottoscritto ai webhook');
      return Response.json({ success: true, message: 'Webhook subscription successful' });
    } else {
      console.error('[subscribeIGWebhook] ✗ Subscription failed:', JSON.stringify(subData.error));
      return Response.json({ 
        success: false, 
        error: subData.error?.message || 'Subscription failed'
      }, { status: 400 });
    }
  } catch (e) {
    console.error('[subscribeIGWebhook] Error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
});