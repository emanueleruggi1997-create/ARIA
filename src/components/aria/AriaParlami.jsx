import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const CHAT_KEY = 'aria_page_chat';
const QUICK = ['📊 Come va oggi?', '✍️ Genera un post', '👥 Ultimi lead', '💡 Dammi un consiglio'];

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch { return []; }
}
function saveHistory(msgs) {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.slice(-60))); } catch {}
}

export default function AriaParlami({ form, ariaName, ariaColor, business }) {
  const [messages, setMessages] = useState(() => {
    const hist = loadHistory();
    if (hist.length) return hist;
    return [{
      id: 1, role: 'robot',
      text: `Ciao! Sono nella mia pagina personale.\nQui puoi testarmi, configurarmi e parlarmi quando vuoi.\nCosa vuoi fare oggi?`,
      ts: new Date().toISOString(),
    }];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const buildPrompt = (history) => {
    const toniDesc = {
      amichevole: 'Sei caldo, usa il tu, emoticon occasionali',
      professionale: 'Sei formale, usi il lei, preciso e strutturato',
      diretto: 'Vai dritto al punto, breve e concreto',
    };
    return `Sei ${ariaName}, l'assistente AI personale del proprietario di "${business?.nome || 'questo business'}".
Tono: ${toniDesc[form.tono] || 'professionale'}. Lingua: ${form.lingua || 'Italiano'}.
Servizi: ${form.servizi || 'non specificati'}
Prezzi: ${form.prezzi || 'non specificati'}
Non fare mai: ${form.cose_da_non_fare || 'nessuna restrizione'}
Rispondi sempre in italiano, in modo ${form.tono || 'professionale'}.

Conversazione:
${history.map(m => `${m.role === 'user' ? 'Utente' : ariaName}: ${m.text}`).join('\n')}

Rispondi all'ultimo messaggio.`;
  };

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), ts: new Date().toISOString() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    saveHistory(updated);
    setInput('');
    setLoading(true);

    const history = updated.slice(-12);
    const reply = await base44.integrations.Core.InvokeLLM({ prompt: buildPrompt(history) });
    const robotMsg = { id: Date.now() + 1, role: 'robot', text: typeof reply === 'string' ? reply : reply?.text || '', ts: new Date().toISOString() };
    const final = [...updated, robotMsg];
    setMessages(final);
    saveHistory(final);
    setLoading(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 380px)', minHeight: 400 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ background: ariaColor }}
        >
          {ariaName[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">{ariaName}</p>
          <p className="text-[10px] text-muted-foreground">Chatta con il tuo assistente</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: '0 0 6px #10B981', animation: 'pulse 2s infinite' }} />
          <span className="text-[10px] text-green-400 font-semibold">online</span>
        </div>
        <button
          onClick={() => {
            const initial = [{
              id: Date.now(), role: 'robot',
              text: `Ciao! Sono ${ariaName}. Come posso aiutarti oggi?`,
              ts: new Date().toISOString(),
            }];
            setMessages(initial);
            saveHistory(initial);
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
        >
          ↺ Reset
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div style={{ maxWidth: '80%' }}>
              <div
                className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                style={{
                  background: msg.role === 'user' ? ariaColor : '#1A1F2E',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  color: '#F0F4FF',
                }}
              >
                {msg.text}
              </div>
              <div className={`text-[10px] text-muted-foreground mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.ts ? format(new Date(msg.ts), 'HH:mm') : ''}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-3 flex gap-1.5 items-center" style={{ background: '#1A1F2E', border: '1px solid rgba(255,255,255,0.07)' }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: ariaColor, animation: `typingDot 1.2s ${i * 0.2}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick pills */}
      <div className="px-4 py-2 flex gap-2 flex-wrap border-t border-border/50 shrink-0">
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full transition-all text-muted-foreground hover:text-foreground"
            style={{ background: 'transparent', border: `1px solid ${ariaColor}44` }}
            onMouseEnter={e => { e.target.style.borderColor = ariaColor; e.target.style.color = '#F0F4FF'; }}
            onMouseLeave={e => { e.target.style.borderColor = `${ariaColor}44`; e.target.style.color = ''; }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 flex gap-3 items-center shrink-0 border-t border-border">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send(input))}
          placeholder={`Scrivi ad ${ariaName}...`}
          disabled={loading}
          className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
          style={{ background: '#1A1F2E', border: '1px solid #2A2F3E', color: '#F0F4FF', fontFamily: 'Inter, sans-serif' }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0"
          style={{ background: input.trim() && !loading ? ariaColor : '#2A2F3E' }}
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M1 6h10M6 1l5 5-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes typingDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}