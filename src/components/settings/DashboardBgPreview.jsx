import React from 'react';

// Renders a mini background preview for each dashboard bg type
export default function DashboardBgPreview({ type, accent, bgUrl, absolute = false }) {
  const style = {
    position: absolute ? 'absolute' : 'relative',
    inset: absolute ? 0 : undefined,
    width: absolute ? undefined : '100%',
    height: absolute ? undefined : '100%',
    overflow: 'hidden',
    pointerEvents: 'none',
  };

  const bg = renderBg(type, accent, bgUrl);

  return <div style={style}>{bg}</div>;
}

function renderBg(type, accent, bgUrl) {
  const dim = `${accent}22`;
  const mid = `${accent}44`;

  switch (type) {
    case 'nebula':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id={`nb-${accent.slice(1)}`} cx="15%" cy="20%" r="60%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`nb2-${accent.slice(1)}`} cx="85%" cy="80%" r="50%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.2" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="200" height="100" fill={`url(#nb-${accent.slice(1)})`} />
          <rect width="200" height="100" fill={`url(#nb2-${accent.slice(1)})`} />
        </svg>
      );

    case 'grid':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id={`grid-${accent.slice(1)}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={accent} strokeWidth="0.4" strokeOpacity="0.25" />
            </pattern>
          </defs>
          <rect width="200" height="100" fill={`url(#grid-${accent.slice(1)})`} />
        </svg>
      );

    case 'dots':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id={`dots-${accent.slice(1)}`} width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="7" cy="7" r="1" fill={accent} fillOpacity="0.2" />
            </pattern>
          </defs>
          <rect width="200" height="100" fill={`url(#dots-${accent.slice(1)})`} />
        </svg>
      );

    case 'waves':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice">
          <path d="M-20 80 Q 30 60 80 75 Q 130 90 180 70 Q 200 60 220 70 L 220 110 L -20 110 Z" fill={accent} fillOpacity="0.1" />
          <path d="M-20 90 Q 40 75 90 85 Q 140 95 190 80 L 220 80 L 220 110 L -20 110 Z" fill={accent} fillOpacity="0.07" />
        </svg>
      );

    case 'circuits':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice">
          <g stroke={accent} strokeWidth="0.5" strokeOpacity="0.18" fill="none">
            <line x1="0" y1="20" x2="60" y2="20" /><line x1="60" y1="20" x2="60" y2="50" />
            <line x1="60" y1="50" x2="120" y2="50" /><line x1="120" y1="50" x2="120" y2="80" />
            <line x1="120" y1="80" x2="200" y2="80" />
            <line x1="20" y1="0" x2="20" y2="40" /><line x1="20" y1="40" x2="90" y2="40" />
            <line x1="90" y1="40" x2="90" y2="70" /><line x1="90" y1="70" x2="160" y2="70" />
            <line x1="160" y1="70" x2="160" y2="100" />
            <circle cx="60" cy="20" r="2" fill={accent} fillOpacity="0.3" stroke="none" />
            <circle cx="60" cy="50" r="2" fill={accent} fillOpacity="0.3" stroke="none" />
            <circle cx="120" cy="50" r="2" fill={accent} fillOpacity="0.3" stroke="none" />
            <circle cx="120" cy="80" r="2" fill={accent} fillOpacity="0.3" stroke="none" />
            <circle cx="20" cy="40" r="2" fill={accent} fillOpacity="0.3" stroke="none" />
            <circle cx="90" cy="40" r="2" fill={accent} fillOpacity="0.3" stroke="none" />
            <circle cx="90" cy="70" r="2" fill={accent} fillOpacity="0.3" stroke="none" />
          </g>
        </svg>
      );

    case 'aurora':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id={`aurora-${accent.slice(1)}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
              <stop offset="40%" stopColor="#7C3AED" stopOpacity="0.2" />
              <stop offset="70%" stopColor="#10B981" stopOpacity="0.15" />
              <stop offset="100%" stopColor={accent} stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <ellipse cx="100" cy="-10" rx="120" ry="50" fill={`url(#aurora-${accent.slice(1)})`} />
          <ellipse cx="100" cy="-5" rx="90" ry="35" fill={accent} fillOpacity="0.08" />
        </svg>
      );

    case 'geometric':
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice">
          <g fill={accent} fillOpacity="0.07" stroke={accent} strokeWidth="0.4" strokeOpacity="0.15">
            <polygon points="10,5 30,5 40,22 20,22" />
            <polygon points="150,10 170,10 180,28 160,28" />
            <polygon points="80,60 100,60 110,78 90,78" />
            <polygon points="40,70 52,60 52,80" />
            <polygon points="160,55 172,45 172,65" />
          </g>
          <g fill="none" stroke={accent} strokeWidth="0.3" strokeOpacity="0.1">
            <polygon points="0,0 50,0 25,43" />
            <polygon points="180,100 200,60 200,100" />
          </g>
        </svg>
      );

    case 'custom-img':
      if (bgUrl) return (
        <img src={bgUrl} alt="bg" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
      );
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 10 }}>
          + Carica immagine
        </div>
      );

    default: // pure
      return null;
  }
}