/**
 * systemHealthCheck — Admin-only health check e stress test dell'app.
 * Verifica: record rotti, token scaduti, connessioni invalide, appuntamenti senza data,
 * contatti senza business, messaggi orfani.
 *
 * Uso: POST /api/functions/systemHealthCheck {}
 * Richiede: admin
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;

function isValidDate(v) { return v && ISO_DATE_RE.test(v) && !isNaN(new Date(v).getTime()); }
function isValidTime(v) { return v && TIME_RE.test(v); }
function isTokenExpired(expiresAt) {
  if (!expiresAt) return null; // unknown
  try { return new Date(expiresAt).getTime() < Date.now(); } catch { return null; }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const report = {
    timestamp: new Date().toISOString(),
    checks: {},
    summary: { total_issues: 0, critical: 0, warnings: 0 },
  };

  const issues = [];

  // ── 1. MetaConnection ──
  try {
    const conns = await base44.asServiceRole.entities.MetaConnection.filter({});
    const expiredTokens = conns.filter(c => c.ig_connected && isTokenExpired(c.ig_token_expires_at) === true);
    const noAccountId = conns.filter(c => c.ig_connected && !c.ig_account_id);
    const noBusinessId = conns.filter(c => !c.business_id && !c.user_id);
    const duplicates = {};
    conns.forEach(c => {
      if (c.ig_account_id) {
        if (!duplicates[c.ig_account_id]) duplicates[c.ig_account_id] = [];
        duplicates[c.ig_account_id].push(c.id);
      }
    });
    const dupIds = Object.values(duplicates).filter(arr => arr.length > 1);

    report.checks.meta_connections = {
      total: conns.length,
      connected: conns.filter(c => c.ig_connected).length,
      expired_tokens: expiredTokens.length,
      no_account_id: noAccountId.length,
      no_business_id: noBusinessId.length,
      duplicate_ig_accounts: dupIds.length,
    };
    if (expiredTokens.length) issues.push({ level: 'critical', area: 'MetaConnection', msg: `${expiredTokens.length} token IG scaduti`, ids: expiredTokens.map(c => c.id) });
    if (noAccountId.length) issues.push({ level: 'critical', area: 'MetaConnection', msg: `${noAccountId.length} connessioni senza ig_account_id`, ids: noAccountId.map(c => c.id) });
    if (dupIds.length) issues.push({ level: 'warning', area: 'MetaConnection', msg: `${dupIds.length} account IG duplicati`, ids: dupIds.flat() });
  } catch (e) { report.checks.meta_connections = { error: e.message }; }

  // ── 2. Appointments ──
  try {
    const apts = await base44.asServiceRole.entities.Appointment.filter({});
    const invalidDate = apts.filter(a => a.data && !isValidDate(a.data));
    const invalidTime = apts.filter(a => a.ora && !isValidTime(a.ora));
    const noDate = apts.filter(a => !a.data);
    const noTitle = apts.filter(a => !a.titolo?.trim());
    const noBusinessId = apts.filter(a => !a.business_id);

    report.checks.appointments = {
      total: apts.length,
      invalid_date: invalidDate.length,
      invalid_time: invalidTime.length,
      no_date: noDate.length,
      no_title: noTitle.length,
      no_business_id: noBusinessId.length,
      in_attesa: apts.filter(a => a.stato === 'in_attesa').length,
      confermati: apts.filter(a => a.stato === 'confermato').length,
    };
    if (invalidDate.length) issues.push({ level: 'critical', area: 'Appointment', msg: `${invalidDate.length} appuntamenti con data non ISO`, ids: invalidDate.map(a => a.id) });
    if (noBusinessId.length) issues.push({ level: 'critical', area: 'Appointment', msg: `${noBusinessId.length} appuntamenti senza business_id`, ids: noBusinessId.map(a => a.id) });
    if (noDate.length) issues.push({ level: 'warning', area: 'Appointment', msg: `${noDate.length} appuntamenti senza data`, ids: noDate.map(a => a.id) });
  } catch (e) { report.checks.appointments = { error: e.message }; }

  // ── 3. Contacts ──
  try {
    const contacts = await base44.asServiceRole.entities.Contact.filter({});
    const noBusinessId = contacts.filter(c => !c.business_id);
    const noNome = contacts.filter(c => !c.nome?.trim());
    const noCanale = contacts.filter(c => !c.canale);

    report.checks.contacts = {
      total: contacts.length,
      no_business_id: noBusinessId.length,
      no_nome: noNome.length,
      no_canale: noCanale.length,
    };
    if (noBusinessId.length) issues.push({ level: 'critical', area: 'Contact', msg: `${noBusinessId.length} contatti senza business_id`, ids: noBusinessId.map(c => c.id) });
    if (noNome.length) issues.push({ level: 'warning', area: 'Contact', msg: `${noNome.length} contatti senza nome` });
  } catch (e) { report.checks.contacts = { error: e.message }; }

  // ── 4. Leads ──
  try {
    const leads = await base44.asServiceRole.entities.Lead.filter({});
    const noBusinessId = leads.filter(l => !l.business_id);
    const invalidStato = leads.filter(l => l.stato && !['nuovo','qualificato','preventivo_inviato','chiuso_vinto','chiuso_perso'].includes(l.stato));

    report.checks.leads = {
      total: leads.length,
      no_business_id: noBusinessId.length,
      invalid_stato: invalidStato.length,
    };
    if (noBusinessId.length) issues.push({ level: 'critical', area: 'Lead', msg: `${noBusinessId.length} lead senza business_id`, ids: noBusinessId.map(l => l.id) });
  } catch (e) { report.checks.leads = { error: e.message }; }

  // ── 5. Messages ──
  try {
    const msgs = await base44.asServiceRole.entities.Message.filter({});
    const noContactId = msgs.filter(m => !m.contact_id);
    const noBusinessId = msgs.filter(m => !m.business_id);
    const emptyText = msgs.filter(m => !m.testo?.trim());

    report.checks.messages = {
      total: msgs.length,
      no_contact_id: noContactId.length,
      no_business_id: noBusinessId.length,
      empty_text: emptyText.length,
    };
    if (noContactId.length) issues.push({ level: 'warning', area: 'Message', msg: `${noContactId.length} messaggi senza contact_id` });
    if (emptyText.length) issues.push({ level: 'warning', area: 'Message', msg: `${emptyText.length} messaggi con testo vuoto` });
  } catch (e) { report.checks.messages = { error: e.message }; }

  // ── 6. UrgentActions ──
  try {
    const actions = await base44.asServiceRole.entities.UrgentAction.filter({ stato: 'nuovo' });
    const noBusinessId = actions.filter(a => !a.business_id);
    report.checks.urgent_actions = {
      total_new: actions.length,
      no_business_id: noBusinessId.length,
    };
    if (actions.length > 50) issues.push({ level: 'warning', area: 'UrgentAction', msg: `${actions.length} azioni urgenti in coda — potrebbe indicare un problema nel sistema` });
  } catch (e) { report.checks.urgent_actions = { error: e.message }; }

  // ── 7. HumanRequests ──
  try {
    const hr = await base44.asServiceRole.entities.HumanRequest.filter({ stato: 'nuovo' });
    report.checks.human_requests = { total_new: hr.length };
    if (hr.length > 20) issues.push({ level: 'warning', area: 'HumanRequest', msg: `${hr.length} richieste umane non gestite` });
  } catch (e) { report.checks.human_requests = { error: e.message }; }

  // ── Summary ──
  report.issues = issues;
  report.summary.total_issues = issues.length;
  report.summary.critical = issues.filter(i => i.level === 'critical').length;
  report.summary.warnings = issues.filter(i => i.level === 'warning').length;
  report.summary.status = report.summary.critical > 0 ? 'CRITICAL' : report.summary.warnings > 0 ? 'WARNING' : 'OK';

  console.log(`[systemHealthCheck] ✅ Done | status:${report.summary.status} | issues:${issues.length} (${report.summary.critical} critical, ${report.summary.warnings} warnings)`);

  return Response.json(report);
});