import React from 'react';

const C = { surface: '#0D1525', border: '#1A2E4A', muted: '#5A7A9A', text: '#E8F4FF', wa: '#25D366' };

const WA_FILTERS = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'non_letti', label: 'Non letti' },
  { id: 'aria', label: '🤖 ARIA attiva' },
  { id: 'archiviate', label: 'Archiviate' },
  { id: 'broadcast', label: '📢 Broadcast' },
];

const IG_FILTERS = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'non_letti', label: 'Non letti' },
  { id: 'aria', label: '🤖 ARIA attiva' },
  { id: 'richieste', label: 'Richieste' },
  { id: 'archiviate', label: 'Archiviate' },
];

export default function SubFilters({ channel, activeFilter, setActiveFilter }) {
  const filters = channel === 'whatsapp' ? WA_FILTERS : IG_FILTERS;
  const activeColor = channel === 'whatsapp' ? C.wa : '#DD2A7B';

  return (
    <div style={{
      display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 14px',
      background: C.surface, borderBottom: `1px solid ${C.border}`,
      scrollbarWidth: 'none', flexShrink: 0,
    }}>
      {filters.map(f => {
        const isActive = activeFilter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20,
              border: isActive ? `1px solid ${activeColor}66` : `1px solid ${C.border}`,
              background: isActive ? `${activeColor}18` : 'transparent',
              color: isActive ? activeColor : C.muted,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}