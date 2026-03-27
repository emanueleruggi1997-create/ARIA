import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Allows user to activate/deactivate FB or IG channel independently
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { fb_connected, ig_connected } = body;

  const existing = await base44.entities.MetaConnection.filter({ user_id: user.id });
  if (existing.length === 0) return Response.json({ error: 'Nessuna connessione Meta trovata' }, { status: 404 });

  const updates = {};
  if (fb_connected !== undefined) updates.fb_connected = fb_connected;
  if (ig_connected !== undefined) updates.ig_connected = ig_connected;

  await base44.entities.MetaConnection.update(existing[0].id, updates);
  return Response.json({ success: true });
});