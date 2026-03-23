import React, { useState, useEffect, useRef } from 'react';
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
  { id: 'energia', label: '⚡ Energico' },
];

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

export default function RobotMascot({ newMessageCount = 0, aiResponseCount = 0, business, activeLeads = 0, scheduledPosts = 0, lastLead = null }) {
  const [name, setName] = useState('ARIA');
  const [color, setColor] = useState('#3B6EF8');
  const [mood, setMood] = useState('felice');
  const [saved, setSaved] = useState(false);

  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [expanded, setExpanded] = useState(false);
  const [blink, setBlink] = useState(false);
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
    await base44.entities.Business.update(business.id, {
      robot_name: updates.name !== undefined ? updates.name : name,
      robot_color: updates.color !== undefined ? updates.color : color,
      robot_mood: updates.mood !== undefined ? updates.mood : mood,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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

  const eyeBlink = thinking ? true : blink;

  const handleClick = (e) => {
    e.stopPropagation();
    setClicked(true);
    setTimeout(() => setClicked(false), 400);
    setPanelOpen(p => !p);
    if (panelOpen) setExpanded(false);
  };

  const robotAnimClass = thinking ? 'robot-thinking'
    : specialAnim === 'jump' ? 'robot-jump'
    : specialAnim === 'spin' ? 'robot-spin'
    : 'robot-idle';

  // Check mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Panel dimensions
  const panelStyle = (() => {
    if (!panelOpen) return { display: 'none' };
    if (expanded && isMobile) {
      return {
        position: 'fixed', inset: 0,
        width: '100vw', height: '100vh',
        borderRadius: 0, zIndex: 100,
        bottom: 0, right: 0,
      };
    }
    if (expanded) {
      return {
        position: 'fixed',
        width: 680, height: '80vh',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        borderRadius: 20, zIndex: 100,
      };
    }
    return {
      position: 'absolute',
      bottom: isMobile ? 'auto' : 90,
      right: 0,
      width: isMobile ? 'calc(100vw - 48px)' : 420,
      height: 580,
      borderRadius: 20,
      zIndex: 50,
    };
  })();

  return (
    <>
      <style>{`
        @keyframes robotIdle { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes antennaWave { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        @keyframes robotJump { 0% { transform: translateY(0px) scale(1); } 20% { transform: translateY(-20px) scale(1.15); } 40% { transform: translateY(-10px) scale(1.1); } 60% { transform: translateY(-18px) scale(1.12); } 80% { transform: translateY(-4px) scale(1.05); } 100% { transform: translateY(0px) scale(1); } }
        @keyframes robotSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes robotClick { 0% { transform: scale(1); } 30% { transform: scale(1.2); } 60% { transform: scale(0.9); } 100% { transform: scale(1); } }
        @keyframes robotThink { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-4px) rotate(2deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes panelExpand { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
        .robot-idle { animation: robotIdle 3s ease-in-out infinite; }
        .robot-jump { animation: robotJump 1s ease-in-out; }
        .robot-spin { animation: robotSpin 0.5s linear; }
        .robot-click { animation: robotClick 0.4s ease-in-out; }
        .robot-thinking { animation: robotThink 0.8s ease-in-out infinite; }
        .robot-wrapper { opacity: 0.75; transition: opacity 0.3s ease, transform 0.3s ease; cursor: pointer; }
        .robot-wrapper:hover { opacity: 1; transform: scale(1.05); }
        .antenna-anim { transform-origin: 24px 6px; animation: antennaWave 2s ease-in-out infinite; }
        .robot-panel { animation: panelExpand 0.25s ease-out; }
        .proactive-bubble { animation: fadeInUp 0.3s ease-out; }
      `}</style>

      {/* Expanded backdrop */}
      {panelOpen && expanded && !isMobile && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 99 }}
          onClick={() => { setExpanded(false); }}
        />
      )}

      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>

        {/* Proactive bubble */}
        {proactiveBubble && !panelOpen && (
          <div className="proactive-bubble"
            onClick={() => { setPanelOpen(true); setActiveTab('chat'); setProactiveBubble(null); }}
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

        {/* Main panel */}
        <div
          ref={panelRef}
          className="robot-panel"
          style={{
            ...panelStyle,
            background: '#0A0D14',
            border: `1px solid ${color}4D`,
            boxShadow: expanded
              ? `0 24px 80px rgba(0,0,0,0.6), 0 0 30px ${color}18`
              : `0 20px 60px rgba(0,0,0,0.5), 0 0 20px ${color}11`,
            display: panelOpen ? 'flex' : 'none',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease',
          }}
          onClick={e => e.stopPropagation()}
        >
          {activeTab === 'chat' ? (
            <AriaChatCore
              color={color}
              name={name}
              mood={mood}
              business={business}
              form={null}
              unreadCount={newMessageCount}
              activeLeads={activeLeads}
              scheduledPosts={scheduledPosts}
              lastLead={lastLead}
              onThinking={setThinking}
              onClose={() => { setPanelOpen(false); setExpanded(false); }}
              expanded={expanded}
              onToggleExpand={() => setExpanded(e => !e)}
              isMobile={isMobile}
            />
          ) : (
            /* Config tab */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Config header */}
              <div style={{
                padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', gap: 8, background: '#0A0D14', flexShrink: 0,
              }}>
                <button onClick={() => setActiveTab('chat')} style={{ width:32,height:32,borderRadius:8,background:'rgba(255,255,255,0.05)',border:'none',color:'#F0F4FF',cursor:'pointer',fontSize:16,fontFamily:'Inter,sans-serif',flexShrink:0 }}>←</button>
                <span style={{ fontSize:13,fontWeight:700,color:'#F0F4FF',flex:1 }}>Personalizza {name}</span>
                <button onClick={() => setPanelOpen(false)} style={{ color:'#6B7280',fontSize:18,background:'none',border:'none',cursor:'pointer',lineHeight:1 }}>×</button>
              </div>

              <div style={{ padding:16,overflowY:'auto',flex:1 }}>
                {saved && <div style={{ fontSize:11,color:'#10B981',marginBottom:10,textAlign:'right' }}>✓ Salvato</div>}

                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:10,fontWeight:700,letterSpacing:'0.1em',color:'#6B7280',textTransform:'uppercase',display:'block',marginBottom:5 }}>Nome</label>
                  <input value={name} onChange={e => savePrefs({ name: e.target.value })} maxLength={12}
                    style={{ width:'100%',boxSizing:'border-box',background:'#1A1F2E',border:'1px solid #2A2F3E',borderRadius:6,padding:'6px 10px',color:'#F0F4FF',fontSize:13,outline:'none',fontFamily:'Inter,sans-serif' }} />
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={{ fontSize:10,fontWeight:700,letterSpacing:'0.1em',color:'#6B7280',textTransform:'uppercase',display:'block',marginBottom:8 }}>Colore</label>
                  <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                    {COLORS.map(c => (
                      <button key={c.id} onClick={() => savePrefs({ color: c.id })} title={c.label}
                        style={{ width:26,height:26,borderRadius:'50%',background:c.id,border:color===c.id?'2px solid white':'2px solid transparent',cursor:'pointer',padding:0,transition:'transform 0.15s' }} />
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize:10,fontWeight:700,letterSpacing:'0.1em',color:'#6B7280',textTransform:'uppercase',display:'block',marginBottom:8 }}>Umore</label>
                  <div style={{ display:'flex',flexDirection:'column',gap:5 }}>
                    {MOODS.map(m => (
                      <button key={m.id} onClick={() => savePrefs({ mood: m.id })}
                        style={{ background:mood===m.id?`${color}22`:'transparent',border:`1px solid ${mood===m.id?color:'#2A2F3E'}`,borderRadius:7,padding:'5px 10px',color:mood===m.id?'#F0F4FF':'#6B7280',fontSize:12,cursor:'pointer',textAlign:'left',transition:'all 0.2s',fontFamily:'Inter,sans-serif' }}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Robot button */}
        <div ref={robotRef} className={`robot-wrapper ${clicked ? 'robot-click' : ''}`} onClick={handleClick}>
          <RobotARIA
            size={isMobile ? 80 : 110}
            color={color}
            mood={mood}
            animated={true}
          />
        </div>

        {name && (
          <div style={{ fontSize:12,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase',color,opacity:0.8,fontFamily:'Inter,sans-serif',marginTop:2 }}>
            {name}
          </div>
        )}
      </div>
    </>
  );
}