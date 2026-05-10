/**
 * AriaHumanoid — mascotte ARIA humanoid robot premium
 * Personaggio umanoide femminile futuristico con animazioni CSS leggere.
 * Usata come fallback/principale quando non c'è un asset GLB/PNG esterno.
 */
import React, { useEffect, useState } from 'react';

export default function AriaHumanoid({ size = 160, color = '#3B6EF8', mood = 'felice', animated = true }) {
  const s = size;
  const c = color;
  // Colori derivati
  const cLight = `${c}99`;
  const cGlow  = `${c}44`;
  const cDark  = '#0A0D18';
  const skin   = '#F5C9A0';
  const skinD  = '#E8A87C';
  const hair   = '#1A0A2E';
  const hairH  = '#5B3A8C';
  const suit   = '#0D1530';
  const suitL  = '#162040';
  const white  = '#E8F4FF';

  // Pupilla animazione mood
  const eyeY = mood === 'stanco' ? '48%' : '47%';
  const eyeH = mood === 'stanco' ? '2' : mood === 'energico' ? '5' : '4';

  return (
    <svg
      width={s} height={s}
      viewBox="0 0 200 220"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: animated ? `drop-shadow(0 0 ${s * 0.08}px ${c}88) drop-shadow(0 0 ${s * 0.04}px ${c}44)` : 'none',
        animation: animated ? 'ariaHumanoidFloat 3.5s ease-in-out infinite' : 'none',
        overflow: 'visible',
        display: 'block',
      }}
    >
      <defs>
        {/* Glow gradients */}
        <radialGradient id={`gHead_${s}`} cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor={skinD} />
          <stop offset="100%" stopColor={skin} />
        </radialGradient>
        <radialGradient id={`gSuit_${s}`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor={suitL} />
          <stop offset="100%" stopColor={suit} />
        </radialGradient>
        <radialGradient id={`gEye_${s}`} cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor={white} />
          <stop offset="60%" stopColor={c} />
          <stop offset="100%" stopColor={`${c}88`} />
        </radialGradient>
        <radialGradient id={`gGlow_${s}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={`${c}55`} />
          <stop offset="100%" stopColor={`${c}00`} />
        </radialGradient>
        <linearGradient id={`gHair_${s}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={hairH} />
          <stop offset="100%" stopColor={hair} />
        </linearGradient>
        <linearGradient id={`gChest_${s}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={c} />
          <stop offset="100%" stopColor={`${c}44`} />
        </linearGradient>
        <linearGradient id={`gNeck_${s}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={skin} />
          <stop offset="50%" stopColor={skinD} />
          <stop offset="100%" stopColor={skin} />
        </linearGradient>
        <filter id={`blur_${s}`}>
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id={`glow_${s}`}>
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ── Aura glow sfondo ── */}
      <ellipse cx="100" cy="185" rx="55" ry="18" fill={cGlow} filter={`url(#blur_${s})`} opacity="0.7" />
      <ellipse cx="100" cy="110" rx="75" ry="80" fill={`url(#gGlow_${s})`} opacity="0.3" />

      {/* ── Corpo / Suit ── */}
      {/* Torso */}
      <path d="M62,135 Q60,105 68,98 L100,95 L132,98 Q140,105 138,135 Q130,150 100,153 Q70,150 62,135Z"
        fill={`url(#gSuit_${s})`} />
      {/* Collo */}
      <rect x="91" y="88" width="18" height="16" rx="4" fill={`url(#gNeck_${s})`} />
      {/* Dettaglio petto centrale — pannello luminoso */}
      <path d="M88,110 L112,110 L115,130 L85,130Z" fill={cDark} rx="4" />
      <rect x="90" y="113" width="20" height="3" rx="1.5" fill={c} opacity="0.9" />
      <rect x="92" y="119" width="16" height="2" rx="1" fill={cLight} opacity="0.6" />
      <rect x="94" y="124" width="12" height="2" rx="1" fill={cLight} opacity="0.4" />
      {/* Linee suit laterali */}
      <path d="M68,100 Q64,118 66,135" stroke={c} strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M132,100 Q136,118 134,135" stroke={c} strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Spalle */}
      <ellipse cx="63" cy="102" rx="10" ry="8" fill={suitL} />
      <ellipse cx="137" cy="102" rx="10" ry="8" fill={suitL} />
      <ellipse cx="63" cy="102" rx="6" ry="4" fill={c} opacity="0.4" />
      <ellipse cx="137" cy="102" rx="6" ry="4" fill={c} opacity="0.4" />

      {/* ── Braccia ── */}
      {/* Braccio sinistro */}
      <path d="M57,108 Q44,118 43,138 Q45,145 52,143 Q58,141 60,130 L62,115Z"
        fill={`url(#gSuit_${s})`} />
      <ellipse cx="47" cy="142" rx="6" ry="4" fill={skin} />
      {/* Braccio destro */}
      <path d="M143,108 Q156,118 157,138 Q155,145 148,143 Q142,141 140,130 L138,115Z"
        fill={`url(#gSuit_${s})`} />
      <ellipse cx="153" cy="142" rx="6" ry="4" fill={skin} />
      {/* Dettagli braccio */}
      <path d="M55,115 Q50,125 49,135" stroke={c} strokeWidth="1" fill="none" opacity="0.4" />
      <path d="M145,115 Q150,125 151,135" stroke={c} strokeWidth="1" fill="none" opacity="0.4" />

      {/* ── Testa ── */}
      <ellipse cx="100" cy="62" rx="34" ry="36" fill={`url(#gHead_${s})`} />
      {/* Ombra sotto mento */}
      <ellipse cx="100" cy="92" rx="20" ry="5" fill={`${skinD}88`} filter={`url(#blur_${s})`} />

      {/* ── Capelli ── */}
      {/* Base capelli */}
      <path d="M66,50 Q68,22 100,18 Q132,22 134,50 Q130,30 100,28 Q70,30 66,50Z"
        fill={`url(#gHair_${s})`} />
      {/* Capelli laterali */}
      <path d="M66,50 Q60,60 62,75 Q64,82 68,82 Q65,70 68,60Z" fill={hair} />
      <path d="M134,50 Q140,60 138,75 Q136,82 132,82 Q135,70 132,60Z" fill={hair} />
      {/* Ciocche frontali */}
      <path d="M78,28 Q74,38 76,48 Q78,40 82,36Z" fill={hairH} opacity="0.8" />
      <path d="M100,22 Q97,32 99,44 Q101,33 103,28Z" fill={hairH} opacity="0.6" />
      <path d="M118,30 Q122,40 120,50 Q118,42 114,38Z" fill={hairH} opacity="0.7" />
      {/* Riflesso luce capelli */}
      <path d="M82,26 Q92,20 108,24" stroke={`${hairH}`} strokeWidth="2.5" fill="none" opacity="0.5" strokeLinecap="round" />

      {/* ── Orecchie / Auricolari tech ── */}
      <ellipse cx="66" cy="64" rx="5" ry="6" fill={skin} />
      <ellipse cx="66" cy="64" rx="3" ry="3" fill={c} opacity="0.7" />
      <ellipse cx="134" cy="64" rx="5" ry="6" fill={skin} />
      <ellipse cx="134" cy="64" rx="3" ry="3" fill={c} opacity="0.7" />

      {/* ── Occhi ── */}
      {/* Occhio sinistro */}
      <ellipse cx="85" cy="65" rx="9" ry={mood === 'stanco' ? 5 : 8} fill={cDark} />
      <ellipse cx="85" cy="65" rx="7" ry={mood === 'stanco' ? 3.5 : 6} fill={`url(#gEye_${s})`} />
      <ellipse cx="85" cy="65" rx="3.5" ry={mood === 'stanco' ? 1.5 : 3} fill={cDark} />
      <circle cx="83" cy="63" r="1.2" fill={white} opacity="0.9" />
      {/* Sopracciglio sinistro */}
      <path d={mood === 'stanco' ? "M77,55 Q85,56 93,55" : mood === 'energico' ? "M77,53 Q85,56 93,55" : "M77,55 Q85,57 93,56"}
        stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Occhio destro */}
      <ellipse cx="115" cy="65" rx="9" ry={mood === 'stanco' ? 5 : 8} fill={cDark} />
      <ellipse cx="115" cy="65" rx="7" ry={mood === 'stanco' ? 3.5 : 6} fill={`url(#gEye_${s})`} />
      <ellipse cx="115" cy="65" rx="3.5" ry={mood === 'stanco' ? 1.5 : 3} fill={cDark} />
      <circle cx="113" cy="63" r="1.2" fill={white} opacity="0.9" />
      {/* Sopracciglio destro */}
      <path d={mood === 'stanco' ? "M107,55 Q115,56 123,55" : mood === 'energico' ? "M107,53 Q115,56 123,55" : "M107,55 Q115,57 123,56"}
        stroke={hair} strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* ── Naso ── */}
      <path d="M98,70 Q97,76 100,78 Q103,76 102,70" stroke={skinD} strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* ── Bocca ── */}
      <path d={mood === 'stanco' ? "M91,84 Q100,83 109,84" : mood === 'energico' ? "M91,83 Q100,87 109,83" : "M91,83 Q100,87 109,83"}
        stroke={skinD} strokeWidth="2" fill="none" strokeLinecap="round" />
      {mood !== 'stanco' && (
        <path d="M94,83 Q100,86 106,83" fill={`${skinD}66`} />
      )}

      {/* ── Dettagli tech sul viso ── */}
      {/* Piccolo punto glowing tempia */}
      <circle cx="72" cy="62" r="2" fill={c} opacity="0.8">
        {animated && <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />}
      </circle>
      <circle cx="128" cy="62" r="2" fill={c} opacity="0.6">
        {animated && <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite" />}
      </circle>

      {/* ── Circuiti/linee tech collo ── */}
      <line x1="91" y1="94" x2="85" y2="100" stroke={c} strokeWidth="0.8" opacity="0.5" />
      <line x1="109" y1="94" x2="115" y2="100" stroke={c} strokeWidth="0.8" opacity="0.5" />
      <circle cx="85" cy="100" r="1.5" fill={c} opacity="0.5" />
      <circle cx="115" cy="100" r="1.5" fill={c} opacity="0.5" />

      {/* ── Badge energico ── */}
      {mood === 'energico' && (
        <>
          <circle cx="100" cy="100" r="5" fill={c} opacity="0.9">
            <animate attributeName="r" values="5;7;5" dur="0.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="0.8s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* ── Particelle glow dinamiche ── */}
      {animated && (
        <>
          <circle cx="78" cy="40" r="1.5" fill={c} opacity="0">
            <animate attributeName="opacity" values="0;0.8;0" dur="3s" begin="0s" repeatCount="indefinite" />
            <animate attributeName="cy" values="40;30;20" dur="3s" begin="0s" repeatCount="indefinite" />
          </circle>
          <circle cx="122" cy="38" r="1" fill={c} opacity="0">
            <animate attributeName="opacity" values="0;0.6;0" dur="2.5s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="cy" values="38;28;18" dur="2.5s" begin="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="100" cy="35" r="1" fill={white} opacity="0">
            <animate attributeName="opacity" values="0;0.5;0" dur="4s" begin="0.5s" repeatCount="indefinite" />
            <animate attributeName="cy" values="35;22;10" dur="4s" begin="0.5s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      <style>{`
        @keyframes ariaHumanoidFloat {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </svg>
  );
}