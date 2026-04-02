import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const VERIFY_TOKEN = 'emaral2026';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // GET: Meta verifica l'endpoint
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }
    // Risposta semplice per confermare che l'endpoint è live
    return new Response('Data Deletion Endpoint Active', { status: 200 });
  }

  // POST: Meta invia richiesta di eliminazione dati
  if (req.method === 'POST') {
    try {
      const body = await req.json().catch(() => ({}));
      console.log('[metaDataDeletion] Received deletion request:', JSON.stringify(body));

      const signedRequest = body.signed_request;
      if (!signedRequest) {
        return Response.json({ error: 'Missing signed_request' }, { status: 400 });
      }

      // Estrai user_id dal signed_request (payload base64)
      const parts = signedRequest.split('.');
      if (parts.length < 2) {
        return Response.json({ error: 'Invalid signed_request' }, { status: 400 });
      }
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const metaUserId = payload.user_id || '';
      console.log('[metaDataDeletion] Deleting data for Meta user_id:', metaUserId);

      // Elimina la connessione Meta associata all'utente
      if (metaUserId) {
        const base44 = createClientFromRequest(req);
        const connections = await base44.asServiceRole.entities.MetaConnection.filter({ meta_user_id: metaUserId });
        for (const conn of connections) {
          await base44.asServiceRole.entities.MetaConnection.delete(conn.id);
          console.log('[metaDataDeletion] Deleted MetaConnection:', conn.id);
        }
      }

      // Meta richiede una risposta con confirmation_code e status_url
      const confirmationCode = `del_${metaUserId}_${Date.now()}`;
      return Response.json({
        url: 'https://emaral-systems-ai.base44.app/legal',
        confirmation_code: confirmationCode,
      });
    } catch (err) {
      console.error('[metaDataDeletion] Error:', err.message);
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
});