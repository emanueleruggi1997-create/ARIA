import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Search, MoreVertical, ArrowLeft, X, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { base44 } from '@/api/base44Client';
import { formatSafeTimestamp } from '@/lib/safeDate.js';
import { useBusiness } from '@/lib/useBusinessContext.jsx';

const C = {
  bg: '#04080F', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  text: '#E8F4FF', muted: '#5A7A9A', wa: '#25D366', ig: '#DD2A7B',
  accent2: '#7000FF', accent: '#0066FF', success: '#00E5A0', danger: '#FF3860',
};

function groupByDay(messages) {
  const groups = [];
  let lastDay = null;
  for (const msg of (messages || [])) {
    const day = formatSafeTimestamp(msg.created_date, 'yyyy-MM-dd', 'unknown');
    if (day !== lastDay) { groups.push({ type: 'separator', date: msg.created_date, key: `sep-${day}-${msg.id}` }); lastDay = day; }
    groups.push({ type: 'message', msg, key: msg.id || Math.random() });
  }
  return groups;
}

function DateSep({ date }) {
  let label = 'Data sconosciuta';
  try {
    if (date) {
      const d = new Date(date);
      const now = new Date();
      if (!isNaN(d.getTime())) {
        if (d.toDateString() === now.toDateString()) label = 'Oggi';
        else {
          const ieri = new Date(now);
          ieri.setDate(ieri.getDate() - 1);
          label = d.toDateString() === ieri.toDateString() ? 'Ieri' : formatSafeTimestamp(date, 'd MMMM yyyy', date);
        }
      }
    }
  } catch {}
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '12px 0' }}>
      <span style={{ fontSize: 11, color: C.muted, background: `${C.card}`, padding: '3px 12px', borderRadius: 20, border: `1px solid ${C.border}` }}>{label}</span>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 0 4px 4px' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>👤</div>
      <div style={{ padding: '10px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '4px 18px 18px 18px', display: 'flex', gap: 4, alignItems: 'center' }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: C.muted, animation: `typingDot 1.2s ${i*0.2}s ease-in-out infinite` }} />)}
      </div>
    </div>
  );
}

