import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Send, Bot, Sparkles, Loader2, Mail, MoreVertical, Search } from 'lucide-react';
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

export default function ChatView({ conversation, messages, onSendMessage, onRefresh }) {
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

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.06] bg-[#0C0F1A] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-primary">{(conversation.nome || '?')[0].toUpperCase()}</span>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-foreground leading-tight">{conversation.nome}</p>
            <p className="text-[11px] text-muted-foreground">
              {conversation.canale === 'whatsapp' ? '💬 WhatsApp' : '📸 Instagram'}
              {conversation.stato ? ` · ${conversation.stato}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (window.__addToMailingList) window.__addToMailingList(conversation); }}
            className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-secondary border border-border hover:border-primary/30 text-muted-foreground transition-colors"
          >
            <Mail className="w-3 h-3" /> Mailing
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline text-[11px]">Manuale</span>
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
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ background: 'linear-gradient(180deg, #080A0F 0%, #0C0F1A 100%)' }}
      >
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">Nessun messaggio in questa conversazione</div>
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

          // Check consecutive messages from same sender
          const prevItem = grouped[idx - 1];
          const prevMsg = prevItem?.type === 'message' ? prevItem.msg : null;
          const isConsecutive = prevMsg && prevMsg.ruolo === msg.ruolo;

          return (
            <div key={item.key} className={cn("flex", isRight ? "justify-end" : "justify-start", isConsecutive ? "mt-0.5" : "mt-3")}>
              <div className={cn(
                "max-w-[78%] px-4 py-2.5 text-[15px] leading-[1.5]",
                isUser && "bg-[#1C2333] text-foreground rounded-[4px_18px_18px_18px]",
                isAI && "bg-primary text-white rounded-[18px_4px_18px_18px]",
                isHuman && "bg-[#2D4A8A] text-white rounded-[18px_4px_18px_18px]",
                isConsecutive && isUser && "rounded-[4px_18px_18px_4px]",
                isConsecutive && isRight && "rounded-[18px_4px_4px_18px]",
              )}>
                <span className="block">{msg.testo || ''}</span>
                <div className={cn("flex items-center gap-1 mt-1", isRight ? "justify-end" : "justify-start")}>
                  {isAI && <span className="text-[10px] opacity-70">🤖</span>}
                  {isHuman && <span className="text-[10px] opacity-70">👤</span>}
                  <span className={cn(
                    "text-[11px]",
                    isUser ? "text-muted-foreground" : "text-white/60"
                  )}>
                    {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Quick messages */}
      {messages.length === 0 && !manualMode && (
        <div className="px-4 py-2 border-t border-white/[0.06]">
          <p className="text-[11px] text-muted-foreground mb-2">Esempi messaggi cliente:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_MESSAGES.map(q => (
              <button key={q} onClick={() => handleSend(q, 'user')}
                className="text-[12px] px-2.5 py-1 rounded-full bg-secondary border border-border hover:border-primary/30 text-muted-foreground transition-all">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Preview */}
      {aiPreview && (
        <div className="px-4 py-3 bg-primary/5 border-t border-primary/20">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] text-primary font-semibold">✨ Risposta AI suggerita:</span>
            {genMs && <span className="text-[11px] text-muted-foreground">⚡ {genMs}ms</span>}
          </div>
          <div className="text-[14px] text-foreground bg-secondary rounded-xl p-3 leading-relaxed">{aiPreview}</div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => handleSend(aiPreview, 'assistant')}>Invia</Button>
            <Button size="sm" variant="outline" onClick={() => setText(aiPreview)}>Modifica</Button>
            <Button size="sm" variant="ghost" onClick={() => setAiPreview('')}>Annulla</Button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div
        className="px-3 py-3 border-t border-white/[0.06] bg-[#0F1219] shrink-0"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {manualMode && (
          <div className="flex items-center gap-1 text-[12px] text-yellow-400 bg-yellow-500/10 rounded-lg px-2.5 py-1.5 mb-2">
            👤 Modalità manuale attiva — l'AI non risponde automaticamente
          </div>
        )}
        <div className="flex items-end gap-2">
          {/* AI button left */}
          <button
            onClick={handleGenerateAI}
            disabled={generating}
            className="shrink-0 w-10 h-10 rounded-full bg-secondary border border-border hover:border-primary/40 flex items-center justify-center transition-all"
            title="Genera risposta AI"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Sparkles className="w-4 h-4 text-primary" />}
          </button>

          {/* Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextareaChange}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(text, 'human'))}
              placeholder="Scrivi un messaggio..."
              rows={1}
              className="w-full bg-secondary border border-border rounded-3xl px-4 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground resize-none outline-none focus:border-primary/40 transition-colors leading-[1.5]"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
          </div>

          {/* Send button */}
          <button
            onClick={() => handleSend(text, 'human')}
            disabled={!text.trim() || sending}
            className={cn(
              "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
              text.trim() && !sending
                ? "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}