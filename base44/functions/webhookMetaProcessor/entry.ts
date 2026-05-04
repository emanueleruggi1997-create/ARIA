import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Lightweight webhook processor — extracts data only, delegates to async handler
Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Verification
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === 'emaral2026') {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json().catch(() => ({}));
  const base44 = createClientFromRequest(req);

  // Queue async processing — respond immediately to Meta
  base44.asServiceRole.functions.invoke('webhookMetaAsync', { body })
    .catch(e => console.error('[webhookMetaProcessor] Async invoke error:', e.message));

  return Response.json({ ok: true });
});