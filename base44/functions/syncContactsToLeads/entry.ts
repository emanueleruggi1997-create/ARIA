import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all existing leads FIRST to build a complete dedup set
  const allLeads = await base44.asServiceRole.entities.Lead.filter({});
  const contactIdsWithLead = new Set(allLeads.map(l => l.contact_id).filter(Boolean));

  // Fetch all contacts
  const allContacts = await base44.asServiceRole.entities.Contact.filter({});

  let created = 0;
  let skipped = 0;

  // Process contacts one by one (sequential) to avoid race conditions
  for (const contact of allContacts) {
    // Skip if this contact already has a lead (checked in-memory, no DB round-trip needed)
    if (contactIdsWithLead.has(contact.id)) {
      skipped++;
      continue;
    }

    // Skip contacts without a valid business_id
    if (!contact.business_id) {
      skipped++;
      continue;
    }

    // Add to set BEFORE creating to prevent duplicates within same run
    // (handles case where same contact appears twice in the list)
    contactIdsWithLead.add(contact.id);

    // Fetch first real user message for note context
    const messages = await base44.asServiceRole.entities.Message.filter(
      { contact_id: contact.id, ruolo: 'user' }, 'created_date', 1
    );
    const firstMsg = messages[0]?.testo || '';

    await base44.asServiceRole.entities.Lead.create({
      business_id: contact.business_id,
      contact_id: contact.id,
      contact_nome: contact.nome || `IG_${contact.numero}`,
      canale: contact.canale || 'instagram',
      stato: 'nuovo',
      note_ai: firstMsg ? `Primo messaggio: "${firstMsg.slice(0, 200)}"` : 'Contatto sincronizzato',
    });

    created++;
    console.log('[syncContactsToLeads] Lead created for:', contact.nome);
  }

  console.log(`[syncContactsToLeads] Done — created: ${created}, skipped: ${skipped}`);
  return Response.json({ ok: true, created, skipped, total: allContacts.length });
});