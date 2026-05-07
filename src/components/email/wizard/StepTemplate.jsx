import React, { useState } from 'react';

const C = {
  card: '#111C30', border: '#1A2E4A', surface: '#0D1525',
  accent: '#00C6FF', accent2: '#7B2FFF', accent3: '#FF3CAC',
  text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0',
};

const TEMPLATES = [
  {
    id: 'newsletter',
    name: 'Newsletter Settimanale',
    desc: 'Aggiornamenti e novità per la tua lista',
    goal: 'Brand awareness & retention',
    color: C.accent2,
    emoji: '📰',
    defaultOggetto: 'Le novità di questa settimana 🗞️',
    defaultBody: `Ciao {{nome}},\n\nEccoci con gli aggiornamenti di questa settimana.\n\n[Blocco testo principale]\n\nA presto,\n{{nome_azienda}}`,
    suggestedDay: 'Martedì ore 10:00',
  },
  {
    id: 'benvenuto',
    name: 'Benvenuto',
    desc: 'Email automatica al primo contatto',
    goal: 'Onboarding & first impression',
    color: C.success,
    emoji: '👋',
    defaultOggetto: 'Benvenuto/a, {{nome}}! 👋',
    defaultBody: `Ciao {{nome}},\n\nSiamo felici di averti con noi.\n\nEcco cosa puoi aspettarti:\n- [Punto 1]\n- [Punto 2]\n- [Punto 3]\n\nPer qualsiasi domanda siamo qui.\n\n{{nome_azienda}}`,
    suggestedDay: 'Automatico al primo contatto',
  },
  {
    id: 'offerta',
    name: 'Offerta Speciale',
    desc: 'Promozione esclusiva per i tuoi contatti',
    goal: 'Conversione immediata',
    color: '#FFD700',
    emoji: '🔥',
    defaultOggetto: '{{nome}}, questa offerta è solo per te 🔥',
    defaultBody: `Ciao {{nome}},\n\nAbbiamo riservato qualcosa di speciale per te.\n\n[Descrizione offerta]\n\n⏰ Valido fino al [data]\n\n[Bottone CTA]\n\n{{nome_azienda}}`,
    suggestedDay: 'Giovedì ore 14:00',
  },
];

const FONTS = ['Arial', 'Georgia', 'Helvetica', 'Times New Roman'];
const BG_PRESETS = [
  { label: 'Bianco', value: '#ffffff' },
  { label: 'Nero', value: '#0a0a0a' },
  { label: 'Grigio scuro', value: '#1a1a2e' },
  { label: 'Blu scuro', value: '#0f172a' },
  { label: 'Beige', value: '#faf7f2' },
];

function EmailPreview({ template, style }) {
  const isDark = style.bgColor.replace('#', '').length === 6
    ? parseInt(style.bgColor.replace('#', '').substring(0, 2), 16) < 128
    : false;
  const textColor = isDark ? '#f0f0f0' : '#1a1a1a';
  const mutedColor = isDark ? '#aaaaaa' : '#666666';

  return (
    <div style={{
      background: style.bgColor, borderRadius: 8, overflow: 'hidden',
      fontFamily: style.font, fontSize: 11, lineHeight: 1.5,
      border: '1px solid #e0e0e0', minHeight: 180,
    }}>
      {style.showLogo && (
        <div style={{ background: style.accentColor + '22', padding: '8px 12px', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ width: 60, height: 16, background: style.accentColor + '44', borderRadius: 4 }} />
        </div>
      )}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: style.accentColor, marginBottom: 8 }}>
          {template.defaultOggetto.replace('{{nome}}', 'Mario').replace('{{nome_azienda}}', 'Business')}
        </div>
        <div style={{ fontSize: 10, color: textColor, lineHeight: 1.6, marginBottom: 10, whiteSpace: 'pre-wrap' }}>
          {template.defaultBody
            .replace('{{nome}}', 'Mario')
            .replace('{{nome_azienda}}', 'Business')
            .split('\n').slice(0, 5).join('\n')}
          {'\n...'}
        </div>
        <div style={{
          display: 'inline-block', background: style.accentColor,
          color: '#fff', padding: '5px 12px', borderRadius: 6,
          fontSize: 10, fontWeight: 700,
        }}>
          Scopri di più →
        </div>
      </div>
      <div style={{ padding: '6px 14px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 9, color: mutedColor }}>© Business 2025 · Disiscriviti</div>
      </div>
    </div>
  );
}

