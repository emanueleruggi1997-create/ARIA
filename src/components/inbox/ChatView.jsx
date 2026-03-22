import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';

export default function ChatView({ conversation, messages, onSendMessage, onRefresh }) {
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState('');
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
    const conversationText = messages.map(m => `${m.ruolo}: ${m.testo}`).join('\n');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un assistente AI per il business "${business?.nome}". Servizi: ${business?.servizi || 'non specificati'}. Tono: ${business?.tono || 'professionale'}.
      
Ecco la conversazione:
${conversationText}

Genera una risposta appropriata e professionale al cliente. Rispondi SOLO con il testo della risposta, niente altro.`,
    });
    setAiPreview(result);
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
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-sm font-semibold">{(conversation.nome || '?')[0].toUpperCase()}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{conversation.nome}</p>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              conversation.canale === 'whatsapp' ? 'bg-green-500/10 text-green-400' : 'bg-pink-500/10 text-pink-400'
            )}>
              {conversation.canale === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={cn("flex", msg.ruolo === 'user' ? 'justify-start' : 'justify-end')}>
            <div className={cn(
              "max-w-[75%] rounded-2xl px-4 py-2.5",
              msg.ruolo === 'user' ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground'
            )}>
              <div className="flex items-center gap-1.5 mb-1">
                {msg.ruolo === 'assistant' ? (
                  <span className="text-[10px] font-semibold opacity-70 flex items-center gap-1">
                    <Bot className="w-3 h-3" /> AI
                  </span>
                ) : msg.ruolo === 'human' ? (
                  <span className="text-[10px] font-semibold opacity-70 flex items-center gap-1">
                    <User className="w-3 h-3" /> UMANO
                  </span>
                ) : null}
              </div>
              <p className="text-sm leading-relaxed">{msg.testo}</p>
              <p className={cn("text-[10px] mt-1", msg.ruolo === 'user' ? 'text-muted-foreground' : 'opacity-60')}>
                {format(new Date(msg.created_date), 'HH:mm')}
              </p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* AI Preview */}
      {aiPreview && (
        <div className="px-4 py-3 bg-primary/5 border-t border-primary/20">
          <p className="text-xs text-primary font-medium mb-1">✨ Risposta AI suggerita:</p>
          <p className="text-sm text-foreground">{aiPreview}</p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={() => handleSend(aiPreview, 'assistant')}>Invia</Button>
            <Button size="sm" variant="ghost" onClick={() => setAiPreview('')}>Annulla</Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={handleGenerateAI} disabled={generating} className="shrink-0">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </Button>
        <Input 
          value={text} 
          onChange={e => setText(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleSend(text, 'human')}
          placeholder="Rispondi manualmente..." 
          className="bg-secondary border-border" 
        />
        <Button size="sm" onClick={() => handleSend(text, 'human')} disabled={!text.trim()} className="shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}