/**
 * RobotARIA — componente robot SVG unico, usato ovunque nell'app.
 * Props:
 *   size    (number) — larghezza in px, altezza = size * 1.25
 *   color   (string) — colore hex
 *   mood    (string) — felice|divertito|triste|arrabbiato|eccitato|stanco|innamorato|energico
 *   animated (bool)  — true per animazione continua
 */
import React, { useState, useEffect } from 'react';

// Animations moved to index.css

const MOOD_ANIM = {
  felice:     'ra-float     3s   ease-in-out infinite',
  divertito:  'ra-wiggle    0.5s ease-in-out infinite',
  triste:     'ra-droop     4s   ease-in-out infinite',
  arrabbiato: 'ra-shake     0.3s ease-in-out infinite',
  eccitato:   'ra-jump      0.6s ease-in-out infinite',
  stanco:     'ra-sway      3s   ease-in-out infinite',
  innamorato: 'ra-heartbeat 1s   ease-in-out infinite',
  energico:   'ra-bounce    0.4s ease-in-out infinite',
};

/* ─── Eyes ─── */
function Eyes({ color, mood, blink }) {
  const op = blink ? 0.05 : 1;
  const tr = { transition: 'opacity 0.12s' };

  switch (mood) {
    case 'divertito':
      // ^  ^ mezzalune
      return (
        <>
          <path d="M9 21 Q13 17 17 21" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity={op} style={tr}/>
          <path d="M27 21 Q31 17 35 21" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity={op} style={tr}/>
        </>
      );
    case 'triste':
      return (
        <>
          <circle cx="13" cy="21" r="4" fill={color} opacity={op} style={tr}/>
          <circle cx="31" cy="21" r="4" fill={color} opacity={op} style={tr}/>
          {/* sopracciglia verso giù */}
          <line x1="9"  y1="14" x2="17" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={0.7}/>
          <line x1="27" y1="17" x2="35" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" opacity={0.7}/>
        </>
      );
    case 'arrabbiato':
      return (
        <>
          <circle cx="13" cy="21" r="4" fill="#EF4444" opacity={op} style={tr}/>
          <circle cx="31" cy="21" r="4" fill="#EF4444" opacity={op} style={tr}/>
          {/* sopracciglio V */}
          <line x1="9"  y1="15" x2="17" y2="17" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="27" y1="17" x2="35" y2="15" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/>
        </>
      );
    case 'eccitato': {
      // stelle a 4 punte
      const star4 = (cx, cy, r=4.5) => {
        const pts = [];
        for (let i=0; i<8; i++) {
          const a = (i*Math.PI)/4 - Math.PI/4;
          const rad = i%2===0 ? r : r*0.38;
          pts.push(`${cx+rad*Math.cos(a)},${cy+rad*Math.sin(a)}`);
        }
        return <polygon key={cx} points={pts.join(' ')} fill={color} opacity={op} style={tr}/>;
      };
      return <>{star4(13,21)}{star4(31,21)}</>;
    }
    case 'stanco':
      // rettangoli sottili quasi chiusi
      return (
        <>
          <rect x="9"  y="19" width="8" height="3.5" rx="1.75" fill={color} opacity={op} style={tr}/>
          <rect x="27" y="19" width="8" height="3.5" rx="1.75" fill={color} opacity={op} style={tr}/>
        </>
      );
    case 'innamorato': {
      // cuori
      const heart = (cx, cy, s=4) => (
        <path key={cx}
          d={`M${cx},${cy+s*0.35} C${cx},${cy-s*0.7} ${cx-s*1.1},${cy-s*0.7} ${cx-s*0.6},${cy-s*0.1} C${cx-s*1.1},${cy-s*0.7} ${cx-s*1.5},${cy+s*0.1} ${cx},${cy+s} C${cx+s*1.5},${cy+s*0.1} ${cx+s*1.1},${cy-s*0.7} ${cx+s*0.6},${cy-s*0.1} C${cx+s*1.1},${cy-s*0.7} ${cx},${cy-s*0.7} ${cx},${cy+s*0.35}Z`}
          fill="#EC4899" opacity={op} style={tr}
        />
      );
      return <>{heart(13,20)}{heart(31,20)}</>;
    }
    case 'energico':
      // cerchi con bagliore esterno
      return (
        <>
          <circle cx="13" cy="21" r="5.5" fill={color} opacity={op*0.28} style={tr}/>
          <circle cx="13" cy="21" r="4"   fill={color} opacity={op} style={tr}/>
          <circle cx="31" cy="21" r="5.5" fill={color} opacity={op*0.28} style={tr}/>
          <circle cx="31" cy="21" r="4"   fill={color} opacity={op} style={tr}/>
        </>
      );
    default: // felice
      return (
        <>
          <circle cx="13" cy="21" r="4" fill={color} opacity={op} style={tr}/>
          <circle cx="31" cy="21" r="4" fill={color} opacity={op} style={tr}/>
          {/* riflesso bianco */}
          <circle cx="11.5" cy="19.5" r="1.3" fill="white" opacity={op*0.7}/>
          <circle cx="29.5" cy="19.5" r="1.3" fill="white" opacity={op*0.7}/>
        </>
      );
  }
}

