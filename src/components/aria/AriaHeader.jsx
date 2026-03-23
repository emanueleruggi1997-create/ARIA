import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AriaRobot from './AriaRobot';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export default function AriaHeader({ form, ariaName, ariaColor, autoSaved, business, onToggle }) {
  const [greeting, setGreeting] = useState('');
  const [loadingGreeting, setLoadingGreeting] = useState(true);

  useEffect(() => {
    if (!business) return;
    generateGreeting();
  }, [business?.id]);

  const generateGreeting = async () => {
    setLoadingGreeting(true);
    const { data: messages = [] } = await base44.entities.Message.filter(
      { business_id: business.id, letto: false },
    ).catch(() => ({ data: [] }));
    const { data: leads = [] } = await base44.entities.Lead.filter(
      { business_id: business.id },
    ).catch(() => ({ data: [] }));

    const unread = Array.isArray(messages) ? messages.length : 0;
    const activeLeads = Array.isArray(leads)
      ? leads.filter(l => !['chiuso_vinto', 'chiuso_perso'].includes(l.stato)).length
      : 0;

    const prompt = `Sei ${ariaName}, l'assistente AI personale del proprietario di "${business.nome}".
Genera UNA sola frase di saluto breve e naturale (max 20 parole) per accogliere il proprietario nella tua pagina personale.
Dati reali: ${unread} messaggi non letti, ${activeLeads} lead attivi.
Sii caldo, diretto, in italiano. Inizia con "Ciao!" o simile. Non usare virgolette.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setGreeting(typeof res === 'string' ? res : res?.text || '');
    } catch {
      setGreeting(`Ciao! Oggi hai ${unread} messaggi e ${activeLeads} lead attivi. Cosa faccio per te?`);
    }
    setLoadingGreeting(false);
  };

  const isActive = form.stato_agente === 'attivo';

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-border">
      {/* Robot */}
      <div className="shrink-0">
        <AriaRobot color={ariaColor} mood={form.robot_mood || 'felice'} width={100} height={130} />
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
        {/* Avatar circle + name */}
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg shrink-0"
            style={{ background: ariaColor, boxShadow: `0 0 24px ${ariaColor}55` }}
          >
            {ariaName[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{ariaName}</h1>
            <p className="text-sm text-muted-foreground">Il tuo assistente personale</p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 mt-1">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
            isActive
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isActive ? 'bg-green-500' : 'bg-red-500'
            )} style={isActive ? { animation: 'pulse 2s infinite', boxShadow: '0 0 6px #10B981' } : {}} />
            {isActive ? 'ATTIVA' : 'DISATTIVA'}
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={onToggle} />
          </div>

          {autoSaved && (
            <span className="text-xs text-green-400 font-medium">✓ ARIA aggiornata</span>
          )}
        </div>

        {/* Dynamic greeting */}
        <div
          className="mt-2 px-4 py-3 rounded-xl text-sm text-foreground leading-relaxed max-w-md"
          style={{ background: `${ariaColor}11`, border: `1px solid ${ariaColor}22` }}
        >
          {loadingGreeting ? (
            <span className="text-muted-foreground italic">ARIA sta pensando...</span>
          ) : (
            <span>"{greeting}"</span>
          )}
        </div>
      </div>
    </div>
  );
}