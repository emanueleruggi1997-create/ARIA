import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const body = await req.json();
  const { code, state } = body;

  if (!code || !state) return Response.json({ error: 'Missing code or state' }, { status: 400 });

  let userId = '';
  let businessId = '';
  try {
    const decoded = JSON.parse(atob(state));
    userId = decoded.userId;
    businessId = decoded.businessId;
  } catch {
    return Response.json({ error: 'Invalid state' }, { status: 400 });
  }

  const appId = Deno.env.get('META_APP_ID');
  const appSecret = Deno.env.get('META_APP_SECRET');
  const redirectUri = (Deno.env.get('META_REDIRECT_URI') || '').trim();

  // 1. Exchange code for short-lived token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
  );
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return Response.json({ error: 'Token exchange failed', detail: tokenData }, { status: 400 });
  }

  // 2. Exchange for long-lived token
  const llRes = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
  );
  const llData = await llRes.json();
  const longToken = llData.access_token || tokenData.access_token;

  // 3. Get Meta user info
  const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${longToken}`);
  const meData = await meRes.json();

  // 4. Get Facebook Pages
  const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`);
  const pagesData = await pagesRes.json();
  const pages = pagesData.data || [];

  // 5. For each page, try to get linked Instagram Business Account
  let igAccountId = '';
  let igAccountName = '';
  let fbPageId = '';
  let fbPageName = '';
  let fbPageToken = '';

  if (pages.length > 0) {
    const page = pages[0]; // use first page by default
    fbPageId = page.id;
    fbPageName = page.name;
    fbPageToken = page.access_token;

    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    );
    const igData = await igRes.json();
    if (igData.instagram_business_account?.id) {
      const igId = igData.instagram_business_account.id;
      const igInfoRes = await fetch(
        `https://graph.facebook.com/v19.0/${igId}?fields=id,name,username&access_token=${page.access_token}`
      );
      const igInfo = await igInfoRes.json();
      igAccountId = igId;
      igAccountName = igInfo.username || igInfo.name || igId;
    }
  }

  // 6. Upsert MetaConnection
  const existing = await base44.asServiceRole.entities.MetaConnection.filter({ user_id: userId });
  const payload = {
    user_id: userId,
    business_id: businessId,
    access_token: longToken,
    meta_user_id: meData.id,
    meta_user_name: meData.name,
    status: 'connected',
    connected_at: new Date().toISOString(),
    fb_connected: pages.length > 0,
    fb_page_id: fbPageId,
    fb_page_name: fbPageName,
    fb_page_token: fbPageToken,
    ig_connected: !!igAccountId,
    ig_account_id: igAccountId,
    ig_account_name: igAccountName,
  };

  if (existing.length > 0) {
    await base44.asServiceRole.entities.MetaConnection.update(existing[0].id, payload);
  } else {
    await base44.asServiceRole.entities.MetaConnection.create(payload);
  }

  return Response.json({
    success: true,
    meta_user_name: meData.name,
    fb_available: pages.length > 0,
    fb_page_name: fbPageName,
    ig_available: !!igAccountId,
    ig_account_name: igAccountName,
    pages,
  });
});