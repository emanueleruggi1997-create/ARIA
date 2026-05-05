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
          if (contact.ai_disabled) {
            console.log('[webhookMeta] AI disabilitata per contatto:', contact.nome);
            return;
          }

          const business = await base44.asServiceRole.entities.Business.get(businessId);
          if (!business) return;

          if (!business.auto_risposta || business.stato_agente === 'off') {
            console.log('[webhookMeta] Auto-risposta disattivata per business:', businessId);
            return;
          }

          // ── Controlla orario (minuti totali, same as WhatsApp) ──
          const now = new Date();
          const romeHour = parseInt(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false }).format(now), 10) % 24;
          const romeMinute = parseInt(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', minute: '2-digit' }).format(now), 10);
          const currentMinutes = romeHour * 60 + romeMinute;
          const [startH, startM] = (business.orario_inizio || '08:00').split(':').map(Number);
          const [endH, endM] = (business.orario_fine || '20:00').split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;
          const is24h = startMinutes === endMinutes || (startMinutes === 0 && endMinutes >= 1439);
          const withinHours = is24h || (currentMinutes >= startMinutes && currentMinutes < endMinutes);
          const giornoCorrente = new Intl.DateTimeFormat('it-IT', { weekday: 'long', timeZone: 'Europe/Rome' }).format(now).toLowerCase();
          const giorni = (business.giorni_attivi || []);
          const withinDay = giorni.length === 0 ? true : giorni.includes(giornoCorrente);

          console.log('[webhookMeta] Ora Roma:', romeHour + ':' + String(romeMinute).padStart(2,'0'), '| withinHours:', withinHours, '| withinDay:', withinDay, '| is24h:', is24h);

          if ((!withinHours || !withinDay) && business.fuori_orario_attivo && business.messaggio_fuori_orario) {
            await sendIGReply(conn, senderId, business.messaggio_fuori_orario);
            await base44.asServiceRole.entities.Message.create({
              business_id: businessId, contact_id: contact.id,
              canale: 'instagram', ruolo: 'assistant',
              testo: business.messaggio_fuori_orario, letto: true,
            });
            console.log('[webhookMeta] Messaggio fuori orario inviato');
            return;
          }

          if (!withinHours || !withinDay) {
            console.log('[webhookMeta] Fuori orario — nessuna risposta automatica');
            return;
          }

          // ── Pre-detect urgenze (appuntamento, documento, preventivo) ──
          const urgentKeywords = /appuntament|call|telefonat|videochiamata|zoom|meet|colloquio|incontr|documento|visura|file|attestato|certificato|preventivo|prez(zo|zi)|cost(o|i)|collaborar|lavorare insieme|contratto|accordo|partnership/i;
          if (urgentKeywords.test(text)) {
            let triggerType = 'appuntamento';
            if (/documento|visura|file|attestato|certificato/i.test(text)) triggerType = 'documento';
            else if (/preventivo|prezzo|prezzi|costo|costi/i.test(text)) triggerType = 'preventivo';
            else if (/collaborar|lavorare insieme|contratto|accordo|partnership/i.test(text)) triggerType = 'collaborazione';
            try {
              await base44.asServiceRole.entities.UrgentAction.create({
                business_id: businessId, contact_id: contact.id,
                contact_nome: contact.nome, contact_canale: 'instagram',
                trigger: triggerType, messaggio_originale: text.slice(0, 500), stato: 'nuovo',
              });
              console.log('[webhookMeta] UrgentAction creata:', triggerType);
            } catch(e) { console.log('[webhookMeta] UrgentAction error:', e.message); }
          }

          // ── Pre-detect: vuole parlare con persona reale ──
          const humanKeywords = /parla(re)? con (te|voi|il titolare|il responsabile|una persona|qualcuno)|voglio (sentire|parlare con) (te|voi|qualcuno|una persona reale)|mettimi in contatto|chiamami|chiamatemi|richiama(temi)?|pass(ami|atemi) (a qualcuno|al titolare)/i;
          if (humanKeywords.test(text)) {
            try {
              const existing = await base44.asServiceRole.entities.HumanRequest.filter({ business_id: businessId, contact_id: contact.id, stato: 'nuovo' });
              if (!existing.length) {
                await base44.asServiceRole.entities.HumanRequest.create({
                  business_id: businessId, contact_id: contact.id,
                  contact_nome: contact.nome, canale: 'instagram',
                  motivo: text.slice(0, 200), stato: 'nuovo',
                });
                console.log('[webhookMeta] HumanRequest creata per:', contact.nome);
              }
            } catch(e) { console.log('[webhookMeta] HumanRequest error:', e.message); }
          }

          // ── Storico conversazione (ultimi 10) ──
          const recentMessages = await base44.asServiceRole.entities.Message.filter(
            { business_id: businessId, contact_id: contact.id }, '-created_date', 10
          );
          const historyText = recentMessages.reverse()
            .map(m => `${m.ruolo === 'user' ? 'Cliente' : 'ARIA'}: ${m.testo}`)
            .join('\n');
          const isFirstMessage = recentMessages.filter(m => m.ruolo === 'assistant').length === 0;
          const agentName = business.nome_agente || 'ARIA';

          // ── Prompt sistema — stesse regole assolute del WhatsApp ──
          const systemPrompt = `Sei ${agentName}, assistente di "${business.nome}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGOLE ASSOLUTE — NON DEROGABILI MAI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NON confermare MAI appuntamenti, call o incontri senza approvazione esplicita del titolare. Quando ti chiedono un appuntamento/call rispondi SEMPRE e SOLO: "Perfetto! Ho preso nota della tua richiesta e la giro subito al team. Ti ricontatteremo entro breve per confermare data e orario. 😊"

2. NON promettere MAI l'invio di documenti, file, visure, attestati o materiali. Rispondi SEMPRE: "Certamente! Giro la richiesta al team che ti contatterà direttamente. 😊"

3. NON dare MAI date, orari specifici o numeri di telefono del titolare al posto del team.

4. Se non sei SICURA al 100% di un'informazione, NON inventare. Di': "Ottima domanda! La giro al team che ti risponderà con precisione. 😊"

5. Non parlare MAI a nome del titolare in prima persona (no "ti chiamerò io", "ti mando io"). Usa sempre "il team ti contatterà".

6. Se il cliente chiede prezzi di servizi non listati → rimanda al team.

7. Non rivelare MAI dati su collaboratori, disponibilità interna, documenti posseduti dall'azienda.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${business.ai_prompt ? business.ai_prompt + '\n' : ''}
LINGUA: Rileva in che lingua sta scrivendo il cliente e rispondi SEMPRE nella sua stessa lingua.

CONTESTO BUSINESS:
${business.settore ? `- Settore: ${business.settore}` : ''}
${business.servizi ? `- Servizi: ${business.servizi}` : ''}
${business.prezzi ? `- Prezzi (condividi SOLO se già listati e il cliente lo chiede): ${business.prezzi}` : ''}
${business.faq ? `- FAQ: ${business.faq}` : ''}
${business.cose_da_non_fare ? `- Non fare mai: ${business.cose_da_non_fare}` : ''}

COME SEI:
- Sei un assistente AI del team, non il titolare.
- Parli in modo naturale, caldo, diretto.
- Risposte brevi: 1-3 frasi al massimo.
- Non usi mai frasi come "come posso assisterti?", "non esitare a contattarci".
${isFirstMessage ? `- È il PRIMO messaggio: presentati brevemente con il tuo nome e sii accogliente. Una frase.` : `- Non ripresentarti. Vai dritto al punto.`}

COSA NON FAI MAI:
- Non spingi a vendere, non insisti.
- Se il cliente dice "no grazie" → risposta cordiale e brevissima. Fine.

RICHIESTA DI PARLARE CON PERSONA REALE:
- Rispondi: "Certo! Ho avvisato il team — ti risponderemo personalmente appena possibile 😊"`;

          // ── Chiama LLM ──
          const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}\n\nStorico conversazione:\n${historyText}\n\nCliente: ${text}\n${agentName}:`,
            model: 'gpt_5_mini',
          });

          const replyText = typeof llmRes === 'string' ? llmRes : (llmRes?.text || llmRes?.response || '');
          if (!replyText) {
            console.log('[webhookMeta] LLM non ha generato risposta');
            return;
          }

          // Invia e salva
          const sent = await sendIGReply(conn, senderId, replyText);
          if (!sent) { console.error('[webhookMeta] Invio risposta IG fallito'); return; }

          await base44.asServiceRole.entities.Message.create({
            business_id: businessId, contact_id: contact.id,
            canale: 'instagram', ruolo: 'assistant', testo: replyText, letto: true,
          });

          console.log('[webhookMeta] ✅ ARIA ha risposto a:', contact.nome, '|', replyText.slice(0, 80));
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