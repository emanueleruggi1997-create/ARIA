import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const QUICK_MESSAGES = [
  '📊 Come va oggi?',
  '✍️ Genera un post',
  '👥 Ultimi lead',
  '💡 Dammi un consiglio',
];

const CHAT_KEY = 'robot_chat_history';

function loadHistory() {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(msgs) {
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-50)));
  } catch {}
}

export default function RobotChat({ color, name, business, unreadCount, activeLeads, scheduledPosts, lastLead, onThinking }) {
  const [messages, setMessages] = useState(() => loadHistory());
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [welcomed, setWelcomed] = useState(() => !!loadHistory().length);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!welcomed) {
      const welcome = {
        id: Date.now(),
        role: 'robot',
        text: `Ciao! Sono ${name} 👋\nCosa posso fare per te oggi?\nPuoi chiedermi info sui tuoi lead, aiuto con i post, o qualsiasi cosa sul tuo business.`,
        ts: new Date().toISOString(),
      };
      const updated = [welcome];
      setMessages(updated);
      saveHistory(updated);
      setWelcomed(true);
    }
  }, [welcomed, name]);

  const buildSystemPrompt = () =>
    `Sei ${name}, l'assistente AI personale del proprietario di "${business?.nome || 'questo business'}" su Emaral Agent AI.
Sei simpatico, diretto e professionale. Rispondi sempre in italiano. Sii conciso ma utile.
Hai accesso a questi dati reali dell'app:
- Messaggi non letti: ${unreadCount}
- Lead attivi: ${activeLeads}
- Post schedulati: ${scheduledPosts}
- Ultimo lead: ${lastLead ? `${lastLead.contact_nome} (${lastLead.stato})` : 'Nessuno'}
Puoi aiutare con:
- Riassunti dati del business
- Generare caption per post social
- Scrivere preventivi
- Rispondere a domande generali
- Dare consigli sul business
Sei anche in grado di fare conversazione normale e motivare il proprietario quando necessario.`;

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), ts: new Date().toISOString() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    saveHistory(updated);
    setInput('');
    setLoading(true);
    onThinking?.(true);

    const history = updated.slice(-10).map(m => ({
      role: m.role === 'user' ? 'Utente' : name,
      text: m.text,
    }));

    const prompt = `${buildSystemPrompt()}

Conversazione recente:
${history.map(h => `${h.role}: ${h.text}`).join('\n')}

Rispondi all'ultimo messaggio dell'utente.`;

    const reply = await base44.integrations.Core.InvokeLLM({ prompt });

    const robotMsg = { id: Date.now() + 1, role: 'robot', text: reply, ts: new Date().toISOString() };
    const final = [...updated, robotMsg];
    setMessages(final);
    saveHistory(final);
    setLoading(false);
    onThinking?.(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {name[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F4FF', lineHeight: 1.2 }}>{name}</div>
          <div style={{ fontSize: 10, color: '#6B7280', marginTop: 1 }}>Il tuo assistente personale</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', background: '#10B981',
            boxShadow: '0 0 6px #10B981',
            animation: 'pulseDot 2s infinite',
          }} />
          <span style={{ fontSize: 9, color: '#10B981', fontWeight: 600 }}>online</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{ maxWidth: '80%' }}>
              <div style={{
                background: msg.role === 'user' ? color : '#1A1F2E',
                border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '8px 12px',
                fontSize: 13,
                color: '#F0F4FF',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}>
                {msg.text}
              </div>
              <div style={{
                fontSize: 9, color: '#4B5563',
                marginTop: 2,
                textAlign: msg.role === 'user' ? 'right' : 'left',
                paddingLeft: msg.role === 'robot' ? 2 : 0,
                paddingRight: msg.role === 'user' ? 2 : 0,
              }}>
                {msg.ts ? format(new Date(msg.ts), 'HH:mm') : ''}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: '#1A1F2E', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '10px 14px',
              display: 'flex', gap: 4, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: color,
                  animation: `typingDot 1.2s ${i * 0.2}s infinite ease-in-out`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick pills */}
      <div style={{
        padding: '6px 12px',
        display: 'flex', gap: 5, flexWrap: 'wrap',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        flexShrink: 0,
      }}>
        {QUICK_MESSAGES.map(q => (
          <button key={q} onClick={() => sendMessage(q)} disabled={loading}
            style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 20,
              background: 'transparent', border: `1px solid ${color}44`,
              color: '#9CA3AF', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = color; e.target.style.color = '#F0F4FF'; }}
            onMouseLeave={e => { e.target.style.borderColor = `${color}44`; e.target.style.color = '#9CA3AF'; }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '8px 10px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
          placeholder={`Scrivi a ${name}...`}
          disabled={loading}
          style={{
            flex: 1, background: '#1A1F2E', border: '1px solid #2A2F3E',
            borderRadius: 20, padding: '7px 12px',
            color: '#F0F4FF', fontSize: 12, outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          style={{
            width: 30, height: 30, borderRadius: '50%',
            background: input.trim() && !loading ? color : '#2A2F3E',
            border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 6h10M6 1l5 5-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}