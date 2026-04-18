import React, { useState } from 'react';
import { Eye } from 'lucide-react';

const C = {
  bg: '#070B14', card: '#111C30', border: '#1A2E4A',
  accent: '#00C6FF', accent2: '#7B2FFF', text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0',
};

const TEMPLATES_IT = [
  {
    category: 'Benvenuto / Welcome',
    templates: [
      { id: 'w1', name: 'Benvenuto nella famiglia Emaral', color: '#FF6B9D' },
      { id: 'w2', name: 'Grazie per esserti iscritto', color: '#FF6B9D' },
      { id: 'w3', name: 'Il tuo account è pronto', color: '#FF6B9D' },
    ],
  },
  {
    category: 'Nurturing',
    templates: [
      { id: 'n1', name: '3 modi per far crescere il tuo business', color: '#00D9FF' },
      { id: 'n2', name: 'Come altri come te hanno risolto X', color: '#00D9FF' },
      { id: 'n3', name: 'Tip della settimana da ARIA', color: '#00D9FF' },
    ],
  },
  {
    category: 'Promozione',
    templates: [
      { id: 'p1', name: 'Offerta esclusiva per te', color: '#FFD700' },
      { id: 'p2', name: 'Ultimi posti disponibili', color: '#FFD700' },
      { id: 'p3', name: 'Scade domani — non perdere', color: '#FFD700' },
    ],
  },
  {
    category: 'Follow-up',
    templates: [
      { id: 'f1', name: 'Ti ho pensato — come stai?', color: '#00E5A0' },
      { id: 'f2', name: 'Hai domande? Sono qui', color: '#00E5A0' },
      { id: 'f3', name: 'Pronto a fare il passo successivo?', color: '#00E5A0' },
    ],
  },
  {
    category: 'Newsletter Settimanale',
    templates: [
      { id: 'nl1', name: 'Le novità di questa settimana', color: '#7B2FFF' },
      { id: 'nl2', name: 'Il recap di [settimana]', color: '#7B2FFF' },
      { id: 'nl3', name: 'Cosa abbiamo imparato questa settimana', color: '#7B2FFF' },
    ],
  },
];

const TEMPLATES_EN = [
  {
    category: 'Welcome',
    templates: [
      { id: 'w1', name: 'Welcome to the Emaral family', color: '#FF6B9D' },
      { id: 'w2', name: 'Thanks for subscribing', color: '#FF6B9D' },
      { id: 'w3', name: 'Your account is ready', color: '#FF6B9D' },
    ],
  },
  {
    category: 'Nurturing',
    templates: [
      { id: 'n1', name: '3 ways to grow your business', color: '#00D9FF' },
      { id: 'n2', name: 'How others like you solved X', color: '#00D9FF' },
      { id: 'n3', name: 'Weekly tip from ARIA', color: '#00D9FF' },
    ],
  },
  {
    category: 'Promotion',
    templates: [
      { id: 'p1', name: 'Exclusive offer for you', color: '#FFD700' },
      { id: 'p2', name: 'Limited spots available', color: '#FFD700' },
      { id: 'p3', name: 'Expires tomorrow — don\'t miss out', color: '#FFD700' },
    ],
  },
  {
    category: 'Follow-up',
    templates: [
      { id: 'f1', name: 'Been thinking of you — how are you?', color: '#00E5A0' },
      { id: 'f2', name: 'Questions? I\'m here', color: '#00E5A0' },
      { id: 'f3', name: 'Ready to take the next step?', color: '#00E5A0' },
    ],
  },
  {
    category: 'Weekly Newsletter',
    templates: [
      { id: 'nl1', name: 'This week\'s news', color: '#7B2FFF' },
      { id: 'nl2', name: 'Recap of [week]', color: '#7B2FFF' },
      { id: 'nl3', name: 'What we learned this week', color: '#7B2FFF' },
    ],
  },
];

function TemplateCard({ template, onUse, onPreview }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      overflow: 'hidden', transition: 'all 0.2s',
    }}>
      {/* Color header */}
      <div style={{
        height: 3, background: template.color,
      }} />

      <div style={{ padding: 12 }}>
        {/* Title */}
        <div style={{
          fontSize: 13, fontWeight: 700, color: C.text,
          marginBottom: 8, minHeight: 36,
        }}>
          {template.name}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onUse(template)} style={{
            flex: 1, background: `${C.accent2}22`, border: `1px solid ${C.accent2}44`,
            borderRadius: 8, padding: '7px 10px', color: C.accent2,
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {window.location.href.includes('en') ? 'Use template' : 'Usa template'}
          </button>
          <button onClick={() => onPreview(template)} style={{
            flex: 1, background: `${C.muted}22`, border: `1px solid ${C.muted}44`,
            borderRadius: 8, padding: '7px 10px', color: C.muted,
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>
            <Eye size={10} /> Preview
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmailTemplateLibrary({ lang = 'en', onSelectTemplate }) {
  const TEMPLATES = lang === 'en' ? TEMPLATES_EN : TEMPLATES_IT;
  const [previewTemplate, setPreviewTemplate] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {TEMPLATES.map((cat, catIdx) => (
        <div key={catIdx}>
          <div style={{
            fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 12,
            paddingBottom: 8, borderBottom: `1px solid ${C.border}`,
          }}>
            {cat.category}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
          }}>
            {cat.templates.map(tmpl => (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
                onUse={onSelectTemplate}
                onPreview={setPreviewTemplate}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Preview Modal */}
      {previewTemplate && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: '#000000cc', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: C.card, borderRadius: 16, padding: 24,
            maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto',
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
                {previewTemplate.name}
              </div>
              <button onClick={() => setPreviewTemplate(null)} style={{
                background: 'none', border: 'none', color: C.muted,
                fontSize: 20, cursor: 'pointer', padding: 0,
              }}>
                ×
              </button>
            </div>

            {/* Mock preview */}
            <div style={{
              background: '#fff', color: '#333', padding: 20, borderRadius: 8,
              lineHeight: 1.6, fontSize: 13, marginBottom: 16,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Caro {'{{nome}},'.replace(/{/g, '{').replace(/}/g, '}')}</div>
              <p>Contenuto del template {previewTemplate.name}</p>
              <p>Puoi personalizzare questo template con le seguenti variabili:</p>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                <li>{'{{nome}}'}</li>
                <li>{'{{azienda}}'}</li>
                <li>{'{{data}}'}</li>
                <li>{'{{offerta}}'}</li>
              </ul>
            </div>

            <button onClick={() => {
              onSelectTemplate(previewTemplate);
              setPreviewTemplate(null);
            }} style={{
              width: '100%', background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
              border: 'none', borderRadius: 8, padding: 10,
              color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {lang === 'en' ? 'Use this template' : 'Usa questo template'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}