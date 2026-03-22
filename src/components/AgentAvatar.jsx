import React from 'react';

export const AVATAR_COLORS = [
  { id: '#3B6EF8', label: 'Blu' },
  { id: '#7C3AED', label: 'Viola' },
  { id: '#10B981', label: 'Verde' },
  { id: '#F59E0B', label: 'Arancio' },
  { id: '#EC4899', label: 'Rosa' },
  { id: '#14B8A6', label: 'Teal' },
];

export default function AgentAvatar({ nome, color = '#3B6EF8', size = 'md' }) {
  const letter = (nome || 'A')[0].toUpperCase();
  const sizeMap = {
    sm: { circle: 28, font: 12 },
    md: { circle: 36, font: 15 },
    lg: { circle: 48, font: 20 },
    xl: { circle: 64, font: 26 },
  };
  const s = sizeMap[size] || sizeMap.md;

  return (
    <div
      style={{
        width: s.circle, height: s.circle, borderRadius: '50%',
        background: color, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}
    >
      <span style={{ color: '#fff', fontWeight: 700, fontSize: s.font, lineHeight: 1 }}>
        {letter}
      </span>
    </div>
  );
}