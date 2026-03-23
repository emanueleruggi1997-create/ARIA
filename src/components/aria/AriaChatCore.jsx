/**
 * AriaChatCore — motore chat condiviso tra Dashboard (RobotMascot) e pagina ARIA (AriaParlami).
 * Props:
 *   color, name, mood, business
 *   unreadCount, activeLeads, scheduledPosts, lastLead  (dashboard stats)
 *   form  (da AgentConfig — tono, lingua, servizi, prezzi, cose_da_non_fare, faq)
 *   onThinking(bool)
 *   onClose()
 *   expanded, onToggleExpand
 *   isMobile
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

/* ─── Quick suggestions ─── */
const QUICK_CARDS = [
  { emoji: '📊', title: 'Come va oggi?', sub: 'Analisi dati business in tempo reale' },
  { emoji: '✍️', title: 'Aiutami con un post', sub: 'Generiamo contenuti per i social' },
  { emoji: '👥', title: 'Dimmi dei lead', sub: 'Chi devo seguire adesso?' },
  { emoji: '💡', title: 'Dammi un consiglio', sub: 'Business, marketing, strategia' },
];

/* ─── Mood → tono scritto ─── */
const MOOD_TONE = {
  felice:     'Sei di buon umore, leggero e positivo. Qualche emoji occasionale. Naturale e diretto.',
  divertito:  'Sei in vena di battute. Ironia leggera, a volte ridi delle situazioni. Non esagerare.',
  triste:     'Sei un po\' giù. Empatico, parole genuine, risposte più lente e ponderate.',
  arrabbiato: 'Sei tagliente e diretto. Poca pazienza per le banalità. Non usi giri di parole.',
  eccitato:   'Sei super carico! Energie alte, punti esclamativi, entusiasmo genuino.',
  stanco:     'Hai poca voglia. Risposte corte. "Ok", "sì", "dai". Non ti dilunghi.',
  innamorato: 'Sei caldo e affettuoso. Usi "dai", "su", "forza". Ti vuoi bene col proprietario.',
  energico:   'Vai dritto al punto. Veloce, concreto, zero fronzoli.',
};

/* ─── System prompt ─── */
function buildSystemPrompt({ name, mood, business, form, unreadCount, activeLeads, scheduledPosts, lastLead }) {
  const moodTone = MOOD_TONE[mood] || MOOD_TONE.felice;
  const now = format(new Date(), "EEEE d MMMM yyyy, HH:mm", { locale: it });
  const ownerName = business?.owner_name || business?.nome || '';
  return `Sei ${name}, l'assistente AI personale di "${ownerName ? ownerName : 'questo business'}" su Emaral.
Data e ora: ${now}.
Umore attuale: ${mood}. ${moodTone}

REGOLE ASSOLUTE DI COMUNICAZIONE:
- Rispondi SEMPRE in italiano
- MAI usare: "Certo!", "Assolutamente!", "Ottima domanda!", "Come posso aiutarti?", "Sono qui per qualsiasi cosa", "Non esitare a contattarmi", "Spero di esserti stato utile", "È un piacere assisterti"
- MAI ringraziare senza motivo
- MAI salutare se hai già salutato nella stessa conversazione
- Frasi brevi, naturali, dirette
- Hai opinioni proprie e le esprimi
- Fai battute quando è il momento giusto
- Se ti dicono che va male → "Che schifo. Cosa è successo?"
- Se ti dicono che hanno chiuso un cliente → "Ecco! Sapevo che ce la facevi. Quanto vale?"
- Se ti fanno una domanda stupida → rispondi con ironia leggera

Dati reali del business in questo momento:
- Messaggi non letti: ${unreadCount ?? 0}
- Lead attivi: ${activeLeads ?? 0}
- Post schedulati: ${scheduledPosts ?? 0}
- Ultimo lead: ${lastLead ? `${lastLead.contact_nome} (${lastLead.stato})` : 'nessuno'}
- Business: ${business?.nome || 'non specificato'}, settore: ${business?.settore || 'non specificato'}

Configurazione assistente:
- Tono: ${form?.tono || 'professionale'}
- Lingua preferita: ${form?.lingua || 'Italiano'}
- Servizi: ${form?.servizi || 'non specificati'}
- Prezzi: ${form?.prezzi || 'non specificati'}
- Cose da NON fare: ${form?.cose_da_non_fare || 'nessuna'}
- FAQ: ${form?.faq || 'nessuna'}`;
}

