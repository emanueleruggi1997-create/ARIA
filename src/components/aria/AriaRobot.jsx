import React, { useState, useEffect, useRef } from 'react';

/* ─── Eyes per mood ─── */
function RobotEyes({ color, mood, blink }) {
  const op = blink ? 0.08 : 1;
  const s = { transition: 'opacity 0.15s' };

  if (mood === 'stanco' || mood === 'triste') {
    return (
      <>
        <rect x="10" y="20" width="10" height="4" rx="2" fill={mood === 'triste' ? color : color} opacity={op} style={s} />
        <rect x="28" y="20" width="10" height="4" rx="2" fill={color} opacity={op} style={s} />
      </>
    );
  }
  if (mood === 'divertito') {
    // X eyes
    const xEye = (cx, cy) => (
      <>
        <line x1={cx-4} y1={cy-4} x2={cx+4} y2={cy+4} stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity={op} style={s} />
        <line x1={cx+4} y1={cy-4} x2={cx-4} y2={cy+4} stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity={op} style={s} />
      </>
    );
    return <>{xEye(15, 22)}{xEye(33, 22)}</>;
  }
  if (mood === 'arrabbiato') {
    // V-shape eyebrows + red eyes
    return (
      <>
        <circle cx="15" cy="23" r="5" fill="#EF4444" opacity={op} style={s} />
        <circle cx="33" cy="23" r="5" fill="#EF4444" opacity={op} style={s} />
        <line x1="10" y1="16" x2="20" y2="19" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="19" x2="38" y2="16" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
      </>
    );
  }
  if (mood === 'eccitato') {
    // Star eyes
    const star = (cx, cy) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? 5.5 : 2.5;
        pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
      }
      return <polygon points={pts.join(' ')} fill={color} opacity={op} style={s} />;
    };
    return <>{star(15, 22)}{star(33, 22)}</>;
  }
  if (mood === 'innamorato') {
    // Heart eyes
    const heart = (cx, cy, sz = 5) => (
      <path
        d={`M${cx},${cy+sz*0.3} C${cx},${cy-sz*0.6} ${cx-sz*1.1},${cy-sz*0.6} ${cx-sz*0.6},${cy-sz*0.1} C${cx-sz*1.1},${cy-sz*0.6} ${cx-sz*1.5},${cy+sz*0.1} ${cx},${cy+sz} C${cx+sz*1.5},${cy+sz*0.1} ${cx+sz*1.1},${cy-sz*0.6} ${cx+sz*0.6},${cy-sz*0.1} C${cx+sz*1.1},${cy-sz*0.6} ${cx},${cy-sz*0.6} ${cx},${cy+sz*0.3}Z`}
        fill="#EC4899" opacity={op} style={s}
      />
    );
    return <>{heart(15, 20)}{heart(33, 20)}</>;
  }
  if (mood === 'energico') {
    return (
      <>
        <circle cx="15" cy="22" r="5" fill={color} opacity={op} style={s} />
        <circle cx="33" cy="22" r="5" fill={color} opacity={op} style={s} />
        <circle cx="15" cy="22" r="3" fill="white" opacity={op * 0.6} style={s} />
        <circle cx="33" cy="22" r="3" fill="white" opacity={op * 0.6} style={s} />
      </>
    );
  }
  // felice / default
  return (
    <>
      <circle cx="15" cy="22" r="5" fill={color} opacity={op} style={s} />
      <circle cx="33" cy="22" r="5" fill={color} opacity={op} style={s} />
      <circle cx="13" cy="20" r="1.5" fill="white" opacity={op * 0.7} />
      <circle cx="31" cy="20" r="1.5" fill="white" opacity={op * 0.7} />
    </>
  );
}

/* ─── Mouth per mood ─── */
function RobotMouth({ color, mood }) {
  if (mood === 'triste') return <path d="M17 33 Q24 29 31 33" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />;
  if (mood === 'arrabbiato') return <path d="M17 33 Q24 29 31 33" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />;
  if (mood === 'eccitato' || mood === 'felice' || mood === 'divertito') return <path d="M17 31 Q24 36 31 31" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />;
  return <rect x="16" y="30" width="16" height="2.5" rx="1.25" fill={color} opacity="0.5" />;
}

