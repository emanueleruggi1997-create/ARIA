import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { appointment_id, action } = await req.json();
  if (!appointment_id || !action) return Response.json({ error: 'Missing appointment_id or action' }, { status: 400 });

  const appt = await base44.asServiceRole.entities.Appointment.get(appointment_id);
  if (!appt) return Response.json({ error: 'Appointment not found' }, { status: 404 });

  const business = await base44.asServiceRole.entities.Business.get(appt.business_id);
  if (!business) return Response.json({ error: 'Business not found' }, { status: 404 });

  // ── FORMAT DATE ──
  const formatDate = (isoDate) => {
    const months = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
    if (!isoDate) return appt.requested_date_text || 'data da definire';
    const d = new Date(isoDate + 'T12:00:00');
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const dateLabel = formatDate(appt.data);
  const timeLabel = appt.ora || appt.requested_time_text || 'orario da definire';

  // ── PRIORITÀ NOME: nome reale > lead_name > contact_nome > username ──
  let nome = appt.contact_nome || '';
  // Rimuovi prefissi auto-generati tipo "User_123" o "@username"
  if (nome.startsWith('User_') || nome.startsWith('WA_')) nome = '';

  // ── SERVIZIO: evita "Richiesta appuntamento" come testo visibile ──
  const rawServizio = appt.service_requested || appt.titolo || '';
  const GENERIC_TITLES = ['richiesta appuntamento', 'appointment request', 'appuntamento'];
  const servizio = GENERIC_TITLES.includes(rawServizio.toLowerCase().trim()) ? '' : rawServizio;

  // ── CONFIRM ──
  if (action === 'confirm') {
    // ── IDEMPOTENZA: se già confermato e messaggio inviato, ritorna subito ──
    if (appt.stato === 'confermato' && appt.confirmation_message_sent) {
      return Response.json({ ok: true, message_sent: true, already_confirmed: true });
    }

    await base44.asServiceRole.entities.Appointment.update(appointment_id, {
      stato: 'confermato',
      needs_human_confirmation: false,
      confirmed_at: new Date().toISOString(),
      confirmed_by: user.email,
    });

    const msg = buildConfirmMessage({ nome, servizio, dateLabel, timeLabel });
    const sendResult = await sendMessage({ base44, appt, business, msg, contact_id: appt.contact_id });

    if (sendResult.ok) {
      await base44.asServiceRole.entities.Appointment.update(appointment_id, {
        confirmation_message_sent: true,
        confirmation_message_sent_at: new Date().toISOString(),
        confirmation_channel: appt.canale_origine,
        confirmation_error: null,
      });
      // Salva il messaggio nella conversazione
      if (appt.contact_id) {
        await base44.asServiceRole.entities.Message.create({
          business_id: appt.business_id,
          contact_id: appt.contact_id,
          canale: appt.canale_origine === 'whatsapp' ? 'whatsapp' : 'instagram',
          ruolo: 'assistant',
          testo: msg,
          letto: true,
        }).catch(() => {});
      }
      return Response.json({ ok: true, message_sent: true });
    } else {
      await base44.asServiceRole.entities.Appointment.update(appointment_id, {
        confirmation_message_sent: false,
        confirmation_error: sendResult.error || 'Invio fallito',
      });
      return Response.json({ ok: true, message_sent: false, warning: 'Appuntamento confermato, ma messaggio non inviato', error: sendResult.error });
    }
  }

  // ── CANCEL ──
  if (action === 'cancel') {
    await base44.asServiceRole.entities.Appointment.update(appointment_id, {
      stato: 'annullato',
      needs_human_confirmation: false,
    });

    const msg = buildCancelMessage({ dateLabel, timeLabel });
    const sendResult = await sendMessage({ base44, appt, business, msg, contact_id: appt.contact_id });

    if (sendResult.ok && appt.contact_id) {
      await base44.asServiceRole.entities.Message.create({
        business_id: appt.business_id,
        contact_id: appt.contact_id,
        canale: appt.canale_origine === 'whatsapp' ? 'whatsapp' : 'instagram',
        ruolo: 'assistant',
        testo: msg,
        letto: true,
      }).catch(() => {});
    }

    return Response.json({ ok: true, message_sent: sendResult.ok, error: sendResult.error });
  }

  // ── RESEND ──
  if (action === 'resend') {
    const msg = buildConfirmMessage({ nome, servizio, dateLabel, timeLabel });
    const sendResult = await sendMessage({ base44, appt, business, msg, contact_id: appt.contact_id });

    if (sendResult.ok) {
      await base44.asServiceRole.entities.Appointment.update(appointment_id, {
        confirmation_message_sent: true,
        confirmation_message_sent_at: new Date().toISOString(),
        confirmation_error: null,
      });
      if (appt.contact_id) {
        await base44.asServiceRole.entities.Message.create({
          business_id: appt.business_id,
          contact_id: appt.contact_id,
          canale: appt.canale_origine === 'whatsapp' ? 'whatsapp' : 'instagram',
          ruolo: 'assistant',
          testo: msg,
          letto: true,
        }).catch(() => {});
      }
      return Response.json({ ok: true, message_sent: true });
    } else {
      await base44.asServiceRole.entities.Appointment.update(appointment_id, {
        confirmation_error: sendResult.error || 'Reinvio fallito',
      });
      return Response.json({ ok: false, error: sendResult.error });
    }
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
});

