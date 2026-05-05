import { createClient } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = 'emaral2026';

// Service role client — non richiede utente autenticato (webhook chiamato da Meta)
const base44 = createClient({
  appId: Deno.env.get('BASE44_APP_ID'),
  serviceRoleKey: true,
});

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // Webhook verification (GET da Meta)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[webhookMeta] Webhook verified ✅');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json().catch(() => ({}));
  const entries = body.entry || [];

  console.log('[webhookMeta] ═══ WEBHOOK RICEVUTO ═══');
  console.log('[webhookMeta] Entry IDs:', entries.map(e => e.id).join(', '));
  console.log('[webhookMeta] Full body (troncato):', JSON.stringify(body).slice(0, 500));

  for (const entry of entries) {
    // ── Processa DM ──
    for (const event of (entry.messaging || [])) {
      // Ignora: read receipts, delivery, messaggi echo (inviati DA noi)
      if (event.read || event.delivery || event.message?.is_echo) continue;

      const senderId = event.sender?.id;
      const text = event.message?.text || event.postback?.title || '';
      if (!senderId || !text) continue;

      (async () => {
        try {
          // Cerca connessione per fb_page_id o ig_account_id
          let conns = await base44.asServiceRole.entities.MetaConnection.filter({ fb_page_id: entry.id });
          if (!conns.length) conns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entry.id });
          if (!conns.length) {
            console.log('[webhookMeta] Nessuna connessione per entry:', entry.id);
            return;
          }

          const conn = conns[0];
          const businessId = conn.business_id;

          if (!businessId) {
            console.log('[webhookMeta] business_id mancante per connessione:', conn.id, '— skip');
            return;
          }

          // Ottieni o crea contatto
          let contacts = await base44.asServiceRole.entities.Contact.filter({ business_id: businessId, numero: senderId, canale: 'instagram' });
          let contact = contacts[0];
          if (!contact) {
            contact = await base44.asServiceRole.entities.Contact.create({
              business_id: businessId,
              nome: `User_${senderId}`,
              numero: senderId,
              canale: 'instagram',
              stato: 'lead',
            });
          }

          // Salva messaggio
          await base44.asServiceRole.entities.Message.create({
            business_id: businessId,
            contact_id: contact.id,
            canale: 'instagram',
            ruolo: 'user',
            testo: text,
            letto: false,
          });

          // Crea lead se nuovo
          const leads = await base44.asServiceRole.entities.Lead.filter({ business_id: businessId, contact_id: contact.id });
          if (!leads.length) {
            await base44.asServiceRole.entities.Lead.create({
              business_id: businessId,
              contact_id: contact.id,
              contact_nome: contact.nome,
              canale: 'instagram',
              stato: 'nuovo',
            });
          }

          console.log('[webhookMeta] ✅ Messaggio salvato | Contatto:', contact.nome);
        } catch (e) {
          console.error('[webhookMeta] Errore DM:', e.message);
        }
      })();
    }

    // ── Processa Commenti ──
    for (const change of (entry.changes || [])) {
      if (change.field !== 'comments') continue;
      const val = change.value || {};
      if (val.parent_id || val.from?.id === entry.id) continue;

      const text = val.text || '';
      const senderId = val.from?.id || '';
      const senderName = val.from?.name || senderId;
      if (!text) continue;

      (async () => {
        try {
          const conns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entry.id });
          const conn = conns[0];
          if (!conn) return;

          const businessId = conn.business_id;
          if (!businessId) {
            console.log('[webhookMeta] business_id mancante per commento, connessione:', conn.id, '— skip');
            return;
          }

          let contacts = await base44.asServiceRole.entities.Contact.filter({ business_id: businessId, numero: senderId, canale: 'instagram' });
          let contact = contacts[0];
          if (!contact) {
            contact = await base44.asServiceRole.entities.Contact.create({
              business_id: businessId,
              nome: senderName,
              numero: senderId,
              canale: 'instagram',
              stato: 'lead',
            });
          }

          await base44.asServiceRole.entities.Message.create({
            business_id: businessId,
            contact_id: contact.id,
            canale: 'instagram',
            ruolo: 'user',
            testo: text,
            letto: false,
            tipo: 'commento',
          });

          console.log('[webhookMeta] ✅ Commento salvato | Contatto:', senderName);
        } catch (e) {
          console.error('[webhookMeta] Errore commento:', e.message);
        }
      })();
    }
  }

  return Response.json({ ok: true });
});