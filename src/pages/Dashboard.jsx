import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { useLang } from '@/lib/LanguageContext';
import KpiCard from '@/components/dashboard/KpiCard';
import AgentStatusBadge from '@/components/dashboard/AgentStatusBadge';
import RobotMascot from '@/components/dashboard/RobotMascot';
import AppointmentRequests from '@/components/dashboard/AppointmentRequests';
import TodayTasks from '@/components/dashboard/TodayTasks';
import AriaProactiveWidget from '@/components/dashboard/AriaProactiveWidget';
import MessagesChartEnhanced from '@/components/dashboard/MessagesChartEnhanced';
import { MessageSquare, Users, CalendarDays, Zap, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { it as itLocale, enUS } from 'date-fns/locale';

function getGreeting(name, lang) {
  const h = new Date().getHours();
  const saluto = lang === 'en'
    ? (h >= 6 && h < 12 ? 'Good morning' : h >= 12 && h < 18 ? 'Good afternoon' : 'Good evening')
    : (h >= 6 && h < 12 ? 'Buongiorno' : h >= 12 && h < 18 ? 'Buon pomeriggio' : 'Buonasera');
  const firstName = name?.split(' ')[0] || '';
  return `${saluto}${firstName ? `, ${firstName}` : ''} 👋`;
}

const STATO_LABELS = {
  nuovo: 'Nuovo',
  qualificato: 'Qualificato',
  preventivo_inviato: 'Preventivo',
  chiuso_vinto: 'Vinto',
  chiuso_perso: 'Perso',
};

const STATO_COLORS = {
  nuovo: 'text-blue-400 bg-blue-400/10',
  qualificato: 'text-yellow-400 bg-yellow-400/10',
  preventivo_inviato: 'text-purple-400 bg-purple-400/10',
  chiuso_vinto: 'text-green-400 bg-green-400/10',
  chiuso_perso: 'text-red-400 bg-red-400/10',
};

const CANALE_COLORS = {
  instagram: 'text-pink-400 bg-pink-400/10',
  whatsapp: 'text-green-400 bg-green-400/10',
};

export default function Dashboard() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const { lang, t } = useLang();
  const dateLocale = lang === 'en' ? enUS : itLocale;

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', business?.id],
    queryFn: () => base44.entities.Message.filter({ business_id: business?.id }, '-created_date', 200),
    enabled: !!business?.id,
    staleTime: 30_000,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', business?.id],
    queryFn: () => base44.entities.Lead.filter({ business_id: business?.id }, '-created_date', 20),
    enabled: !!business?.id,
    staleTime: 60_000,
  });

  const { data: metaConnections = [] } = useQuery({
    queryKey: ['meta-connection-dashboard', user?.id],
    queryFn: () => base44.entities.MetaConnection.filter({ user_id: user?.id }),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const igReallyConnected = metaConnections.some(c => c.ig_connected && c.ig_account_id);

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', business?.id],
    queryFn: () => base44.entities.Appointment.filter({ business_id: business?.id }),
    enabled: !!business?.id,
    staleTime: 60_000,
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  const unreadMessages = messages.filter(m => !m.letto && m.ruolo === 'user');
  const todayMessages = messages.filter(m => {
    const d = new Date(m.created_date);
    return d.toDateString() === new Date().toDateString();
  });
  const activeLeads = leads.filter(l => !['chiuso_vinto', 'chiuso_perso'].includes(l.stato));
  const aiMessages = messages.filter(m => m.ruolo === 'assistant');
  const aiRate = messages.length > 0 ? Math.round((aiMessages.length / messages.length) * 100) : 0;
  const upcomingAppointments = appointments.filter(a => a.stato === 'in_attesa' || a.stato === 'confermato');
  const todayAppointments = appointments.filter(a => a.data === today);
  const unreadCount = unreadMessages.length;

  return (
    <div className="px-5 py-5 md:p-6 lg:p-8 space-y-3 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {getGreeting(user?.full_name, lang)}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: dateLocale })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-green-400">ATTIVO</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link to="/inbox">
          <KpiCard title={lang === 'en' ? 'Messages today' : 'Messaggi oggi'} value={todayMessages.length} icon={MessageSquare} trend={12} trendLabel={lang === 'en' ? 'vs yesterday' : 'vs ieri'} accent="blue" />
        </Link>
        <Link to="/crm">
          <KpiCard title={lang === 'en' ? 'Active leads' : 'Lead attivi'} value={activeLeads.length} icon={Users} trend={8} trendLabel={lang === 'en' ? 'this week' : 'questa settimana'} accent="green" />
        </Link>
        <Link to="/calendar">
          <KpiCard title={lang === 'en' ? 'Appointments' : 'Appuntamenti'} value={upcomingAppointments.length} icon={CalendarDays} accent="purple" />
        </Link>
        <Link to="/analytics">
          <KpiCard title={lang === 'en' ? 'AI Response' : 'Risposta AI'} value={`${aiRate}%`} icon={Zap} trend={5} trendLabel={lang === 'en' ? 'vs last week' : 'vs sett. scorsa'} accent="cyan" />
        </Link>
      </div>

      {/* ARIA proattiva + Cosa fare oggi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AriaProactiveWidget business={business} messages={messages} leads={leads} />
        <TodayTasks
          unreadMessages={unreadCount}
          pendingLeads={activeLeads.length}
          todayAppointments={todayAppointments.length}
          pendingCampaigns={0}
        />
      </div>

      {/* Chart */}
      <MessagesChartEnhanced messages={messages} />

      {/* Instagram connection notice */}
      {business && !igReallyConnected && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-3">
            <span className="text-xl">📸</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{lang === 'en' ? 'Instagram not connected' : 'Instagram non connesso'}</p>
              <p className="text-xs text-muted-foreground">{lang === 'en' ? 'Connect your account to receive DMs' : 'Collega il tuo account per ricevere i DM'}</p>
            </div>
          </div>
          <Link to="/settings?tab=connections" className="shrink-0 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors">
            {lang === 'en' ? 'Connect →' : 'Connetti →'}
          </Link>
        </div>
      )}

      {/* Appointment Requests */}
      <AppointmentRequests businessId={business?.id} />

      {/* Two column: Leads + Messaggi non letti */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ultimi 5 Lead */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">{t.latestLeads}</h3>
            <Link to="/crm" className="text-xs text-primary hover:underline">{lang === 'en' ? 'See all →' : 'Vedi tutti →'}</Link>
          </div>
          <div className="space-y-2">
            {leads.slice(0, 5).length > 0 ? leads.slice(0, 5).map(lead => (
              <Link
                key={lead.id}
                to="/crm"
                className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  {(lead.contact_nome || 'L')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{lead.contact_nome || 'Sconosciuto'}</p>
                  <p className="text-xs text-muted-foreground truncate">{lead.tipo_progetto || 'Non specificato'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATO_COLORS[lead.stato] || 'text-muted-foreground bg-secondary'}`}>
                    {STATO_LABELS[lead.stato] || lead.stato}
                  </span>
                  {lead.canale && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CANALE_COLORS[lead.canale] || 'text-muted-foreground bg-secondary'}`}>
                      {lead.canale === 'instagram' ? 'IG' : 'WA'}
                    </span>
                  )}
                </div>
              </Link>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">{lang === 'en' ? 'No leads yet' : 'Nessun lead ancora'}</p>
            )}
          </div>
        </div>

        {/* Messaggi non letti */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">{lang === 'en' ? 'Unread messages' : 'Messaggi non letti'}</h3>
            <Link to="/inbox" className="text-xs text-primary hover:underline">{lang === 'en' ? 'Go to inbox →' : 'Vai all\'inbox →'}</Link>
          </div>
          <div className="space-y-2">
            {unreadMessages.slice(0, 3).length > 0 ? unreadMessages.slice(0, 3).map(msg => (
              <Link
                key={msg.id}
                to="/inbox"
                className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{msg.testo}</p>
                  <p className="text-xs text-muted-foreground">{msg.canale === 'whatsapp' ? '🟢 WhatsApp' : '📸 Instagram'}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
                </span>
              </Link>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">{lang === 'en' ? 'No unread messages 🎉' : 'Nessun messaggio non letto 🎉'}</p>
            )}
          </div>
        </div>
      </div>

      <RobotMascot
        newMessageCount={unreadCount}
        aiResponseCount={aiMessages.length}
        business={business}
        activeLeads={activeLeads.length}
        scheduledPosts={upcomingAppointments.length}
        lastLead={leads[0] || null}
      />
    </div>
  );
}