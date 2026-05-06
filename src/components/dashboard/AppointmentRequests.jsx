import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLang } from '@/lib/LanguageContext.jsx';
import { format } from 'date-fns';
import { safeDateLabel, formatSafeTimestamp } from '@/lib/safeDate.js';

// ── Confirm modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ apt, onConfirm, onClose }) {
  const { lang } = useLang();
  const en = lang === 'en';
  const today = format(new Date(), 'yyyy-MM-dd');
  const [data, setData] = useState(apt?.data || today);
  const [ora, setOra] = useState(apt?.ora || '10:00');
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
          <DialogTitle>{en ? 'Confirm Appointment' : 'Conferma Appuntamento'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {en
              ? <>Choose date and time for <strong className="text-foreground">{apt?.contact_nome}</strong>.</>
              : <>Scegli data e ora per <strong className="text-foreground">{apt?.contact_nome}</strong>.</>
            }
          </p>
          {/* Show original requested text if no valid date */}
          {apt?.note && apt.note.includes('Data richiesta:') && (
            <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
              📅 {apt.note.split('\n').find(l => l.startsWith('Data richiesta:')) || ''}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{en ? 'Date' : 'Data'}</Label>
              <Input type="date" value={data} onChange={e => setData(e.target.value)} className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{en ? 'Time' : 'Ora'}</Label>
              <Input type="time" value={ora} onChange={e => setOra(e.target.value)} className="mt-1 bg-secondary border-border" />
            </div>
          </div>
          {apt?.note && (
            <p className="text-xs text-muted-foreground italic bg-secondary/50 rounded-lg px-3 py-2 max-h-20 overflow-y-auto">{apt.note}</p>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">{en ? 'Cancel' : 'Annulla'}</Button>
            <Button onClick={handleConfirm} disabled={!data || loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                : `✅ ${en ? 'Confirm & Send' : 'Conferma & Invia'}`
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Single appointment card — isolated rendering ───────────────────────────────
function AppointmentCard({ apt, onAccept, onReject, actionLoading, lang }) {
  const en = lang === 'en';

  // Crash-proof date label
  const dateLabel = (() => {
    if (apt.data) {
      const label = safeDateLabel(apt.data, lang, en ? 'Today' : 'Oggi', en ? 'Tomorrow' : 'Domani');
      if (label !== 'Da confermare') return label;
    }
    // Fallback: cerca il testo naturale nelle note
    const noteLine = (apt.note || '').split('\n').find(l => l.startsWith('Data richiesta:'));
    if (noteLine) return noteLine.replace('Data richiesta: ', '').replace(/"/g, '');
    return en ? 'Date TBD' : 'Da confermare';
  })();

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Clock className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{apt.titolo || (en ? 'Appointment' : 'Appuntamento')}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          👤 {apt.contact_nome || '—'}
          {' · '}
          📅 {dateLabel}
          {apt.ora && ` ${en ? 'at' : 'ore'} ${apt.ora}`}
        </p>
        {apt.note && (
          <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">{apt.note}</p>
        )}
        {!apt.data && (
          <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <AlertTriangle className="w-2.5 h-2.5" /> {en ? 'Date not set' : 'Data mancante'}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={() => onAccept(apt)}
          disabled={actionLoading === apt.id}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors text-xs font-semibold disabled:opacity-50"
        >
          <Check className="w-3 h-3" /> {en ? 'Accept' : 'Accetta'}
        </button>
        <button
          onClick={() => onReject(apt)}
          disabled={actionLoading === apt.id}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-xs font-semibold disabled:opacity-50"
        >
          {actionLoading === apt.id
            ? <span className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
            : <X className="w-3 h-3" />
          } {en ? 'Reject' : 'Rifiuta'}
        </button>
      </div>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────
export default function AppointmentRequests({ businessId }) {
  const { lang } = useLang();
  const en = lang === 'en';
  const queryClient = useQueryClient();
  const [confirmingApt, setConfirmingApt] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const { data: pendingAppointments = [], isError } = useQuery({
    queryKey: ['pending-appointments', businessId],
    queryFn: () => base44.entities.Appointment.filter(
      { business_id: businessId, stato: 'in_attesa' },
      '-created_date',
      10
    ),
    enabled: !!businessId,
    refetchInterval: 15_000,
    refetchOnMount: true,
    staleTime: 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-appointments', businessId] });
    queryClient.invalidateQueries({ queryKey: ['appointments', businessId] });
  };

  const handleConfirm = async (apt, data, ora) => {
    setActionLoading(apt.id);
    try {
      await base44.functions.invoke('confirmAppointment', { appointmentId: apt.id, action: 'confirm', data, ora });
    } catch (e) {
      console.error('[AppointmentRequests] confirm error:', e.message);
    }
    setConfirmingApt(null);
    setActionLoading(null);
    invalidate();
  };

  const handleReject = async (apt) => {
    setActionLoading(apt.id);
    try {
      await base44.functions.invoke('confirmAppointment', { appointmentId: apt.id, action: 'reject' });
    } catch (e) {
      console.error('[AppointmentRequests] reject error:', e.message);
    }
    setActionLoading(null);
    invalidate();
  };

  if (isError || !pendingAppointments.length) return null;

  return (
    <>
      {confirmingApt && (
        <ConfirmModal apt={confirmingApt} onConfirm={handleConfirm} onClose={() => setConfirmingApt(null)} />
      )}

      <div className="bg-card border border-primary/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {en ? 'Appointment Requests' : 'Richieste Appuntamento'}
          </h3>
          <span className="ml-auto text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {pendingAppointments.length}
          </span>
        </div>

        <div className="space-y-3">
          {pendingAppointments.map(apt => {
            // Isolate each card: if render fails, show fallback
            try {
              return (
                <AppointmentCard
                  key={apt.id}
                  apt={apt}
                  lang={lang}
                  actionLoading={actionLoading}
                  onAccept={() => setConfirmingApt(apt)}
                  onReject={handleReject}
                />
              );
            } catch (e) {
              console.error('[AppointmentRequests] card render error for apt', apt.id, e.message);
              return (
                <div key={apt.id} className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-xs text-yellow-400">
                  ⚠️ {en ? 'Unable to display this request' : 'Impossibile visualizzare questa richiesta'} · ID: {apt.id?.slice(0, 8)}
                </div>
              );
            }
          })}
        </div>
      </div>
    </>
  );
}