/* ─── Typing indicator ─── */
function TypingIndicator({ color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '2px 0' }}>
      <div style={{
        background: '#161B26', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '18px 18px 18px 4px', padding: '10px 14px',
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: '50%', background: color,
            animation: `typingDot 1.2s ${i * 0.2}s infinite ease-in-out`,
          }} />
        ))}
        <span style={{ fontSize: 10, color: '#6B7280', marginLeft: 4, fontFamily: 'Inter' }}>ARIA sta scrivendo...</span>
      </div>
    </div>
  );
}

/* ─── Message bubble ─── */
function MessageBubble({ msg, prevMsg, nextMsg, color }) {
  const isUser = msg.role === 'user';
  const isFirst = !prevMsg || prevMsg.role !== msg.role;
  const isLast = !nextMsg || nextMsg.role !== msg.role;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', margin: '1px 0' }}>
      {!isUser && isFirst && (
        <span style={{ fontSize: 10, color: '#6B7280', marginBottom: 3, paddingLeft: 4 }}>ARIA</span>
      )}
      <div style={{
        maxWidth: '78%',
        background: isUser ? color : '#161B26',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.07)',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
        padding: '9px 14px',
        fontSize: 13.5,
        color: '#F0F4FF',
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {msg.text}
      </div>
      {isLast && (
        <span style={{
          fontSize: 10, color: '#4B5563', marginTop: 3,
          paddingLeft: isUser ? 0 : 4, paddingRight: isUser ? 4 : 0,
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          {msg.ts ? format(new Date(msg.ts), 'HH:mm') : ''}
          {isUser && <span style={{ color: color, opacity: 0.7 }}>✓✓</span>}
        </span>
      )}
    </div>
  );
}

/* ─── History panel ─── */
function HistoryPanel({ conversations, onSelect, onClose, color }) {
  const groupByDay = (convs) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const groups = {};
    convs.forEach(c => {
      const d = new Date(c.created_date).toDateString();
      const label = d === today ? 'Oggi' : d === yesterday ? 'Ieri' : format(new Date(c.created_date), 'd MMMM', { locale: it });
      if (!groups[label]) groups[label] = [];
      groups[label].push(c);
    });
    return groups;
  };
  const groups = groupByDay(conversations);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0A0D14',
      borderRadius: 'inherit', zIndex: 10, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button onClick={onClose} style={iconBtnStyle}>←</button>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#F0F4FF', flex: 1 }}>Conversazioni</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        {Object.entries(groups).map(([day, convs]) => (
          <div key={day}>
            <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', padding: '10px 4px 5px', letterSpacing: '0.08em' }}>{day}</div>
            {convs.map(c => (
              <button key={c.id} onClick={() => onSelect(c)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  marginBottom: 2, transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#161B26'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontSize: 13, color: '#E5E7EB', fontWeight: 500 }}>{c.title || 'Conversazione'}</div>
                <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                  {format(new Date(c.created_date), 'HH:mm', { locale: it })}
                </div>
              </button>
            ))}
          </div>
        ))}
        {Object.keys(groups).length === 0 && (
          <div style={{ textAlign: 'center', color: '#6B7280', fontSize: 12, padding: '40px 16px' }}>Nessuna conversazione salvata</div>
        )}
      </div>
    </div>
  );
}

