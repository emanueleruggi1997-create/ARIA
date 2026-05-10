/**
 * ARIAMascot — mascotte ARIA humanoid draggable premium
 * Gestisce: posizione draggable (mouse + touch), localStorage, responsive, click → chat
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import AriaHumanoid from './AriaHumanoid';

const LS_KEY = 'aria_mascot_pos';

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function getInitialPos(isMobile, size) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY));
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      if (saved.x >= 0 && saved.x <= W - size - 4 && saved.y >= 0 && saved.y <= H - size - 4) {
        return { x: saved.x, y: saved.y };
      }
    }
  } catch {}
  // Default: bottom-right corner
  const bottomOffset = isMobile ? 88 : 28;
  const rightOffset  = isMobile ? 12 : 28;
  return {
    x: Math.max(8, W - size - rightOffset),
    y: Math.max(8, H - size - bottomOffset),
  };
}

export default function ARIAMascot({
  color = '#3B6EF8',
  mood  = 'felice',
  name  = 'ARIA',
  onClick,
  newMessageCount = 0,
  panelOpen = false,
}) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const size = isMobile ? 100 : 160;

  const [pos, setPos]           = useState(() => getInitialPos(isMobile, size));
  const [dragging, setDragging] = useState(false);
  const [didDrag, setDidDrag]   = useState(false);
  const [clicked, setClicked]   = useState(false);
  const [pulse, setPulse]       = useState(false);

  const dragStart  = useRef(null); // { clientX, clientY, startX, startY }
  const posRef     = useRef(pos);
  posRef.current   = pos;
  const wrapperRef = useRef(null);

  // Resize — riposiziona se esce dallo schermo
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      const sz = mobile ? 100 : 160;
      setPos(p => ({
        x: clamp(p.x, 8, window.innerWidth  - sz - 8),
        y: clamp(p.y, 8, window.innerHeight - sz - 8),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Pulse quando arriva un nuovo messaggio
  useEffect(() => {
    if (newMessageCount > 0 && !panelOpen) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1200);
      return () => clearTimeout(t);
    }
  }, [newMessageCount, panelOpen]);

  const savePos = useCallback((x, y) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ x, y })); } catch {}
  }, []);

  // ── MOUSE drag ──
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart.current = { clientX: e.clientX, clientY: e.clientY, startX: pos.x, startY: pos.y };
    setDragging(true);
    setDidDrag(false);
  };

  useEffect(() => {
    if (!dragging) return;
    const sz = isMobile ? 100 : 160;

    const onMouseMove = (e) => {
      const dx = e.clientX - dragStart.current.clientX;
      const dy = e.clientY - dragStart.current.clientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) setDidDrag(true);
      const nx = clamp(dragStart.current.startX + dx, 8, window.innerWidth  - sz - 8);
      const ny = clamp(dragStart.current.startY + dy, 8, window.innerHeight - sz - 8);
      setPos({ x: nx, y: ny });
    };

    const onMouseUp = () => {
      setDragging(false);
      savePos(posRef.current.x, posRef.current.y);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, isMobile, savePos]);

  // ── TOUCH drag ──
  const onTouchStart = (e) => {
    const t = e.touches[0];
    dragStart.current = { clientX: t.clientX, clientY: t.clientY, startX: pos.x, startY: pos.y };
    setDragging(true);
    setDidDrag(false);
  };

  useEffect(() => {
    if (!dragging) return;
    const sz = isMobile ? 100 : 160;

    const onTouchMove = (e) => {
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.clientX;
      const dy = t.clientY - dragStart.current.clientY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) setDidDrag(true);
      const nx = clamp(dragStart.current.startX + dx, 8, window.innerWidth  - sz - 8);
      const ny = clamp(dragStart.current.startY + dy, 8, window.innerHeight - sz - 8);
      setPos({ x: nx, y: ny });
      e.preventDefault();
    };

    const onTouchEnd = () => {
      setDragging(false);
      savePos(posRef.current.x, posRef.current.y);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragging, isMobile, savePos]);

  const handleClick = (e) => {
    if (didDrag) return; // era un drag, non un click
    e.stopPropagation();
    setClicked(true);
    setTimeout(() => setClicked(false), 400);
    onClick?.();
  };

  const glowColor = color;

  return (
    <div
      ref={wrapperRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={handleClick}
      style={{
        position: 'fixed',
        left: pos.x,
        top:  pos.y,
        width:  size,
        zIndex: 1000,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        transition: dragging ? 'none' : 'filter 0.3s, transform 0.15s',
        filter: pulse
          ? `drop-shadow(0 0 16px ${glowColor}) drop-shadow(0 0 32px ${glowColor}88)`
          : `drop-shadow(0 0 8px ${glowColor}66)`,
        transform: clicked ? 'scale(1.08)' : 'scale(1)',
        overflow: 'visible',
      }}
    >
      {/* Badge messaggi non letti */}
      {newMessageCount > 0 && !panelOpen && (
        <div style={{
          position: 'absolute',
          top: 6, right: 6,
          minWidth: 20, height: 20,
          borderRadius: 10,
          background: '#EF4444',
          color: '#fff',
          fontSize: 11, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 5px',
          zIndex: 2,
          boxShadow: '0 0 8px #EF444466',
          border: '2px solid #0A0D14',
        }}>
          {newMessageCount > 9 ? '9+' : newMessageCount}
        </div>
      )}

      {/* Mascotte humanoid */}
      <AriaHumanoid
        size={size}
        color={color}
        mood={mood}
        animated={true}
      />

      {/* Label nome — solo desktop */}
      {!isMobile && (
        <div style={{
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: glowColor,
          opacity: 0.85,
          marginTop: -8,
          fontFamily: 'Inter, sans-serif',
          textShadow: `0 0 8px ${glowColor}66`,
          pointerEvents: 'none',
        }}>
          {name}
        </div>
      )}

      <style>{`
        @keyframes ariaMascotPulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>
    </div>
  );
}