/* ─── Particle effects ─── */
function Particles({ mood, color }) {
  const [items, setItems] = useState([]);
  const counter = useRef(0);

  const INTERVALS = { felice: 5000, divertito: 4000, triste: 6000, arrabbiato: 3000, eccitato: 2000, stanco: 4000, innamorato: 1800, energico: 2000 };
  const interval = INTERVALS[mood] || 5000;

  useEffect(() => {
    const spawn = () => {
      const id = counter.current++;
      setItems(p => [...p.slice(-6), { id, born: Date.now() }]);
      setTimeout(() => setItems(p => p.filter(x => x.id !== id)), 2400);
    };
    spawn();
    const t = setInterval(spawn, interval);
    return () => clearInterval(t);
  }, [mood, interval]);

  const renderParticle = (item, i) => {
    const x = 24 + (Math.random() * 30 - 15);
    const key = `${item.id}-${i}`;

    if (mood === 'felice') return (
      <g key={key} style={{ animation: `particleRise ${2}s ease-out forwards`, transformOrigin: `${x}px 40px` }}>
        <path d={`M${x},45 C${x},42 ${x-3},42 ${x-1.5},43.5 C${x-3},42 ${x-4.5},43 ${x},47 C${x+4.5},43 ${x+3},42 ${x+1.5},43.5 C${x+3},42 ${x},42 ${x},45Z`} fill="#EC4899" opacity="0.9" />
      </g>
    );
    if (mood === 'divertito') {
      const sx = 8 + Math.random() * 30, sy = 2 + Math.random() * 15;
      return (
        <g key={key} style={{ animation: `starBounce 1.5s ease-out forwards`, transformOrigin: `${sx}px ${sy}px` }}>
          <polygon points={`${sx},${sy-4} ${sx+1.5},${sy-1} ${sx+4},${sy-1} ${sx+2},${sy+1} ${sx+2.5},${sy+4} ${sx},${sy+2} ${sx-2.5},${sy+4} ${sx-2},${sy+1} ${sx-4},${sy-1} ${sx-1.5},${sy-1}`} fill="#F59E0B" />
        </g>
      );
    }
    if (mood === 'triste') return (
      <g key={key} style={{ animation: `tearDrop 2s ease-in forwards`, transformOrigin: `${x}px 10px` }}>
        <ellipse cx={x} cy={10} rx={2} ry={3.5} fill="#60A5FA" opacity="0.8" />
      </g>
    );
    if (mood === 'arrabbiato') return (
      <g key={key} style={{ animation: `flameUp 1.5s ease-out forwards`, transformOrigin: `${x}px 2px` }}>
        <path d={`M${x},8 C${x-2},5 ${x+1},2 ${x},0 C${x+3},2 ${x+2},5 ${x+3},7 C${x+4},4 ${x+5},5 ${x+4},8Z`} fill="#F97316" />
      </g>
    );
    if (mood === 'eccitato') {
      const colors2 = ['#3B6EF8','#EC4899','#F59E0B','#10B981','#7C3AED','#EF4444'];
      const cx2 = 8 + Math.random() * 32, cy2 = 5 + Math.random() * 60;
      return (
        <g key={key} style={{ animation: `confettiFall 2s ease-out forwards` }}>
          <rect x={cx2} y={cy2} width="3" height="5" rx="1" fill={colors2[Math.floor(Math.random() * colors2.length)]}
            transform={`rotate(${Math.random() * 60 - 30} ${cx2} ${cy2})`} opacity="0.9" />
        </g>
      );
    }
    if (mood === 'stanco') return (
      <g key={key} style={{ animation: `zzzRise 2.5s ease-out forwards`, transformOrigin: `${x}px 0px` }}>
        <text x={x} y={5} fontSize="8" fill={color} opacity="0.7" fontWeight="bold">Z</text>
        <text x={x + 5} y={0} fontSize="6" fill={color} opacity="0.5" fontWeight="bold">z</text>
      </g>
    );
    if (mood === 'innamorato') {
      const sz = 2.5 + Math.random() * 3, hx = 5 + Math.random() * 38, hy = 70 + Math.random() * 5;
      return (
        <g key={key} style={{ animation: `heartFloat ${1.8 + Math.random()}s ease-out forwards`, transformOrigin: `${hx}px ${hy}px` }}>
          <path d={`M${hx},${hy+sz*0.3} C${hx},${hy-sz*0.6} ${hx-sz*1.1},${hy-sz*0.6} ${hx-sz*0.6},${hy-sz*0.1} C${hx-sz*1.1},${hy-sz*0.6} ${hx-sz*1.5},${hy+sz*0.1} ${hx},${hy+sz} C${hx+sz*1.5},${hy+sz*0.1} ${hx+sz*1.1},${hy-sz*0.6} ${hx+sz*0.6},${hy-sz*0.1} C${hx+sz*1.1},${hy-sz*0.6} ${hx},${hy-sz*0.6} ${hx},${hy+sz*0.3}Z`}
            fill="#EC4899" opacity="0.85" />
        </g>
      );
    }
    if (mood === 'energico') {
      const bx = 5 + Math.random() * 36, by = 5 + Math.random() * 30;
      return (
        <g key={key} style={{ animation: `boltFlash 0.8s ease-out forwards`, transformOrigin: `${bx}px ${by}px` }}>
          <path d={`M${bx+3},${by} L${bx},${by+5} L${bx+2},${by+5} L${bx-1},${by+11} L${bx+5},${by+4} L${bx+3},${by+4}Z`} fill="#F59E0B" />
        </g>
      );
    }
    return null;
  };

  return (
    <g>
      {items.map((item, i) => renderParticle(item, i))}
    </g>
  );
}

