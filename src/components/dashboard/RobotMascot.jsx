import React, { useState, useEffect, useRef, useCallback } from 'react';
import RobotChat from './RobotChat';

const COLORS = [
  { id: '#3B6EF8', label: 'Blu' },
  { id: '#10B981', label: 'Verde' },
  { id: '#7C3AED', label: 'Viola' },
  { id: '#EC4899', label: 'Rosa' },
  { id: '#F59E0B', label: 'Arancio' },
  { id: '#14B8A6', label: 'Teal' },
];

const MOODS = [
  { id: 'felice', label: '😊 Felice' },
  { id: 'stanco', label: '😴 Stanco' },
  { id: 'energia', label: '⚡ Energia' },
];

function loadPrefs() {
  try {
    const raw = localStorage.getItem('robot_prefs');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePrefs(prefs) {
  try { localStorage.setItem('robot_prefs', JSON.stringify(prefs)); } catch {}
}

function RobotEyes({ color, mood, blink }) {
  if (mood === 'stanco') {
    return (
      <>
        <rect x="10" y="19" width="10" height="5" rx="2" fill={color} opacity={blink ? 0.1 : 1} style={{ transition: 'opacity 0.15s' }} />
        <rect x="28" y="19" width="10" height="5" rx="2" fill={color} opacity={blink ? 0.1 : 1} style={{ transition: 'opacity 0.15s' }} />
      </>
    );
  }
  if (mood === 'energia') {
    const starPath = (cx, cy, r = 5) => {
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 - Math.PI / 2;
        const radius = i % 2 === 0 ? r : r * 0.45;
        pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
      }
      return `M ${pts.join(' L ')} Z`;
    };
    return (
      <>
        <path d={starPath(15, 22)} fill={color} opacity={blink ? 0.1 : 1} style={{ transition: 'opacity 0.15s' }} />
        <path d={starPath(33, 22)} fill={color} opacity={blink ? 0.1 : 1} style={{ transition: 'opacity 0.15s' }} />
      </>
    );
  }
  // Felice — default round
  return (
    <>
      <circle cx="15" cy="22" r="5" fill={color} opacity={blink ? 0.1 : 1} style={{ transition: 'opacity 0.15s' }} />
      <circle cx="33" cy="22" r="5" fill={color} opacity={blink ? 0.1 : 1} style={{ transition: 'opacity 0.15s' }} />
    </>
  );
}

export default function RobotMascot({ newMessageCount = 0, aiResponseCount = 0 }) {
  const prefs = loadPrefs();
  const [name, setName] = useState(prefs?.name || 'ARIA');
  const [color, setColor] = useState(prefs?.color || '#3B6EF8');
  const [mood, setMood] = useState(prefs?.mood || 'felice');
  const [panelOpen, setPanelOpen] = useState(false);
  const [blink, setBlink] = useState(false);
  const [specialAnim, setSpecialAnim] = useState(null); // 'jump' | 'spin'
  const [clicked, setClicked] = useState(false);
  const panelRef = useRef(null);
  const robotRef = useRef(null);
  const prevMsgCount = useRef(newMessageCount);
  const prevAiCount = useRef(aiResponseCount);

  // Blink every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // New message → jump animation
  useEffect(() => {
    if (newMessageCount > prevMsgCount.current) {
      setSpecialAnim('jump');
      setTimeout(() => setSpecialAnim(null), 1000);
    }
    prevMsgCount.current = newMessageCount;
  }, [newMessageCount]);

  // AI response → spin animation
  useEffect(() => {
    if (aiResponseCount > prevAiCount.current) {
      setSpecialAnim('spin');
      setTimeout(() => setSpecialAnim(null), 600);
    }
    prevAiCount.current = aiResponseCount;
  }, [aiResponseCount]);

  // Click outside to close panel
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          robotRef.current && !robotRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 400);
    setPanelOpen(p => !p);
  };

  const updatePrefs = (updates) => {
    const next = { name, color, mood, ...updates };
    if (updates.name !== undefined) setName(updates.name);
    if (updates.color !== undefined) setColor(updates.color);
    if (updates.mood !== undefined) setMood(updates.mood);
    savePrefs(next);
  };

  const robotAnimClass = specialAnim === 'jump'
    ? 'robot-jump'
    : specialAnim === 'spin'
    ? 'robot-spin'
    : 'robot-idle';

  return (
    <>
      <style>{`
        @keyframes robotIdle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes antennaWave {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes robotJump {
          0% { transform: translateY(0px) scale(1); }
          20% { transform: translateY(-20px) scale(1.15); }
          40% { transform: translateY(-10px) scale(1.1); }
          60% { transform: translateY(-18px) scale(1.12); }
          80% { transform: translateY(-4px) scale(1.05); }
          100% { transform: translateY(0px) scale(1); }
        }
        @keyframes robotSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes robotClick {
          0% { transform: scale(1); }
          30% { transform: scale(1.2); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .robot-idle { animation: robotIdle 3s ease-in-out infinite; }
        .robot-jump { animation: robotJump 1s ease-in-out; }
        .robot-spin { animation: robotSpin 0.5s linear; }
        .robot-click { animation: robotClick 0.4s ease-in-out; }
        .robot-wrapper {
          opacity: 0.75;
          transition: opacity 0.3s ease, transform 0.3s ease;
          cursor: pointer;
        }
        .robot-wrapper:hover {
          opacity: 1;
          transform: scale(1.05);
        }
        .robot-head-hover:hover .robot-head {
          transform: rotate(-3deg);
          transition: transform 0.3s ease;
        }
        .antenna-anim {
          transform-origin: 24px 6px;
          animation: antennaWave 2s ease-in-out infinite;
        }
        .robot-panel {
          animation: fadeInUp 0.2s ease-out;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ position: 'fixed', bottom: 90, right: 24, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>

        {/* Config Panel */}
        {panelOpen && (
          <div ref={panelRef} className="robot-panel" style={{
            background: '#0F1219',
            border: `1px solid ${color}4D`,
            borderRadius: 12,
            padding: 16,
            width: 200,
            marginBottom: 8,
            boxShadow: `0 0 20px ${color}22`,
          }}>
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button onClick={() => setPanelOpen(false)} style={{ color: '#6B7280', fontSize: 16, lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#6B7280', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Nome</label>
              <input
                value={name}
                onChange={e => updatePrefs({ name: e.target.value })}
                maxLength={12}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#1A1F2E', border: '1px solid #2A2F3E',
                  borderRadius: 6, padding: '5px 8px',
                  color: '#F0F4FF', fontSize: 12, outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>

            {/* Color */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#6B7280', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Colore</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button key={c.id} onClick={() => updatePrefs({ color: c.id })}
                    title={c.label}
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: c.id, border: color === c.id ? '2px solid white' : '2px solid transparent',
                      cursor: 'pointer', transition: 'transform 0.2s',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Mood */}
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#6B7280', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Umore</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {MOODS.map(m => (
                  <button key={m.id} onClick={() => updatePrefs({ mood: m.id })}
                    style={{
                      background: mood === m.id ? `${color}22` : 'transparent',
                      border: `1px solid ${mood === m.id ? color : '#2A2F3E'}`,
                      borderRadius: 6, padding: '4px 8px',
                      color: mood === m.id ? '#F0F4FF' : '#6B7280',
                      fontSize: 11, cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Robot */}
        <div
          ref={robotRef}
          className={`robot-wrapper ${clicked ? 'robot-click' : ''}`}
          onClick={handleClick}
        >
          <div className={robotAnimClass}>
            <svg
              viewBox="0 0 48 80"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                width: 'clamp(60px, 8vw, 80px)',
                height: 'clamp(75px, 10vw, 100px)',
                display: 'block',
              }}
            >
              {/* Antenna */}
              <g className="antenna-anim">
                <line x1="24" y1="8" x2="24" y2="2" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <circle cx="24" cy="2" r="2.5" fill={color} />
              </g>

              {/* Head */}
              <rect x="6" y="8" width="36" height="26" rx="8" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />

              {/* Eyes */}
              <RobotEyes color={color} mood={mood} blink={blink} />

              {/* Mouth */}
              <rect x="16" y="29" width="16" height="2.5" rx="1.25" fill={color} opacity="0.5" />

              {/* Body */}
              <rect x="9" y="36" width="30" height="26" rx="8" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />

              {/* Body detail */}
              <rect x="15" y="42" width="18" height="10" rx="4" fill={color} opacity="0.15" />
              <circle cx="24" cy="47" r="3" fill={color} opacity="0.4" />

              {/* Left arm */}
              <rect x="0" y="37" width="8" height="18" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />

              {/* Right arm */}
              <rect x="40" y="37" width="8" height="18" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />

              {/* Left leg */}
              <rect x="13" y="63" width="9" height="14" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />

              {/* Right leg */}
              <rect x="26" y="63" width="9" height="14" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Name label */}
        {name && (
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color,
            opacity: 0.8,
            fontFamily: 'Inter, sans-serif',
            marginTop: 2,
          }}>
            {name}
          </div>
        )}
      </div>
    </>
  );
}