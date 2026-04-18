import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Calcola la data di un mese fa
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const cutoff = oneMonthAgo.toISOString().split('T')[0]; // 'yyyy-MM-dd'

  // Recupera tutti gli appuntamenti annullati
  const all = await base44.asServiceRole.entities.Appointment.filter({ stato: 'annullato' });

  // Filtra quelli più vecchi di un mese
  const toDelete = all.filter(a => a.data && a.data < cutoff);

  let deleted = 0;
  for (const appt of toDelete) {
    await base44.asServiceRole.entities.Appointment.delete(appt.id);
    deleted++;
  }

  return Response.json({ deleted, total: all.length });
});