/* ─── Animation CSS per mood ─── */
const MOOD_ANIM = {
  felice:     'ariaFloat 3s ease-in-out infinite',
  divertito:  'ariaWiggle 0.5s ease-in-out infinite',
  triste:     'ariaSlow 4s ease-in-out infinite',
  arrabbiato: 'ariaShake 0.15s ease-in-out infinite',
  eccitato:   'ariaJump 0.6s ease-in-out infinite',
  stanco:     'ariaDrowsy 5s ease-in-out infinite',
  innamorato: 'ariaTrembleJoy 1.2s ease-in-out infinite',
  energico:   'ariaBounce 0.4s ease-in-out infinite',
};

const CSS_KEYFRAMES = `
@keyframes ariaFloat    { 0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)} }
@keyframes ariaWiggle   { 0%,100%{transform:rotate(0deg)}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)} }
@keyframes ariaSlow     { 0%,100%{transform:translateY(0)}50%{transform:translateY(6px)} }
@keyframes ariaShake    { 0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)} }
@keyframes ariaJump     { 0%,100%{transform:translateY(0) scale(1)}40%{transform:translateY(-18px) scale(1.08)}60%{transform:translateY(-14px) scale(1.06)} }
@keyframes ariaDrowsy   { 0%,100%{transform:rotate(0deg) translateY(0)}30%{transform:rotate(-4deg) translateY(3px)}70%{transform:rotate(3deg) translateY(2px)} }
@keyframes ariaTrembleJoy{ 0%,100%{transform:scale(1) rotate(0deg)}25%{transform:scale(1.04) rotate(-2deg)}75%{transform:scale(1.04) rotate(2deg)} }
@keyframes ariaBounce   { 0%,100%{transform:translateY(0) scaleY(1)}40%{transform:translateY(-14px) scaleY(1.05)}60%{transform:translateY(-10px) scaleY(1.03)} }
@keyframes ariaAntenna  { 0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)} }
@keyframes particleRise { 0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-28px) scale(0.5);opacity:0} }
@keyframes starBounce   { 0%{transform:scale(0) rotate(0);opacity:1}50%{transform:scale(1.3) rotate(20deg);opacity:1}100%{transform:scale(0.5) rotate(40deg);opacity:0} }
@keyframes tearDrop     { 0%{transform:translateY(0);opacity:0.8}100%{transform:translateY(22px);opacity:0} }
@keyframes flameUp      { 0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(-18px) scale(0.5);opacity:0} }
@keyframes confettiFall { 0%{transform:translateY(-5px) rotate(0);opacity:1}100%{transform:translateY(18px) rotate(180deg);opacity:0} }
@keyframes zzzRise      { 0%{transform:translateY(0);opacity:0.8}100%{transform:translateY(-22px);opacity:0} }
@keyframes heartFloat   { 0%{transform:translateY(0) scale(0.8);opacity:0.9}100%{transform:translateY(-30px) scale(0.3);opacity:0} }
@keyframes boltFlash    { 0%{opacity:1;transform:scale(1)}50%{opacity:0.9;transform:scale(1.2)}100%{opacity:0;transform:scale(0.5)} }
@media (prefers-reduced-motion:reduce){
  [style*="animation"]{animation:none!important}
  .aria-robot-anim{animation:none!important}
}
`;

export default function AriaRobot({ color = '#3B6EF8', mood = 'felice', width = 100, height = 130 }) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const bodyAnim = MOOD_ANIM[mood] || MOOD_ANIM.felice;

  return (
    <>
      <style>{CSS_KEYFRAMES}</style>
      <div className="aria-robot-anim" style={{ animation: bodyAnim, display: 'inline-block' }}>
        <svg viewBox="0 0 48 80" xmlns="http://www.w3.org/2000/svg" style={{ width, height, display: 'block' }}>
          {/* Antenna */}
          <g style={{ transformOrigin: '24px 6px', animation: 'ariaAntenna 2s ease-in-out infinite' }}>
            <line x1="24" y1="8" x2="24" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="1" r="2.5" fill={color} />
          </g>
          {/* Head */}
          <rect x="6" y="8" width="36" height="26" rx="8" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
          <RobotEyes color={color} mood={mood} blink={blink} />
          <RobotMouth color={color} mood={mood} />
          {/* Body */}
          <rect x="9" y="36" width="30" height="26" rx="8" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
          <rect x="15" y="42" width="18" height="10" rx="4" fill={color} opacity="0.15" />
          <circle cx="24" cy="47" r="3" fill={color} opacity="0.4" />
          {/* Arms */}
          <rect x="0" y="37" width="8" height="18" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
          <rect x="40" y="37" width="8" height="18" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
          {/* Legs */}
          <rect x="13" y="63" width="9" height="14" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
          <rect x="26" y="63" width="9" height="14" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
          {/* Particles overlay */}
          <Particles mood={mood} color={color} />
        </svg>
      </div>
    </>
  );
}