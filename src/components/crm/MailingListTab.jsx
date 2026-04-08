import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Mail, Trash2, UserCheck, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const FONTE_LABELS = {
  whatsapp: { label: 'WA', color: 'text-green-400 bg-green-400/10' },
  instagram: { label: 'IG', color: 'text-pink-400 bg-pink-400/10' },
  csv: { label: 'CSV', color: 'text-blue-400 bg-blue-400/10' },
  form: { label: 'Form', color: 'text-purple-400 bg-purple-400/10' },
  manuale: { label: 'Man.', color: 'text-muted-foreground bg-secondary' },
};

const SEGMENTI = [
  { id: 'tutti', label: 'Tutti i contatti' },
  { id: 'attivo', label: 'Attivi' },
  { id: 'disiscritto', label: 'Disiscritti' },
  { id: 'instagram', label: 'Lead IG' },
  { id: 'whatsapp', label: 'Lead WA' },
];

export default function MailingListTab({ businessId }) {
  const queryClient = useQueryClient();
  const [segment, setSegment] = useState('tutti');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ nome: '', email: '' });
  const [saving, setSaving] = useState(false);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['email-contacts', businessId],
    queryFn: () => base44.entities.ContactEmail.filter({ business_id: businessId }),
    enabled: !!businessId,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['email-contacts', businessId] });

  const filtered = contacts.filter(c => {
    const matchSegment =
      segment === 'tutti' ||
      (segment === 'attivo' && c.stato === 'attivo') ||
      (segment === 'disiscritto' && c.stato === 'disiscritto') ||
      (segment === 'instagram' && c.fonte === 'instagram') ||
      (segment === 'whatsapp' && c.fonte === 'whatsapp');
    const matchSearch = !search || c.nome?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    return matchSegment && matchSearch;
  });

  const activeCount = contacts.filter(c => c.stato === 'attivo').length;
  const unsubCount = contacts.filter(c => c.stato === 'disiscritto').length;

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
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (contact) => {
    await base44.entities.ContactEmail.update(contact.id, {
      stato: contact.stato === 'attivo' ? 'disiscritto' : 'attivo',
    });
    invalidate();
  };

  const handleDelete = async (id) => {
    await base44.entities.ContactEmail.delete(id);
    invalidate();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <span className="text-xs bg-secondary px-2.5 py-1 rounded-lg text-muted-foreground">{contacts.length} totali</span>
        <span className="text-xs bg-green-500/10 px-2.5 py-1 rounded-lg text-green-400">{activeCount} attivi</span>
        <span className="text-xs bg-red-500/10 px-2.5 py-1 rounded-lg text-red-400">{unsubCount} disiscritti</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Segment sidebar (horizontal on mobile) */}
        <div className="flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible sm:w-44 shrink-0 pb-1 sm:pb-0">
          {SEGMENTI.map(s => (
            <button
              key={s.id}
              onClick={() => setSegment(s.id)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-medium text-left whitespace-nowrap transition-colors',
                segment === s.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Cerca nome o email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 bg-secondary border-border text-sm h-9"
              />
            </div>
            <Button onClick={() => setShowAdd(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Aggiungi
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nessun contatto trovato</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map(c => {
                const fonte = FONTE_LABELS[c.fonte] || FONTE_LABELS.manuale;
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-border/80 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                      {(c.nome || c.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.nome || '—'}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${fonte.color}`}>{fonte.label}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.stato === 'attivo' ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                        {c.stato === 'attivo' ? 'Attivo' : 'Disiscritto'}
                      </span>
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                        title={c.stato === 'attivo' ? 'Disiscri' : 'Riattiva'}
                      >
                        {c.stato === 'attivo' ? <UserX className="w-3.5 h-3.5 text-muted-foreground" /> : <UserCheck className="w-3.5 h-3.5 text-green-400" />}
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Aggiungi contatto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nome</Label>
              <Input value={newContact.nome} onChange={e => setNewContact(p => ({ ...p, nome: e.target.value }))} placeholder="Mario Rossi" className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email *</Label>
              <Input type="email" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} placeholder="mario@esempio.com" className="mt-1 bg-secondary border-border" />
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={!newContact.email.trim() || saving}>
              {saving ? 'Salvataggio...' : 'Aggiungi'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}