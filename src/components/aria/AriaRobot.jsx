import React, { useState, useEffect } from 'react';

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
  return (
    <>
      <circle cx="15" cy="22" r="5" fill={color} opacity={blink ? 0.1 : 1} style={{ transition: 'opacity 0.15s' }} />
      <circle cx="33" cy="22" r="5" fill={color} opacity={blink ? 0.1 : 1} style={{ transition: 'opacity 0.15s' }} />
    </>
  );
}

export default function AriaRobot({ color = '#3B6EF8', mood = 'felice', width = 100, height = 130 }) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
        @keyframes ariaIdle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes ariaAntennaWave {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        .aria-robot-idle { animation: ariaIdle 3s ease-in-out infinite; }
        .aria-antenna { transform-origin: 24px 6px; animation: ariaAntennaWave 2s ease-in-out infinite; }
      `}</style>
      <div className="aria-robot-idle">
        <svg
          viewBox="0 0 48 80"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width, height, display: 'block' }}
        >
          <g className="aria-antenna">
            <line x1="24" y1="8" x2="24" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="1" r="2.5" fill={color} />
          </g>
          <rect x="6" y="8" width="36" height="26" rx="8" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
          <RobotEyes color={color} mood={mood} blink={blink} />
          <rect x="16" y="29" width="16" height="2.5" rx="1.25" fill={color} opacity="0.5" />
          <rect x="9" y="36" width="30" height="26" rx="8" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
          <rect x="15" y="42" width="18" height="10" rx="4" fill={color} opacity="0.15" />
          <circle cx="24" cy="47" r="3" fill={color} opacity="0.4" />
          <rect x="0" y="37" width="8" height="18" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
          <rect x="40" y="37" width="8" height="18" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
          <rect x="13" y="63" width="9" height="14" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
          <rect x="26" y="63" width="9" height="14" rx="4" fill="#1A1F2E" stroke={color} strokeWidth="1.5" />
        </svg>
      </div>
    </>
  );
}