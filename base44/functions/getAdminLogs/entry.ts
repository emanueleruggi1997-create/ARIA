import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// In-memory log store (persists for the lifetime of the Deno instance)
// Logs are written by other functions via the appendLog export concept,
// but since Deno functions are isolated, we read real system events from entities.

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Build real logs from actual system entities
  const logs = [];

  // Recent messages → WEBHOOK logs
  const recentMessages = await base44.asServiceRole.entities.Message.filter({}, '-created_date', 50);
  for (const m of recentMessages) {
    logs.push({
      id: `msg-${m.id}`,
      tipo: m.ruolo === 'assistant' ? 'AI' : 'WEBHOOK',
      messaggio: m.ruolo === 'assistant'
        ? `Risposta AI inviata a contatto ${m.contact_id?.slice(0, 8)}: "${m.testo?.slice(0, 80)}"`
        : `Messaggio ricevuto da ${m.canale || 'unknown'}: "${m.testo?.slice(0, 80)}"`,
      timestamp: m.created_date,
      business_id: m.business_id,
      extra: { canale: m.canale, ruolo: m.ruolo },
    });
  }

  // Recent leads → INFO logs
  const recentLeads = await base44.asServiceRole.entities.Lead.filter({}, '-created_date', 20);
  for (const l of recentLeads) {
    logs.push({
      id: `lead-${l.id}`,
      tipo: 'INFO',
      messaggio: `Nuovo lead CRM: ${l.contact_nome} (${l.canale || 'unknown'}) — stato: ${l.stato}`,
      timestamp: l.created_date,
      business_id: l.business_id,
      extra: { stato: l.stato, canale: l.canale },
    });
  }

  // Recent appointments → INFO logs
  const recentApts = await base44.asServiceRole.entities.Appointment.filter({}, '-created_date', 20);
  for (const a of recentApts) {
    logs.push({
      id: `apt-${a.id}`,
      tipo: 'INFO',
      messaggio: `Appuntamento: "${a.titolo}" — ${a.data || '?'} ${a.ora || ''} — stato: ${a.stato}`,
      timestamp: a.created_date,
      business_id: a.business_id,
      extra: { stato: a.stato, tipo: a.tipo, canale_origine: a.canale_origine },
    });
  }

  // Sort all logs by timestamp descending
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return Response.json({ ok: true, logs: logs.slice(0, 100) });
});