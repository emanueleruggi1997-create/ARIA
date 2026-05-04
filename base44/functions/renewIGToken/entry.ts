import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Refresh long-lived Instagram tokens (runs daily via automation)
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const conns = await base44.asServiceRole.entities.MetaConnection.filter({});
    console.log('[renewIGToken] Checking', conns.length, 'connections');

    let renewed = 0;
    let errors = 0;

    for (const conn of conns) {
      if (!conn.access_token || !conn.ig_account_id) continue;

      try {
        // Refresh token via Facebook Graph API
        const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${conn.access_token}`;
        const res = await fetch(refreshUrl);
        const data = await res.json();

        if (data.error) {
          console.log('[renewIGToken] Refresh failed for', conn.id, ':', data.error.message);
          errors++;
          continue;
        }

        if (data.access_token) {
          // Calculate new expiry (60 days from now)
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 60);

          await base44.asServiceRole.entities.MetaConnection.update(conn.id, {
            access_token: data.access_token,
            ig_token_expires_at: expiresAt.toISOString(),
          });

          renewed++;
          console.log('[renewIGToken] ✅ Token renewed for', conn.id);
        }
      } catch (e) {
        console.error('[renewIGToken] Error renewing', conn.id, ':', e.message);
        errors++;
      }
    }

    return Response.json({
      renewed,
      errors,
      total: conns.length,
      status: 'completed',
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});