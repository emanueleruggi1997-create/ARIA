import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch all contacts and all leads
  const allContacts = await base44.asServiceRole.entities.Contact.filter({});
  const allLeads = await base44.asServiceRole.entities.Lead.filter({});

  // Build set of contact_ids that already have AT LEAST ONE lead
  const contactIdsWithLead = new Set(allLeads.map(l => l.contact_id).filter(Boolean));

  // Deduplicate contacts by contact.id — each contact gets at most one lead
  let created = 0;
  let skipped = 0;

  for (const contact of allContacts) {
    // Skip if lead already exists for this contact
    if (contactIdsWithLead.has(contact.id)) {
      skipped++;
      continue;
    }

    // Skip contacts with fake/placeholder names (IG_ prefix with no real name)
    if (!contact.nome || contact.nome.startsWith('IG_')) {
      skipped++;
      continue;
    }

    // Skip contacts without a business_id
    if (!contact.business_id) {
      skipped++;
      continue;
    }

    // Fetch first real user message for context note
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
      note_ai: firstMsg ? `Primo messaggio: "${firstMsg.slice(0, 200)}"` : 'Contatto sincronizzato',
    });

    // Mark this contact as having a lead to avoid duplicates within same run
    contactIdsWithLead.add(contact.id);
    created++;
    console.log('[syncContactsToLeads] Lead created for:', contact.nome);
  }

  console.log(`[syncContactsToLeads] Done — created: ${created}, skipped: ${skipped}`);
  return Response.json({ ok: true, created, skipped, total: allContacts.length });
});