import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = 'emaral2026';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── Webhook verification (GET da Meta) ──
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

  // Usa createClientFromRequest — l'unico modo corretto per service role nei webhook
  const base44 = createClientFromRequest(req);

  for (const entry of entries) {
    // ── Processa DM ──
    for (const event of (entry.messaging || [])) {
      // Ignora: read receipts, delivery, messaggi echo (inviati DA noi)
      if (event.read || event.delivery || event.message?.is_echo) continue;

      const senderId = event.sender?.id;
      const text = event.message?.text || event.postback?.title || '';
      if (!senderId || !text) continue;

      console.log('[webhookMeta] Messaggio ricevuto da:', senderId, '| testo:', text.slice(0, 100));

      (async () => {
        try {
          // Cerca connessione per ig_account_id (nuovo flusso) o fb_page_id (vecchio flusso)
          let conns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: entry.id });
          if (!conns.length) conns = await base44.asServiceRole.entities.MetaConnection.filter({ fb_page_id: entry.id });
          if (!conns.length) {
            console.log('[webhookMeta] Nessuna connessione per entry:', entry.id);
            return;
          }

          const conn = conns[0];
          let businessId = conn.business_id;

          // Risolvi businessId se mancante
          if (!businessId && conn.user_id) {
            const allBiz = await base44.asServiceRole.entities.Business.filter({});
            const match = allBiz.find(b => b.created_by === conn.user_id);
            if (match) {
              businessId = match.id;
              await base44.asServiceRole.entities.MetaConnection.update(conn.id, { business_id: businessId });
              console.log('[webhookMeta] businessId risolto:', businessId);
            }
          }

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

          // Salva messaggio in arrivo
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

          // ── ARIA Auto-risposta ──
          // Salta se AI disabilitata per questo contatto
          if (contact.ai_disabled) {
            console.log('[webhookMeta] AI disabilitata per contatto:', contact.nome);
            return;
          }

          // Carica configurazione business
          const business = await base44.asServiceRole.entities.Business.get(businessId);
          if (!business) return;

          // Controlla se auto-risposta è attiva
          if (!business.auto_risposta || business.stato_agente === 'off') {
            console.log('[webhookMeta] Auto-risposta disattivata per business:', businessId);
            return;
          }

          // Controlla orario — usa HH:MM in Europe/Rome
          const now = new Date();
          const formatter = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome', hour12: false });
          const parts = formatter.formatToParts(now);
          const hh = parts.find(p => p.type === 'hour')?.value || '00';
          const mm = parts.find(p => p.type === 'minute')?.value || '00';
          const oraCorrente = `${hh}:${mm}`;
          const giornoCorrente = new Intl.DateTimeFormat('it-IT', { weekday: 'long', timeZone: 'Europe/Rome' }).format(now).toLowerCase();
          const giorni = business.giorni_attivi || ['lunedì','martedì','mercoledì','giovedì','venerdì','sabato','domenica'];

          const inOrario = (business.orario_inizio && business.orario_fine)
            ? (oraCorrente >= business.orario_inizio && oraCorrente <= business.orario_fine)
            : true;
          const inGiorno = giorni.length === 0 ? true : giorni.includes(giornoCorrente);

          console.log('[webhookMeta] Ora:', oraCorrente, '| Giorno:', giornoCorrente, '| inOrario:', inOrario, '| inGiorno:', inGiorno, '| fuori_orario_attivo:', business.fuori_orario_attivo);

          if ((!inOrario || !inGiorno) && business.fuori_orario_attivo && business.messaggio_fuori_orario) {
            // Invia messaggio fuori orario
            await sendIGReply(conn, senderId, business.messaggio_fuori_orario);
            await base44.asServiceRole.entities.Message.create({
              business_id: businessId, contact_id: contact.id,
              canale: 'instagram', ruolo: 'assistant',
              testo: business.messaggio_fuori_orario, letto: true,
            });
            console.log('[webhookMeta] Messaggio fuori orario inviato');
            return;
          }

          if (!inOrario || !inGiorno) {
            console.log('[webhookMeta] Fuori orario — nessuna risposta automatica');
            return;
          }

          // Carica storico conversazione (ultimi 10 messaggi)
          const storia = await base44.asServiceRole.entities.Message.filter({ business_id: businessId, contact_id: contact.id });
          const storicoTesto = storia.slice(-10).map(m => `${m.ruolo === 'user' ? 'Cliente' : 'ARIA'}: ${m.testo}`).join('\n');

          // Costruisci prompt sistema
          const systemPrompt = `Sei ${business.nome_agente || 'ARIA'}, l'assistente AI di "${business.nome}".
Settore: ${business.settore || 'non specificato'}. Città: ${business.citta || ''}.
Tono: ${business.tono || 'professionale'}.
Servizi: ${business.servizi || 'non specificati'}.
Prezzi: ${business.prezzi || 'da richiedere'}.
FAQ: ${business.faq || ''}.
Cose da NON fare: ${business.cose_da_non_fare || 'nessuna restrizione'}.
${business.ai_prompt || ''}

Regole:
- Rispondi SOLO alla domanda del cliente, in modo breve e diretto.
- Non inventare informazioni non fornite.
- Se non sai rispondere, di' che passerai la richiesta a un operatore.
- Lingua: ${business.lingua || 'Italiano'}.`;

          // Chiama LLM via SDK (service role)
          const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}\n\n--- Conversazione precedente ---\n${storicoTesto}\n\nCliente: ${text}\n\nRispondi come ${business.nome_agente || 'ARIA'}:`,
          });

          const replyText = typeof llmRes === 'string' ? llmRes : (llmRes?.text || llmRes?.response || '');
          if (!replyText) {
            console.log('[webhookMeta] LLM non ha generato risposta');
            return;
          }

          // Invia risposta via Instagram API
          const sent = await sendIGReply(conn, senderId, replyText);
          if (!sent) {
            console.error('[webhookMeta] Invio risposta IG fallito');
            return;
          }

          // Salva risposta nel DB
          await base44.asServiceRole.entities.Message.create({
            business_id: businessId,
            contact_id: contact.id,
            canale: 'instagram',
            ruolo: 'assistant',
            testo: replyText,
            letto: true,
          });

          console.log('[webhookMeta] ✅ ARIA ha risposto a:', contact.nome);
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
          if (!businessId) return;

          let contacts = await base44.asServiceRole.entities.Contact.filter({ business_id: businessId, numero: senderId, canale: 'instagram' });
          let contact = contacts[0];
          if (!contact) {
            contact = await base44.asServiceRole.entities.Contact.create({
              business_id: businessId, nome: senderName, numero: senderId,
              canale: 'instagram', stato: 'lead',
            });
          }

          await base44.asServiceRole.entities.Message.create({
            business_id: businessId, contact_id: contact.id,
            canale: 'instagram', ruolo: 'user', testo: text, letto: false, tipo: 'commento',
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

// ── Helper: invia messaggio via Instagram Messaging API ──
async function sendIGReply(conn, recipientId, text) {
  const token = conn.access_token || conn.fb_page_token;
  const igAccountId = conn.ig_account_id;

  if (!token || !igAccountId) {
    console.error('[sendIGReply] Token o account ID mancante');
    return false;
  }

  try {
    const res = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });
    const data = await res.json();
    if (data.error) {
      console.error('[sendIGReply] Errore API:', JSON.stringify(data.error));
      return false;
    }
    console.log('[sendIGReply] ✅ Messaggio inviato:', data.message_id);
    return true;
  } catch (e) {
    console.error('[sendIGReply] Eccezione:', e.message);
    return false;
  }
}