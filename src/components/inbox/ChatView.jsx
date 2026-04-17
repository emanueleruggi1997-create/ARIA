import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Send, Bot, Sparkles, Loader2, Mail, MoreVertical, Search, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';

const QUICK_MESSAGES = [
  'Ciao, quanto costa un sito web?',
  'Che servizi offrite?',
  'Vorrei un preventivo',
  'Siete aperti domani?',
];

function DateSeparator({ date }) {
  const d = new Date(date);
  let label;
  if (isToday(d)) label = 'Oggi';
  else if (isYesterday(d)) label = 'Ieri';
  else label = format(d, 'd MMMM', { locale: it });
  return (
    <div className="flex items-center justify-center my-4">
      <span className="text-[11px] text-muted-foreground bg-white/[0.06] px-3 py-1 rounded-full">{label}</span>
    </div>
  );
}

function groupByDay(messages) {
  const groups = [];
  let lastDay = null;
  for (const msg of messages) {
    const day = msg.created_date ? format(new Date(msg.created_date), 'yyyy-MM-dd') : 'unknown';
    if (day !== lastDay) {
      groups.push({ type: 'separator', date: msg.created_date, key: `sep-${day}` });
      lastDay = day;
    }
    groups.push({ type: 'message', msg, key: msg.id });
  }
  return groups;
}

