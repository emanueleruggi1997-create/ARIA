import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import AriaChatCore from '@/components/aria/AriaChatCore';
import ARIAMascot from '@/components/aria/ARIAMascot';

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
  { id: 'energico', label: '⚡ Energico' },
];

export default function RobotMascot({ newMessageCount = 0, aiResponseCount = 0, business, activeLeads = 0, scheduledPosts = 0, lastLead = null }) {
  const navigate = useNavigate();
  const [name, setName] = useState('ARIA');
  const [color, setColor] = useState('#3B6EF8');
  const [mood, setMood] = useState('felice');
  const [saved, setSaved] = useState(false);

  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [expanded, setExpanded] = useState(false);
  const [specialAnim, setSpecialAnim] = useState(null);
  const [clicked, setClicked] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [proactiveBubble, setProactiveBubble] = useState(null);

  const panelRef = useRef(null);
  const robotRef = useRef(null);
  const prevMsgCount = useRef(newMessageCount);
  const prevAiCount = useRef(aiResponseCount);

  // Load prefs from DB
  useEffect(() => {
    if (!business?.id) return;
    setName(business.aria_name || business.robot_name || 'ARIA');
    setColor(business.aria_color || business.robot_color || '#3B6EF8');
    setMood(business.aria_mood || business.robot_mood || 'felice');
  }, [business?.id, business?.aria_name, business?.aria_color, business?.aria_mood]);

  const savePrefs = async (updates) => {
    if (!business?.id) return;
    if (updates.name !== undefined) setName(updates.name);
    if (updates.color !== undefined) setColor(updates.color);
    if (updates.mood !== undefined) setMood(updates.mood);
    try {
      await base44.entities.Business.update(business.id, {
        robot_name: updates.name !== undefined ? updates.name : name,
        robot_color: updates.color !== undefined ? updates.color : color,
        robot_mood: updates.mood !== undefined ? updates.mood : mood,
        aria_name: updates.name !== undefined ? updates.name : name,
        aria_color: updates.color !== undefined ? updates.color : color,
        aria_mood: updates.mood !== undefined ? updates.mood : mood,
      });
      setSaved(true);
      const t = setTimeout(() => setSaved(false), 1500);
      return () => clearTimeout(t);
    } catch (err) {
      console.error('[RobotMascot] savePrefs error:', err);
    }
  };

  useEffect(() => {
    if (newMessageCount > prevMsgCount.current && prevMsgCount.current > 0) {
      setSpecialAnim('jump');
      const t1 = setTimeout(() => setSpecialAnim(null), 1000);
      if (!panelOpen) {
        setProactiveBubble(`💬 Hai ${newMessageCount} nuov${newMessageCount === 1 ? 'o' : 'i'} messagg${newMessageCount === 1 ? 'io' : 'i'}!`);
        const t2 = setTimeout(() => setProactiveBubble(null), 5000);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
      return () => clearTimeout(t1);
    }
    prevMsgCount.current = newMessageCount;
  }, [newMessageCount, panelOpen]);

  useEffect(() => {
    if (aiResponseCount > prevAiCount.current) {
      setSpecialAnim('spin');
      const t = setTimeout(() => setSpecialAnim(null), 600);
      prevAiCount.current = aiResponseCount;
      return () => clearTimeout(t);
    }
    prevAiCount.current = aiResponseCount;
  }, [aiResponseCount]);

  // Close panel on outside click (only when not expanded)
  useEffect(() => {
    if (!panelOpen || expanded) return;
    const handler = (e) => {
      if (!panelRef.current?.contains(e.target)) {
        setPanelOpen(false);
        setExpanded(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [panelOpen, expanded]);

  const handleClick = (e) => {
    e.stopPropagation();
    setClicked(true);
    setTimeout(() => setClicked(false), 400);
    // Su mobile apri la route dedicata, su desktop usa il pannello overlay
    if (isMobile) {
      navigate('/aria-chat');
      return;
    }
    setPanelOpen(p => !p);
    if (panelOpen) setExpanded(false);
  };

  // Check mobile (reactive) — default to false on SSR, calculate after hydration
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // On mobile always fullscreen; on desktop small or expanded
  const showFullscreen = isMobile || expanded;
  const showSmall = panelOpen && !isMobile && !expanded;

  // Small panel style (desktop only, non-expanded)
  const smallPanelStyle = {
    position: 'absolute',
    bottom: 90,
    right: 0,
    width: 420,
    height: 580,
    borderRadius: 20,
    zIndex: 50,
  };

  // Fullscreen/expanded panel style
  const expandedPanelStyle = isMobile ? {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100dvw',
    height: '100dvh',
    borderRadius: 0, zIndex: 200,
  } : {
    position: 'fixed',
    width: 680, height: '80vh',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: 20, zIndex: 200,
  };

  // Compute panel style — on mobile always fullscreen fixed, on desktop small or expanded
  const panelStyle = isMobile
    ? {
        position: 'fixed',
        top: 0, left: 0,
        width: '100dvw',
        height: '100dvh',
        borderRadius: 0,
        zIndex: 200,
      }
    : expanded
    ? {
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 680,
        height: '80vh',
        borderRadius: 20,
        zIndex: 200,
      }
    : {
        position: 'fixed',
        bottom: 200, right: 28,
        width: 420,
        height: 580,
        borderRadius: 20,
        zIndex: 50,
      };

  return createPortal(
    <>
      {/* Backdrop for desktop expanded */}
      {showFullscreen && !isMobile && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 199 }}
          onClick={() => setExpanded(false)}
        />
      )}

      {/* SINGLE CHAT PANEL — solo desktop, su mobile si usa /aria-chat */}
      {panelOpen && !isMobile && (
        <div
          ref={panelRef}
          className="robot-panel"
          style={{
            ...panelStyle,
            background: '#0A0D14',
            border: `1px solid ${color}4D`,
            boxShadow: showFullscreen
              ? `0 24px 80px rgba(0,0,0,0.6), 0 0 30px ${color}18`
              : `0 20px 60px rgba(0,0,0,0.5), 0 0 20px ${color}11`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          <AriaChatCore
            color={color} name={name} mood={mood} business={business} form={null}
            unreadCount={newMessageCount} activeLeads={activeLeads}
            scheduledPosts={scheduledPosts} lastLead={lastLead}
            onThinking={setThinking}
            onClose={() => { setPanelOpen(false); setExpanded(false); }}
            expanded={isMobile || expanded}
            onToggleExpand={isMobile ? null : () => setExpanded(e => !e)}
            isMobile={isMobile}
          />
        </div>
      )}

      {/* Proactive bubble — posizionata in basso a destra fisso */}
      {proactiveBubble && !panelOpen && (
        <div
          className="proactive-bubble"
          onClick={() => { setPanelOpen(true); setProactiveBubble(null); }}
          style={{
            position: 'fixed',
            bottom: isMobile ? 210 : 220,
            right: isMobile ? 16 : 28,
            background: '#0F1219', border: `1px solid ${color}66`,
            borderRadius: 20, padding: '6px 12px',
            fontSize: 11, color: '#F0F4FF', cursor: 'pointer',
            boxShadow: `0 4px 16px ${color}33`,
            whiteSpace: 'nowrap',
            zIndex: 1001,
          }}
        >
          {proactiveBubble}
        </div>
      )}

      {/* Nuova mascotte humanoid draggable */}
      <ARIAMascot
        color={color}
        mood={mood}
        name={name}
        newMessageCount={newMessageCount}
        panelOpen={panelOpen}
        onClick={handleClick}
      />
    </>,
    document.body
  );
}