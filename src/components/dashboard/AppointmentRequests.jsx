import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, X, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export default function AppointmentRequests({ businessId }) {
  const queryClient = useQueryClient();

  const { data: pendingAppointments = [] } = useQuery({
    queryKey: ['pending-appointments', businessId],
    queryFn: () => base44.entities.Appointment.filter(
      { business_id: businessId, stato: 'in_attesa' },
      '-created_date',
      10
    ),
    enabled: !!businessId,
    refetchInterval: 20_000,
  });

  const handleAction = async (apt, newStato) => {
    await base44.entities.Appointment.update(apt.id, { stato: newStato });
    queryClient.invalidateQueries({ queryKey: ['pending-appointments', businessId] });
    queryClient.invalidateQueries({ queryKey: ['appointments', businessId] });
  };

  if (!pendingAppointments.length) return null;

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <CalendarDays className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Richieste Appuntamento</h3>
        <span className="ml-auto text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {pendingAppointments.length}
        </span>
      </div>

      <div className="space-y-3">
        {pendingAppointments.map(apt => (
          <div key={apt.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{apt.titolo}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                👤 {apt.contact_nome}
                {apt.data && (
                  <> &middot; 📅 {format(parseISO(apt.data), 'd MMM', { locale: it })}
                  {apt.ora && ` ore ${apt.ora}`}</>
                )}
              </p>
              {apt.note && (
                <p className="text-xs text-muted-foreground mt-1 italic truncate">{apt.note}</p>
              )}
              <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                📸 Instagram
              </span>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => handleAction(apt, 'confermato')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors text-xs font-semibold"
              >
                <Check className="w-3 h-3" /> Accetta
              </button>
              <button
                onClick={() => handleAction(apt, 'annullato')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-semibold"
              >
                <X className="w-3 h-3" /> Rifiuta
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}