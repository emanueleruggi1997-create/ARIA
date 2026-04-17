import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get all contacts for all businesses
  const allContacts = await base44.asServiceRole.entities.Contact.filter({});
  const allLeads = await base44.asServiceRole.entities.Lead.filter({});

  // Build a set of contact_ids that already have a lead
  const contactIdsWithLead = new Set(allLeads.map(l => l.contact_id).filter(Boolean));

  let created = 0;
  for (const contact of allContacts) {
    if (contactIdsWithLead.has(contact.id)) continue;
    // Get first message for context
    const messages = await base44.asServiceRole.entities.Message.filter(
      { contact_id: contact.id, ruolo: 'user' }, 'created_date', 1
    );
    const firstMsg = messages[0]?.testo || '';
    await base44.asServiceRole.entities.Lead.create({
      business_id: contact.business_id,
      contact_id: contact.id,
      contact_nome: contact.nome,
      canale: contact.canale || 'instagram',
      stato: 'nuovo',
      note_ai: firstMsg ? `Primo messaggio: "${firstMsg.slice(0, 200)}"` : 'Contatto importato retroattivamente',
    });
    created++;
    console.log('[syncContactsToLeads] Lead created for:', contact.nome);
  }

  return Response.json({ ok: true, created, total: allContacts.length });
});