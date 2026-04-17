import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { appointmentId, action, data, ora } = await req.json();
  // action: 'confirm' | 'reject'

  const apt = await base44.asServiceRole.entities.Appointment.get(appointmentId);
  if (!apt) return Response.json({ error: 'Appointment not found' }, { status: 404 });

  // Get contact to find senderId
  const contact = apt.contact_id
    ? await base44.asServiceRole.entities.Contact.get(apt.contact_id)
    : null;

  // Get business
  const business = await base44.asServiceRole.entities.Business.get(apt.business_id);

  // Get MetaConnection for this business
  const connections = await base44.asServiceRole.entities.MetaConnection.filter({ business_id: apt.business_id });
  const conn = connections.find(c => c.ig_connected && c.ig_account_id) || connections[0];

  if (action === 'confirm') {
    // Update appointment with confirmed date/time and status
    const updates = { stato: 'confermato' };
    if (data) updates.data = data;
    if (ora) updates.ora = ora;
    await base44.asServiceRole.entities.Appointment.update(appointmentId, updates);

    // Send confirmation DM via Instagram if possible
    if (conn?.access_token && conn?.ig_account_id && contact?.numero) {
      const agentName = business?.nome_agente || 'ARIA';
      const businessName = business?.nome || '';
      // Parse date as local Italy date (YYYY-MM-DD) without UTC shift
      const dateStr = data ? (() => {
        const [y, m, d] = data.split('-').map(Number);
        const localDate = new Date(y, m - 1, d);
        return localDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
      })() : 'data da definire';
      const timeStr = ora || '';

      const confirmText = `✅ Ottimo, il tuo appuntamento è confermato!\n\n📅 ${dateStr}${timeStr ? ` alle ${timeStr}` : ''}\n\nTi aspettiamo da ${businessName}. Se hai bisogno di cambiare o annullare, scrivici qui. A presto! 👋`;

      const sendRes = await fetch(`https://graph.instagram.com/v21.0/${conn.ig_account_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${conn.access_token}` },
        body: JSON.stringify({ recipient: { id: contact.numero }, message: { text: confirmText } }),
      });
      const sendData = await sendRes.json();

      // Save the outbound confirmation message in the DB
      if (contact?.id) {
        await base44.asServiceRole.entities.Message.create({
          business_id: apt.business_id,
          contact_id: contact.id,
          canale: 'instagram',
          ruolo: 'assistant',
          testo: confirmText,
          letto: true,
        });
      }

      if (sendData.error) {
        console.error('[confirmAppointment] IG send error:', JSON.stringify(sendData.error));
      } else {
        console.log('[confirmAppointment] Confirmation sent via IG:', sendData.message_id);
      }
    }

    return Response.json({ ok: true, action: 'confirmed' });
  }

  if (action === 'reject') {
    await base44.asServiceRole.entities.Appointment.update(appointmentId, { stato: 'annullato' });

    // Send rejection DM via Instagram if possible
    if (conn?.access_token && conn?.ig_account_id && contact?.numero) {
      const businessName = business?.nome || '';
      const rejectText = `Ciao! Purtroppo non siamo disponibili per la data richiesta. Se vuoi, puoi proporci un'altra data e faremo del nostro meglio per accontendarti. Grazie e a presto! 🙏`;

      await fetch(`https://graph.instagram.com/v21.0/${conn.ig_account_id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${conn.access_token}` },
        body: JSON.stringify({ recipient: { id: contact.numero }, message: { text: rejectText } }),
      });

      if (contact?.id) {
        await base44.asServiceRole.entities.Message.create({
          business_id: apt.business_id,
          contact_id: contact.id,
          canale: 'instagram',
          ruolo: 'assistant',
          testo: rejectText,
          letto: true,
        });
      }
    }

    return Response.json({ ok: true, action: 'rejected' });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
});