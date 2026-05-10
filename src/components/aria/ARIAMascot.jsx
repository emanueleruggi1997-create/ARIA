/**
 * ARIAMascot — mascotte ARIA humanoid draggable
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import AriaHumanoid from './AriaHumanoid';

const LS_KEY = 'aria_mascot_pos_v2';

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

export default function ARIAMascot({
  color = '#3B6EF8',
  mood  = 'felice',
  name  = 'ARIA',
  onClick,
  newMessageCount = 0,
  panelOpen = false,
}) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const SIZE = isMobile ? 80 : 130;

  // Posizione: lazy init dopo mount per avere window sicuro
  const [pos, setPos] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [didDrag, setDidDrag]   = useState(false);
  const dragStart = useRef(null);
  const posRef    = useRef(pos);
  posRef.current  = pos;

  // Init posizione dopo mount
  useEffect(() => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const mobile = W < 768;
    const sz = mobile ? 80 : 130;
    const bottomPad = mobile ? 90 : 28;
    const rightPad  = mobile ? 12 : 28;
    const defaultPos = {
      x: Math.max(8, W - sz - rightPad),
      y: Math.max(8, H - sz - bottomPad),
    };
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY));
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number'
          && saved.x >= 0 && saved.x <= W - sz - 4
          && saved.y >= 0 && saved.y <= H - sz - 4) {
        setPos(saved);
        return;
      }
    } catch {}
    setPos(defaultPos);
  }, []);

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
    if (!dragging || !pos) return;
    const sz = window.innerWidth < 768 ? 80 : 130;
    const onMove = (e) => {
      const dx = e.clientX - dragStart.current.clientX;
      const dy = e.clientY - dragStart.current.clientY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) setDidDrag(true);
      setPos({
        x: clamp(dragStart.current.startX + dx, 8, window.innerWidth  - sz - 8),
        y: clamp(dragStart.current.startY + dy, 8, window.innerHeight - sz - 8),
      });
    };
    const onUp = () => { setDragging(false); savePos(posRef.current.x, posRef.current.y); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, savePos]);

  // ── TOUCH drag ──
  const onTouchStart = (e) => {
    const t = e.touches[0];
    dragStart.current = { clientX: t.clientX, clientY: t.clientY, startX: pos.x, startY: pos.y };
    setDragging(true);
    setDidDrag(false);
  };

  useEffect(() => {
    if (!dragging || !pos) return;
    const sz = window.innerWidth < 768 ? 80 : 130;
    const onMove = (e) => {
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.clientX;
      const dy = t.clientY - dragStart.current.clientY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) setDidDrag(true);
      setPos({
        x: clamp(dragStart.current.startX + dx, 8, window.innerWidth  - sz - 8),
        y: clamp(dragStart.current.startY + dy, 8, window.innerHeight - sz - 8),
      });
      e.preventDefault();
    };
    const onEnd = () => { setDragging(false); savePos(posRef.current.x, posRef.current.y); };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
  }, [dragging, savePos]);

  const handleClick = (e) => {
    if (didDrag) return;
    e.stopPropagation();
    onClick?.();
  };

  // Non renderizzare finché la posizione non è pronta
  if (!pos) return null;

  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={handleClick}
      style={{
        position: 'fixed',
        left: pos.x,
        top:  pos.y,
        width: SIZE,
        zIndex: 1000,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        filter: `drop-shadow(0 0 10px ${color}88)`,
        overflow: 'visible',
      }}
    >
      {/* Badge messaggi */}
      {newMessageCount > 0 && !panelOpen && (
        <div style={{
          position: 'absolute', top: 4, right: 4,
          minWidth: 18, height: 18, borderRadius: 9,
          background: '#EF4444', color: '#fff',
          fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px', zIndex: 2,
          boxShadow: '0 0 6px #EF444466',
          border: '2px solid #0A0D14',
        }}>
          {newMessageCount > 9 ? '9+' : newMessageCount}
        </div>
      )}

      <AriaHumanoid size={SIZE} color={color} mood={mood} animated={true} />

      {/* Nome — solo desktop */}
      {!isMobile && (
        <div style={{
          textAlign: 'center', fontSize: 10, fontWeight: 800,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color, opacity: 0.8, marginTop: -6,
          fontFamily: 'Inter, sans-serif',
          textShadow: `0 0 6px ${color}66`,
          pointerEvents: 'none',
        }}>
          {name}
        </div>
      )}
    </div>
  );
}