export default function ChatView({ conversation, messages, onSendMessage, onRefresh, onBack, mobile }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState('');
  const [genMs, setGenMs] = useState(null);
  const [manualMode, setManualMode] = useState(!!conversation?.ai_disabled);
  const { business } = useBusiness();
  const endRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync manualMode when conversation changes
  useEffect(() => {
    setManualMode(!!conversation?.ai_disabled);
  }, [conversation?.contact_id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (messageText, ruolo = 'human') => {
    if (!messageText.trim() || sending) return;
    setSending(true);
    try {
      await onSendMessage(messageText, ruolo);
      setText('');
      setAiPreview('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    } finally {
      setSending(false);
    }
  };

  const handleGenerateAI = async () => {
    if (generating) return;
    setGenerating(true);
    const t0 = Date.now();
    try {
      const conversationText = messages.map(m => `${m.ruolo}: ${m.testo}`).join('\n');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un assistente AI per il business "${business?.nome}". Servizi: ${business?.servizi || 'non specificati'}. Tono: ${business?.tono || 'professionale'}.
Agente: ${business?.nome_agente || 'Assistente'}.

Conversazione:
${conversationText}

Genera una risposta professionale al cliente. Rispondi SOLO con il testo della risposta, niente altro.`,
      });
      setAiPreview(typeof result === 'string' ? result : result?.text || '');
      setGenMs(Date.now() - t0);
    } catch (err) {
      console.error('[ChatView] handleGenerateAI error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleTextareaChange = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Seleziona una conversazione</p>
        </div>
      </div>
    );
  }

  const grouped = groupByDay(messages);

  const C = {
    bg: '#070B14', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
    accent: '#00C6FF', accent2: '#7B2FFF', accent3: '#FF3CAC',
    text: '#E8F4FF', muted: '#5A7A9A', ig: '#E1306C', wa: '#25D366',
  };

  const srcColor = conversation.canale === 'instagram' ? C.ig : C.wa;
  const srcLabel = conversation.canale === 'instagram' ? 'Instagram' : 'WhatsApp';
  const letter = (conversation.nome || '?').replace('@','').replace('IG_','')[0]?.toUpperCase() || '?';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
        background: C.surface, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        {onBack && (
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 24, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>‹</button>
        )}
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: conversation.canale === 'instagram' ? `linear-gradient(135deg, ${C.ig}44, ${C.accent2}44)` : `linear-gradient(135deg, ${C.wa}44, #00a85444)`,
            border: `2px solid ${srcColor}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 16, color: C.text,
          }}>{letter}</div>
          <div style={{
            position: 'absolute', bottom: -2, right: -2, background: srcColor,
            borderRadius: '50%', width: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${C.bg}`, fontSize: 8, color: '#fff',
          }}>{conversation.canale === 'instagram' ? '📸' : '💬'}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.nome}</div>
          <div style={{ fontSize: 11, color: srcColor, display: 'flex', alignItems: 'center', gap: 4 }}>
            {srcLabel}{conversation.stato ? ` · ${conversation.stato}` : ''}
          </div>
        </div>
        {/* Manual mode + mailing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => { if (window.__addToMailingList) window.__addToMailingList(conversation); }}
            style={{ background: `${C.accent2}18`, border: `1px solid ${C.accent2}44`, borderRadius: 8, padding: '5px 10px', color: C.accent2, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            className="hidden sm:flex"
          >✉ Mailing</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.muted }}>
            <span className="hidden sm:inline">Manuale</span>
            <Switch checked={manualMode} onCheckedChange={async (val) => {
              setManualMode(val);
              if (conversation?.contact_id) {
                await base44.entities.Contact.update(conversation.contact_id, { ai_disabled: val });
              }
            }} />
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, background: `linear-gradient(180deg, ${C.bg} 0%, ${C.surface} 100%)` }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: 13 }}>Nessun messaggio in questa conversazione</div>
        )}

        {grouped.map((item, idx) => {
          if (item.type === 'separator') {
            return <DateSeparator key={item.key} date={item.date} />;
          }
          const msg = item.msg;
          const isUser = msg.ruolo === 'user';
          const isAI = msg.ruolo === 'assistant';
          const isHuman = msg.ruolo === 'human';
          const isRight = !isUser;

          const prevItem = grouped[idx - 1];
          const prevMsg = prevItem?.type === 'message' ? prevItem.msg : null;
          const isConsecutive = prevMsg && prevMsg.ruolo === msg.ruolo;

          const bubbleBg = isUser ? C.card
            : isAI ? `linear-gradient(135deg, ${C.accent2}22, ${C.accent3}11)`
            : `linear-gradient(135deg, ${C.accent2}, ${C.accent})`;
          const bubbleBorder = isUser ? `1px solid ${C.border}` : isAI ? `1px solid ${C.accent2}44` : 'none';
          const bubbleRadius = isUser
            ? (isConsecutive ? '4px 18px 18px 4px' : '4px 18px 18px 18px')
            : (isConsecutive ? '18px 4px 4px 18px' : '18px 4px 18px 18px');

          return (
            <div key={item.key} style={{ display: 'flex', justifyContent: isRight ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end', marginTop: isConsecutive ? 2 : 12 }}>
              {!isRight && (
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: isAI ? `linear-gradient(135deg, ${C.accent2}, ${C.accent3})` : `linear-gradient(135deg, ${srcColor}44, ${srcColor}22)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                }}>
                  {isAI ? '🤖' : letter}
                </div>
              )}
              <div style={{ maxWidth: '72%', padding: '10px 14px', fontSize: 13, lineHeight: 1.5, borderRadius: bubbleRadius, background: bubbleBg, color: C.text, border: bubbleBorder }}>
                {isAI && <div style={{ fontSize: 10, color: C.accent2, fontWeight: 700, marginBottom: 3 }}>ARIA ·</div>}
                {isHuman && <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, marginBottom: 3 }}>👤 Tu ·</div>}
                <span>{msg.testo || ''}</span>
                <div style={{ fontSize: 10, color: isRight ? 'rgba(255,255,255,0.5)' : C.muted, marginTop: 4, textAlign: isRight ? 'right' : 'left' }}>
                  {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Quick messages */}
      {messages.length === 0 && !manualMode && (
        <div style={{ padding: '8px 14px 0', borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Esempi messaggi cliente:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {QUICK_MESSAGES.map(q => (
              <button key={q} onClick={() => handleSend(q, 'user')}
                style={{ fontSize: 11, padding: '5px 10px', borderRadius: 20, background: C.card, border: `1px solid ${C.border}`, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Preview */}
      {aiPreview && (
        <div style={{ padding: '12px 14px', background: `${C.accent2}11`, borderTop: `1px solid ${C.accent2}33` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: C.accent2, fontWeight: 700 }}>✨ Risposta AI suggerita:</span>
            {genMs && <span style={{ fontSize: 11, color: C.muted }}>⚡ {genMs}ms</span>}
          </div>
          <div style={{ fontSize: 13, color: C.text, background: C.card, borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: `1px solid ${C.border}` }}>{aiPreview}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={() => handleSend(aiPreview, 'assistant')}>Invia</Button>
            <Button size="sm" variant="outline" onClick={() => setText(aiPreview)}>Modifica</Button>
            <Button size="sm" variant="ghost" onClick={() => setAiPreview('')}>Annulla</Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '10px 14px', borderTop: `1px solid ${C.border}`,
        background: C.surface, flexShrink: 0,
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
      }}>
        {manualMode && (
          <div style={{ fontSize: 12, color: '#facc15', background: 'rgba(234,179,8,0.1)', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
            👤 Modalità manuale attiva — l'AI non risponde automaticamente
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* AI button */}
          <button
            onClick={handleGenerateAI}
            disabled={generating}
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
              background: C.card, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
            title="Genera risposta AI"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: C.accent2 }} /> : <Sparkles className="w-4 h-4" style={{ color: C.accent2 }} />}
          </button>

          {/* Input */}
          <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, display: 'flex', alignItems: 'center', padding: '0 14px' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextareaChange}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(text, 'human'))}
              placeholder="Rispondi come ARIA..."
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', color: C.text, fontSize: 13,
                fontFamily: 'inherit', outline: 'none', resize: 'none', padding: '10px 0',
                minHeight: 42, maxHeight: 120,
              }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={() => handleSend(text, 'human')}
            disabled={!text.trim() || sending}
            style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: '50%', border: 'none',
              background: text.trim() && !sending ? `linear-gradient(135deg, ${C.accent2}, ${C.accent})` : C.card,
              color: '#fff', fontSize: 16, cursor: text.trim() && !sending ? 'pointer' : 'not-allowed',
              boxShadow: text.trim() ? `0 0 16px ${C.accent2}55` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}