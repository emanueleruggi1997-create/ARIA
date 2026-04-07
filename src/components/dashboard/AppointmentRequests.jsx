import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, X, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ConfirmModal({ apt, onConfirm, onClose }) {
  const suggestedDate = apt?.data || format(new Date(), 'yyyy-MM-dd');
  const suggestedTime = apt?.ora || '10:00';
  const [data, setData] = useState(suggestedDate);
  const [ora, setOra] = useState(suggestedTime);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(apt, data, ora);
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle>Conferma Appuntamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scegli data e ora per <strong className="text-foreground">{apt?.contact_nome}</strong>. ARIA invierà automaticamente la conferma su Instagram.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ora</Label>
              <Input type="time" value={ora} onChange={e => setOra(e.target.value)} className="mt-1 bg-secondary border-border" />
            </div>
          </div>
          {apt?.note && (
            <p className="text-xs text-muted-foreground italic bg-secondary/50 rounded-lg px-3 py-2">{apt.note}</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Annulla</Button>
            <Button onClick={handleConfirm} disabled={!data || loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : '✅ Conferma & Invia'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AppointmentRequests({ businessId }) {
  const queryClient = useQueryClient();
  const [confirmingApt, setConfirmingApt] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-appointments', businessId] });
    queryClient.invalidateQueries({ queryKey: ['appointments', businessId] });
  };

  const handleConfirm = async (apt, data, ora) => {
    setActionLoading(apt.id);
    await base44.functions.invoke('confirmAppointment', {
      appointmentId: apt.id,
      action: 'confirm',
      data,
      ora,
    });
    setConfirmingApt(null);
    setActionLoading(null);
    invalidate();
  };

  const handleReject = async (apt) => {
    setActionLoading(apt.id);
    await base44.functions.invoke('confirmAppointment', {
      appointmentId: apt.id,
      action: 'reject',
    });
    setActionLoading(null);
    invalidate();
  };

  if (!pendingAppointments.length) return null;

  return (
    <>
      {confirmingApt && (
        <ConfirmModal
          apt={confirmingApt}
          onConfirm={handleConfirm}
          onClose={() => setConfirmingApt(null)}
        />
      )}

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
                    <> · 📅 {format(parseISO(apt.data), 'd MMM', { locale: it })}
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
                  onClick={() => setConfirmingApt(apt)}
                  disabled={actionLoading === apt.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors text-xs font-semibold disabled:opacity-50"
                >
                  <Check className="w-3 h-3" /> Accetta
                </button>
                <button
                  onClick={() => handleReject(apt)}
                  disabled={actionLoading === apt.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-semibold disabled:opacity-50"
                >
                  {actionLoading === apt.id ? <span className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" /> : <X className="w-3 h-3" />} Rifiuta
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}