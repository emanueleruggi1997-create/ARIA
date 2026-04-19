import React from 'react';
import { X, UserPlus } from 'lucide-react';

const C = {
  bg: '#04080F', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  text: '#E8F4FF', muted: '#5A7A9A', wa: '#25D366', ig: '#DD2A7B',
  accent2: '#7000FF', success: '#00E5A0', danger: '#FF3860',
};

export default function ContactInfoPanel({ contact, onClose }) {
  if (!contact) return null;

  const canale = contact.canale;
  const srcColor = canale === 'instagram' ? C.ig : C.wa;
  const letter = (contact.nome || '?').replace('@','').replace('IG_','').replace('WA_','')[0]?.toUpperCase() || '?';

  const statusColor = { lead: C.wa, cliente: C.success, perso: C.danger, inattivo: C.muted };

  return (
    <div style={{
      width: 300, height: '100%', background: C.surface, borderLeft: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Info contatto</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, display: 'flex' }}>
          <X size={16} />
        </button>
      </div>

      {/* Profile */}
      <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: canale === 'instagram' ? 'linear-gradient(135deg,#F5852933,#DD2A7B33)' : `${C.wa}22`, border: `3px solid ${srcColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 28, color: C.text }}>
          {letter}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>{contact.nome}</div>
          {contact.numero && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{contact.numero}</div>}
          <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: `${srcColor}18`, border: `1px solid ${srcColor}44`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: srcColor }}>
            {canale === 'instagram' ? '📸 Instagram' : '💬 WhatsApp'}
          </div>
        </div>
      </div>

      {/* CRM Status */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>STATO CRM</div>
        {contact.stato ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${statusColor[contact.stato] || C.muted}18`, border: `1px solid ${statusColor[contact.stato] || C.muted}44`, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: statusColor[contact.stato] || C.muted }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor[contact.stato] || C.muted }} />
            {contact.stato.charAt(0).toUpperCase() + contact.stato.slice(1)}
          </div>
        ) : (
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: `${C.accent2}18`, border: `1px solid ${C.accent2}44`, color: C.accent2, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <UserPlus size={14} /> Aggiungi al CRM
          </button>
        )}
      </div>

      {/* ARIA summary */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>RIEPILOGO ARIA</div>
        <div style={{ background: `${C.accent2}11`, border: `1px solid ${C.accent2}33`, borderRadius: 10, padding: '10px 12px', fontSize: 12, color: C.text, lineHeight: 1.6 }}>
          🤖 ARIA ha gestito le conversazioni con questo contatto.
          {contact.ai_disabled && (
            <div style={{ marginTop: 6, color: '#facc15', fontSize: 11 }}>⚠ ARIA attualmente in pausa per questo contatto</div>
          )}
        </div>
      </div>

      {/* Notes */}
      {contact.note && (
        <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>NOTE</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{contact.note}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
        <button style={{ width: '100%', padding: '10px', borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>🔕 Silenzia</button>
        <button style={{ width: '100%', padding: '10px', borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>📦 Archivia</button>
        <button style={{ width: '100%', padding: '10px', borderRadius: 10, background: `${C.danger}12`, border: `1px solid ${C.danger}33`, color: C.danger, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>🚫 Blocca</button>
      </div>
    </div>
  );
}