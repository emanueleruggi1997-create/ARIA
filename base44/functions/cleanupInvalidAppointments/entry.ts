import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * cleanupInvalidAppointments
 * Admin-only. Trova appuntamenti con date invalide e li normalizza:
 * - data non ISO → null, testo spostato nelle note
 * - stato rimane in_attesa (pending_confirmation)
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidISODate(value) {
  if (!value || typeof value !== 'string') return false;
  if (!ISO_DATE_RE.test(value.trim())) return false;
  const d = new Date(value.trim());
  return !isNaN(d.getTime());
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const all = await base44.asServiceRole.entities.Appointment.filter({});
  let fixed = 0;
  let skipped = 0;
  const errors = [];

  for (const apt of all) {
    try {
      const dateInvalid = apt.data && !isValidISODate(apt.data);
      const oraInvalid  = apt.ora && !/^\d{1,2}:\d{2}$/.test(apt.ora.trim());

      if (!dateInvalid && !oraInvalid) { skipped++; continue; }

      const notePrefix = [];
      if (dateInvalid) notePrefix.push(`Data originale non valida: "${apt.data}"`);
      if (oraInvalid)  notePrefix.push(`Ora originale non valida: "${apt.ora}"`);

      const existingNote = apt.note || '';
      const newNote = [...notePrefix, existingNote].filter(Boolean).join('\n').trim();

      const updatePayload = {
        stato: apt.stato === 'confermato' ? 'in_attesa' : apt.stato,
        note: newNote,
      };
      // Solo sovrascrive se il campo era effettivamente invalido (non lo tocca se già null)
      if (dateInvalid) updatePayload.data = '';
      if (oraInvalid)  updatePayload.ora  = '';
      await base44.asServiceRole.entities.Appointment.update(apt.id, updatePayload);
      fixed++;
      console.log(`[cleanup] Fixed apt ${apt.id}: data="${apt.data}" → null`);
    } catch (e) {
      errors.push({ id: apt.id, error: e.message });
      console.error(`[cleanup] Error on apt ${apt.id}:`, e.message);
    }
  }

  return Response.json({ total: all.length, fixed, skipped, errors });
});