/* ─── Mouth ─── */
function Mouth({ color, mood }) {
  if (mood === 'triste' || mood === 'arrabbiato') {
    const c = mood === 'arrabbiato' ? '#EF4444' : color;
    return <path d="M15 32 Q22 28 29 32" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6"/>;
  }
  if (mood === 'stanco') {
    return <rect x="16" y="30" width="12" height="2.5" rx="1.25" fill={color} opacity="0.45"/>;
  }
  // sorriso default
  return <path d="M15 30 Q22 35 29 30" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.65"/>;
}

/* ─── Main component ─── */
export default function RobotARIA({ size = 100, color = '#3B6EF8', mood = 'felice', animated = true }) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!animated) return;
    const t = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 130);
    }, 4000);
    return () => clearInterval(t);
  }, [animated]);

  const w = size;
  const h = size * 1.25;
  const bodyAnim = animated ? (MOOD_ANIM[mood] || MOOD_ANIM.felice) : 'none';

  // SVG viewBox is 44 × 80
  return (
    <div className="ra-anim" style={{ display: 'inline-block', animation: bodyAnim }}>
      <svg
        viewBox="0 0 44 80"
        width={w}
        height={h}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* ── Antenna ── */}
        <g style={{ transformOrigin: '22px 8px', animation: animated ? 'ra-antenna 2s ease-in-out infinite' : 'none' }}>
          <line x1="22" y1="8" x2="22" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          <circle cx="22" cy="1" r="2.5" fill={color}/>
        </g>

        {/* ── Head ── */}
        <rect x="5" y="8" width="34" height="28" rx="10"
          fill={color} fillOpacity="0.18"
          stroke={color} strokeWidth="1.5"/>

        {/* Eyes */}
        <Eyes color={color} mood={mood} blink={blink}/>

        {/* Mouth */}
        <Mouth color={color} mood={mood}/>

        {/* ── Body ── */}
        <rect x="3" y="38" width="38" height="28" rx="8"
          fill={color} fillOpacity="0.13"
          stroke={color} strokeWidth="1.5"/>

        {/* body detail */}
        <rect x="13" y="44" width="18" height="10" rx="4"
          fill={color} fillOpacity="0.22"/>
        <circle cx="22" cy="49" r="3" fill={color} fillOpacity="0.45"/>

        {/* ── Arms ── */}
        <rect x="-3" y="39" width="5" height="18" rx="2.5"
          fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1"/>
        <rect x="42" y="39" width="5" height="18" rx="2.5"
          fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1"/>

        {/* ── Legs ── */}
        <rect x="10" y="67" width="9" height="12" rx="4"
          fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1"/>
        <rect x="25" y="67" width="9" height="12" rx="4"
          fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1"/>
      </svg>
    </div>
  );
}