export default function NewChatView({ conversation, messages, onSendMessage, onBack, mobile, onOpenContactInfo }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [manualMode, setManualMode] = useState(!!conversation?.ai_disabled);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [showAriaLog, setShowAriaLog] = useState(false);
  const { business } = useBusiness();
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { setManualMode(!!conversation?.ai_disabled); setAiSuggestion(''); }, [conversation?.contact_id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (msgText, ruolo = 'human') => {
    if (!msgText?.trim() || sending) return;
    setSending(true);
    try {
      await onSendMessage(msgText, ruolo);
      setText(''); setAiSuggestion('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } finally { setSending(false); }
  };

  const generateSuggestion = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const history = messages.map(m => `${m.ruolo}: ${m.testo}`).join('\n');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un assistente AI per "${business?.nome}". Servizi: ${business?.servizi || 'non specificati'}. Tono: ${business?.tono || 'professionale'}.\n\nConversazione:\n${history}\n\nGenera una risposta professionale. Rispondi SOLO con il testo.`,
      });
      setAiSuggestion(typeof result === 'string' ? result : result?.text || '');
    } finally { setGenerating(false); }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
  };

  if (!conversation) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 48 }}>💬</div>
        <div style={{ color: C.muted, fontSize: 14 }}>Seleziona una conversazione</div>
      </div>
    );
  }

  const canale = conversation.canale;
  const srcColor = canale === 'instagram' ? C.ig : C.wa;
  const srcLabel = canale === 'instagram' ? 'Instagram' : 'WhatsApp';
  const letter = (conversation.nome || '?').replace('@','').replace('IG_','').replace('WA_','')[0]?.toUpperCase() || '?';
  const grouped = groupByDay(messages);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>

      {/* ── HEADER ── */}
      <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>‹</button>
        )}
        <div
          style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
          onClick={() => onOpenContactInfo?.()}
        >
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: canale === 'instagram' ? 'linear-gradient(135deg,#F5852933,#DD2A7B33,#8134AF33)' : `${C.wa}22`, border: `2px solid ${srcColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: C.text }}>{letter}</div>
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: C.success, border: `2px solid ${C.surface}` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onOpenContactInfo?.()}>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.nome}</div>
          <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: srcColor, fontWeight: 700 }}>{srcLabel}</span>
            {conversation.numero && <span style={{ color: C.muted }}>{conversation.numero}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <button style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 6, display: 'flex' }}>
            <Search size={16} />
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMoreMenuOpen(v => !v)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 6, display: 'flex' }}>
              <MoreVertical size={16} />
            </button>
            {moreMenuOpen && (
              <div style={{ position: 'absolute', right: 0, top: 32, width: 200, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 32px #00000088' }}
                onMouseLeave={() => setMoreMenuOpen(false)}>
                {['Info contatto', 'Aggiungi al CRM', 'Silenzia notifiche', 'Archivia conversazione', 'Blocca contatto'].map((item, i) => (
                  <button key={i} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none', color: i === 4 ? C.danger : C.text, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                    onClick={() => { setMoreMenuOpen(false); if (i === 0) onOpenContactInfo?.(); }}>
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ARIA CONTROL BAR ── */}
      <div style={{
        padding: '8px 14px', borderBottom: `1px solid ${C.border}`,
        background: manualMode ? `#ef444408` : `${C.accent2}08`,
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        {/* Badge MANUALE visibile */}
        {manualMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: '#ef444420', border: '1px solid #ef444440' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.danger, display: 'inline-block', animation: 'pulseDot 1.5s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 900, color: C.danger, letterSpacing: 1 }}>MANUALE</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13 }}>🤖</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: manualMode ? C.danger : C.success }}>
            {manualMode ? 'ARIA disattivata — rispondi tu' : 'ARIA automatica attiva'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Log ARIA button */}
          <button
            onClick={() => setShowAriaLog(v => !v)}
            style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            📋 Log ARIA
          </button>
          <Switch
            checked={!manualMode}
            onCheckedChange={async (val) => {
              const newManual = !val;
              setManualMode(newManual);
              if (conversation?.contact_id) {
                await base44.entities.Contact.update(conversation.contact_id, { ai_disabled: newManual });
              }
            }}
          />
        </div>
      </div>

      {/* ── ARIA LOG PANEL ── */}
      {showAriaLog && (
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: `${C.accent2}06`, maxHeight: 220, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent2, marginBottom: 8 }}>📋 Messaggi inviati da ARIA</div>
          {messages.filter(m => m.ruolo === 'assistant').length === 0 ? (
            <div style={{ fontSize: 12, color: C.muted }}>Nessun messaggio ARIA in questa conversazione.</div>
          ) : messages.filter(m => m.ruolo === 'assistant').map(m => (
            <div key={m.id} style={{ marginBottom: 8, padding: '7px 10px', background: C.card, borderRadius: 8, border: `1px solid ${C.accent2}22` }}>
              <div style={{ fontSize: 10, color: C.accent2, marginBottom: 3 }}>
                {formatSafeTimestamp(m.created_date, 'dd/MM HH:mm', '')}
              </div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{m.testo}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── MESSAGES AREA — windowed: show only last 60 items for perf ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2, background: `linear-gradient(180deg, ${C.bg} 0%, ${C.surface}44 100%)` }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: 13 }}>Nessun messaggio in questa conversazione</div>
        )}
        {grouped.length > 60 && (
          <div style={{ textAlign: 'center', padding: '8px 0', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: C.muted, background: C.card, padding: '3px 12px', borderRadius: 20, border: `1px solid ${C.border}` }}>
              Mostrando gli ultimi {Math.floor(60 * messages.length / grouped.length)} messaggi
            </span>
          </div>
        )}
        {(grouped.length > 60 ? grouped.slice(-60) : grouped).map((item, idx) => {
          if (item.type === 'separator') return <DateSep key={item.key} date={item.date} />;
          const msg = item.msg;
          const isUser = msg.ruolo === 'user';
          const isAI = msg.ruolo === 'assistant';
          const isRight = !isUser;
          const prevItem = grouped[idx - 1];
          const prevMsg = prevItem?.type === 'message' ? prevItem.msg : null;
          const isConsecutive = prevMsg && prevMsg.ruolo === msg.ruolo;

          const bubbleBg = isUser
            ? C.card
            : isAI
              ? `linear-gradient(135deg, ${C.accent2}33, ${C.accent}22)`
              : `linear-gradient(135deg, ${C.accent}, ${C.accent2})`;
          const bubbleBorder = isUser ? `1px solid ${C.border}` : isAI ? `1px solid ${C.accent2}44` : 'none';

          return (
            <div key={item.key} style={{ display: 'flex', justifyContent: isRight ? 'flex-end' : 'flex-start', gap: 6, alignItems: 'flex-end', marginTop: isConsecutive ? 2 : 10 }}>
              {!isRight && !isConsecutive && (
                <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: isAI ? `linear-gradient(135deg,${C.accent2},${C.accent})` : `${srcColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, border: `1px solid ${isAI ? C.accent2 + '44' : srcColor + '44'}` }}>
                  {isAI ? '🤖' : letter}
                </div>
              )}
              {!isRight && isConsecutive && <div style={{ width: 26 }} />}
              <div style={{ maxWidth: '72%', padding: '9px 13px', fontSize: 13, lineHeight: 1.5, borderRadius: isUser ? (isConsecutive ? '4px 18px 18px 4px' : '4px 18px 18px 18px') : (isConsecutive ? '18px 4px 4px 18px' : '18px 4px 18px 18px'), background: bubbleBg, color: C.text, border: bubbleBorder, boxShadow: isRight && !isAI ? `0 0 20px ${C.accent}33` : 'none' }}>
                {isAI && <div style={{ fontSize: 9, color: C.accent2, fontWeight: 700, marginBottom: 2, letterSpacing: 1 }}>ARIA ·</div>}
                {msg.ruolo === 'human' && <div style={{ fontSize: 9, color: '#60a5fa', fontWeight: 700, marginBottom: 2, letterSpacing: 1 }}>👤 TU ·</div>}
                {msg.tipo === 'commento' && <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, marginBottom: 2 }}>💬 COMMENTO IG</div>}
                <span>{msg.testo || ''}</span>
                <div style={{ fontSize: 10, color: isRight ? 'rgba(255,255,255,0.4)' : C.muted, marginTop: 3, textAlign: 'right' }}>
                  {formatSafeTimestamp(msg.created_date, 'HH:mm', '')}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* ── ARIA SUGGESTION BAR ── */}
      {aiSuggestion && (
        <div style={{ padding: '10px 14px', background: `${C.accent2}12`, borderTop: `1px solid ${C.accent2}33`, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: C.accent2, fontWeight: 700, marginBottom: 6 }}>✨ ARIA suggerisce:</div>
          <div style={{ fontSize: 13, color: C.text, background: C.card, borderRadius: 10, padding: '8px 12px', marginBottom: 8, border: `1px solid ${C.border}` }}>{aiSuggestion}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => handleSend(aiSuggestion, 'assistant')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: C.success, border: 'none', color: '#000', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Check size={12} /> Usa
            </button>
            <button onClick={() => { setText(aiSuggestion); setAiSuggestion(''); textareaRef.current?.focus(); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✏ Modifica
            </button>
            <button onClick={() => setAiSuggestion('')} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: 'none', border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              <X size={12} /> Ignora
            </button>
          </div>
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div style={{
        padding: '10px 12px', borderTop: `1px solid ${C.border}`, background: C.surface, flexShrink: 0,
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {/* AI suggest button */}
          <button onClick={generateSuggestion} disabled={generating} title="Genera risposta AI"
            style={{ flexShrink: 0, width: 38, height: 38, borderRadius: '50%', background: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {generating ? <Loader2 size={16} style={{ color: C.accent2, animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} style={{ color: C.accent2 }} />}
          </button>

          {/* Text input */}
          <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, display: 'flex', alignItems: 'flex-end', padding: '2px 12px' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(text, 'human'))}
              placeholder="Scrivi un messaggio..."
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', color: C.text, fontSize: 13,
                fontFamily: 'inherit', outline: 'none', resize: 'none', padding: '10px 0',
                minHeight: 38, maxHeight: 100, lineHeight: 1.5,
              }}
            />
          </div>

          {/* Send / Mic */}
          <button
            onClick={() => text.trim() && handleSend(text, 'human')}
            disabled={sending}
            style={{
              flexShrink: 0, width: 38, height: 38, borderRadius: '50%', border: 'none',
              background: text.trim() ? `linear-gradient(135deg, ${C.accent}, ${C.accent2})` : C.card,
              color: text.trim() ? '#fff' : C.muted, cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: text.trim() ? `0 0 16px ${C.accent2}55` : 'none',
              transition: 'all 0.2s',
            }}
          >
            {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : text.trim() ? <Send size={16} /> : <span style={{ fontSize: 16 }}>🎤</span>}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes typingDot { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}