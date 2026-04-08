import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function AriaProactiveWidget({ business, messages, leads }) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const ariaColor = business?.aria_color || business?.avatar_agente || '#3B6EF8';
  const ariaName = business?.aria_name || business?.nome_agente || 'ARIA';

  useEffect(() => {
    if (!business) return;
    generateMessage();
  }, [business?.id]);

  const generateMessage = async () => {
    setLoading(true);
    try {
      const igMsgs = messages.filter(m => m.canale === 'instagram').length;
      const aiRate = messages.length > 0
        ? Math.round((messages.filter(m => m.ruolo === 'assistant').length / messages.length) * 100)
        : 0;
      const openLeads = leads.filter(l => !['chiuso_vinto', 'chiuso_perso'].includes(l.stato)).length;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei ${ariaName}, l'assistente AI di "${business.nome}". 
Genera UN SOLO messaggio proattivo breve (max 2 frasi) per il proprietario del business, basato su questi dati reali di oggi:
- Messaggi Instagram totali: ${igMsgs}
- Tasso risposta AI: ${aiRate}%
- Lead aperti: ${openLeads}
Sii diretto, utile e concreto. Non iniziare con "Ciao" o presentarti. Termina con una domanda o suggerimento d'azione.
Rispondi SOLO con il messaggio, nient'altro.`,
        model: 'gpt_5_mini',
      });
      setMessage(typeof res === 'string' ? res : res?.text || res?.content || '');
    } catch {
      setMessage(`Oggi hai ${messages.filter(m => !m.letto && m.ruolo === 'user').length} messaggi non letti. Vuoi che controlli i lead in attesa?`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: ariaColor }}
        >
          {ariaName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold mb-1" style={{ color: ariaColor }}>{ariaName} dice</p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Sto analizzando...
            </div>
          ) : (
            <p className="text-sm text-foreground leading-relaxed">{message}</p>
          )}
        </div>
      </div>
      {!loading && (
        <div className="flex gap-2 mt-3 flex-wrap">
          <Link to="/inbox" className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors font-medium">
            Vai all'Inbox →
          </Link>
          <Link to="/crm" className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors font-medium">
            Vedi Lead →
          </Link>
        </div>
      )}
    </div>
  );
}