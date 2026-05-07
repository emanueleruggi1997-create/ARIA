import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Pulizia contatti Instagram con nomi tecnici (User_XXX, ID numerici, ecc.)
// Tenta di risolvere il profilo reale via IG API, altrimenti imposta "Utente Instagram"
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Solo admin
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Trova tutti i contatti IG con nomi tecnici
  const allContacts = await base44.asServiceRole.entities.Contact.filter({ canale: 'instagram' });
  
  const isTechName = (n) => {
    if (!n) return true;
    if (n.startsWith('User_')) return true;
    if (/^\d{8,}$/.test(n)) return true;
    if (n === 'Utente IG' || n === 'Utente Instagram') return true;
    return false;
  };

  const badContacts = allContacts.filter(c => isTechName(c.nome));
  console.log(`[cleanupIGContacts] Found ${badContacts.length} contacts with tech names out of ${allContacts.length} total`);

  if (!badContacts.length) {
    return Response.json({ success: true, message: 'No contacts to clean', cleaned: 0 });
  }

  // Ottieni token IG per ogni business
  const tokenCache = {};
  const getToken = async (businessId) => {
    if (tokenCache[businessId] !== undefined) return tokenCache[businessId];
    const conns = await base44.asServiceRole.entities.MetaConnection.filter({ business_id: businessId, ig_connected: true });
    tokenCache[businessId] = conns[0]?.access_token || null;
    return tokenCache[businessId];
  };

  let resolved = 0;
  let fallback = 0;
  let errors = 0;

  for (const contact of badContacts) {
    try {
      const senderId = contact.numero;
      if (!senderId) {
        await base44.asServiceRole.entities.Contact.update(contact.id, { nome: 'Utente Instagram' });
        fallback++;
        continue;
      }

      const igToken = await getToken(contact.business_id);
      let newName = null;

      if (igToken) {
        try {
          const res = await fetch(
            `https://graph.instagram.com/v21.0/${senderId}?fields=username,name&access_token=${igToken}`
          );
          const data = await res.json();
          console.log(`[cleanupIGContacts] ${senderId}: ${JSON.stringify(data)}`);
          if (!data.error) {
            if (data.username) newName = `@${data.username}`;
            else if (data.name && !/^\d+$/.test(data.name)) newName = data.name;
          }
        } catch (e) {
          console.log(`[cleanupIGContacts] API error for ${senderId}:`, e.message);
        }
      }

      await base44.asServiceRole.entities.Contact.update(contact.id, { 
        nome: newName || 'Utente Instagram' 
      });

      if (newName) {
        resolved++;
        console.log(`[cleanupIGContacts] ✅ ${contact.nome} → ${newName}`);
      } else {
        fallback++;
        console.log(`[cleanupIGContacts] 📝 ${contact.nome} → Utente Instagram (no profile)`);
      }

      // Anche leads collegati
      const leads = await base44.asServiceRole.entities.Lead.filter({ contact_id: contact.id });
      for (const lead of leads) {
        if (isTechName(lead.contact_nome)) {
          await base44.asServiceRole.entities.Lead.update(lead.id, { 
            contact_nome: newName || 'Utente Instagram' 
          });
        }
      }

    } catch (e) {
      errors++;
      console.error(`[cleanupIGContacts] Error for contact ${contact.id}:`, e.message);
    }
  }

  return Response.json({ 
    success: true, 
    total: badContacts.length, 
    resolved, 
    fallback, 
    errors,
    message: `Cleaned ${badContacts.length} contacts: ${resolved} resolved with real username, ${fallback} set to "Utente Instagram"`
  });
});