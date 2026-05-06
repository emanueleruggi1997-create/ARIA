import React from 'react';

const C = {
  card: '#111C30', border: '#1A2E4A', surface: '#0D1525',
  accent: '#00C6FF', accent2: '#7B2FFF', text: '#E8F4FF', muted: '#5A7A9A',
  success: '#00E5A0', warning: '#FF9500', danger: '#FF3860',
};

const SEGMENTS = [
  { id: 'tutti', label: 'Tutti i contatti attivi', desc: 'Intera lista email qualificata', icon: '👥' },
  { id: 'instagram', label: 'Lead Instagram', desc: 'Solo contatti raccolti da DM IG', icon: '📸' },
  { id: 'whatsapp', label: 'Lead WhatsApp', desc: 'Solo contatti raccolti da WA', icon: '💬' },
  { id: 'manuale', label: 'Aggiunti manualmente', desc: 'Contatti inseriti direttamente', icon: '✏️' },
  { id: 'csv', label: 'Importati da CSV', desc: 'Lista caricata via CSV', icon: '📊' },
];

export default function StepAudience({ form, setField, validContacts, allContacts, getAudienceCount, onBack, onNext }) {
  const totalContacts = allContacts.length;
  const withEmail = allContacts.filter(c => c.email?.includes('@')).length;
  const withoutEmail = totalContacts - withEmail;
  const active = validContacts.length;
  const unsubscribed = allContacts.filter(c => c.stato === 'disiscritto').length;
  const audienceCount = getAudienceCount();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 4 }}>Scegli l'Audience</div>
        <div style={{ fontSize: 13, color: C.muted }}>Solo contatti con email valida vengono inclusi.</div>
      </div>

      {/* Audience breakdown */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12,
      }}>
        {[
          { label: 'Totale contatti', val: totalContacts, color: C.muted },
          { label: 'Con email valida', val: withEmail, color: C.accent },
          { label: 'Attivi', val: active, color: C.success },
          { label: 'Disiscritti', val: unsubscribed, color: C.danger },
          { label: 'Senza email', val: withoutEmail, color: C.warning, note: 'esclusi' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center', background: '#0D1525', borderRadius: 10, padding: '10px 8px' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: C.muted }}>{s.label}</div>
            {s.note && <div style={{ fontSize: 9, color: C.warning, fontStyle: 'italic' }}>{s.note}</div>}
          </div>
        ))}
      </div>

      {/* Segment selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Segmento destinatari</div>
        {SEGMENTS.map(seg => {
          const count = seg.id === 'tutti'
            ? validContacts.length
            : validContacts.filter(c => c.fonte === seg.id).length;
          const isSelected = form.destinatari_tag === seg.id;
          return (
            <div
              key={seg.id}
              onClick={() => setField('destinatari_tag', seg.id)}
              style={{
                background: isSelected ? C.accent2 + '15' : C.card,
                border: `2px solid ${isSelected ? C.accent2 : C.border}`,
                borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 20 }}>{seg.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{seg.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{seg.desc}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: isSelected ? C.accent2 : C.muted }}>{count}</div>
                <div style={{ fontSize: 10, color: C.muted }}>destinatari</div>
              </div>
              {isSelected && (
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', background: C.accent2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#fff', fontWeight: 800, flexShrink: 0,
                }}>✓</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Final count */}
      <div style={{
        background: `linear-gradient(135deg, ${C.accent2}22, ${C.accent}11)`,
        border: `2px solid ${C.accent2}44`, borderRadius: 14, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 36 }}>📬</div>
        <div>
          <div style={{ fontSize: 14, color: C.muted, fontWeight: 700 }}>Questa campagna raggiungerà</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: C.accent2, letterSpacing: -1 }}>
            {audienceCount} <span style={{ fontSize: 16, color: C.muted, fontWeight: 400 }}>persone</span>
          </div>
        </div>
      </div>

      {audienceCount === 0 && (
        <div style={{ background: C.warning + '15', border: `1px solid ${C.warning}44`, borderRadius: 10, padding: 12, fontSize: 13, color: C.warning }}>
          ⚠️ Nessun destinatario per questo segmento. Torna alla Mailing List e aggiungi contatti con email valida.
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{
          flex: 1, background: 'none', border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '11px 0', color: C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>← Indietro</button>
        <button onClick={onNext} style={{
          flex: 2, background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
          border: 'none', borderRadius: 10, padding: '11px 0',
          color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
        }}>Continua → Editor</button>
      </div>
    </div>
  );
}