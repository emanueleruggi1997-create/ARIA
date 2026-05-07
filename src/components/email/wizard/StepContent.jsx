import React, { useRef } from 'react';

const C = {
  card: '#111C30', border: '#1A2E4A', surface: '#0D1525',
  accent: '#00C6FF', accent2: '#7B2FFF', text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0',
};

const VARS = ['{{nome}}', '{{nome_azienda}}', '{{data}}', '{{anno}}', '{{data_scadenza}}'];

export default function StepContent({ form, setField, onBack, onNext }) {
  const bodyRef = useRef(null);
  const canNext = form.oggetto.trim() && form.body.trim();

  const insertVar = (varText) => {
    const el = bodyRef.current;
    if (!el) {
      setField('body', (form.body || '') + varText);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newVal = (form.body || '').substring(0, start) + varText + (form.body || '').substring(end);
    setField('body', newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + varText.length, start + varText.length);
    }, 10);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 4 }}>Contenuto</div>
        <div style={{ fontSize: 13, color: C.muted }}>Scrivi il testo della tua email.</div>
      </div>

      {/* Oggetto */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>Oggetto email *</div>
        <input
          value={form.oggetto}
          onChange={e => setField('oggetto', e.target.value)}
          placeholder="Es: Le novità di questa settimana 🗞️"
          style={{
            width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit',
            outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = C.accent2}
          onBlur={e => e.target.style.borderColor = C.border}
        />
      </div>

      {/* Body */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Corpo email *</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {VARS.map(v => (
              <button key={v} onClick={() => insertVar(v)} style={{
                background: C.accent2 + '22', border: `1px solid ${C.accent2}44`,
                borderRadius: 6, padding: '3px 8px',
                color: C.accent2, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <textarea
          ref={bodyRef}
          value={form.body}
          onChange={e => setField('body', e.target.value)}
          rows={10}
          placeholder="Ciao {{nome}},&#10;&#10;Scrivi qui il tuo messaggio..."
          style={{
            width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '12px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit',
            outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
          }}
          onFocus={e => e.target.style.borderColor = C.accent2}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
          💡 Clicca sulle variabili sopra per inserirle nel punto del cursore
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onBack} style={{
          flex: 1, background: 'none', border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '11px 0', color: C.muted, fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          ← Indietro
        </button>
        <button onClick={onNext} disabled={!canNext} style={{
          flex: 2,
          background: canNext ? `linear-gradient(135deg, ${C.accent2}, ${C.accent})` : C.card,
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