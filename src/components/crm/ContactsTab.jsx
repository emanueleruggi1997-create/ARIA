import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Upload, MoreHorizontal, Mail, UserX, Trash2, Tag, FileText, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const TAG_COLORS = ['bg-blue-500/20 text-blue-300', 'bg-green-500/20 text-green-300', 'bg-purple-500/20 text-purple-300', 'bg-yellow-500/20 text-yellow-300', 'bg-pink-500/20 text-pink-300', 'bg-orange-500/20 text-orange-300'];
const tagColor = (tag) => TAG_COLORS[tag.charCodeAt(0) % TAG_COLORS.length];

const FONTI = ['whatsapp', 'instagram', 'csv', 'form', 'manuale'];

export default function ContactsTab({ businessId }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStato, setFilterStato] = useState('tutti');
  const [filterTag, setFilterTag] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [form, setForm] = useState({ nome: '', email: '', tags: '', fonte: 'manuale' });
  const [saving, setSaving] = useState(false);

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-email', businessId],
    queryFn: () => base44.entities.ContactEmail.filter({ business_id: businessId }),
    enabled: !!businessId,
  });

  const allTags = [...new Set(contacts.flatMap(c => c.tags || []))];

  const filtered = contacts.filter(c => {
    const matchSearch = !search || c.nome?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStato = filterStato === 'tutti' || c.stato === filterStato;
    const matchTag = !filterTag || (c.tags || []).includes(filterTag);
    return matchSearch && matchStato && matchTag;
  });

  const handleAdd = async () => {
    setSaving(true);
    await base44.entities.ContactEmail.create({
      business_id: businessId,
      nome: form.nome,
      email: form.email,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      fonte: form.fonte,
      stato: 'attivo',
    });
    queryClient.invalidateQueries({ queryKey: ['contacts-email'] });
    setShowAdd(false);
    setForm({ nome: '', email: '', tags: '', fonte: 'manuale' });
    setSaving(false);
  };

  const handleToggleStato = async (c) => {
    await base44.entities.ContactEmail.update(c.id, { stato: c.stato === 'attivo' ? 'disiscritto' : 'attivo' });
    queryClient.invalidateQueries({ queryKey: ['contacts-email'] });
    setMenuId(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.ContactEmail.delete(id);
    queryClient.invalidateQueries({ queryKey: ['contacts-email'] });
    setMenuId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Contatti</h2>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{contacts.length}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Importa CSV
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Aggiungi contatto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome o email..." className="pl-8 bg-secondary border-border h-8 text-sm" />
        </div>
        <div className="flex gap-2">
          {['tutti', 'attivo', 'disiscritto'].map(s => (
            <button key={s} onClick={() => setFilterStato(s)}
              className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-all border",
                filterStato === s ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
              )}>
              {s === 'tutti' ? 'Tutti' : s === 'attivo' ? 'Attivi' : 'Non iscritti'}
            </button>
          ))}
          {allTags.length > 0 && (
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="h-8 text-xs bg-secondary border-border w-32"><SelectValue placeholder="Tag..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Tutti i tag</SelectItem>
                {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="text-5xl mb-4">📧</div>
          <p className="text-base font-medium text-foreground">Nessun contatto ancora</p>
          <p className="text-sm mt-1 mb-4">Aggiungi contatti manualmente o importa da CSV</p>
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5 mr-1.5" /> Aggiungi contatto</Button>
        </div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-secondary/50 border-b border-border">
              <tr>
                {['Nome', 'Email', 'Tag', 'Fonte', 'Data', 'Stato', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{c.nome || '—'}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(c.tags || []).map(t => (
                        <span key={t} className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", tagColor(t))}>{t}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] uppercase font-medium text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{c.fonte || 'manuale'}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.created_date ? format(new Date(c.created_date), 'dd/MM/yy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                      c.stato === 'attivo' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    )}>
                      {c.stato === 'attivo' ? 'Attivo' : 'Non iscritto'}
                    </span>
                  </td>
                  <td className="px-4 py-3 relative">
                    <div className="relative">
                      <button onClick={() => setMenuId(menuId === c.id ? null : c.id)}
                        className="w-7 h-7 rounded flex items-center justify-center hover:bg-secondary transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {menuId === c.id && (
                        <div className="absolute right-0 top-8 z-30 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                          <button onClick={() => handleToggleStato(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors">
                            <UserX className="w-3 h-3" /> {c.stato === 'attivo' ? 'Disiscriviti' : 'Riattiva'}
                          </button>
                          <button onClick={() => handleDelete(c.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors border-t border-border">
                            <Trash2 className="w-3 h-3" /> Elimina
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div className="md:hidden space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{c.nome || c.email}</p>
                <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(c.tags || []).map(t => (
                    <span key={t} className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", tagColor(t))}>{t}</span>
                  ))}
                </div>
              </div>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0",
                c.stato === 'attivo' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              )}>
                {c.stato === 'attivo' ? 'Attivo' : 'Non iscritto'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>Nuovo Contatto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className="mt-1 bg-secondary border-border" /></div>
            <div><Label>Email *</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="mt-1 bg-secondary border-border" /></div>
            <div><Label>Tag (separati da virgola)</Label><Input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="cliente, newsletter, vip" className="mt-1 bg-secondary border-border" /></div>
            <div>
              <Label>Fonte</Label>
              <Select value={form.fonte} onValueChange={v => setForm(p => ({ ...p, fonte: v }))}>
                <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONTI.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={!form.email || saving}>{saving ? 'Salvataggio...' : 'Aggiungi Contatto'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import CSV Modal */}
      <ImportCsvModal open={showImport} onClose={() => setShowImport(false)} businessId={businessId} onImported={() => queryClient.invalidateQueries({ queryKey: ['contacts-email'] })} />
    </div>
  );
}

function ImportCsvModal({ open, onClose, businessId, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [colNome, setColNome] = useState('');
  const [colEmail, setColEmail] = useState('');
  const [step, setStep] = useState(1);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter(Boolean);
      const h = lines[0].split(',').map(s => s.trim().replace(/"/g, ''));
      setHeaders(h);
      setPreview(lines.slice(1, 6).map(l => l.split(',').map(s => s.trim().replace(/"/g, ''))));
      setColNome(h[0] || '');
      setColEmail(h[1] || '');
      setStep(2);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file || !colEmail) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const lines = e.target.result.split('\n').filter(Boolean);
      const h = lines[0].split(',').map(s => s.trim().replace(/"/g, ''));
      const iNome = h.indexOf(colNome);
      const iEmail = h.indexOf(colEmail);
      const records = lines.slice(1).map(l => {
        const cols = l.split(',').map(s => s.trim().replace(/"/g, ''));
        return { business_id: businessId, nome: iNome >= 0 ? cols[iNome] : '', email: cols[iEmail] || '', fonte: 'csv', stato: 'attivo' };
      }).filter(r => r.email);
      await base44.entities.ContactEmail.bulkCreate(records);
      onImported?.();
      onClose();
      setStep(1); setFile(null); setPreview([]); setImporting(false);
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader><DialogTitle>Importa contatti CSV</DialogTitle></DialogHeader>
        {step === 1 && (
          <div
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          >
            <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium">Trascina il file CSV qui</p>
            <p className="text-xs text-muted-foreground mt-1">o clicca per selezionare</p>
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Colonna Nome</Label>
                <Select value={colNome} onValueChange={setColNome}>
                  <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Colonna Email *</Label>
                <Select value={colEmail} onValueChange={setColEmail}>
                  <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Anteprima (prime 5 righe)</p>
              <div className="bg-secondary/50 rounded-lg p-3 overflow-x-auto">
                <table className="text-xs w-full">
                  <thead><tr>{headers.map(h => <th key={h} className="text-left px-2 py-1 text-muted-foreground">{h}</th>)}</tr></thead>
                  <tbody>{preview.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="px-2 py-1 text-foreground">{cell}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
            <Button onClick={handleImport} className="w-full" disabled={!colEmail || importing}>
              {importing ? 'Importazione...' : `Importa contatti`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}