/**
 * syncInstagramConversations
 *
 * Tenta di recuperare le conversazioni recenti dall'account Instagram Business
 * tramite l'API Graph di Meta.
 *
 * IMPORTANTE — LIMITAZIONI META:
 * L'endpoint GET /{ig-user-id}/conversations con platform=instagram
 * restituisce solo i thread in cui il business ha già ricevuto o inviato
 * un messaggio tramite la Messaging API.
 * I messaggi inviati DIRETTAMENTE dall'app Instagram nativa (outbound manuali)
 * NON appaiono in questo endpoint — Meta non li espone via API.
 *
 * Quello che questo endpoint fa:
 * - Recupera thread già esistenti con i loro ultimi messaggi
 * - Importa messaggi mancanti in Emaral (utile dopo un restart, dati persi, ecc.)
 * - NON crea nuove conversazioni per outbound manuali da app Instagram nativa
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Trova la MetaConnection del business dell'utente
  let conn = null;
  try {
    const conns = await base44.asServiceRole.entities.MetaConnection.filter({ ig_connected: true });
    // Filtra per user_id o business_id
    const allBiz = await base44.asServiceRole.entities.Business.filter({});
    const userBiz = allBiz.find(b => b.created_by === user.email || b.created_by === user.id);
    if (userBiz) {
      conn = conns.find(c => c.business_id === userBiz.id) || conns[0];
    } else {
      conn = conns[0];
    }
  } catch (e) {
    return Response.json({ error: 'Nessuna connessione Instagram trovata' }, { status: 404 });
  }

  if (!conn) return Response.json({ error: 'Nessuna connessione Instagram attiva' }, { status: 404 });

  const { access_token: token, ig_account_id: igAccountId, business_id: businessId } = conn;

  if (!token || !igAccountId || !businessId) {
    return Response.json({ error: 'Connessione incompleta (token/account_id/business_id mancante)' }, { status: 400 });
  }

  console.log('[syncIG] Starting sync for ig_account_id:', igAccountId, 'business_id:', businessId);

  // ── STEP 1: chiama GET /{ig-user-id}/conversations ──
  const convsUrl = `https://graph.instagram.com/v21.0/${igAccountId}/conversations?platform=instagram&fields=id,updated_time,participants&access_token=${token}`;
  const convsRes = await fetch(convsUrl);
  const convsData = await convsRes.json();

  console.log('[syncIG] /conversations HTTP:', convsRes.status, '| data:', JSON.stringify(convsData).slice(0, 500));

  // Gestisci errori API Meta
  if (convsData.error) {
    const errCode = convsData.error.code;
    const errMsg = convsData.error.message || '';
    console.error('[syncIG] Meta API error:', errCode, errMsg);

    // Error 190 = token scaduto — non è un limite API, è un problema di token
    if (errCode === 190) {
      return Response.json({
        success: false,
        api_supported: true,
        token_expired: true,
        error_code: errCode,
        error_message: 'Il token Instagram è scaduto. Riconnetti Instagram dalle Impostazioni → Connessioni.',
        meta_limitation: false,
      });
    }

    // Error 100 / 10 / 200 / 3 = permessi insufficienti o endpoint non disponibile (limite Meta)
    return Response.json({
      success: false,
      api_supported: false,
      error_code: errCode,
      error_message: errMsg,
      meta_limitation: true,
      message: `Meta API non ha restituito conversazioni (errore ${errCode}). ` +
        `I messaggi inviati direttamente dall'app Instagram nativa non sono accessibili via API. ` +
        `Le conversazioni appariranno in Emaral solo quando il cliente risponde e Meta invia il webhook.`,
    });
  }

  const threads = convsData.data || [];
  console.log('[syncIG] Found', threads.length, 'conversation threads');

  if (threads.length === 0) {
    return Response.json({
      success: true,
      api_supported: true,
      threads_found: 0,
      imported: 0,
      message: 'Nessun thread trovato. Le conversazioni iniziate dall\'app Instagram nativa non sono accessibili via API Meta.',
    });
  }

  let imported = 0;
  let skipped = 0;
  const results = [];

  for (const thread of threads.slice(0, 20)) { // max 20 thread
    const threadId = thread.id;
    const participants = thread.participants?.data || [];

    // Trova il partecipante che NON è il business (cioè il cliente)
    const otherParticipant = participants.find(p => String(p.id) !== String(igAccountId));
    if (!otherParticipant) { skipped++; continue; }

    const senderId = otherParticipant.id;
    const senderName = otherParticipant.username ? `@${otherParticipant.username}` : (otherParticipant.name || null);

    // ── Recupera messaggi del thread ──
    const msgsUrl = `https://graph.instagram.com/v21.0/${threadId}/messages?fields=id,created_time,from,to,message&access_token=${token}`;
    const msgsRes = await fetch(msgsUrl);
    const msgsData = await msgsRes.json();

    if (msgsData.error) {
      console.warn('[syncIG] Thread', threadId, 'messages error:', msgsData.error.code, msgsData.error.message);
      skipped++;
      continue;
    }

    const msgs = (msgsData.data || []).reverse(); // dal più vecchio al più recente
    if (msgs.length === 0) { skipped++; continue; }

    // ── Trova o crea Contact ──
    let contact = null;
    const existingContacts = await base44.asServiceRole.entities.Contact.filter({
      business_id: businessId,
      numero: senderId,
      canale: 'instagram',
    }).catch(() => []);

    if (existingContacts.length > 0) {
      contact = existingContacts[0];
      // Aggiorna nome se era placeholder
      const isPlaceholder = !contact.nome || contact.nome.startsWith('User_') || /^\d{8,}$/.test(contact.nome) || contact.nome === 'Utente Instagram' || contact.nome === 'Utente IG';
      if (isPlaceholder && senderName) {
        await base44.asServiceRole.entities.Contact.update(contact.id, { nome: senderName }).catch(() => {});
        contact = { ...contact, nome: senderName };
      }
    } else {
      // Crea nuovo contatto
      contact = await base44.asServiceRole.entities.Contact.create({
        business_id: businessId,
        nome: senderName || `Utente Instagram (${senderId.slice(-6)})`,
        numero: senderId,
        canale: 'instagram',
        stato: 'lead',
        ai_disabled: false,
      });
      console.log('[syncIG] Created contact:', contact.id, 'for sender:', senderId);
    }

    // ── Recupera messaggi già in DB per questo contatto ──
    const existingMsgs = await base44.asServiceRole.entities.Message.filter({
      business_id: businessId,
      contact_id: contact.id,
    }, '-created_date', 50).catch(() => []);

    // Usa created_date del più vecchio messaggio esistente come soglia
    // Importa solo messaggi più recenti di quelli già presenti
    const existingDates = new Set(existingMsgs.map(m => m.testo?.slice(0, 50)));

    let threadImported = 0;
    for (const msg of msgs) {
      const msgText = msg.message || '';
      if (!msgText) continue;

      // Deduplication semplice per testo
      if (existingDates.has(msgText.slice(0, 50))) continue;

      // Determina direzione: from.id === igAccountId = outbound (assistant), altrimenti inbound (user)
      const isOutbound = String(msg.from?.id) === String(igAccountId);
      const ruolo = isOutbound ? 'assistant' : 'user';

      await base44.asServiceRole.entities.Message.create({
        business_id: businessId,
        contact_id: contact.id,
        canale: 'instagram',
        ruolo,
        testo: msgText,
        letto: true,
      }).catch(() => {});

      existingDates.add(msgText.slice(0, 50));
      threadImported++;
    }

    imported += threadImported;
    results.push({ sender: senderName || senderId, messages_imported: threadImported, contact_id: contact.id });
    console.log('[syncIG] Thread', threadId, '→ imported', threadImported, 'messages for', senderName || senderId);
  }

  return Response.json({
    success: true,
    api_supported: true,
    threads_found: threads.length,
    threads_processed: threads.slice(0, 20).length - skipped,
    imported,
    skipped,
    results,
    message: imported > 0
      ? `Sincronizzati ${imported} messaggi da ${results.filter(r => r.messages_imported > 0).length} conversazioni.`
      : 'Nessun messaggio nuovo da importare. Le conversazioni erano già aggiornate.',
    caveat: 'I messaggi inviati direttamente dall\'app Instagram nativa (outbound manuali senza API) non sono recuperabili via Meta API.',
  });
});