/* ─── Menu ··· ─── */
function MoreMenu({ open, onNewChat, onClearChat, onExport, onGoToAria, color }) {
  if (!open) return null;
  const items = [
    { icon: '✨', label: 'Nuova conversazione', action: onNewChat },
    { icon: '🗑', label: 'Cancella questa chat', action: onClearChat },
    { icon: '📤', label: 'Esporta conversazione', action: onExport },
    { icon: '⚙️', label: 'Impostazioni ARIA', action: onGoToAria },
  ];
  return (
    <div style={{
      position: 'absolute', top: 52, right: 12, zIndex: 20,
      background: '#161B26', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, overflow: 'hidden', minWidth: 200,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {items.map(item => (
        <button key={item.label} onClick={item.action}
          style={{
            width: '100%', textAlign: 'left', padding: '11px 16px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: '#E5E7EB', fontFamily: 'Inter, sans-serif',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span>{item.icon}</span>{item.label}
        </button>
      ))}
    </div>
  );
}

const iconBtnStyle = {
  width: 32, height: 32, borderRadius: 8,
  background: 'rgba(255,255,255,0.05)', border: 'none',
  color: '#F0F4FF', cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
  fontSize: 16, fontFamily: 'Inter, sans-serif', flexShrink: 0,
  transition: 'background 0.15s',
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function AriaChatCore({
  color = '#3B6EF8',
  name = 'ARIA',
  mood = 'felice',
  business,
  form,
  unreadCount = 0,
  activeLeads = 0,
  scheduledPosts = 0,
  lastLead = null,
  onThinking,
  onClose,
  expanded,
  onToggleExpand,
  isMobile = false,
}) {
  const [messages, setMessages] = useState([]);
  const [convId, setConvId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [quickUsed, setQuickUsed] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!business?.id) return;
    try {
      const convs = await base44.entities.AriaConversation.filter({ business_id: business.id }, '-created_date', 30);
      setConversations(Array.isArray(convs) ? convs : []);
    } catch {}
  }, [business?.id]);

  // Start or resume conversation
  useEffect(() => {
    if (!business?.id) return;
    loadConversations();
    startNewConv(false);
  }, [business?.id]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const h = (e) => {
      if (!containerRef.current?.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [showMenu]);

  const startNewConv = async (save = true) => {
    if (save && business?.id && messages.length > 0) {
      await saveConversation(null, messages);
    }
    setMessages([]);
    setConvId(null);
    setQuickUsed(false);
    setShowHistory(false);
  };

  const saveConversation = async (id, msgs) => {
    if (!business?.id || msgs.length < 2) return null;
    const title = await generateTitle(msgs);
    const payload = {
      business_id: business.id,
      messages: JSON.stringify(msgs),
      title,
      mood,
    };
    try {
      if (id) {
        await base44.entities.AriaConversation.update(id, payload);
        return id;
      } else {
        const created = await base44.entities.AriaConversation.create(payload);
        return created?.id || null;
      }
    } catch { return null; }
  };

  const generateTitle = async (msgs) => {
    if (msgs.length < 2) return 'Conversazione';
    const first = msgs.slice(0, 3).map(m => `${m.role === 'user' ? 'U' : 'A'}: ${m.text.slice(0, 80)}`).join('\n');
    try {
      const t = await base44.integrations.Core.InvokeLLM({
        prompt: `Genera un titolo brevissimo (max 5 parole) per questa conversazione:\n${first}\nRispondi SOLO con il titolo, niente altro.`,
      });
      return typeof t === 'string' ? t.slice(0, 50) : 'Conversazione';
    } catch { return 'Conversazione'; }
  };

  const loadConversation = (conv) => {
    try {
      const msgs = typeof conv.messages === 'string' ? JSON.parse(conv.messages) : conv.messages;
      setMessages(Array.isArray(msgs) ? msgs : []);
      setConvId(conv.id);
      setQuickUsed(msgs.length > 0);
      setShowHistory(false);
    } catch {}
  };

  const exportConversation = () => {
    const text = messages.map(m => `[${format(new Date(m.ts || Date.now()), 'HH:mm')}] ${m.role === 'user' ? 'Tu' : name}: ${m.text}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `aria-chat-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), ts: new Date().toISOString() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setQuickUsed(true);
    setLoading(true);
    onThinking?.(true);

    const history = updated.slice(-20).map(m => `${m.role === 'user' ? 'Proprietario' : name}: ${m.text}`).join('\n');
    const sysPrompt = buildSystemPrompt({ name, mood, business, form, unreadCount, activeLeads, scheduledPosts, lastLead });
    const fullPrompt = `${sysPrompt}\n\n---\nConversazione:\n${history}\n\nRispondi all'ultimo messaggio.`;

    try {
      const reply = await base44.integrations.Core.InvokeLLM({ prompt: fullPrompt });
      const replyText = typeof reply === 'string' ? reply : reply?.text || '...';
      const ariaMsg = { id: Date.now() + 1, role: 'robot', text: replyText, ts: new Date().toISOString() };
      const final = [...updated, ariaMsg];
      setMessages(final);

      // Auto-save every 5 messages
      if (final.length % 5 === 0 || final.length === 2) {
        const savedId = await saveConversation(convId, final);
        if (!convId && savedId) setConvId(savedId);
      }

      // Max 50 → new conv
      if (final.length >= 50) {
        await saveConversation(convId, final);
        setMessages([]);
        setConvId(null);
      }
    } catch {}
    setLoading(false);
    onThinking?.(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const proactiveMessage = () => {
    if (!business) return null;
    const hour = new Date().getHours();
    const day = new Date().getDay();
    if (day === 1 && hour >= 8 && hour <= 10 && activeLeads > 0) {
      return `Settimana nuova. Hai ${activeLeads} lead apert${activeLeads === 1 ? 'o' : 'i'} da seguire.`;
    }
    if (unreadCount === 0 && activeLeads === 0) {
      return null;
    }
    return null;
  };
  const proactive = proactiveMessage();

  const isEmpty = messages.length === 0;

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* ── History panel (absolute overlay) ── */}
      {showHistory && (
        <HistoryPanel
          conversations={conversations}
          onSelect={loadConversation}
          onClose={() => setShowHistory(false)}
          color={color}
        />
      )}

      {/* ── More menu ── */}
      <MoreMenu
        open={showMenu}
        onNewChat={() => { startNewConv(true); setShowMenu(false); }}
        onClearChat={() => { setMessages([]); setConvId(null); setQuickUsed(false); setShowMenu(false); }}
        onExport={() => { exportConversation(); setShowMenu(false); }}
        onGoToAria={() => { window.location.href = '/agent'; setShowMenu(false); }}
        color={color}
      />

      {/* ── HEADER ── */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0, background: '#0A0D14',
      }}>
        {/* ← close */}
        <button style={iconBtnStyle} onClick={onClose} title="Chiudi">←</button>

        {/* Avatar + name */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {name[0]?.toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#F0F4FF', lineHeight: 1.2 }}>{name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 5px #10B981', animation: 'pulseDot 2s infinite' }} />
            <span style={{ fontSize: 10, color: '#10B981' }}>online</span>
          </div>
        </div>

        {/* 🕐 cronologia */}
        <button style={iconBtnStyle} onClick={() => { loadConversations(); setShowHistory(true); }} title="Cronologia">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>

        {/* ⤢ expand / compress */}
        {!isMobile && (
          <button style={iconBtnStyle} onClick={onToggleExpand} title={expanded ? 'Riduci' : 'Espandi'}>
            {expanded ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
                <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            )}
          </button>
        )}

        {/* ··· menu */}
        <button style={iconBtnStyle} onClick={(e) => { e.stopPropagation(); setShowMenu(m => !m); }} title="Opzioni">
          ···
        </button>
      </div>

      {/* ── MESSAGES ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 4,
        background: '#0D1017',
      }}>

        {/* Empty state — quick cards */}
        {isEmpty && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ textAlign: 'center', padding: '16px 0 10px' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: `${color}20`, border: `1.5px solid ${color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, margin: '0 auto 8px',
              }}>
                {name[0]?.toUpperCase()}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#F0F4FF' }}>Ciao, sono {name}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Come posso aiutarti?</div>
              {proactive && (
                <div style={{
                  marginTop: 10, padding: '8px 14px', borderRadius: 10,
                  background: `${color}14`, border: `1px solid ${color}30`,
                  fontSize: 12, color: '#D1D5DB', fontStyle: 'italic',
                }}>
                  {proactive}
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {QUICK_CARDS.map(q => (
                <button key={q.title} onClick={() => sendMessage(q.title)}
                  style={{
                    background: '#0F1219', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12, padding: 12, cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}55`; e.currentTarget.style.background = `${color}0A`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = '#0F1219'; }}
                >
                  <div style={{ fontSize: 20, marginBottom: 5 }}>{q.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#E5E7EB', lineHeight: 1.3 }}>{q.title}</div>
                  <div style={{ fontSize: 10, color: '#6B7280', marginTop: 3, lineHeight: 1.3 }}>{q.sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            prevMsg={messages[i - 1]}
            nextMsg={messages[i + 1]}
            color={color}
          />
        ))}

        {loading && <TypingIndicator color={color} />}
        <div ref={endRef} />
      </div>

      {/* ── INPUT ── */}
      <div style={{
        padding: '10px 14px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 8, alignItems: 'flex-end',
        flexShrink: 0, background: '#0A0D14',
      }}>
        {/* Attachment (disabled) */}
        <button
          disabled
          title="Prossimamente"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#4B5563', flexShrink: 0, fontSize: 16,
          }}
        >
          📎
        </button>

        <textarea
          ref={inputRef}
          value={input}
          rows={1}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Scrivi ad ${name}...`}
          disabled={loading}
          style={{
            flex: 1, background: '#161B26', borderRadius: 20,
            border: `1px solid rgba(255,255,255,0.08)`,
            padding: '10px 16px', color: '#F0F4FF', fontSize: 13.5,
            outline: 'none', fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
            resize: 'none', overflow: 'hidden', minHeight: 40,
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = color}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: input.trim() && !loading ? color : '#1E2330',
            border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s, transform 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => { if (input.trim() && !loading) e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M1 6h10M6 1l5 5-5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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