import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, RotateCcw, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function AgentSimulator({ business, config }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const systemPrompt = config.ai_prompt || `Sei ${config.nome_agente || 'un assistente AI'} per "${business?.nome}". Tono: ${config.tono}. Servizi: ${config.servizi || 'non specificati'}. ${config.cose_da_non_fare ? 'NON FARE: ' + config.cose_da_non_fare : ''}`;
    
    const conversationText = [...messages, userMsg].map(m => `${m.role}: ${m.content}`).join('\n');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nConversazione:\n${conversationText}\n\nRispondi come l'agente. Solo il testo della risposta.`,
    });

    setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    setLoading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" /> Testa il tuo agente
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Simulazione — i clienti non vedono questo</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-semibold text-green-400">AGENTE ATTIVO</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="bg-secondary/50 rounded-xl border border-border h-72 flex flex-col">
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-8">Scrivi come se fossi un cliente...</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                msg.role === 'user' ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground'
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-primary/20 rounded-xl px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-2 border-t border-border flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Scrivi un messaggio..."
            className="bg-card border-border text-sm"
          />
          <Button size="sm" onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}