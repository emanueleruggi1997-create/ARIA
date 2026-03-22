import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';

const QUICK_MESSAGES = [
  'Ciao, quanto costa un sito web?',
  'Che servizi offrite?',
  'Vorrei un preventivo',
  'Siete aperti domani?',
];

export default function ChatView({ conversation, messages, onSendMessage, onRefresh }) {
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [genMs, setGenMs] = useState(null);
  const endRef = useRef(null);
  const { business } = useBusiness();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (messageText, ruolo = 'human') => {
    if (!messageText.trim()) return;
    await onSendMessage(messageText, ruolo);
    setText('');
    setAiPreview('');
  };

  const handleGenerateAI = async () => {
    setGenerating(true);
    const t0 = Date.now();
    const conversationText = messages.map(m => `${m.ruolo}: ${m.testo}`).join('\n');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un assistente AI per il business "${business?.nome}". Servizi: ${business?.servizi || 'non specificati'}. Tono: ${business?.tono || 'professionale'}.
Agente: ${business?.nome_agente || 'Assistente'}.

Conversazione:
${conversationText}

Genera una risposta professionale al cliente. Rispondi SOLO con il testo della risposta, niente altro.`,
    });
    setAiPreview(result);
    setGenMs(Date.now() - t0);
    setGenerating(false);
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

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">{(conversation.nome || '?')[0].toUpperCase()}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{conversation.nome}</p>
            <div className="flex items-center gap-1.5">
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium",
                conversation.canale === 'whatsapp' ? 'bg-green-500/10 text-green-400' : 'bg-pink-500/10 text-pink-400'
              )}>
                {conversation.canale === 'whatsapp' ? '📱 WA' : '📸 IG'}
              </span>
              {conversation.stato && (
                <span className="text-[10px] text-muted-foreground capitalize">• {conversation.stato}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Modalità manuale</span>
          <Switch checked={manualMode} onCheckedChange={setManualMode} />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{
        backgroundImage: manualMode ? 'none' : 'radial-gradient(circle, hsl(220 15% 13%) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}>
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">Nessun messaggio in questa conversazione</div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex", msg.ruolo === 'user' ? 'justify-start' : 'justify-end')}>
            <div className={cn(
              "max-w-[75%] rounded-2xl px-4 py-2.5",
              msg.ruolo === 'user' ? 'bg-secondary text-foreground rounded-tl-sm' :
              msg.ruolo === 'assistant' ? 'bg-primary text-primary-foreground rounded-tr-sm' :
              'bg-green-600 text-white rounded-tr-sm'
            )}>
              <div className="flex items-center gap-1 mb-1">
                {msg.ruolo === 'assistant' && <span className="text-[10px] opacity-70 flex items-center gap-0.5"><Bot className="w-3 h-3" /> 🤖 AI</span>}
                {msg.ruolo === 'human' && <span className="text-[10px] opacity-70 flex items-center gap-0.5"><User className="w-3 h-3" /> 👤 Tu</span>}
              </div>
              <p className="text-sm leading-relaxed">{msg.testo}</p>
              <p className={cn("text-[10px] mt-1", msg.ruolo === 'user' ? 'text-muted-foreground' : 'opacity-60')}>
                {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Quick messages */}
      {messages.length === 0 && !manualMode && (
        <div className="px-4 py-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Esempi di messaggi del cliente:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_MESSAGES.map(q => (
              <button key={q} onClick={() => handleSend(q, 'user')}
                className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border hover:border-primary/30 text-muted-foreground transition-all">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Preview */}
      {aiPreview && (
        <div className="px-4 py-3 bg-primary/5 border-t border-primary/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-primary font-medium">✨ Risposta AI suggerita:</p>
            {genMs && <span className="text-xs text-muted-foreground">⚡ {genMs}ms</span>}
          </div>
          <p className="text-sm text-foreground bg-secondary rounded-lg p-2">{aiPreview}</p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => handleSend(aiPreview, 'assistant')}>Invia</Button>
            <Button size="sm" variant="outline" onClick={() => setText(aiPreview)}>Modifica</Button>
            <Button size="sm" variant="ghost" onClick={() => setAiPreview('')}>Annulla</Button>
          </div>
        </div>
      )}

      {/* Input area — sticky on mobile */}
      <div className="p-3 border-t border-border shrink-0 space-y-2 bg-background" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {manualMode && (
          <div className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg px-2 py-1">
            👤 Modalità manuale attiva — l'AI non risponde automaticamente
          </div>
        )}
        <div className="flex items-end gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={generating} className="shrink-0 h-9">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {!generating && <span className="ml-1 text-xs hidden sm:inline">AI</span>}
          </Button>
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend(text, 'human'))}
            placeholder={manualMode ? "Rispondi manualmente..." : "Scrivi risposta o usa ✨ AI..."}
            className="bg-secondary border-border resize-none min-h-[36px] max-h-24 text-sm"
            rows={1}
          />
          <Button size="sm" onClick={() => handleSend(text, 'human')} disabled={!text.trim()} className="shrink-0 h-9">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}