import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VERIFY_TOKEN = 'emaral2026';

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // ── Webhook verification (GET) ──
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[webhookMeta] ✅ Webhook verified');
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const body = await req.json().catch(() => ({}));

  // ── LOG COMPLETO payload in arrivo ──
  console.log('[webhookMeta] ═══════════════════════════════');
  console.log('[webhookMeta] object:', body.object);
  console.log('[webhookMeta] entry count:', (body.entry || []).length);
  console.log('[webhookMeta] FULL BODY:', JSON.stringify(body).slice(0, 2000));
  console.log('[webhookMeta] ═══════════════════════════════');

  // Supporta sia object="instagram" (nuovo) che object="page" (fallback)
  const supportedObjects = ['instagram', 'page'];
  if (!supportedObjects.includes(body.object)) {
    console.log('[webhookMeta] object non supportato:', body.object, '— skip');
    return Response.json({ ok: true });
  }

  const base44 = createClientFromRequest(req);
  const entries = body.entry || [];

  for (const entry of entries) {
    console.log('[webhookMeta] entry.id:', entry.id);

    // ── Processa DM (messaging array) ──
    for (const event of (entry.messaging || [])) {
      if (event.read || event.delivery || event.message?.is_echo) continue;

      const senderId    = event.sender?.id;
      const recipientId = event.recipient?.id;
      const text        = event.message?.text || event.postback?.title || '';

      console.log('[webhookMeta] DM event | sender:', senderId, '| recipient:', recipientId, '| text:', text?.slice(0, 100));

      if (!senderId || !text) {
        console.log('[webhookMeta] DM skippato: senderId o text mancante');
        continue;
      }

      (async () => {
        try {
          // ── Trova MetaConnection ──
          // Per Instagram Business Login, entry.id = ig_account_id dell'account ricevente
          // recipient.id = ig_account_id dell'account ricevente
          const accountId = recipientId || entry.id;
          console.log('[webhookMeta] Cerco MetaConnection per accountId:', accountId);

          let conn = null;

          // 1. Cerca per ig_account_id (priorità massima — Instagram Business Login)
          let conns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: accountId });
          if (conns.length) {
            conn = conns[0];
            console.log('[webhookMeta] ✅ Trovata per ig_account_id');
          }

          // 2. Cerca per meta_user_id
          if (!conn) {
            conns = await base44.asServiceRole.entities.MetaConnection.filter({ meta_user_id: accountId });
            if (conns.length) {
              conn = conns[0];
              console.log('[webhookMeta] ✅ Trovata per meta_user_id');
            }
          }

          // 3. Cerca per fb_page_id (fallback compatibilità)
          if (!conn) {
            conns = await base44.asServiceRole.entities.MetaConnection.filter({ fb_page_id: accountId });
            if (conns.length) {
              conn = conns[0];
              console.log('[webhookMeta] ✅ Trovata per fb_page_id (fallback)');
            }
          }

          // 4. Ultimo fallback: unica connessione IG attiva
          if (!conn) {
            const allConns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_connected: true });
            if (allConns.length === 1) {
              conn = allConns[0];
              console.log('[webhookMeta] ✅ Trovata per fallback unica connessione IG | conn.ig_account_id:', conn.ig_account_id);
            } else {
              console.log('[webhookMeta] ❌ MetaConnection NON trovata per accountId:', accountId, '| connessioni IG attive:', allConns.length);
              return;
            }
          }

          console.log('[webhookMeta] MetaConnection trovata | id:', conn.id, '| ig_account_id:', conn.ig_account_id, '| business_id:', conn.business_id);

          let businessId = conn.business_id;

          // Risolvi businessId se mancante
          if (!businessId && conn.user_id) {
            try {
              const allBiz = await base44.asServiceRole.entities.Business.filter({ ig_connesso: true });
              const match  = allBiz.find(b => b.created_by === conn.user_id);
              if (match) {
                businessId = match.id;
                await base44.asServiceRole.entities.MetaConnection.update(conn.id, { business_id: businessId });
                console.log('[webhookMeta] businessId risolto:', businessId);
              }
            } catch (e) {
              console.log('[webhookMeta] Errore risoluzione businessId:', e.message);
            }
          }

          if (!businessId) {
            console.log('[webhookMeta] ❌ businessId mancante — skip');
            return;
          }

          // ── Trova o crea contatto ──
          let contacts = await base44.asServiceRole.entities.Contact.filter({
            business_id: businessId, numero: senderId, canale: 'instagram',
          });
          let contact = contacts[0];
          if (!contact) {
            contact = await base44.asServiceRole.entities.Contact.create({
              business_id: businessId,
              nome:   `User_${senderId}`,
              numero: senderId,
              canale: 'instagram',
              stato:  'lead',
            });
            console.log('[webhookMeta] Nuovo contatto creato:', contact.id);
          }

          // Salva messaggio in arrivo
          await base44.asServiceRole.entities.Message.create({
            business_id: businessId,
            contact_id:  contact.id,
            canale:      'instagram',
            ruolo:       'user',
            testo:       text,
            letto:       false,
          });

          // Crea lead se non esiste
          const leads = await base44.asServiceRole.entities.Lead.filter({ business_id: businessId, contact_id: contact.id });
          if (!leads.length) {
            await base44.asServiceRole.entities.Lead.create({
              business_id: businessId, contact_id: contact.id,
              contact_nome: contact.nome, canale: 'instagram', stato: 'nuovo',
            });
          }

          console.log('[webhookMeta] ✅ Messaggio salvato | contatto:', contact.nome);

          // ── Controlla se AI è disabilitata per questo contatto ──
          if (contact.ai_disabled) {
            console.log('[webhookMeta] AI disabilitata per contatto:', contact.nome);
            return;
          }

          const business = await base44.asServiceRole.entities.Business.get(businessId);
          if (!business) { console.log('[webhookMeta] Business non trovato:', businessId); return; }

          if (!business.auto_risposta || business.stato_agente === 'off') {
            console.log('[webhookMeta] Auto-risposta disattivata per business:', businessId);
            return;
          }

          // ── Controlla orario (Europe/Rome) ──
          const now = new Date();
          const fmt = (unit) => parseInt(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', [unit]: '2-digit', hour12: false }).format(now), 10);
          const romeHour   = fmt('hour') % 24;
          const romeMinute = fmt('minute');
          const currentMin = romeHour * 60 + romeMinute;
          const [sH, sM]   = (business.orario_inizio || '08:00').split(':').map(Number);
          const [eH, eM]   = (business.orario_fine   || '20:00').split(':').map(Number);
          const startMin   = sH * 60 + sM;
          const endMin     = eH * 60 + eM;
          const is24h      = startMin === endMin || (startMin === 0 && endMin >= 1439);
          const withinTime = is24h || (currentMin >= startMin && currentMin < endMin);
          const giornoCorrente = new Intl.DateTimeFormat('it-IT', { weekday: 'long', timeZone: 'Europe/Rome' }).format(now).toLowerCase();
          const giorni     = business.giorni_attivi || [];
          const withinDay  = giorni.length === 0 || giorni.includes(giornoCorrente);

          console.log('[webhookMeta] Ora Roma:', `${romeHour}:${String(romeMinute).padStart(2,'0')}`, '| withinTime:', withinTime, '| withinDay:', withinDay);

          if ((!withinTime || !withinDay) && business.fuori_orario_attivo && business.messaggio_fuori_orario) {
            await sendIGReply(conn, senderId, business.messaggio_fuori_orario);
            await base44.asServiceRole.entities.Message.create({
              business_id: businessId, contact_id: contact.id,
              canale: 'instagram', ruolo: 'assistant', testo: business.messaggio_fuori_orario, letto: true,
            });
            console.log('[webhookMeta] Messaggio fuori orario inviato');
            return;
          }

          if (!withinTime || !withinDay) {
            console.log('[webhookMeta] Fuori orario — nessuna risposta automatica');
            return;
          }

          // ── Pre-detect urgenze ──
          const urgentKeywords = /appuntament|call|telefonat|videochiamata|zoom|meet|colloquio|incontr|documento|visura|file|attestato|certificato|preventivo|prez(zo|zi)|cost(o|i)|collaborar|lavorare insieme|contratto|accordo|partnership/i;
          if (urgentKeywords.test(text)) {
            let trigger = 'appuntamento';
            if (/documento|visura|file|attestato|certificato/i.test(text)) trigger = 'documento';
            else if (/preventivo|prezzo|prezzi|costo|costi/i.test(text)) trigger = 'preventivo';
            else if (/collaborar|lavorare insieme|contratto|accordo|partnership/i.test(text)) trigger = 'collaborazione';
            try {
              await base44.asServiceRole.entities.UrgentAction.create({
                business_id: businessId, contact_id: contact.id,
                contact_nome: contact.nome, contact_canale: 'instagram',
                trigger, messaggio_originale: text.slice(0, 500), stato: 'nuovo',
              });
            } catch (e) { console.log('[webhookMeta] UrgentAction error:', e.message); }
          }

          // ── Pre-detect: vuole parlare con persona reale ──
          const humanKeywords = /parla(re)? con (te|voi|il titolare|il responsabile|una persona|qualcuno)|voglio (sentire|parlare con) (te|voi|qualcuno|una persona reale)|mettimi in contatto|chiamami|chiamatemi|richiama(temi)?|pass(ami|atemi) (a qualcuno|al titolare)/i;
          if (humanKeywords.test(text)) {
            try {
              const existing = await base44.asServiceRole.entities.HumanRequest.filter({ business_id: businessId, contact_id: contact.id, stato: 'nuovo' });
              if (!existing.length) {
                await base44.asServiceRole.entities.HumanRequest.create({
                  business_id: businessId, contact_id: contact.id,
                  contact_nome: contact.nome, canale: 'instagram', motivo: text.slice(0, 200), stato: 'nuovo',
                });
              }
            } catch (e) { console.log('[webhookMeta] HumanRequest error:', e.message); }
          }

          // ── Storico conversazione (ultimi 10 messaggi) ──
          const recentMsgs = await base44.asServiceRole.entities.Message.filter(
            { business_id: businessId, contact_id: contact.id }, '-created_date', 10
          );
          const historyText  = recentMsgs.reverse().map(m => `${m.ruolo === 'user' ? 'Cliente' : 'ARIA'}: ${m.testo}`).join('\n');
          const isFirstMsg   = recentMsgs.filter(m => m.ruolo === 'assistant').length === 0;
          const agentName    = business.nome_agente || 'ARIA';

          // ── System prompt ARIA ──
          const systemPrompt = `Sei ${agentName}, assistente di "${business.nome}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGOLE ASSOLUTE — NON DEROGABILI MAI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. NON confermare MAI appuntamenti senza approvazione titolare. Rispondi: "Ho preso nota e la giro al team. Ti ricontatteremo per confermare. 😊"
2. NON promettere MAI l'invio di documenti/file. Rispondi: "Giro la richiesta al team che ti contatterà. 😊"
3. NON dare MAI date/orari specifici o numeri del titolare.
4. Se non sei sicura al 100%: "Ottima domanda! La giro al team. 😊"
5. Usa sempre "il team ti contatterà", mai "io ti chiamerò".
6. Prezzi di servizi non listati → rimanda al team.
7. Non rivelare MAI dati interni su collaboratori o documenti.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${business.ai_prompt ? business.ai_prompt + '\n' : ''}
LINGUA: Rispondi nella stessa lingua del cliente.

CONTESTO BUSINESS:
${business.settore ? `- Settore: ${business.settore}` : ''}
${business.servizi ? `- Servizi: ${business.servizi}` : ''}
${business.prezzi ? `- Prezzi (solo se già listati): ${business.prezzi}` : ''}
${business.faq ? `- FAQ: ${business.faq}` : ''}
${business.cose_da_non_fare ? `- Non fare: ${business.cose_da_non_fare}` : ''}

STILE: Risposte brevi (1-3 frasi), naturali e caldi. ${isFirstMsg ? 'È il PRIMO messaggio: presentati brevemente.' : 'Non ripresentarti.'}
SE VUOLE PARLARE CON UNA PERSONA: "Certo! Ho avvisato il team — ti risponderemo presto 😊"`;

          // ── LLM call ──
          console.log('[webhookMeta] Chiamata LLM per:', contact.nome);
          const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `${systemPrompt}\n\nStorico:\n${historyText}\n\nCliente: ${text}\n${agentName}:`,
            model:  'gpt_5_mini',
          });
          const replyText = typeof llmRes === 'string' ? llmRes : (llmRes?.text || llmRes?.response || '');

          if (!replyText) {
            console.log('[webhookMeta] ❌ LLM non ha generato risposta');
            return;
          }

          // ── Invia risposta IG ──
          const sent = await sendIGReply(conn, senderId, replyText);
          if (!sent) {
            console.error('[webhookMeta] ❌ Invio risposta IG fallito');
            return;
          }

          await base44.asServiceRole.entities.Message.create({
            business_id: businessId, contact_id: contact.id,
            canale: 'instagram', ruolo: 'assistant', testo: replyText, letto: true,
          });

          console.log('[webhookMeta] ✅ ARIA ha risposto a:', contact.nome, '|', replyText.slice(0, 80));
        } catch (e) {
          console.error('[webhookMeta] ❌ Errore DM:', e.message);
        }
      })();
    }

    // ── Processa Commenti ──
    for (const change of (entry.changes || [])) {
      if (change.field !== 'comments') continue;
      const val = change.value || {};
      if (val.parent_id || val.from?.id === entry.id) continue;
      const text     = val.text || '';
      const senderId = val.from?.id || '';
      const senderName = val.from?.name || senderId;
      if (!text) continue;

      console.log('[webhookMeta] Commento ricevuto da:', senderName, '| text:', text.slice(0, 100));

      (async () => {
        try {
          const accountId = entry.id;
          let conns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_account_id: accountId });
          if (!conns.length) conns = await base44.asServiceRole.entities.MetaConnection.filter({ meta_user_id: accountId });
          if (!conns.length) {
            const allConns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_connected: true });
            if (allConns.length === 1) conns = allConns;
          }
          const conn = conns[0];
          if (!conn?.business_id) return;

          const businessId = conn.business_id;
          let contacts = await base44.asServiceRole.entities.Contact.filter({ business_id: businessId, numero: senderId, canale: 'instagram' });
          let contact  = contacts[0];
          if (!contact) {
            contact = await base44.asServiceRole.entities.Contact.create({
              business_id: businessId, nome: senderName, numero: senderId, canale: 'instagram', stato: 'lead',
            });
          }

          await base44.asServiceRole.entities.Message.create({
            business_id: businessId, contact_id: contact.id,
            canale: 'instagram', ruolo: 'user', testo: text, letto: false, tipo: 'commento',
          });

          console.log('[webhookMeta] ✅ Commento salvato | contatto:', senderName);
        } catch (e) {
          console.error('[webhookMeta] Errore commento:', e.message);
        }
      })();
    }
  }

  return Response.json({ ok: true });
});

// ── Helper: invia DM via Instagram Messaging API ──
async function sendIGReply(conn, recipientId, text) {
  const token       = conn.access_token;
  const igAccountId = conn.ig_account_id;

  if (!token || !igAccountId) {
    console.error('[sendIGReply] ❌ Token o ig_account_id mancante | token:', !!token, '| igAccountId:', igAccountId);
    return false;
  }

  console.log('[sendIGReply] Invio a:', recipientId, '| via account:', igAccountId);

  try {
    const res = await fetch(`https://graph.instagram.com/v21.0/${igAccountId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message:   { text },
      }),
    });
    const data = await res.json();
    if (data.error) {
      console.error('[sendIGReply] ❌ Errore API Meta:', JSON.stringify(data.error));
      return false;
    }
    console.log('[sendIGReply] ✅ Messaggio inviato | message_id:', data.message_id);
    return true;
  } catch (e) {
    console.error('[sendIGReply] ❌ Eccezione:', e.message);
    return false;
  }
}