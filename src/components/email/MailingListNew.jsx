import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Upload, UserX, UserCheck, Trash2, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const C = {
  card: '#111C30', border: '#1A2E4A', surface: '#0D1525',
  accent: '#00C6FF', accent2: '#7B2FFF', text: '#E8F4FF', muted: '#5A7A9A',
  success: '#00E5A0', warning: '#FF9500', danger: '#FF3860',
};

const FONTE_CONFIG = {
  whatsapp: { label: 'WA', bg: '#25D36622', color: '#25D366' },
  instagram: { label: 'IG', bg: '#E1306C22', color: '#E1306C' },
  csv: { label: 'CSV', bg: '#00C6FF22', color: '#00C6FF' },
  manuale: { label: 'Man', bg: '#5A7A9A22', color: '#5A7A9A' },
  form: { label: 'Form', bg: '#7B2FFF22', color: '#7B2FFF' },
};

const FILTERS = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'attivo', label: 'Attivi' },
  { id: 'disiscritto', label: 'Disiscritti' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'csv', label: 'CSV' },
  { id: 'manuale', label: 'Manuali' },
];

function parseEmailsFromCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { contacts: [], skipped: 0 };

  const headers = lines[0].toLowerCase().replace(/['"]/g, '').split(/[,;]/).map(h => h.trim());
  const emailIdx = headers.findIndex(h => h.includes('email') || h === 'e-mail');
  const nomeIdx = headers.findIndex(h => h.includes('nome') || h.includes('name') || h === 'cognome');

  const contacts = [];
  let skipped = 0;

  const dataLines = emailIdx >= 0 ? lines.slice(1) : lines;

  for (const line of dataLines) {
    const cols = line.replace(/['"]/g, '').split(/[,;]/);
    let email = emailIdx >= 0 ? (cols[emailIdx] || '').trim() : line.trim();
    let nome = nomeIdx >= 0 ? (cols[nomeIdx] || '').trim() : '';

    if (!email.includes('@') || !email.includes('.')) { skipped++; continue; }
    contacts.push({ email: email.toLowerCase(), nome });
  }

  return { contacts, skipped };
}

export default function MailingListNew({ businessId }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [filter, setFilter] = useState('tutti');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ nome: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [csvPreview, setCsvPreview] = useState(null); // { contacts, skipped }
  const [importingCsv, setImportingCsv] = useState(false);
  const [swipedId, setSwipedId] = useState(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['email-contacts', businessId],
    queryFn: () => base44.entities.ContactEmail.filter({ business_id: businessId }),
    enabled: !!businessId,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['email-contacts', businessId] });

  // Only contacts with valid email
  const validContacts = contacts.filter(c => c.email?.includes('@'));
  const activeCount = validContacts.filter(c => c.stato === 'attivo').length;
  const unsubCount = validContacts.filter(c => c.stato === 'disiscritto').length;

  const filtered = validContacts.filter(c => {
    if (filter === 'attivo') return c.stato === 'attivo';
    if (filter === 'disiscritto') return c.stato === 'disiscritto';
    if (filter === 'instagram') return c.fonte === 'instagram';
    if (filter === 'whatsapp') return c.fonte === 'whatsapp';
    if (filter === 'csv') return c.fonte === 'csv';
    if (filter === 'manuale') return c.fonte === 'manuale';
    return true;
  }).filter(c => {
    if (!search) return true;
    return (c.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase());
  });

  const handleAdd = async () => {
    if (!newContact.email.trim() || saving) return;
    setSaving(true);
    try {
      await base44.entities.ContactEmail.create({
        ...newContact,
        business_id: businessId,
        fonte: 'manuale',
        stato: 'attivo',
      });
      invalidate();
      setShowAdd(false);
      setNewContact({ nome: '', email: '' });
    } finally { setSaving(false); }
  };

  const handleToggleStatus = async (c) => {
    await base44.entities.ContactEmail.update(c.id, {
      stato: c.stato === 'attivo' ? 'disiscritto' : 'attivo',
    });
    invalidate();
  };

  const handleDelete = async (id) => {
    await base44.entities.ContactEmail.delete(id);
    invalidate();
    setSwipedId(null);
  };

  // CSV import
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = parseEmailsFromCSV(text);
    // Filter out existing emails
    const existingEmails = new Set(validContacts.map(c => c.email.toLowerCase()));
    const newContacts = result.contacts.filter(c => !existingEmails.has(c.email));
    const duplicates = result.contacts.length - newContacts.length;
    setCsvPreview({ contacts: newContacts, skipped: result.skipped, duplicates });
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!csvPreview?.contacts?.length) return;
    setImportingCsv(true);
    try {
      for (const c of csvPreview.contacts) {
        await base44.entities.ContactEmail.create({
          business_id: businessId,
          nome: c.nome || '',
          email: c.email,
          fonte: 'csv',
          stato: 'attivo',
        });
      }
      invalidate();
      setCsvPreview(null);
    } finally { setImportingCsv(false); }
  };

  const isMobile = window.innerWidth < 768;

  return (
    <div style={{ fontFamily: 'inherit' }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { label: `${validContacts.length} totali`, bg: C.card, color: C.muted },
          { label: `${activeCount} attivi`, bg: C.success + '22', color: C.success },
          { label: `${unsubCount} disiscritti`, bg: C.danger + '22', color: C.danger },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.bg, border: `1px solid ${s.color}44`,
            borderRadius: 8, padding: '5px 12px',
            fontSize: 12, fontWeight: 700, color: s.color,
          }}>{s.label}</div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: C.muted }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca nome o email..."
            style={{
              width: '100%', paddingLeft: 32, background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '9px 12px 9px 32px', color: C.text, fontSize: 13,
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <button onClick={() => fileInputRef.current?.click()} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '9px 14px', color: C.muted, fontSize: 12, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
          <Upload style={{ width: 14, height: 14 }} /> Importa CSV
        </button>
        <button onClick={() => setShowAdd(true)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
          border: 'none', borderRadius: 10, padding: '9px 14px',
          color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}>
          <Plus style={{ width: 14, height: 14 }} /> Aggiungi
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.txt" onChange={handleFileChange} style={{ display: 'none' }} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            background: filter === f.id ? C.accent2 + '22' : C.card,
            border: `1px solid ${filter === f.id ? C.accent2 : C.border}`,
            borderRadius: 20, padding: '5px 12px',
            color: filter === f.id ? C.accent2 : C.muted,
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>{f.label}</button>
        ))}
      </div>

      {/* CSV Preview */}
      {csvPreview && (
        <div style={{
          background: C.card, border: `1px solid ${C.accent2}66`,
          borderRadius: 12, padding: 16, marginBottom: 14,
        }}>
          <div style={{ fontWeight: 800, color: C.text, marginBottom: 8, fontSize: 14 }}>📊 Anteprima importazione</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
            Trovati <strong style={{ color: C.accent2 }}>{csvPreview.contacts.length} contatti validi</strong>
            {csvPreview.skipped > 0 && `, ${csvPreview.skipped} ignorati (email mancante)`}
            {csvPreview.duplicates > 0 && `, ${csvPreview.duplicates} duplicati (già presenti)`}
          </div>
          <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {csvPreview.contacts.slice(0, 10).map((c, i) => (
              <div key={i} style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 10 }}>
                <span>{c.nome || '—'}</span>
                <span style={{ color: C.accent }}>{c.email}</span>
              </div>
            ))}
            {csvPreview.contacts.length > 10 && (
              <div style={{ fontSize: 11, color: C.muted }}>...e altri {csvPreview.contacts.length - 10}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCsvPreview(null)} style={{
              flex: 1, background: 'none', border: `1px solid ${C.border}`, borderRadius: 10,
              padding: '9px', color: C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Annulla</button>
            <button onClick={handleConfirmImport} disabled={importingCsv || !csvPreview.contacts.length} style={{
              flex: 2, background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
              border: 'none', borderRadius: 10, padding: '9px',
              color: '#fff', fontSize: 13, fontWeight: 800,
              cursor: importingCsv ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {importingCsv ? '⏳ Importando...' : `✓ Importa ${csvPreview.contacts.length} contatti`}
            </button>
          </div>
        </div>
      )}

      {/* Contact list */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: `3px solid ${C.accent}33`, borderTopColor: C.accent, animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
          <Mail style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.2 }} />
          <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>Nessun contatto</div>
          <div style={{ fontSize: 13 }}>Aggiungi contatti manualmente o importa un CSV</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(c => {
            const fonte = FONTE_CONFIG[c.fonte] || FONTE_CONFIG.manuale;
            const isSwiped = swipedId === c.id;
            return (
              <div key={c.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
                {/* Swipe delete background */}
                <div style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0, width: 64,
                  background: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '0 12px 12px 0',
                }}>
                  <Trash2 style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: '12px 14px',
                    transform: isSwiped ? 'translateX(-64px)' : 'translateX(0)',
                    transition: 'transform 0.2s', cursor: 'pointer',
                  }}
                  onTouchStart={() => setSwipedId(isSwiped ? null : null)}
                  onTouchEnd={() => {}}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: C.accent2 + '22', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 13, fontWeight: 800, color: C.accent2,
                  }}>
                    {(c.nome || c.email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.nome || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: fonte.bg, color: fonte.color }}>{fonte.label}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: c.stato === 'attivo' ? C.success + '22' : C.danger + '22',
                      color: c.stato === 'attivo' ? C.success : C.danger,
                    }}>
                      {c.stato === 'attivo' ? 'Attivo' : 'Disiscr.'}
                    </span>
                    <button onClick={() => handleToggleStatus(c)} style={{
                      width: 28, height: 28, borderRadius: 8, background: C.surface,
                      border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer',
                    }}>
                      {c.stato === 'attivo'
                        ? <UserX style={{ width: 13, height: 13, color: C.muted }} />
                        : <UserCheck style={{ width: 13, height: 13, color: C.success }} />
                      }
                    </button>
                    <button onClick={() => handleDelete(c.id)} style={{
                      width: 28, height: 28, borderRadius: 8, background: C.surface,
                      border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer',
                    }}>
                      <Trash2 style={{ width: 13, height: 13, color: C.muted }} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB mobile */}
      {isMobile && (
        <button onClick={() => setShowAdd(true)} style={{
          position: 'fixed', bottom: 84, right: 16, width: 52, height: 52, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: `0 4px 20px ${C.accent2}66`, zIndex: 50,
        }}>
          <Plus style={{ width: 22, height: 22, color: '#fff' }} />
        </button>
      )}

      {/* Add contact dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Aggiungi contatto</DialogTitle></DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Nome (opzionale)</div>
              <input
                value={newContact.nome}
                onChange={e => setNewContact(p => ({ ...p, nome: e.target.value }))}
                placeholder="Mario Rossi"
                style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Email *</div>
              <input
                type="email"
                value={newContact.email}
                onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                placeholder="mario@esempio.com"
                style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={handleAdd} disabled={!newContact.email.trim() || saving} style={{
              background: newContact.email.trim() ? `linear-gradient(135deg, ${C.accent2}, ${C.accent})` : C.card,
              border: 'none', borderRadius: 10, padding: '11px',
              color: newContact.email.trim() ? '#fff' : C.muted,
              fontSize: 13, fontWeight: 800, cursor: newContact.email.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}>
              {saving ? 'Salvataggio...' : 'Aggiungi contatto'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}