import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;

function sanitizeDate(v) {
  if (!v || typeof v !== 'string') return null;
  const t = v.trim();
  if (!ISO_DATE_RE.test(t)) return null;
  return !isNaN(new Date(t).getTime()) ? t : null;
}
function sanitizeTime(v) {
  if (!v || typeof v !== 'string') return null;
  const t = v.trim();
  return TIME_RE.test(t) ? t : null;
}

async function sendWAMessage(phoneNumberId, toNumber, text) {
  const token = Deno.env.get('WHATSAPP_BUSINESS_TOKEN');
  if (!token || !phoneNumberId || !toNumber) return { ok: false, error: 'missing_params' };
  try {
    const res = await fetch(`https://graph.instagram.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toNumber,
        type: 'text',
        text: { body: text },
      }),
    });
    const data = await res.json();
    if (data.error) { console.error('[confirmAppointment] WA send error:', JSON.stringify(data.error)); return { ok: false }; }
    return { ok: true };
  } catch (e) {
    console.error('[confirmAppointment] WA send exception:', e.message);
    return { ok: false };
  }
}

async function sendIGMessage(conn, recipientId, text) {
  if (!conn?.access_token || !conn?.ig_account_id || !recipientId) return { ok: false, error: 'missing_params' };
  try {
    const res = await fetch(`https://graph.instagram.com/v21.0/${conn.ig_account_id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${conn.access_token}` },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    const data = await res.json();
    if (data.error) {
      console.error('[confirmAppointment] IG send error:', JSON.stringify(data.error));
      return { ok: false, error: data.error.message };
    }
    return { ok: true, message_id: data.message_id };
  } catch (e) {
    console.error('[confirmAppointment] IG send exception:', e.message);
    return { ok: false, error: e.message };
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { appointmentId, action, data, ora } = body;

  if (!appointmentId || !action) {
    return Response.json({ error: 'Missing appointmentId or action' }, { status: 400 });
  }
  if (!['confirm', 'reject'].includes(action)) {
    return Response.json({ error: 'Invalid action. Must be confirm or reject.' }, { status: 400 });
  }

  // Fetch appointment
  const apt = await base44.asServiceRole.entities.Appointment.get(appointmentId).catch(() => null);
  if (!apt) return Response.json({ error: 'Appointment not found' }, { status: 404 });
  if (!apt.business_id) return Response.json({ error: 'Appointment has no business_id' }, { status: 422 });

  // Fetch related entities
  const [contact, business, connections] = await Promise.all([
    apt.contact_id ? base44.asServiceRole.entities.Contact.get(apt.contact_id).catch(() => null) : Promise.resolve(null),
    base44.asServiceRole.entities.Business.get(apt.business_id).catch(() => null),
    base44.asServiceRole.entities.MetaConnection.filter({ business_id: apt.business_id }).catch(() => []),
  ]);

  const conn = (connections || []).find(c => c?.ig_connected && c?.ig_account_id) || (connections || [])[0] || null;
  const canale = contact?.canale || apt.canale_origine || 'instagram';

  // Helper: invia messaggio sul canale giusto e salva in DB
  async function sendAndSave(text) {
    if (!contact?.numero) return;
    let sent = false;
    if (canale === 'whatsapp') {
      // Per WA: usa wa_number del business come phoneNumberId
      const phoneNumberId = business?.wa_number || null;
      if (phoneNumberId) {
        const res = await sendWAMessage(phoneNumberId, contact.numero, text);
        sent = res.ok;
      } else {
        console.warn('[confirmAppointment] WA phoneNumberId mancante — salvo solo in DB');
      }
    } else {
      // Instagram
      if (conn?.access_token && conn?.ig_account_id) {
        const res = await sendIGMessage(conn, contact.numero, text);
        sent = res.ok;
      }
    }
    // Salva il messaggio in DB comunque (anche se invio fallito, per storico)
    await base44.asServiceRole.entities.Message.create({
      business_id: apt.business_id, contact_id: contact.id,
      canale, ruolo: 'assistant', testo: text, letto: true,
    }).catch(e => console.warn('[confirmAppointment] Message save failed:', e.message));
    console.log(`[confirmAppointment] Notification sent=${sent} via ${canale} to ${contact.numero}`);
  }

  if (action === 'confirm') {
    const safeData = sanitizeDate(data);
    const safeOra = sanitizeTime(ora);

    const updates = { stato: 'confermato' };
    if (safeData) updates.data = safeData;
    if (safeOra) updates.ora = safeOra;

    await base44.asServiceRole.entities.Appointment.update(appointmentId, updates);
    console.log(`[confirmAppointment] Confirmed apt:${appointmentId} | date:${safeData} time:${safeOra}`);

    const businessName = business?.nome || '';
    const dateStr = safeData ? (() => {
      try {
        const [y, m, d] = safeData.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      } catch { return safeData; }
    })() : 'data da concordare';

    const confirmText = `✅ Il tuo appuntamento è confermato!\n\n📅 ${dateStr}${safeOra ? ` alle ${safeOra}` : ''}\n\nTi aspettiamo da ${businessName}. Per modifiche o cancellazioni, scrivici qui. A presto! 👋`;
    await sendAndSave(confirmText);

    return Response.json({ ok: true, action: 'confirmed' });
  }

  if (action === 'reject') {
    await base44.asServiceRole.entities.Appointment.update(appointmentId, { stato: 'annullato' });
    console.log(`[confirmAppointment] Rejected apt:${appointmentId}`);

    const rejectText = `Ciao! Purtroppo non siamo disponibili per la data richiesta. Se vuoi, proponci un'altra data e faremo del nostro meglio per accontentarti. Grazie e a presto! 🙏`;
    await sendAndSave(rejectText);

    return Response.json({ ok: true, action: 'rejected' });
  }
});