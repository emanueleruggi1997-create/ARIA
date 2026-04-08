import React, { useState, useRef, useEffect } from 'react';
import { CheckCheck, Archive, Trash2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';

const IgIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <radialGradient id="ig-grad2" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497" />
        <stop offset="45%" stopColor="#fd5949" />
        <stop offset="60%" stopColor="#d6249f" />
        <stop offset="90%" stopColor="#285AEB" />
      </radialGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad2)" />
    <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
    <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
  </svg>
);

const WaIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#25D366" />
    <path d="M12 4C7.58 4 4 7.58 4 12c0 1.49.41 2.88 1.13 4.07L4 20l4.1-1.08A7.94 7.94 0 0 0 12 20c4.42 0 8-3.58 8-8s-3.58-8-8-8zm3.9 11.1c-.17.47-1 .9-1.37.93-.37.04-.72.17-2.44-.51-2.05-.82-3.36-2.9-3.46-3.03-.1-.13-.8-1.07-.8-2.04 0-.97.5-1.44.68-1.64.18-.2.38-.25.51-.25.13 0 .26 0 .37.01.12 0 .28-.05.44.34.17.4.57 1.38.62 1.48.05.1.08.22.02.35-.07.13-.1.21-.2.32-.1.1-.2.23-.29.31-.1.09-.2.19-.09.37.11.18.5.82 1.07 1.33.73.65 1.35.85 1.54.94.19.09.3.08.41-.05.11-.13.47-.55.6-.73.12-.18.25-.15.42-.09.17.06 1.09.52 1.28.61.19.09.32.13.37.2.05.08.05.47-.12.94z" fill="white" />
  </svg>
);

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ieri';
  return format(d, 'd MMM', { locale: it });
}

function ConvRow({ conv, isActive, onSelect, onMarkRead, onArchive, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const hasUnread = conv.unreadCount > 0;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menuOpen]);

  return (
    <div className="relative">
      {/* Row */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
          isActive ? "bg-primary/10" : hasUnread ? "bg-secondary/40 hover:bg-secondary/60" : "hover:bg-secondary/30"
        )}
        onClick={() => { setMenuOpen(false); onSelect(conv); }}
      >
        {/* Avatar */}
        <div className={cn(
          "w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
          isActive ? "bg-primary text-white" : "bg-secondary text-foreground"
        )}>
          {(conv.nome || '?')[0].toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <p className={cn("text-[15px] truncate", hasUnread ? "font-bold text-foreground" : "font-medium text-foreground/90")}>
              {conv.nome}
            </p>
            <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(conv.lastMessageTime)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {conv.canale === 'instagram' ? <IgIcon size={13} /> : <WaIcon size={13} />}
            <p className={cn("text-[13px] truncate", hasUnread ? "text-foreground/80" : "text-muted-foreground")}>
              {conv.lastMessage || 'Nessun messaggio'}
            </p>
          </div>
        </div>

        {hasUnread && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
        )}
      </div>

      {/* Menu button — always visible */}
      <div ref={menuRef} className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
        <button
          className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
        >
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-9 w-48 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
          >
            <button
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
              onClick={e => { e.stopPropagation(); onMarkRead?.(conv); setMenuOpen(false); }}
            >
              <CheckCheck className="w-4 h-4" /> Segna come letto
            </button>
            <button
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
              onClick={e => { e.stopPropagation(); onArchive?.(conv); setMenuOpen(false); }}
            >
              <Archive className="w-4 h-4" /> Archivia
            </button>
            <button
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors border-t border-border"
              onClick={e => { e.stopPropagation(); onDelete?.(conv); setMenuOpen(false); }}
            >
              <Trash2 className="w-4 h-4" /> Elimina
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConversationList({ conversations, activeId, onSelect, onMarkRead, onArchive, onDelete, filter }) {
  const filtered = conversations.filter(c => {
    if (filter === 'archiviati') return c.archiviata;
    if (filter === 'whatsapp') return c.canale === 'whatsapp' && !c.archiviata;
    if (filter === 'instagram') return c.canale === 'instagram' && !c.archiviata;
    if (filter === 'non_letti') return c.unreadCount > 0 && !c.archiviata;
    return !c.archiviata;
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground px-4">
        <div className="text-4xl mb-3">💬</div>
        <p className="text-sm font-medium text-foreground">Nessuna conversazione ancora</p>
        <p className="text-xs mt-1">I messaggi WhatsApp e Instagram appariranno qui</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/[0.04]">
      {filtered.map(conv => (
        <ConvRow
          key={conv.contact_id}
          conv={conv}
          isActive={activeId === conv.contact_id}
          onSelect={onSelect}
          onMarkRead={onMarkRead}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}