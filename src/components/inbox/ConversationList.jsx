import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, MoreHorizontal, CheckCheck, Archive, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function ConversationList({ conversations, activeId, onSelect, onMarkRead, onArchive, onDelete, filter }) {
  const [menuId, setMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = conversations.filter(c => {
    if (filter === 'whatsapp') return c.canale === 'whatsapp';
    if (filter === 'instagram') return c.canale === 'instagram';
    if (filter === 'non_letti') return c.unreadCount > 0;
    if (filter === 'archiviati') return c.archiviata;
    return !c.archiviata;
  });

  return (
    <div className="space-y-0.5">
      {filtered.length > 0 ? filtered.map(conv => (
        <div key={conv.contact_id} className="group relative">
          <button
            onClick={() => onSelect(conv)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
              activeId === conv.contact_id ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/80"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-foreground">
                {(conv.nome || '?')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground truncate">{conv.nome}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {conv.lastMessageTime ? format(new Date(conv.lastMessageTime), 'HH:mm') : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0",
                  conv.canale === 'whatsapp' ? 'bg-green-500/10 text-green-400' : 'bg-pink-500/10 text-pink-400'
                )}>
                  {conv.canale === 'whatsapp' ? 'WA' : 'IG'}
                </span>
                <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
              </div>
              {conv.lastResponder && (
                <span className="text-[10px] text-muted-foreground">
                  {conv.lastResponder === 'assistant' ? '🤖 AI' : conv.lastResponder === 'human' ? '👤 Umano' : ''}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {conv.unreadCount > 0 && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">{conv.unreadCount}</span>
                </div>
              )}
            </div>
          </button>

          {/* ··· menu */}
          <div ref={menuRef} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={e => { e.stopPropagation(); setMenuId(menuId === conv.contact_id ? null : conv.contact_id); }}
              className="w-6 h-6 rounded flex items-center justify-center bg-secondary border border-border hover:border-primary/30">
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            {menuId === conv.contact_id && (
              <div className="absolute right-0 top-7 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20">
                <button onClick={() => { onMarkRead?.(conv); setMenuId(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors">
                  <CheckCheck className="w-3 h-3" /> Segna come letto
                </button>
                <button onClick={() => { onArchive?.(conv); setMenuId(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors">
                  <Archive className="w-3 h-3" /> Archivia
                </button>
                <button onClick={() => { onDelete?.(conv); setMenuId(null); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors border-t border-border">
                  <Trash2 className="w-3 h-3" /> Elimina
                </button>
              </div>
            )}
          </div>
        </div>
      )) : (
        <div className="text-center py-16 text-muted-foreground px-4">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-sm font-medium text-foreground">Nessuna conversazione ancora</p>
          <p className="text-xs mt-1">I messaggi WhatsApp e Instagram appariranno qui</p>
        </div>
      )}
    </div>
  );
}