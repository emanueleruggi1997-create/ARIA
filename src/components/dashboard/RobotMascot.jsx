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
  { id: 'energico', label: '⚡ Energico' },
];

export default function RobotMascot({ newMessageCount = 0, aiResponseCount = 0, business, activeLeads = 0, scheduledPosts = 0, lastLead = null }) {
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
    await base44.entities.Business.update(business.id, {
      robot_name: updates.name !== undefined ? updates.name : name,
      robot_color: updates.color !== undefined ? updates.color : color,
      robot_mood: updates.mood !== undefined ? updates.mood : mood,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
    setPanelOpen(p => !p);
    if (panelOpen) setExpanded(false);
  };

  // Check mobile (reactive)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Small panel style (non-expanded, inside fixed wrapper)
  const smallPanelStyle = !panelOpen || expanded ? { display: 'none' } : {
    position: 'absolute',
    bottom: isMobile ? 'auto' : 90,
    right: 0,
    width: isMobile ? 'calc(100vw - 48px)' : 420,
    height: 580,
    borderRadius: 20,
    zIndex: 50,
  };

  // Expanded panel style (rendered outside wrapper via separate element)
  const expandedPanelStyle = !panelOpen || !expanded ? { display: 'none' } : isMobile ? {
    position: 'fixed', inset: 0,
    width: '100vw', height: '100vh',
    borderRadius: 0, zIndex: 200,
  } : {
    position: 'fixed',
    width: 680, height: '80vh',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: 20, zIndex: 200,
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