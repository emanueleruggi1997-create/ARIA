import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { MoreHorizontal, Pencil, ArrowRight, Trash2 } from 'lucide-react';

const STATI = [
  { id: 'nuovo', label: 'Nuovo' },
  { id: 'qualificato', label: 'Qualificato' },
  { id: 'preventivo_inviato', label: 'Preventivo' },
  { id: 'chiuso_vinto', label: 'Vinto' },
  { id: 'chiuso_perso', label: 'Perso' },
];

export default function LeadCard({ lead, onClick, onDelete, onMove }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setMenuOpen(v => !v);
    setShowMoveMenu(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setConfirmDelete(true);
    setMenuOpen(false);
  };

  const confirmDel = (e) => {
    e.stopPropagation();
    onDelete?.(lead.id);
    setConfirmDelete(false);
  };

  const handleMove = (e, stato) => {
    e.stopPropagation();
    onMove?.(lead, stato);
    setMenuOpen(false);
    setShowMoveMenu(false);
  };

  return (
    <div
      onClick={() => onClick(lead)}
      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/30 transition-all group relative"
    >
      {confirmDelete && (
        <div className="absolute inset-0 z-20 bg-card/95 rounded-lg flex flex-col items-center justify-center p-3 gap-2"
          onClick={e => e.stopPropagation()}>
          <p className="text-xs font-medium text-foreground text-center">Eliminare questo lead? Azione irreversibile.</p>
          <div className="flex gap-2">
            <button onClick={confirmDel} className="px-3 py-1.5 bg-destructive text-white text-xs rounded-lg font-medium">Elimina</button>
            <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }} className="px-3 py-1.5 bg-secondary text-xs rounded-lg">Annulla</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2 min-w-0">
         <p className="text-sm font-medium text-foreground truncate flex-1 min-w-0">{lead.contact_nome || 'Lead'}</p>
         <div className="flex items-center gap-1 shrink-0">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
            lead.canale === 'whatsapp' ? 'bg-green-500/10 text-green-400' : 'bg-pink-500/10 text-pink-400'
          )}>
            {lead.canale === 'whatsapp' ? 'WA' : 'IG'}
          </span>

          {/* ··· menu */}
          <div className="relative" ref={menuRef}>
            <button onClick={handleMenuClick}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-30 w-40 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                <button onClick={e => { e.stopPropagation(); onClick(lead); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors">
                  <Pencil className="w-3 h-3" /> Modifica lead
                </button>
                <button onClick={e => { e.stopPropagation(); setShowMoveMenu(v => !v); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors">
                  <ArrowRight className="w-3 h-3" /> Sposta in...
                </button>
                {showMoveMenu && (
                  <div className="border-t border-border">
                    {STATI.filter(s => s.id !== lead.stato).map(s => (
                      <button key={s.id} onClick={e => handleMove(e, s.id)}
                        className="w-full flex items-center gap-2 px-4 py-1.5 text-xs hover:bg-secondary transition-colors text-muted-foreground">
                        → {s.label}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors border-t border-border">
                  <Trash2 className="w-3 h-3" /> Elimina lead
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {lead.tipo_progetto && (
         <p className="text-xs text-muted-foreground mb-2 truncate">{lead.tipo_progetto}</p>
       )}
      <div className="flex items-center justify-between">
        {(lead.budget_min || lead.budget_max) && (
          <p className="text-xs font-medium text-primary">€{lead.budget_min || 0} — €{lead.budget_max || 0}</p>
        )}
        <p className="text-[10px] text-muted-foreground ml-auto">
          {lead.created_date ? format(new Date(lead.created_date), 'dd/MM') : ''}
        </p>
      </div>
    </div>
  );
}