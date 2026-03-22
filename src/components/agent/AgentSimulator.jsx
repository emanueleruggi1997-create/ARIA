import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, RotateCcw, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import AgentAvatar from '@/components/AgentAvatar';

const QUICK_MESSAGES = [
  'Ciao, quanto costa un sito web?',
  'Che servizi offrite?',
  'Vorrei un preventivo per un e-commerce',
  'Siete disponibili questa settimana?',
  'Ho un problema con il sito che avete fatto',
];

export default function AgentSimulator({ business, config }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const msgText = text || input;
    if (!msgText.trim() || loading) return;

    const userMsg = { role: 'user', content: msgText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    const t0 = Date.now();

    const systemPrompt = config.ai_prompt ||
      `Sei ${config.nome_agente || 'un assistente AI'} per "${business?.nome}". Tono: ${config.tono || 'professionale'}. Servizi: ${config.servizi || 'non specificati'}. ${config.cose_da_non_fare ? 'NON FARE MAI: ' + config.cose_da_non_fare : ''} ${config.faq ? 'FAQ: ' + config.faq : ''}`;

    const conversationText = [...messages, userMsg].map(m => `${m.role}: ${m.content}`).join('\n');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompt}\n\nConversazione:\n${conversationText}\n\nRispondi come l'agente. Solo il testo della risposta.`,
    });

    const ms = Date.now() - t0;
    setMessages(prev => [...prev, { role: 'assistant', content: result, ms }]);
    setLoading(false);
  };

  const agentColor = config.avatar_agente && config.avatar_agente.startsWith('#') ? config.avatar_agente : '#3B6EF8';
  const agentName = config.nome_agente || 'Agente';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">💬 Testa il tuo agente in tempo reale</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">⚠️ Simulazione — i clienti non vedono questo</p>
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

      {/* Quick messages */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {QUICK_MESSAGES.map(q => (
          <button key={q} onClick={() => handleSend(q)}
            className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all">
            {q}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border flex flex-col"
        style={{ height: 320, backgroundImage: 'radial-gradient(circle, hsl(220 15% 13%) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-8">Scrivi come se fossi un cliente o clicca un messaggio rapido...</p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex flex-col", msg.role === 'user' ? 'items-end' : 'items-start')}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 mb-1 ml-1">
                  <AgentAvatar nome={agentName} color={agentColor} size="sm" />
                  <span className="text-[10px] text-muted-foreground font-medium">{agentName}</span>
                </div>
              )}
              <div className={cn(
                "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                msg.role === 'user' ? 'bg-secondary text-foreground rounded-tr-sm' : 'bg-primary text-primary-foreground rounded-tl-sm'
              )}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.ms && (
                <p className="text-[10px] text-muted-foreground mt-0.5 ml-1">⚡ Risposta generata in {msg.ms}ms</p>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-1.5">
              <AgentAvatar nome={agentName} color={agentColor} size="sm" />
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
          <Button size="sm" onClick={() => handleSend()} disabled={loading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}