export default function StepTemplate({ selected, emailStyle, onSelect, onStyleChange }) {
  const [activeId, setActiveId] = useState(selected || null);
  const style = emailStyle || { bgColor: '#ffffff', textColor: '#1a1a1a', accentColor: '#7B2FFF', font: 'Arial', showLogo: false };

  const handleSelect = (tmpl) => {
    setActiveId(tmpl.id);
    onSelect(tmpl, style);
  };

  const updateStyle = (key, val) => {
    const newStyle = { ...style, [key]: val };
    onStyleChange(newStyle);
    if (activeId) {
      const tmpl = TEMPLATES.find(t => t.id === activeId);
      if (tmpl) onSelect(tmpl, newStyle);
    }
  };

  const selectedTemplate = TEMPLATES.find(t => t.id === activeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 4 }}>Scegli template</div>
        <div style={{ fontSize: 13, color: C.muted }}>Seleziona un template e personalizza colori e font.</div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Template grid */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TEMPLATES.map(tmpl => {
            const isSelected = activeId === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => handleSelect(tmpl)}
                style={{
                  background: C.card, borderRadius: 14,
                  border: `2px solid ${isSelected ? tmpl.color : C.border}`,
                  padding: 14, cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: isSelected ? `0 0 16px ${tmpl.color}44` : 'none',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                  background: tmpl.color + '22', border: `1px solid ${tmpl.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>{tmpl.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{tmpl.name}</div>
                    {isSelected && <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: tmpl.color, borderRadius: 20, padding: '2px 7px' }}>✓ SELEZIONATO</div>}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>{tmpl.desc}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: tmpl.color, background: tmpl.color + '15', borderRadius: 6, padding: '2px 7px', display: 'inline-block' }}>
                    🎯 {tmpl.goal}
                  </div>
                </div>
                {/* Mini preview */}
                <div style={{ width: 100, flexShrink: 0, pointerEvents: 'none' }}>
                  <EmailPreview template={tmpl} style={style} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Style panel */}
        <div style={{
          width: 220, flexShrink: 0,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16,
          display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'flex-start',
          position: 'sticky', top: 0,
        }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>🎨 Personalizza</div>

          {/* BG Color */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Sfondo email</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {BG_PRESETS.map(p => (
                <button key={p.value} onClick={() => updateStyle('bgColor', p.value)} title={p.label} style={{
                  width: 24, height: 24, borderRadius: '50%', background: p.value,
                  border: `2px solid ${style.bgColor === p.value ? C.accent : '#333'}`,
                  cursor: 'pointer', outline: 'none',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={style.bgColor} onChange={e => updateStyle('bgColor', e.target.value)}
                style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
              <span style={{ fontSize: 11, color: C.muted }}>Custom</span>
            </div>
          </div>

          {/* Accent color */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Colore accent</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="color" value={style.accentColor} onChange={e => updateStyle('accentColor', e.target.value)}
                style={{ width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }} />
              <span style={{ fontSize: 11, color: style.accentColor, fontWeight: 700 }}>{style.accentColor}</span>
            </div>
          </div>

          {/* Font */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Font</div>
            <select value={style.font} onChange={e => updateStyle('font', e.target.value)} style={{
              width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: '7px 10px', color: C.text, fontSize: 12, fontFamily: 'inherit', outline: 'none',
            }}>
              {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
            </select>
          </div>

          {/* Logo toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Header con logo</div>
            </div>
            <button onClick={() => updateStyle('showLogo', !style.showLogo)} style={{
              width: 36, height: 20, borderRadius: 20,
              background: style.showLogo ? C.accent2 : C.border,
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: style.showLogo ? 19 : 3,
                transition: 'left 0.2s',
              }} />
            </button>
          </div>

          {/* Live preview */}
          {selectedTemplate && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Preview live</div>
              <EmailPreview template={selectedTemplate} style={style} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}