import React, { useState, useRef, useEffect } from 'react';
import { CheckCheck, Archive, Trash2, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';

const C = {
  ig: "#E1306C",
  wa: "#25D366",
  accent2: "#7B2FFF",
  accent: "#00C6FF",
  border: "#1A2E4A",
  card: "#111C30",
  text: "#E8F4FF",
  muted: "#5A7A9A",
  danger: "#FF3860",
};

const IgIcon = ({ size = 10, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="5.5" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="2"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill={color}/>
  </svg>
);

const WaIcon = ({ size = 10, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.413A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm4.93 13.643c-.207.583-1.215 1.114-1.664 1.176-.45.063-.863.088-2.776-.579-2.34-.82-3.83-3.22-3.945-3.368-.113-.147-.927-1.232-.927-2.35s.586-1.666.794-1.895c.208-.229.454-.286.605-.286.152 0 .303.001.436.008.14.007.327-.053.512.39.19.454.644 1.572.7 1.686.057.114.095.247.019.397-.076.15-.114.243-.227.374-.113.132-.238.294-.34.395-.113.113-.23.235-.099.46.132.227.585.965 1.257 1.563.863.767 1.59 1.004 1.817 1.117.227.113.36.094.492-.057.133-.15.569-.664.72-.893.152-.228.303-.19.511-.114.208.076 1.32.623 1.547.737.227.113.378.17.434.265.057.094.057.54-.15 1.124z"/>
  </svg>
);

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ieri';
  return format(d, 'd MMM', { locale: it });
}

function Avatar({ nome, canale, size = 44 }) {
  const letter = (nome || 'S').replace('@', '').replace('IG_', '')[0]?.toUpperCase() || '?';
  const isIg = canale === 'instagram';
  const bgColor = isIg ? `${C.ig}33` : `${C.wa}33`;
  const borderColor = isIg ? `${C.ig}55` : `${C.wa}55`;
  const badgeBg = isIg ? C.ig : C.wa;
  const Icon = isIg ? IgIcon : WaIcon;
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: bgColor, border: `2px solid ${borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: size * 0.38, color: C.text,
      }}>{letter}</div>
      <div style={{
        position: 'absolute', bottom: -2, right: -2,
        background: badgeBg, borderRadius: '50%',
        width: 17, height: 17, display: 'flex', alignItems: 'center',
        justifyContent: 'center', border: `2px solid #070B14`,
      }}>
        <Icon size={9} color="#fff" />
      </div>
    </div>
  );
}

function ConvRow({ conv, isActive, onSelect, onMarkRead, onArchive, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const hasUnread = conv.unreadCount > 0;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menuOpen]);

  return (
    <div className="relative" style={{ borderBottom: `1px solid ${C.border}` }}>
      {/* Row */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 13, padding: '13px 48px 13px 16px',
          cursor: 'pointer', background: isActive ? `${C.accent2}12` : hasUnread ? `${C.accent}08` : 'transparent',
          transition: 'background 0.15s',
        }}
        onClick={() => { setMenuOpen(false); onSelect(conv); }}
      >
        <Avatar nome={conv.nome} canale={conv.canale} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
            <p style={{ fontSize: 14, fontWeight: hasUnread ? 800 : 600, color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: -0.3 }}>
              {conv.nome || 'Sconosciuto'}
            </p>
            <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{formatTime(conv.lastMessageTime)}</span>
          </div>
          <p style={{
            fontSize: 12, color: hasUnread ? `${C.text}cc` : C.muted,
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontWeight: hasUnread ? 500 : 400,
          }}>
            {conv.lastMessage || 'Nessun messaggio'}
          </p>
        </div>

        {hasUnread && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.danger, boxShadow: `0 0 6px ${C.danger}`, flexShrink: 0 }} />
        )}
      </div>

      {/* Menu button */}
      <div ref={menuRef} className="absolute right-2 top-1/2 -translate-y-1/2 z-20">
        <button
          style={{ width: 32, height: 32, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
        >
          <MoreHorizontal style={{ width: 14, height: 14, color: C.muted }} />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-9 w-48 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
          >
            <button className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
              onClick={e => { e.stopPropagation(); onMarkRead?.(conv); setMenuOpen(false); }}>
              <CheckCheck className="w-4 h-4" /> Segna come letto
            </button>
            <button className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-secondary transition-colors"
              onClick={e => { e.stopPropagation(); onArchive?.(conv); setMenuOpen(false); }}>
              <Archive className="w-4 h-4" /> Archivia
            </button>
            <button className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors border-t border-border"
              onClick={e => { e.stopPropagation(); onDelete?.(conv); setMenuOpen(false); }}>
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