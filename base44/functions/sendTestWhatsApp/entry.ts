import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const { to, message, phone_number_id } = await req.json();
  const token = Deno.env.get('WHATSAPP_BUSINESS_TOKEN');

  if (!token) return Response.json({ error: 'Missing WHATSAPP_BUSINESS_TOKEN' }, { status: 500 });

  const res = await fetch(`https://graph.instagram.com/v21.0/${phone_number_id}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: { body: message },
    }),
  });

  const data = await res.json();
  return Response.json(data);
});