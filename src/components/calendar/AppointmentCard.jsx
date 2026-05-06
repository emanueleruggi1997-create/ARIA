import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Circle, Phone, Video, Briefcase, CalendarDays, Clock, User, Send, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeDate, safeDateLabel } from '@/lib/safeDate.js';
import { format } from 'date-fns';
import { it, enUS } from 'date-fns/locale';

const STATI_CONFIG = {
  pending_confirmation: { color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30', icon: Circle, label: 'Da confermare' },
  in_attesa: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', icon: Circle, label: 'In attesa' },
  confermato: { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30', icon: CheckCircle2, label: 'Confermato' },
  completato: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', icon: CheckCircle2, label: 'Completato' },
  annullato: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', icon: XCircle, label: 'Annullato' },
};

const TIPI_ICONS = { chiamata: Phone, riunione: Video, servizio: Briefcase, altro: CalendarDays };

const CHANNEL_ICONS = { instagram: '📸', whatsapp: '💬', email: '✉️', manuale: '✏️' };

export default function AppointmentCard({ appt, onEdit, onRefresh, lang = 'it' }) {
  const [loading, setLoading] = useState(null); // 'confirm' | 'cancel' | 'resend'
  const [warning, setWarning] = useState(null);
  const [error, setError] = useState(null);
  const [optimisticStato, setOptimisticStato] = useState(null);
  const [messageSent, setMessageSent] = useState(null); // true | false | null

  const stato = optimisticStato || appt.stato || 'in_attesa';
  const cfg = STATI_CONFIG[stato] || STATI_CONFIG.in_attesa;
  const StatoIcon = cfg.icon;
  const TipoIcon = TIPI_ICONS[appt.tipo] || TIPI_ICONS.altro;
  const isPending = stato === 'pending_confirmation' || stato === 'in_attesa';
  const isConfirmed = stato === 'confermato';
  const isCancelled = stato === 'annullato';

  const dateLocale = lang === 'en' ? enUS : it;
  const dateLabel = appt.data
    ? format(safeDate(appt.data) || new Date(), 'EEEE d MMMM', { locale: dateLocale })
    : appt.requested_date_text || 'Data da definire';

  const invoke = async (action) => {
    setLoading(action);
    setWarning(null);
    setError(null);
    setMessageSent(null);

    // Ottimistic update immediato
    if (action === 'confirm') setOptimisticStato('confermato');
    if (action === 'cancel') setOptimisticStato('annullato');

    try {
      const res = await base44.functions.invoke('confirmAppointmentAction', {
        appointment_id: appt.id,
        action,
      });
      const data = res.data;

      if (action === 'confirm' || action === 'resend') {
        if (data?.message_sent) {
          setMessageSent(true);
        } else {
          setMessageSent(false);
          if (data?.warning) setWarning(data.warning);
          if (data?.error) setError(data.error);
        }
      }

      if (!data?.ok && data?.error && action !== 'confirm') {
        setError(data.error);
        setOptimisticStato(null); // rollback
      }

      onRefresh?.();
    } catch (e) {
      setError(e.message || 'Errore');
      setOptimisticStato(null); // rollback
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={cn(
      'rounded-xl border transition-all p-4 space-y-3',
      cfg.bg, cfg.border,
      isCancelled && 'opacity-60'
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <TipoIcon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground truncate">{appt.titolo || 'Appuntamento'}</p>
            {appt.canale_origine && (
              <span className="text-xs">{CHANNEL_ICONS[appt.canale_origine] || ''}</span>
            )}
          </div>
          {appt.contact_nome && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3" /> {appt.contact_nome}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> {dateLabel}
            </span>
            {(appt.ora || appt.requested_time_text) && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {appt.ora || appt.requested_time_text}
              </span>
            )}
          </div>
          {appt.service_requested && appt.service_requested !== appt.titolo && (
            <p className="text-xs text-muted-foreground mt-0.5">Servizio: {appt.service_requested}</p>
          )}
        </div>
        <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full shrink-0', cfg.color, cfg.bg)}>
          <StatoIcon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      {/* Contact info */}
      {(appt.email || appt.phone || appt.customer_channel_id) && (
        <div className="flex gap-3 flex-wrap text-xs text-muted-foreground">
          {appt.email && <span>✉️ {appt.email}</span>}
          {appt.phone && <span>📞 {appt.phone}</span>}
          {appt.customer_channel_id && appt.canale_origine === 'instagram' && (
            <span>@ig: {appt.customer_username || appt.customer_channel_id}</span>
          )}
        </div>
      )}

      {/* Notes */}
      {appt.note && (
        <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2 leading-relaxed">{appt.note}</p>
      )}

      {/* Warning / Error */}
      {warning && (
        <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {warning}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Confirmed info / message feedback */}
      {isConfirmed && (messageSent === true || appt.confirmation_message_sent) && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <Send className="w-3 h-3" /> Conferma inviata al cliente
        </div>
      )}
      {isConfirmed && messageSent === false && (
        <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Confermato, ma il messaggio non è stato inviato.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap pt-1">
        {/* Modifica — sempre visibile */}
        <button
          onClick={() => onEdit?.(appt)}
          className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-semibold hover:text-foreground hover:bg-muted transition-colors"
        >
          ✏️ Modifica
        </button>

        {/* Conferma — solo se pending/in_attesa */}
        {isPending && (
          <button
            disabled={!!loading}
            onClick={() => invoke('confirm')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-colors disabled:opacity-50"
          >
            {loading === 'confirm' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Conferma
          </button>
        )}

        {/* Annulla — se non già annullato */}
        {!isCancelled && (
          <button
            disabled={!!loading}
            onClick={() => invoke('cancel')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-50"
          >
            {loading === 'cancel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Annulla
          </button>
        )}

        {/* Reinvia conferma — se confermato e messaggio non inviato o in errore */}
        {isConfirmed && (!appt.confirmation_message_sent || appt.confirmation_error) && (
          <button
            disabled={!!loading}
            onClick={() => invoke('resend')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-colors disabled:opacity-50"
          >
            {loading === 'resend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Reinvia conferma
          </button>
        )}
      </div>
    </div>
  );
}