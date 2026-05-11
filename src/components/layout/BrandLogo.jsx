import React from 'react';

/**
 * BrandLogo — gerarchia del brand prodotto
 * ARIA / AI Agent / by Emaral
 */
export default function BrandLogo({ size = 'md' }) {
  const sizes = {
    sm: { aria: 13, agent: 10, by: 9 },
    md: { aria: 15, agent: 11, by: 10 },
    lg: { aria: 20, agent: 13, by: 11 },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div style={{ lineHeight: 1 }}>
      <div style={{ fontSize: s.aria, fontWeight: 800, color: '#F0F4FF', letterSpacing: '-0.02em' }}>ARIA</div>
      <div style={{ fontSize: s.agent, fontWeight: 600, color: '#3B6EF8', letterSpacing: '0.01em' }}>AI Agent</div>
      <div style={{ fontSize: s.by, fontWeight: 400, color: '#6B7280' }}>by Emaral</div>
    </div>
  );
}