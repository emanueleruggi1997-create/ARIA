import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Users, DollarSign, TrendingUp, CalendarDays, MoreHorizontal, Search, X, Eye, CreditCard, MessageSquare, Pause, Trash2 } from 'lucide-react';
import { format, subDays, isAfter } from 'date-fns';

const PIANO_PREZZO = { starter: 99, pro: 199, agency: 399 };
const PIANO_COLORS = {
  starter: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  pro: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  agency: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};
const FILTERS = ['Tutti', 'Starter', 'Pro', 'Agency', 'Sospesi', 'Nuovi'];

export default function AdminBusiness({ businesses, isLoading }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('Tutti');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [changePianoModal, setChangePianoModal] = useState(null);

  const sevenDaysAgo = subDays(new Date(), 7);

  const filtered = businesses.filter(b => {
    const matchSearch = !search ||
      b.nome?.toLowerCase().includes(search.toLowerCase()) ||
      b.created_by?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'Tutti') return true;
    if (filter === 'Starter') return b.piano === 'starter';
    if (filter === 'Pro') return b.piano === 'pro';
    if (filter === 'Agency') return b.piano === 'agency';
    if (filter === 'Sospesi') return b.attivo === false;
    if (filter === 'Nuovi') return isAfter(new Date(b.created_date), sevenDaysAgo);
    return true;
  });

  const activeBusinesses = businesses.filter(b => b.attivo !== false);
  const mrr = activeBusinesses.reduce((sum, b) => sum + (PIANO_PREZZO[b.piano] || 0), 0);
  const newThisWeek = businesses.filter(b => isAfter(new Date(b.created_date), sevenDaysAgo)).length;

  const handleToggle = async (b) => {
    await base44.entities.Business.update(b.id, { attivo: !b.attivo });
    qc.invalidateQueries({ queryKey: ['admin-businesses'] });
  };

  const handleDelete = async (b) => {
    await base44.entities.Business.delete(b.id);
    qc.invalidateQueries({ queryKey: ['admin-businesses'] });
    setDeleteConfirm(null);
  };

  const handleChangePiano = async (b, piano) => {
    await base44.entities.Business.update(b.id, { piano });
    qc.invalidateQueries({ queryKey: ['admin-businesses'] });
    setChangePianoModal(null);
  };

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Business totali', value: businesses.length, icon: Users, color: '#3B6EF8' },
          { label: 'Attivi oggi', value: activeBusinesses.length, icon: TrendingUp, color: '#10B981' },
          { label: 'MRR totale', value: `€${mrr.toLocaleString()}`, icon: DollarSign, color: '#F59E0B' },
          { label: 'Nuovi (7gg)', value: newThisWeek, icon: CalendarDays, color: '#7C3AED' },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${k.color}18` }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-xl font-bold text-foreground">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${filter === f ? 'bg-primary text-white border-primary' : 'bg-card border-border text-muted-foreground hover:border-primary/40'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca nome / email..."
            className="pl-8 h-8 text-xs bg-card border-border" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-muted-foreground" /></button>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {['Business', 'Piano', 'Iscrizione', 'MRR', 'Stato', ''].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">Caricamento...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">Nessun business trovato</td></tr>
              )}
              {filtered.map(b => (
                <tr key={b.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{b.nome}</p>
                    <p className="text-xs text-muted-foreground">{b.created_by}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${PIANO_COLORS[b.piano] || PIANO_COLORS.starter}`}>
                      {b.piano || 'starter'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {b.created_date ? format(new Date(b.created_date), 'dd/MM/yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-foreground">€{PIANO_PREZZO[b.piano] || 0}</td>
                  <td className="px-4 py-3">
                    <Switch checked={b.attivo !== false} onCheckedChange={() => handleToggle(b)} />
                  </td>
                  <td className="px-4 py-3 relative">
                    <button onClick={() => setMenuOpen(menuOpen === b.id ? null : b.id)}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen === b.id && (
                      <div className="absolute right-4 top-10 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden min-w-[180px]"
                        onMouseLeave={() => setMenuOpen(null)}>
                        {[
                          { icon: Eye, label: 'Visualizza dettaglio', action: () => setMenuOpen(null) },
                          { icon: CreditCard, label: 'Cambia piano', action: () => { setChangePianoModal(b); setMenuOpen(null); } },
                          { icon: MessageSquare, label: 'Invia messaggio', action: () => setMenuOpen(null) },
                          { icon: Pause, label: b.attivo !== false ? 'Sospendi account' : 'Riattiva account', action: () => { handleToggle(b); setMenuOpen(null); } },
                          { icon: Trash2, label: 'Elimina account', action: () => { setDeleteConfirm(b); setMenuOpen(null); }, danger: true },
                        ].map(item => (
                          <button key={item.label} onClick={item.action}
                            className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors ${item.danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-secondary'}`}>
                            <item.icon className="w-3.5 h-3.5" />{item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground mb-2">Elimina account</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Stai per eliminare <strong className="text-foreground">{deleteConfirm.nome}</strong>. Questa azione è irreversibile.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Annulla</Button>
              <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-white" onClick={() => handleDelete(deleteConfirm)}>Elimina</Button>
            </div>
          </div>
        </div>
      )}

      {/* Change piano modal */}
      {changePianoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setChangePianoModal(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-foreground mb-4">Cambia piano — {changePianoModal.nome}</h3>
            <div className="space-y-2">
              {['starter', 'pro', 'agency'].map(p => (
                <button key={p} onClick={() => handleChangePiano(changePianoModal, p)}
                  className={`flex items-center justify-between w-full p-3 rounded-xl border-2 transition-all ${changePianoModal.piano === p ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'}`}>
                  <span className="font-semibold capitalize text-foreground">{p}</span>
                  <span className="text-sm text-muted-foreground">€{PIANO_PREZZO[p]}/mese</span>
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => setChangePianoModal(null)}>Annulla</Button>
          </div>
        </div>
      )}
    </div>
  );
}