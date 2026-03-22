import React from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function LeadCard({ lead, onClick }) {
  return (
    <div 
      onClick={() => onClick(lead)}
      className="bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-primary/30 transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-foreground truncate">{lead.contact_nome || 'Lead'}</p>
        <span className={cn(
          "text-[10px] px-1.5 py-0.5 rounded font-medium",
          lead.canale === 'whatsapp' ? 'bg-green-500/10 text-green-400' : 'bg-pink-500/10 text-pink-400'
        )}>
          {lead.canale === 'whatsapp' ? 'WA' : 'IG'}
        </span>
      </div>
      {lead.tipo_progetto && (
        <p className="text-xs text-muted-foreground mb-2">{lead.tipo_progetto}</p>
      )}
      <div className="flex items-center justify-between">
        {(lead.budget_min || lead.budget_max) && (
          <p className="text-xs font-medium text-primary">
            €{lead.budget_min || 0} — €{lead.budget_max || 0}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {format(new Date(lead.created_date), 'dd/MM')}
        </p>
      </div>
    </div>
  );
}