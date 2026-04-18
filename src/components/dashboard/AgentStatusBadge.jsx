import React from 'react';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/LanguageContext.jsx';

export default function AgentStatusBadge({ status = 'off' }) {
  const { lang } = useLang();
  const en = lang === 'en';

  const statusMap = {
    attivo: { label: en ? 'ACTIVE' : 'ATTIVO', color: 'bg-green-500', glow: 'shadow-green-500/30' },
    pausa:  { label: en ? 'PAUSED' : 'IN PAUSA', color: 'bg-yellow-500', glow: 'shadow-yellow-500/30' },
    off:    { label: en ? 'INACTIVE' : 'DISATTIVO', color: 'bg-red-500', glow: 'shadow-red-500/30' },
  };

  const s = statusMap[status] || statusMap.off;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
      <div className={cn("w-2 h-2 rounded-full shadow-sm", s.color, s.glow)} />
      <span className="text-xs font-semibold text-foreground tracking-wide">{s.label}</span>
    </div>
  );
}