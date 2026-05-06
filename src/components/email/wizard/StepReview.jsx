import React, { useState } from 'react';

const C = {
  card: '#111C30', border: '#1A2E4A', surface: '#0D1525',
  accent: '#00C6FF', accent2: '#7B2FFF', text: '#E8F4FF', muted: '#5A7A9A',
  success: '#00E5A0', warning: '#FF9500', danger: '#FF3860',
};

function CheckRow({ ok, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{ok === true ? '✅' : ok === false ? '❌' : '⚠️'}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: ok === false ? C.danger : C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>}
      </div>
    </div>
  );
}

function DevicePreview({ blocks, device }) {
  const isDesktop = device === 'desktop';
  const maxW = isDesktop ? 540 : 320;

  const renderBlock = (block) => {
    switch (block.type) {
      case 'heading':
        return <div style={{ fontSize: isDesktop ? 20 : 16, fontWeight: 900, color: '#1a1a1a', textAlign: 'center', padding: '6px 0' }}>{block.content}</div>;
      case 'text':
        return <div style={{ fontSize: isDesktop ? 13 : 12, color: '#333', lineHeight: 1.6, padding: '2px 0', whiteSpace: 'pre-wrap' }}>{block.content}</div>;
      case 'button':
        return (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <span style={{ display: 'inline-block', background: '#7B2FFF', color: '#fff', padding: isDesktop ? '10px 28px' : '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: isDesktop ? 13 : 12 }}>{block.content}</span>
          </div>
        );
      case 'image':
        return <img src={block.content} alt="" style={{ width: '100%', borderRadius: 6 }} onError={e => e.target.style.display = 'none'} />;
      case 'divider':
        return <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '6px 0' }} />;
      case 'social':
        return <div style={{ display: 'flex', justifyContent: 'center', gap: 10, fontSize: 11, color: '#999' }}>📘 📸 🐦</div>;
      case 'footer':
        return <div style={{ fontSize: 10, color: '#999', textAlign: 'center' }}>{block.content}</div>;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: maxW, background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 20px #00000044', border: '1px solid #e0e0e0' }}>
        {/* Email chrome */}
        <div style={{ background: '#f0f0f0', padding: '6px 10px', display: 'flex', gap: 4 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {blocks.length === 0 ? (
            <div style={{ color: '#ccc', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Nessun contenuto — vai all'Editor per aggiungere blocchi</div>
          ) : (
            blocks.map((b, i) => <div key={i}>{renderBlock(b)}</div>)
          )}
        </div>
      </div>
    </div>
  );
}

export default function StepReview({ form, audienceCount, onBack, onSave, saving }) {
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);

  const checks = [
    { ok: form.nome.trim().length > 0, label: 'Nome campagna', sub: form.nome || 'Mancante' },
    { ok: form.oggetto.trim().length > 0, label: 'Oggetto email', sub: form.oggetto || 'Mancante' },
    { ok: form.mittente_email.includes('@'), label: 'Mittente', sub: form.mittente_nome ? `${form.mittente_nome} <${form.mittente_email}>` : form.mittente_email },
    { ok: audienceCount > 0, label: 'Audience', sub: `${audienceCount} destinatari` },
    { ok: form.blocks.length > 0, label: 'Contenuto email', sub: `${form.blocks.length} blocchi` },
    { ok: form.preview_text.trim().length > 0, label: 'Preview text', sub: form.preview_text || 'Non impostato (consigliato)' },
  ];

  const allGood = checks.every(c => c.ok === true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 4 }}>Review finale</div>
        <div style={{ fontSize: 13, color: C.muted }}>Controlla tutto prima di inviare.</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: C.card, borderRadius: 12, padding: '0 14px', border: `1px solid ${C.border}` }}>
        {checks.map((c, i) => <CheckRow key={i} ok={c.ok} label={c.label} sub={c.sub} />)}
      </div>

      {/* Preview */}
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {['desktop', 'mobile'].map(d => (
            <button key={d} onClick={() => setPreviewDevice(d)} style={{
              background: previewDevice === d ? C.accent2 + '22' : C.card,
              border: `1px solid ${previewDevice === d ? C.accent2 : C.border}`,
              borderRadius: 8, padding: '6px 14px',
              color: previewDevice === d ? C.accent2 : C.muted,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {d === 'desktop' ? '🖥 Desktop' : '📱 Mobile'}
            </button>
          ))}
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto', background: '#e8e8e8', borderRadius: 12, padding: 16 }}>
          <DevicePreview blocks={form.blocks} device={previewDevice} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
        {showSchedule && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              style={{
                flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button onClick={() => onSave('schedulata', scheduledAt)} disabled={!scheduledAt || saving} style={{
              background: C.warning, border: 'none', borderRadius: 10, padding: '10px 18px',
              color: '#fff', fontWeight: 800, fontSize: 13, cursor: scheduledAt ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            }}>📅 Schedula</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onBack} style={{
            flex: 1, background: 'none', border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '11px 0', color: C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>← Indietro</button>

          <button onClick={() => onSave('bozza')} disabled={saving} style={{
            flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: '11px 0', color: C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>💾 Salva bozza</button>

          <button onClick={() => setShowSchedule(v => !v)} style={{
            flex: 1, background: C.warning + '22', border: `1px solid ${C.warning}66`, borderRadius: 10,
            padding: '11px 0', color: C.warning, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>📅 Schedula</button>

          <button onClick={() => onSave('bozza')} disabled={!allGood || saving} style={{
            flex: 2, background: allGood ? `linear-gradient(135deg, ${C.success}, #00a87a)` : C.card,
            border: 'none', borderRadius: 10, padding: '11px 0',
            color: allGood ? '#fff' : C.muted, fontSize: 13, fontWeight: 800,
            cursor: allGood && !saving ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
          }}>
            {saving ? '⏳ Salvataggio...' : '🚀 Conferma e Invia'}
          </button>
        </div>
      </div>
    </div>
  );
}