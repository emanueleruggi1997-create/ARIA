import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertCircle, Check, X, MessageSquare } from 'lucide-react';

const TRIGGER_LABELS = {
  appuntamento: '📅 Appuntamento/Call',
  documento: '📄 Richiesta documento',
  preventivo: '💰 Preventivo/Prezzi',
  collaborazione: '🤝 Collaborazione',
};

const TRIGGER_COLORS = {
  appuntamento: '#3B6EF8',
  documento: '#f59e0b',
  preventivo: '#10b981',
  collaborazione: '#a855f7',
};

export default function UrgentActionsWidget({ businessId }) {
  const qc = useQueryClient();

  const { data: actions = [] } = useQuery({
    queryKey: ['urgent-actions', businessId],
    queryFn: () => base44.entities.UrgentAction.filter({ business_id: businessId, stato: 'nuovo' }, '-created_date', 20),
    enabled: !!businessId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const updateAction = useMutation({
    mutationFn: ({ id, stato }) => base44.entities.UrgentAction.update(id, { stato }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['urgent-actions', businessId] }),
  });

  if (!actions.length) return null;

  return (
    <div className="bg-card rounded-xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3" style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.15)' }}>
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-sm font-bold text-red-400 uppercase tracking-wider">Azione Richiesta</span>
        <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
          🔴 {actions.length}
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {actions.map(action => (
          <div key={action.id} className="p-4">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-black"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                {(action.contact_nome || '?')[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-bold text-foreground">{action.contact_nome}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: `${TRIGGER_COLORS[action.trigger] || '#3B6EF8'}20`, color: TRIGGER_COLORS[action.trigger] || '#3B6EF8' }}>
                    {TRIGGER_LABELS[action.trigger] || action.trigger}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {action.canale === 'whatsapp' ? '🟢 WA' : '📸 IG'}
                  </span>
                </div>

                {/* Messaggio originale */}
                <p className="text-xs text-muted-foreground mb-3 p-2 rounded-lg bg-secondary/50 italic">
                  "{action.messaggio_originale}"
                </p>

                {/* Timestamp */}
                <p className="text-[10px] text-muted-foreground mb-2">
                  {(() => {
                    if (!action.created_date) return '';
                    try {
                      const d = new Date(action.created_date);
                      return Number.isNaN(d.getTime()) ? '' : format(d, 'dd/MM HH:mm');
                    } catch { return ''; }
                  })()}
                </p>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => updateAction.mutate({ id: action.id, stato: 'confermato' })}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
                  >
                    <Check className="w-3 h-3" /> Confermato
                  </button>
                  <button
                    onClick={() => updateAction.mutate({ id: action.id, stato: 'rifiutato' })}
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                  >
                    <X className="w-3 h-3" /> Rifiuta
                  </button>
                  <Link
                    to="/inbox"
                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: 'rgba(59,110,248,0.12)', color: '#3B6EF8', border: '1px solid rgba(59,110,248,0.25)' }}
                  >
                    <MessageSquare className="w-3 h-3" /> Rispondi
                  </Link>
                  <button
                    onClick={() => updateAction.mutate({ id: action.id, stato: 'gestito' })}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
                  >
                    Gestito ✓
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}