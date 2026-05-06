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

  // Fetch related entities (non-blocking failures)
  const [contact, business, connections] = await Promise.all([
    apt.contact_id ? base44.asServiceRole.entities.Contact.get(apt.contact_id).catch(() => null) : Promise.resolve(null),
    base44.asServiceRole.entities.Business.get(apt.business_id).catch(() => null),
    base44.asServiceRole.entities.MetaConnection.filter({ business_id: apt.business_id }).catch(() => []),
  ]);

  const conn = (connections || []).find(c => c?.ig_connected && c?.ig_account_id) || (connections || [])[0] || null;

  if (action === 'confirm') {
    const safeData = sanitizeDate(data);
    const safeOra = sanitizeTime(ora);

    const updates = { stato: 'confermato' };
    if (safeData) updates.data = safeData;
    if (safeOra) updates.ora = safeOra;

    await base44.asServiceRole.entities.Appointment.update(appointmentId, updates);
    console.log(`[confirmAppointment] Confirmed apt:${appointmentId} | date:${safeData} time:${safeOra}`);

    // Send IG confirmation DM — non-blocking
    if (conn?.access_token && conn?.ig_account_id && contact?.numero) {
      const businessName = business?.nome || '';
      const dateStr = safeData ? (() => {
        try {
          const [y, m, d] = safeData.split('-').map(Number);
          return new Date(y, m - 1, d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        } catch { return safeData; }
      })() : (apt.note?.includes('Data richiesta:') ? 'data da concordare' : 'data da definire');

      const confirmText = `✅ Ottimo, il tuo appuntamento è confermato!\n\n📅 ${dateStr}${safeOra ? ` alle ${safeOra}` : ''}\n\nTi aspettiamo da ${businessName}. Se hai bisogno di cambiare o annullare, scrivici qui. A presto! 👋`;
      const sendResult = await sendIGMessage(conn, contact.numero, confirmText);
      if (sendResult.ok && contact?.id) {
        await base44.asServiceRole.entities.Message.create({
          business_id: apt.business_id, contact_id: contact.id,
          canale: 'instagram', ruolo: 'assistant', testo: confirmText, letto: true,
        }).catch(e => console.warn('[confirmAppointment] Message save failed:', e.message));
      }
    }

    return Response.json({ ok: true, action: 'confirmed' });
  }

  if (action === 'reject') {
    await base44.asServiceRole.entities.Appointment.update(appointmentId, { stato: 'annullato' });
    console.log(`[confirmAppointment] Rejected apt:${appointmentId}`);

    if (conn?.access_token && conn?.ig_account_id && contact?.numero) {
      const rejectText = `Ciao! Purtroppo non siamo disponibili per la data richiesta. Se vuoi, puoi proporci un'altra data e faremo del nostro meglio per accontentarti. Grazie e a presto! 🙏`;
      const sendResult = await sendIGMessage(conn, contact.numero, rejectText);
      if (sendResult.ok && contact?.id) {
        await base44.asServiceRole.entities.Message.create({
          business_id: apt.business_id, contact_id: contact.id,
          canale: 'instagram', ruolo: 'assistant', testo: rejectText, letto: true,
        }).catch(e => console.warn('[confirmAppointment] Message save failed:', e.message));
      }
    }

    return Response.json({ ok: true, action: 'rejected' });
  }
});