import React, { useState, useRef, useEffect } from 'react';
import { CheckCheck, Archive, Trash2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';

const IgIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497" />
        <stop offset="5%" stopColor="#fdf497" />
        <stop offset="45%" stopColor="#fd5949" />
        <stop offset="60%" stopColor="#d6249f" />
        <stop offset="90%" stopColor="#285AEB" />
      </radialGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)" />
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

export default function ConversationList({ conversations, activeId, onSelect, onMarkRead, onArchive, onDelete, filter }) {
  const [menuId, setMenuId] = useState(null);
  const [swipeId, setSwipeId] = useState(null);
  const menuRef = useRef(null);
  const touchStartX = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = conversations.filter(c => {
    if (filter === 'archiviati') return c.archiviata;
    if (filter === 'whatsapp') return c.canale === 'whatsapp' && !c.archiviata;
    if (filter === 'instagram') return c.canale === 'instagram' && !c.archiviata;
    if (filter === 'non_letti') return c.unreadCount > 0 && !c.archiviata;
    return !c.archiviata;
  });

  const handleTouchStart = (e, id) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e, id) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) setSwipeId(id);
    else if (diff < -20) setSwipeId(null);
    touchStartX.current = null;
  };

  return (
    <div className="space-y-0">
      {filtered.length > 0 ? filtered.map((conv, idx) => {
        const isActive = activeId === conv.contact_id;
        const hasUnread = conv.unreadCount > 0;
        const isSwiped = swipeId === conv.contact_id;

        return (
          <div
            key={conv.contact_id}
            className="relative overflow-hidden"
            onTouchStart={e => handleTouchStart(e, conv.contact_id)}
            onTouchEnd={e => handleTouchEnd(e, conv.contact_id)}
          >
            {/* Swipe delete background */}
            <div
              className={cn(
                "absolute inset-y-0 right-0 w-20 bg-destructive flex items-center justify-center transition-opacity duration-200",
                isSwiped ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              onClick={() => { onDelete?.(conv); setSwipeId(null); }}
            >
              <Trash2 className="w-5 h-5 text-white" />
            </div>

            {/* Main row */}
            <div
              className={cn(
                "relative transition-transform duration-200 group",
                isSwiped ? "-translate-x-20" : "translate-x-0"
              )}
            >
              <button
                onClick={() => { setSwipeId(null); onSelect(conv); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  isActive ? "bg-primary/10" : hasUnread ? "bg-secondary/40 hover:bg-secondary/60" : "hover:bg-secondary/30"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold",
                  isActive ? "bg-primary text-white" : "bg-secondary text-foreground"
                )}>
                  {(conv.nome || '?')[0].toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={cn(
                      "text-[15px] truncate",
                      hasUnread ? "font-bold text-foreground" : "font-medium text-foreground/90"
                    )}>
                      {conv.nome}
                    </p>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {formatTime(conv.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {conv.canale === 'instagram' ? <IgIcon size={13} /> : <WaIcon size={13} />}
                    <p className={cn(
                      "text-[13px] truncate",
                      hasUnread ? "text-foreground/80" : "text-muted-foreground"
                    )}>
                      {conv.lastMessage || 'Nessun messaggio'}
                    </p>
                  </div>
                </div>

                {/* Right indicators */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  {hasUnread && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              </button>

              {/* Context menu — always rendered, visible on hover */}
              <div ref={menuRef} className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={e => { e.stopPropagation(); setMenuId(menuId === conv.contact_id ? null : conv.contact_id); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary/80 hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  style={{ opacity: menuId === conv.contact_id ? 1 : undefined }}
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {menuId === conv.contact_id && (
                  <div className="absolute right-0 top-8 w-44 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20">
                    <button onClick={() => { onMarkRead?.(conv); setMenuId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary transition-colors">
                      <CheckCheck className="w-3.5 h-3.5" /> Segna come letto
                    </button>
                    <button onClick={() => { onArchive?.(conv); setMenuId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-secondary transition-colors">
                      <Archive className="w-3.5 h-3.5" /> Archivia
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDelete?.(conv); setMenuId(null); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-destructive/10 text-destructive transition-colors border-t border-border">
                      <Trash2 className="w-3.5 h-3.5" /> Elimina
                    </button>
                  </div>
                )}
              </div>

              {/* Separator */}
              {idx < filtered.length - 1 && (
                <div className="absolute bottom-0 left-16 right-0 h-px bg-white/[0.04]" />
              )}
            </div>
          </div>
        );
      }) : (
        <div className="text-center py-16 text-muted-foreground px-4">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-sm font-medium text-foreground">Nessuna conversazione ancora</p>
          <p className="text-xs mt-1">I messaggi WhatsApp e Instagram appariranno qui</p>
        </div>
      )}
    </div>
  );
}