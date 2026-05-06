import React from 'react';

const C = {
  card: '#111C30', border: '#1A2E4A', surface: '#0D1525',
  accent: '#00C6FF', accent2: '#7B2FFF', text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0',
};

const TIPI = [
  { id: 'newsletter', label: 'Newsletter', emoji: '📰' },
  { id: 'promo', label: 'Promozione', emoji: '🔥' },
  { id: 'followup', label: 'Follow-up', emoji: '🎯' },
  { id: 'reminder', label: 'Reminder', emoji: '📅' },
  { id: 'automation', label: 'Automazione', emoji: '⚡' },
];

function Field({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: C.muted }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
        width: '100%', boxSizing: 'border-box',
      }}
      onFocus={e => e.target.style.borderColor = C.accent2}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  );
}

export default function StepDetails({ form, setField, onBack, onNext }) {
  const canNext = form.nome.trim() && form.oggetto.trim() && form.mittente_email.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 4 }}>Dettagli campagna</div>
        <div style={{ fontSize: 13, color: C.muted }}>Template selezionato: <strong style={{ color: C.accent2 }}>{form.templateName}</strong></div>
      </div>

      {/* Tipo campagna */}
      <Field label="Tipo campagna">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TIPI.map(t => (
            <button key={t.id} onClick={() => setField('tipo', t.id)} style={{
              background: form.tipo === t.id ? C.accent2 + '22' : C.card,
              border: `1px solid ${form.tipo === t.id ? C.accent2 : C.border}`,
              borderRadius: 10, padding: '8px 14px',
              color: form.tipo === t.id ? C.accent2 : C.muted,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Nome campagna *" hint="Solo uso interno">
        <TextInput value={form.nome} onChange={v => setField('nome', v)} placeholder="Es: Newsletter Maggio 2025" />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Nome mittente *">
          <TextInput value={form.mittente_nome} onChange={v => setField('mittente_nome', v)} placeholder="Es: Team Emaral" />
        </Field>
        <Field label="Email mittente *">
          <TextInput type="email" value={form.mittente_email} onChange={v => setField('mittente_email', v)} placeholder="info@tuo-business.com" />
        </Field>
      </div>

      <Field label="Oggetto email *" hint="Decisivo per l'open rate — sii diretto e curioso">
        <TextInput value={form.oggetto} onChange={v => setField('oggetto', v)} placeholder="Es: Una novità esclusiva per te 🚀" />
      </Field>

      <Field label="Preview text" hint="Testo visibile nella anteprima della casella di posta">
        <TextInput value={form.preview_text} onChange={v => setField('preview_text', v)} placeholder="Es: Scopri cosa abbiamo preparato per questo mese..." />
      </Field>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onBack} style={{
          flex: 1, background: 'none', border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '11px 0', color: C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ← Indietro
        </button>
        <button onClick={onNext} disabled={!canNext} style={{
          flex: 2, background: canNext ? `linear-gradient(135deg, ${C.accent2}, ${C.accent})` : C.card,
          border: 'none', borderRadius: 10, padding: '11px 0',
          color: canNext ? '#fff' : C.muted, fontSize: 13, fontWeight: 800,
          cursor: canNext ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        }}>
          Continua → Audience
        </button>
      </div>
    </div>
  );
}