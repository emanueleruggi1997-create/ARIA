import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const C = {
  card: '#111C30', border: '#1A2E4A', surface: '#0D1525',
  accent: '#00C6FF', accent2: '#7B2FFF', text: '#E8F4FF', muted: '#5A7A9A',
  success: '#00E5A0', warning: '#FF9500',
};

const BLOCK_TYPES = [
  { type: 'heading', icon: 'H', label: 'Titolo', defaultContent: 'Il tuo titolo principale' },
  { type: 'text', icon: '¶', label: 'Testo', defaultContent: 'Il tuo testo qui. Usa [Nome] per personalizzare.' },
  { type: 'button', icon: '▶', label: 'Bottone CTA', defaultContent: 'Scopri di più', defaultUrl: '#' },
  { type: 'image', icon: '🖼', label: 'Immagine', defaultContent: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=200&fit=crop' },
  { type: 'divider', icon: '—', label: 'Separatore', defaultContent: '' },
  { type: 'social', icon: '🔗', label: 'Social links', defaultContent: '' },
  { type: 'footer', icon: '©', label: 'Footer', defaultContent: '© 2025 · Disiscriviti' },
];

function BlockPreview({ block, onEdit, onDelete, onMoveUp, onMoveDown }) {
  const [hovered, setHovered] = useState(false);

  const renderContent = () => {
    switch (block.type) {
      case 'heading':
        return <div style={{ fontSize: 22, fontWeight: 900, color: '#1a1a1a', textAlign: 'center', padding: '8px 0' }}>{block.content}</div>;
      case 'text':
        return <div style={{ fontSize: 14, color: '#333', lineHeight: 1.7, padding: '4px 0', whiteSpace: 'pre-wrap' }}>{block.content}</div>;
      case 'button':
        return (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <span style={{
              display: 'inline-block', background: '#7B2FFF', color: '#fff',
              padding: '10px 28px', borderRadius: 8, fontWeight: 700, fontSize: 14,
            }}>{block.content}</span>
          </div>
        );
      case 'image':
        return <img src={block.content} alt="" style={{ width: '100%', borderRadius: 6, display: 'block' }} />;
      case 'divider':
        return <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '8px 0' }} />;
      case 'social':
        return (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: '4px 0' }}>
            {['📘 Facebook', '📸 Instagram', '🐦 Twitter'].map(s => (
              <span key={s} style={{ fontSize: 12, color: '#666' }}>{s}</span>
            ))}
          </div>
        );
      case 'footer':
        return <div style={{ fontSize: 11, color: '#999', textAlign: 'center', padding: '4px 0' }}>{block.content}</div>;
      default:
        return null;
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', background: '#fff', borderRadius: 6,
        padding: '10px 14px', border: `2px solid ${hovered ? '#7B2FFF66' : 'transparent'}`,
        transition: 'border-color 0.15s',
      }}
    >
      {renderContent()}
      {hovered && (
        <div style={{
          position: 'absolute', top: -16, right: 4,
          display: 'flex', gap: 4, background: '#111C30', borderRadius: 8,
          padding: '4px 6px', border: `1px solid #1A2E4A`,
        }}>
          {[
            { label: '↑', action: onMoveUp },
            { label: '↓', action: onMoveDown },
            { label: '✏', action: onEdit },
            { label: '×', action: onDelete, danger: true },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action} style={{
              background: 'none', border: 'none', color: btn.danger ? '#FF3860' : '#5A7A9A',
              fontSize: 13, cursor: 'pointer', padding: '1px 4px', fontWeight: 700,
            }}>{btn.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function EditBlockModal({ block, onSave, onClose }) {
  const [content, setContent] = useState(block.content);
  const [url, setUrl] = useState(block.url || '');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, background: '#000c', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, width: '100%', maxWidth: 480 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 16 }}>Modifica blocco</div>
        {block.type === 'image' ? (
          <input
            value={content} onChange={e => setContent(e.target.value)}
            placeholder="URL immagine"
            style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        ) : block.type === 'divider' || block.type === 'social' ? (
          <div style={{ color: C.muted, fontSize: 13 }}>Nessun contenuto da modificare per questo blocco.</div>
        ) : (
          <textarea
            value={content} onChange={e => setContent(e.target.value)}
            rows={5}
            style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        )}
        {block.type === 'button' && (
          <input
            value={url} onChange={e => setUrl(e.target.value)}
            placeholder="URL del bottone (es: https://...)"
            style={{ width: '100%', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginTop: 8 }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, background: 'none', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px', color: C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Annulla</button>
          <button onClick={() => onSave({ content, url })} style={{ flex: 2, background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`, border: 'none', borderRadius: 10, padding: '10px', color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Salva</button>
        </div>
      </div>
    </div>
  );
}

export default function StepEditor({ form, setField, businessId, onBack, onNext }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [generating, setGenerating] = useState(false);

  const blocks = form.blocks || [];

  const addBlock = (type) => {
    const def = BLOCK_TYPES.find(b => b.type === type);
    const newBlock = { id: Date.now(), type, content: def.defaultContent, url: def.defaultUrl || '' };
    setField('blocks', [...blocks, newBlock]);
  };

  const deleteBlock = (idx) => {
    setField('blocks', blocks.filter((_, i) => i !== idx));
  };

  const moveBlock = (idx, dir) => {
    const arr = [...blocks];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setField('blocks', arr);
  };

  const saveBlock = (idx, { content, url }) => {
    const arr = [...blocks];
    arr[idx] = { ...arr[idx], content, url };
    setField('blocks', arr);
    setEditingIdx(null);
  };

  const handleGenerateWithARIA = async () => {
    setGenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei ARIA, assistente marketing esperta. Genera il contenuto per una campagna email di tipo "${form.tipo}" con oggetto "${form.oggetto}".
Restituisci un JSON con:
- heading: titolo principale (max 10 parole)
- intro: paragrafo di apertura (50-80 parole), usa [Nome] per personalizzare
- body: paragrafo principale con il messaggio chiave (80-120 parole)
- cta: testo del bottone di chiamata all'azione (max 5 parole)
- footer: testo footer (max 20 parole)`,
        response_json_schema: {
          type: 'object',
          properties: {
            heading: { type: 'string' },
            intro: { type: 'string' },
            body: { type: 'string' },
            cta: { type: 'string' },
            footer: { type: 'string' },
          },
          required: ['heading', 'intro', 'body', 'cta', 'footer'],
        },
        model: 'gpt_5_mini',
      });
      const generated = typeof res === 'object' ? res : {};
      const newBlocks = [
        { id: Date.now() + 1, type: 'heading', content: generated.heading || form.oggetto },
        { id: Date.now() + 2, type: 'text', content: generated.intro || '' },
        { id: Date.now() + 3, type: 'text', content: generated.body || '' },
        { id: Date.now() + 4, type: 'button', content: generated.cta || 'Scopri di più', url: '#' },
        { id: Date.now() + 5, type: 'divider', content: '' },
        { id: Date.now() + 6, type: 'footer', content: generated.footer || '© 2025 · Disiscriviti' },
      ];
      setField('blocks', newBlocks);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 4 }}>Editor Email</div>
        <div style={{ fontSize: 13, color: C.muted }}>Aggiungi blocchi o lascia che ARIA generi il contenuto automaticamente.</div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Sidebar: block types */}
        <div style={{ width: 130, flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Aggiungi blocco</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {BLOCK_TYPES.map(b => (
              <button key={b.type} onClick={() => addBlock(b.type)} style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '7px 10px', color: C.muted, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 7, transition: 'color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = C.accent2}
                onMouseLeave={e => e.currentTarget.style.color = C.muted}
              >
                <span style={{ fontSize: 13 }}>{b.icon}</span>
                <span>{b.label}</span>
              </button>
            ))}
          </div>

          <button onClick={handleGenerateWithARIA} disabled={generating} style={{
            width: '100%', marginTop: 12,
            background: generating ? C.card : `linear-gradient(135deg, ${C.accent2}44, ${C.accent}44)`,
            border: `1px solid ${C.accent2}66`, borderRadius: 8,
            padding: '9px 10px', color: generating ? C.muted : C.accent2,
            fontSize: 11, fontWeight: 800, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            textAlign: 'center',
          }}>
            {generating ? '⏳ Generando...' : '🤖 ARIA genera tutto'}
          </button>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, minHeight: 300 }}>
          <div style={{
            background: '#f5f5f5', borderRadius: 12, padding: 20,
            minHeight: 300, border: '2px dashed #ddd',
          }}>
            {blocks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#aaa' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#888', marginBottom: 6 }}>Canvas vuoto</div>
                <div style={{ fontSize: 12 }}>Aggiungi blocchi dalla sidebar oppure usa ARIA per generare il contenuto automaticamente.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {blocks.map((block, idx) => (
                  <BlockPreview
                    key={block.id}
                    block={block}
                    onEdit={() => setEditingIdx(idx)}
                    onDelete={() => deleteBlock(idx)}
                    onMoveUp={() => moveBlock(idx, -1)}
                    onMoveDown={() => moveBlock(idx, 1)}
                  />
                ))}
              </div>
            )}
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
            {blocks.length} blocchi · Clicca su un blocco per modificarlo
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{
          flex: 1, background: 'none', border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '11px 0', color: C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>← Indietro</button>
        <button onClick={onNext} style={{
          flex: 2, background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
          border: 'none', borderRadius: 10, padding: '11px 0',
          color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
        }}>Continua → Review</button>
      </div>

      {editingIdx !== null && blocks[editingIdx] && (
        <EditBlockModal
          block={blocks[editingIdx]}
          onSave={(data) => saveBlock(editingIdx, data)}
          onClose={() => setEditingIdx(null)}
        />
      )}
    </div>
  );
}