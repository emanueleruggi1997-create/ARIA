import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { format } from 'date-fns';

export default function HumanRequestsWidget({ businessId }) {
  const qc = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['human-requests', businessId],
    queryFn: () => base44.entities.HumanRequest.filter({ business_id: businessId, stato: 'nuovo' }, '-created_date', 20),
    enabled: !!businessId,
    staleTime: 15_000,
  });

  const markDone = useMutation({
    mutationFn: (id) => base44.entities.HumanRequest.update(id, { stato: 'gestito' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['human-requests', businessId] }),
  });

  if (!requests.length) return null;

  return (
    <div className="bg-card border border-orange-500/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Phone className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-semibold text-foreground">Vuole parlare con te</h3>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
          {requests.length}
        </span>
      </div>
      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/8 border border-orange-500/15">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-orange-400">
              {(r.contact_nome || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{r.contact_nome}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {r.canale === 'whatsapp' ? '🟢 WA' : '📸 IG'}
                </span>
              </div>
              {r.motivo && <p className="text-xs text-muted-foreground mt-0.5 truncate">"{r.motivo}"</p>}
              <p className="text-[10px] text-muted-foreground mt-1">
                {r.created_date ? format(new Date(r.created_date), 'HH:mm') : ''}
              </p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Link
                to="/inbox"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Vai all'Inbox
              </Link>
              <button
                onClick={() => markDone.mutate(r.id)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Gestito ✓
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}