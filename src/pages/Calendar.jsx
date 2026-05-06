import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { useLang } from '@/lib/LanguageContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, CalendarDays, Circle, CheckCircle2, XCircle, Phone, Video, Briefcase } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { safeDate } from '@/lib/safeDate.js';
import { it, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import AvailabilityPanel from '@/components/calendar/AvailabilityPanel';
import AppointmentCard from '@/components/calendar/AppointmentCard';

const STATI_CONFIG = {
  pending_confirmation: { color: 'text-orange-400', bg: 'bg-orange-400/10', icon: Circle },
  in_attesa: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Circle },
  confermato: { color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle2 },
  completato: { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: CheckCircle2 },
  annullato: { color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle },
};

const TIPI_ICONS = {
  chiamata: Phone, riunione: Video, servizio: Briefcase, altro: CalendarDays,
};

const EMPTY_FORM = {
  titolo: '',
  contact_nome: '',
  data: '',
  ora: '10:00',
  durata_minuti: 60,
  tipo: 'servizio',
  stato: 'in_attesa',
  note: '',
};

function AppointmentModal({ open, onClose, appointment, businessId, contacts, onSaved }) {
  const isEdit = !!appointment?.id;
  const [form, setForm] = useState(appointment || EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { t } = useLang();

  // Reset when appointment changes
  React.useEffect(() => {
    setForm(appointment || EMPTY_FORM);
  }, [appointment]);

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

  const handleSave = async () => {
    if (!form.titolo.trim() || !form.data) return;
    setSaving(true);
    try {
      // Se viene impostato come annullato → elimina direttamente
      if (isEdit && form.stato === 'annullato') {
        await base44.entities.Appointment.delete(appointment.id);
      } else {
        const data = { ...form, business_id: businessId };
        if (isEdit) {
          await base44.entities.Appointment.update(appointment.id, data);
        } else {
          await base44.entities.Appointment.create(data);
        }
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t.editAppointment : t.newAppointment}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">{t.titleField}</Label>
            <Input value={form.titolo} onChange={e => set('titolo', e.target.value)} placeholder="Es: Consulenza Instagram" className="mt-1 bg-secondary border-border" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">{t.clientField}</Label>
            {contacts.length > 0 ? (
              <Select value={form.contact_nome || ''} onValueChange={v => set('contact_nome', v)}>
                <SelectTrigger className="mt-1 bg-secondary border-border">
                  <SelectValue placeholder={t.selectContact} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>{t.noContact}</SelectItem>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.contact_nome} onChange={e => set('contact_nome', e.target.value)} placeholder={t.clientField} className="mt-1 bg-secondary border-border" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t.dateField}</Label>
              <Input type="date" value={form.data} onChange={e => set('data', e.target.value)} className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t.timeField}</Label>
              <Input type="time" value={form.ora} onChange={e => set('ora', e.target.value)} className="mt-1 bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t.typeField}</Label>
              <Select value={form.tipo} onValueChange={v => set('tipo', v)}>
                <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['chiamata','riunione','servizio','altro'].map(k => (
                    <SelectItem key={k} value={k}>{t[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t.statusField}</Label>
              <Select value={form.stato} onValueChange={v => set('stato', v)}>
                <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['in_attesa','confermato','completato','annullato'].map(k => (
                    <SelectItem key={k} value={k}>{t[k === 'in_attesa' ? 'inAttesa' : k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">{t.notesField}</Label>
            <Input value={form.note} onChange={e => set('note', e.target.value)} placeholder={t.notesPlaceholder} className="mt-1 bg-secondary border-border" />
          </div>

          <div className="flex gap-2">
            {isEdit && form.stato === 'annullato' && (
              <Button
                variant="destructive"
                onClick={async () => {
                  setSaving(true);
                  await base44.entities.Appointment.delete(appointment.id);
                  onSaved();
                  onClose();
                  setSaving(false);
                }}
                disabled={saving}
                className="flex-1"
              >
                {t.deleteForever}
              </Button>
            )}
            <Button onClick={handleSave} disabled={!form.titolo.trim() || !form.data || saving} className="flex-1">
              {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block" />{t.saving}</> : (isEdit ? t.saveChanges : t.createAppointment)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



export default function Calendar() {
  const { business } = useBusiness();
  const { t, lang } = useLang();
  const dateLocale = lang === 'en' ? enUS : it;
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [filterStato, setFilterStato] = useState('tutti');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', business?.id],
    queryFn: () => base44.entities.Appointment.filter({ business_id: business?.id }, 'data'),
    enabled: !!business?.id,
    staleTime: 30_000,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', business?.id],
    queryFn: () => base44.entities.Contact.filter({ business_id: business?.id }),
    enabled: !!business?.id,
    staleTime: 60_000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });

  const handleEdit = (appt) => {
    setSelectedAppt(appt);
    setModalOpen(true);
  };

  const handleNew = () => {
    setSelectedAppt(null);
    setModalOpen(true);
  };

  const filtered = appointments.filter(a => {
    if (filterStato === 'tutti') return true;
    return a.stato === filterStato;
  });

  const pendingCount = appointments.filter(a => a.stato === 'pending_confirmation').length;

  // Group by date
  const grouped = filtered.reduce((acc, appt) => {
    const key = appt.data || 'senza_data';
    if (!acc[key]) acc[key] = [];
    acc[key].push(appt);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  const today = appointments.filter(a => a.data === format(new Date(), 'yyyy-MM-dd'));
  const upcoming = appointments.filter(a => a.stato !== 'annullato' && a.stato !== 'completato');
  const pendingConfirm = appointments.filter(a => a.stato === 'pending_confirmation');

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.agenda}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>{today.length} {t.todayLabel.toLowerCase()} · {upcoming.length} {lang === 'en' ? 'scheduled' : 'in programma'}</span>
            {pendingConfirm.length > 0 && (
              <span className="text-xs font-semibold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-400/30">
                🔔 {pendingConfirm.length} da confermare
              </span>
            )}
          </p>
        </div>
        <Button onClick={handleNew} className="hidden md:flex">
          <Plus className="w-4 h-4 mr-2" /> {t.newAppointment}
        </Button>
        <button
          onClick={handleNew}
          className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-primary shadow-lg flex items-center justify-center"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[['tutti', t.filterAll], ['pending_confirmation', '🔔 Da confermare'], ['in_attesa', t.filterPending], ['confermato', t.filterConfirmed], ['completato', t.filterCompleted], ['annullato', t.filterCancelled]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterStato(val)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5',
              filterStato === val ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:text-foreground',
              val === 'pending_confirmation' && pendingCount > 0 && filterStato !== val && 'border border-orange-400/50 text-orange-400 bg-orange-400/10'
            )}
          >
            {label}
            {val === 'pending_confirmation' && pendingCount > 0 && (
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', filterStato === val ? 'bg-white/20' : 'bg-orange-400 text-white')}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <CalendarDays className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-base font-medium text-foreground">{t.noAppointments}</p>
          <p className="text-sm mt-1 mb-4">{t.addFirstAppointment}</p>
          <Button onClick={handleNew}><Plus className="w-4 h-4 mr-2" /> {t.createAppointment}</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(dateKey => {
            const d = dateKey !== 'senza_data' ? safeDate(dateKey) : null;
            const label = d
              ? isToday(d) ? `📅 ${t.todayLabel}` : isTomorrow(d) ? `📅 ${t.tomorrowLabel}` : `📅 ${format(d, 'EEEE d MMMM', { locale: dateLocale })}`
              : (lang === 'en' ? '📅 No date' : '📅 Senza data');
            return (
              <div key={dateKey}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{label}</h3>
                <div className="space-y-2">
                  {grouped[dateKey].map(appt => (
                    <AppointmentCard
                      key={appt.id}
                      appt={appt}
                      onEdit={handleEdit}
                      onRefresh={refresh}
                      lang={lang}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Availability Panel */}
      <AvailabilityPanel business={business} onSaved={refresh} />

      <AppointmentModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedAppt(null); }}
        appointment={selectedAppt}
        businessId={business?.id}
        contacts={contacts}
        onSaved={refresh}
      />
    </div>
  );
}