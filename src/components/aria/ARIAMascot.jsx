import React, { useState, useEffect, useRef, useCallback } from 'react';
import AriaHumanoid from './AriaHumanoid';

const LS_KEY = 'aria_mascot_pos_v3';

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

export default function ARIAMascot({ color = '#3B6EF8', mood = 'felice', name = 'ARIA', onClick, newMessageCount = 0, panelOpen = false }) {
  const [pos, setPos] = useState(null); // null = not yet initialized
  const [dragging, setDragging] = useState(false);
  const [didDrag, setDidDrag] = useState(false);
  const dragStart = useRef(null);
  const posRef = useRef(null);

  const getSize = () => window.innerWidth < 768 ? 80 : 130;

  // Initialize position after mount
  useEffect(() => {
    const sz = getSize();
    const W = window.innerWidth;
    const H = window.innerHeight;

    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY));
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number'
        && saved.x > 0 && saved.x < W - sz
        && saved.y > 0 && saved.y < H - sz) {
        const p = { x: saved.x, y: saved.y };
        setPos(p);
        posRef.current = p;
        return;
      }
    } catch (_) {}

    // Default: bottom-right
    const mobile = W < 768;
    const p = {
      x: W - sz - (mobile ? 12 : 28),
      y: H - sz - (mobile ? 90 : 28),
    };
    setPos(p);
    posRef.current = p;
  }, []);

  const savePos = useCallback((x, y) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ x, y })); } catch (_) {}
  }, []);

  // Mouse drag
  const onMouseDown = (e) => {
    if (e.button !== 0 || !pos) return;
    e.preventDefault();
    dragStart.current = { cx: e.clientX, cy: e.clientY, sx: pos.x, sy: pos.y };
    setDragging(true);
    setDidDrag(false);
  };

  useEffect(() => {
    if (!dragging) return;
    const sz = getSize();
    const onMove = (e) => {
      const dx = e.clientX - dragStart.current.cx;
      const dy = e.clientY - dragStart.current.cy;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) setDidDrag(true);
      const p = {
        x: clamp(dragStart.current.sx + dx, 4, window.innerWidth - sz - 4),
        y: clamp(dragStart.current.sy + dy, 4, window.innerHeight - sz - 4),
      };
      setPos(p);
      posRef.current = p;
    };
    const onUp = () => {
      setDragging(false);
      if (posRef.current) savePos(posRef.current.x, posRef.current.y);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, savePos]);

  // Touch drag
  const onTouchStart = (e) => {
    if (!pos) return;
    const t = e.touches[0];
    dragStart.current = { cx: t.clientX, cy: t.clientY, sx: pos.x, sy: pos.y };
    setDragging(true);
    setDidDrag(false);
  };

  useEffect(() => {
    if (!dragging) return;
    const sz = getSize();
    const onMove = (e) => {
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.cx;
      const dy = t.clientY - dragStart.current.cy;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) setDidDrag(true);
      const p = {
        x: clamp(dragStart.current.sx + dx, 4, window.innerWidth - sz - 4),
        y: clamp(dragStart.current.sy + dy, 4, window.innerHeight - sz - 4),
      };
      setPos(p);
      posRef.current = p;
      e.preventDefault();
    };
    const onEnd = () => {
      setDragging(false);
      if (posRef.current) savePos(posRef.current.x, posRef.current.y);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => { window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
  }, [dragging, savePos]);

  const handleClick = (e) => {
    if (didDrag) return;
    e.stopPropagation();
    onClick?.();
  };

  if (!pos) return null;

  const sz = getSize();
  const mobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={handleClick}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: sz,
        zIndex: 9999,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        filter: `drop-shadow(0 0 10px ${color}99)`,
        overflow: 'visible',
      }}
    >
      {/* Unread badge */}
      {newMessageCount > 0 && !panelOpen && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          minWidth: 18, height: 18, borderRadius: 9,
          background: '#EF4444', color: '#fff',
          fontSize: 10, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px', zIndex: 2,
          border: '2px solid #080A0F',
          boxShadow: '0 0 6px #EF444499',
        }}>
          {newMessageCount > 9 ? '9+' : newMessageCount}
        </div>
      )}

      <AriaHumanoid size={sz} color={color} mood={mood} animated />

      {!mobile && (
        <div style={{
          textAlign: 'center', fontSize: 10, fontWeight: 800,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color, opacity: 0.85, marginTop: -4,
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