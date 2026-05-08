import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';
import { MoreHorizontal, Archive, Trash2, CheckCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const C = {
  bg: '#04080F', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  text: '#E8F4FF', muted: '#5A7A9A', wa: '#25D366', ig: '#DD2A7B',
  accent2: '#7000FF', danger: '#FF3860', success: '#00E5A0',
};

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ieri';
  return format(d, 'd MMM', { locale: it });
}

function Avatar({ nome, canale, size = 48 }) {
  const letter = (nome || '?').replace('@', '').replace('IG_', '').replace('WA_', '')[0]?.toUpperCase() || '?';
  const isIg = canale === 'instagram';
  const color = isIg ? C.ig : C.wa;
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: isIg
          ? 'linear-gradient(135deg,#F5852933,#DD2A7B33,#8134AF33)'
          : `${C.wa}22`,
        border: `2px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: size * 0.38, color: C.text,
      }}>{letter}</div>
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 12, height: 12, borderRadius: '50%',
        background: C.success, border: `2px solid ${C.surface}`,
        boxShadow: `0 0 6px ${C.success}`,
      }} />
    </div>
  );
}

const ConvRow = memo(function ConvRow({ conv, isActive, onSelect, onArchive, onDelete, onMarkRead, onToggleAI }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const hasUnread = conv.unreadCount > 0;
  const ariaActive = !conv.ai_disabled;

  const handleToggleAI = useCallback(async (e) => {
    e.stopPropagation();
    const newDisabled = !conv.ai_disabled;
    if (conv.contact_id) {
      await base44.entities.Contact.update(conv.contact_id, { ai_disabled: newDisabled });
    }
    onToggleAI?.(conv, newDisabled);
  }, [conv, onToggleAI]);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, [menuOpen]);

  const isManualConv = conv.ai_disabled && (!conv.numero || conv.numero === '');
  const previewText = conv.lastMessage || (isManualConv ? '⏳ In attesa di risposta...' : 'Nessun messaggio');

  return (
    <div style={{ position: 'relative', borderBottom: `1px solid ${C.border}` }}>
      <div
        onClick={() => onSelect(conv)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '13px 48px 13px 14px',
          cursor: 'pointer',
          background: isActive ? `${C.accent2}14` : hasUnread ? `${C.text}04` : 'transparent',
          transition: 'background 0.1s',
          willChange: 'background-color',
        }}
      >
        <Avatar nome={conv.nome} canale={conv.canale} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: hasUnread ? 900 : 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {conv.nome || 'Sconosciuto'}
            </span>
            <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{formatTime(conv.lastMessageTime)}</span>
          </div>
          {isManualConv && (
              <div style={{ marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, background: `${C.danger}22`, color: C.danger, border: `1px solid ${C.danger}40`, letterSpacing: 0.5 }}>
                  🔴 MANUALE · ARIA DISATTIVATA
                </span>
              </div>
            )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 12, color: hasUnread ? `${C.text}cc` : C.muted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              fontWeight: hasUnread ? 600 : 400,
            }}>
              {previewText}
            </span>
            <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
              {/* Quick AI toggle */}
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={handleToggleAI}
                title={ariaActive ? 'ARIA ON — clicca per modalità manuale' : 'MANUALE — clicca per riattivare ARIA'}
                style={{
                  padding: '2px 6px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
                  background: ariaActive ? `${C.accent2}22` : `${C.danger}22`,
                  color: ariaActive ? C.accent2 : C.danger,
                  transition: 'all 0.2s',
                }}
              >
                {ariaActive ? '🤖 AUTO' : '🔴 MAN'}
              </button>
              {hasUnread && (
                <span style={{
                  background: conv.canale === 'whatsapp' ? C.wa : C.ig,
                  color: '#fff', borderRadius: '50%', width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800,
                }}>{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu button */}
      <div ref={menuRef} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
        <button
          style={{ width: 30, height: 30, borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
        >
          <MoreHorizontal style={{ width: 14, height: 14, color: C.muted }} />
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', right: 0, top: 34, width: 180, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: '0 8px 32px #00000088', overflow: 'hidden', zIndex: 50 }}>
            <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', color: C.text, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={e => { e.stopPropagation(); onMarkRead?.(conv); setMenuOpen(false); }}>
              <CheckCheck size={14} /> Segna come letto
            </button>
            <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', color: C.text, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={e => { e.stopPropagation(); onArchive?.(conv); setMenuOpen(false); }}>
              <Archive size={14} /> Archivia
            </button>
            <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', borderTop: `1px solid ${C.border}`, color: C.danger, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={e => { e.stopPropagation(); onDelete?.(conv); setMenuOpen(false); }}>
              <Trash2 size={14} /> Elimina
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default ConvRow;