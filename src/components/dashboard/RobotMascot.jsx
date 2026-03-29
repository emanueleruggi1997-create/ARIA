import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import AriaChatCore from '@/components/aria/AriaChatCore';
import RobotARIA from '@/components/aria/RobotARIA';

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
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      console.error('[RobotMascot] savePrefs error:', err);
    }
  };

  useEffect(() => {
    if (newMessageCount > prevMsgCount.current && prevMsgCount.current > 0) {
      setSpecialAnim('jump');
      setTimeout(() => setSpecialAnim(null), 1000);
      if (!panelOpen) {
        setProactiveBubble(`💬 Hai ${newMessageCount} nuov${newMessageCount === 1 ? 'o' : 'i'} messagg${newMessageCount === 1 ? 'io' : 'i'}!`);
        setTimeout(() => setProactiveBubble(null), 5000);
      }
    }
    prevMsgCount.current = newMessageCount;
  }, [newMessageCount, panelOpen]);

  useEffect(() => {
    if (aiResponseCount > prevAiCount.current) {
      setSpecialAnim('spin');
      setTimeout(() => setSpecialAnim(null), 600);
    }
    prevAiCount.current = aiResponseCount;
  }, [aiResponseCount]);

  // Close panel on outside click (only when not expanded)
  useEffect(() => {
    if (!panelOpen || expanded) return;
    const handler = (e) => {
      if (!panelRef.current?.contains(e.target) && !robotRef.current?.contains(e.target)) {
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
        position: 'absolute',
        bottom: 90, right: 0,
        width: 420,
        height: 580,
        borderRadius: 20,
        zIndex: 50,
      };

  return (
    <>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes panelExpand { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
        @keyframes robotClick { 0% { transform: scale(1); } 30% { transform: scale(1.2); } 60% { transform: scale(0.9); } 100% { transform: scale(1); } }
        .robot-click { animation: robotClick 0.4s ease-in-out; }
        .robot-wrapper { opacity: 0.75; transition: opacity 0.3s ease, transform 0.3s ease; cursor: pointer; }
        .robot-wrapper:hover { opacity: 1; transform: scale(1.05); }
        .robot-panel { animation: panelExpand 0.25s ease-out; }
        .proactive-bubble { animation: fadeInUp 0.3s ease-out; }
      `}</style>

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

      <div style={{ position: 'fixed', bottom: isMobile ? 80 : 24, right: isMobile ? 12 : 24, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>

        {/* Proactive bubble */}
        {proactiveBubble && !panelOpen && (
          <div className="proactive-bubble"
            onClick={() => { setPanelOpen(true); setProactiveBubble(null); }}
            style={{
              background: '#0F1219', border: `1px solid ${color}66`,
              borderRadius: 20, padding: '6px 12px',
              fontSize: 11, color: '#F0F4FF', cursor: 'pointer',
              boxShadow: `0 4px 16px ${color}33`,
              marginBottom: 4, whiteSpace: 'nowrap',
            }}
          >
            {proactiveBubble}
          </div>
        )}

        {/* Robot button */}
        <div ref={robotRef} className={`robot-wrapper ${clicked ? 'robot-click' : ''}`} onClick={handleClick} style={{ position: 'relative', zIndex: 51 }}>
          <RobotARIA
            size={isMobile ? 64 : 110}
            color={color}
            mood={mood}
            animated={true}
          />
        </div>

        {name && !isMobile && (
          <div style={{ fontSize:12,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color,opacity:0.8,fontFamily:'Inter,sans-serif',marginTop:2 }}>
            {name}
          </div>
        )}
      </div>
    </>
  );
}