function buildConfirmMessage({ nome, servizio, dateLabel, timeLabel }) {
  const greeting = nome ? `Perfetto ${nome}` : 'Perfetto';
  // Usa servizio solo se è un nome reale (non "Richiesta appuntamento")
  if (servizio) {
    return `${greeting}, la tua richiesta per ${servizio} è confermata per il ${dateLabel} alle ${timeLabel}. A presto! 🗓️`;
  }
  return `${greeting}, il tuo appuntamento è confermato per il ${dateLabel} alle ${timeLabel}. A presto! 🗓️`;
}

function buildCancelMessage({ dateLabel, timeLabel }) {
  return `Ci dispiace, l'appuntamento richiesto per il ${dateLabel} alle ${timeLabel} non è disponibile. Ti proponiamo di scegliere un altro giorno o orario. 📅`;
}

async function sendMessage({ base44, appt, business, msg, contact_id }) {
  const channel = appt.canale_origine;

  // ── Instagram ──
  if (channel === 'instagram') {
    const recipientId = appt.customer_channel_id;
    if (!recipientId) return { ok: false, error: 'customer_channel_id mancante per Instagram' };

    // Recupera token dalla MetaConnection
    const conns = await base44.asServiceRole.entities.MetaConnection.filter({ business_id: appt.business_id, ig_connected: true });
    const conn = conns[0];
    if (!conn?.access_token || !conn?.ig_account_id) return { ok: false, error: 'MetaConnection non trovata o token mancante' };

    try {
      const res = await fetch(`https://graph.instagram.com/v21.0/${conn.ig_account_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${conn.access_token}` },
        body: JSON.stringify({ recipient: { id: recipientId }, message: { text: msg } }),
      });
      const data = await res.json();
      if (!res.ok || data.error) return { ok: false, error: JSON.stringify(data.error || data) };
      console.log('[confirmAction] IG DM sent:', data.message_id);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ── WhatsApp ──
  if (channel === 'whatsapp') {
    const toNumber = appt.customer_channel_id || appt.phone;
    if (!toNumber) return { ok: false, error: 'Numero WhatsApp mancante' };

    const token = Deno.env.get('WHATSAPP_BUSINESS_TOKEN');
    if (!token) return { ok: false, error: 'WHATSAPP_BUSINESS_TOKEN non configurato' };

    // Recupera phone_number_id dal business (wa_number)
    const contacts = contact_id ? await base44.asServiceRole.entities.Contact.filter({ business_id: appt.business_id, canale: 'whatsapp' }) : [];
    // Usa l'endpoint standard - phone_number_id lo recuperiamo dal business
    const allBiz = await base44.asServiceRole.entities.Business.filter({ id: appt.business_id });
    const biz = allBiz[0] || {};
    const phoneNumberId = biz.wa_phone_number_id || biz.wa_number;
    if (!phoneNumberId) return { ok: false, error: 'wa_phone_number_id non configurato nel business' };

    try {
      const res = await fetch(`https://graph.instagram.com/v21.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toNumber,
          type: 'text',
          text: { body: msg },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) return { ok: false, error: JSON.stringify(data.error || data) };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  // ── Email ──
  if (appt.email) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: appt.email,
        subject: `Conferma appuntamento — ${appt.data || ''} ${appt.ora || ''}`.trim(),
        body: msg,
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  return { ok: false, error: 'Nessun canale di invio disponibile (customer_channel_id mancante)' };
}