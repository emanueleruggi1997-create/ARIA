import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { useLang } from '@/lib/LanguageContext.jsx';
import KpiCard from '@/components/dashboard/KpiCard';
import AgentStatusBadge from '@/components/dashboard/AgentStatusBadge';
import RobotMascot from '@/components/dashboard/RobotMascot';
import AppointmentRequests from '@/components/dashboard/AppointmentRequests';
import HumanRequestsWidget from '@/components/dashboard/HumanRequestsWidget';
import UrgentActionsWidget from '@/components/dashboard/UrgentActionsWidget';
import TodayTasks from '@/components/dashboard/TodayTasks';
import AriaProactiveWidget from '@/components/dashboard/AriaProactiveWidget';
import MessagesChartEnhanced from '@/components/dashboard/MessagesChartEnhanced';
import { MessageSquare, Users, CalendarDays, Zap, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { it as itLocale, enUS } from 'date-fns/locale';
import { formatSafeTimestamp } from '@/lib/safeDate.js';
import SafeSection from '@/components/ui/SafeSection.jsx';
import { safeArray, safeString } from '@/lib/safeData.js';

function getGreeting(name, lang) {
  const h = new Date().getHours();
  const saluto = lang === 'en'
    ? (h >= 6 && h < 12 ? 'Good morning' : h >= 12 && h < 18 ? 'Good afternoon' : 'Good evening')
    : (h >= 6 && h < 12 ? 'Buongiorno' : h >= 12 && h < 18 ? 'Buon pomeriggio' : 'Buonasera');
  const firstName = name?.split(' ')[0] || '';
  return `${saluto}${firstName ? `, ${firstName}` : ''} 👋`;
}

const STATO_LABELS_IT = {
  nuovo: 'Nuovo', qualificato: 'Qualificato',
  preventivo_inviato: 'Preventivo', chiuso_vinto: 'Vinto', chiuso_perso: 'Perso',
};
const STATO_LABELS_EN = {
  nuovo: 'New', qualificato: 'Qualified',
  preventivo_inviato: 'Proposal', chiuso_vinto: 'Won', chiuso_perso: 'Lost',
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

  const safeMessages = safeArray(messages);
  const safeLeads = safeArray(leads);
  const safeAppointments = safeArray(appointments);

  const unreadMessages = safeMessages.filter(m => !m?.letto && m?.ruolo === 'user');
  const todayMessages = safeMessages.filter(m => {
    try {
      if (!m?.created_date) return false;
      return new Date(m.created_date).toDateString() === new Date().toDateString();
    } catch { return false; }
  });
  const activeLeads = safeLeads.filter(l => !['chiuso_vinto', 'chiuso_perso'].includes(l?.stato));
  const aiMessages = safeMessages.filter(m => m?.ruolo === 'assistant');
  const aiRate = safeMessages.length > 0 ? Math.round((aiMessages.length / safeMessages.length) * 100) : 0;
  const upcomingAppointments = safeAppointments.filter(a => a?.stato === 'in_attesa' || a?.stato === 'confermato');
  const todayAppointments = safeAppointments.filter(a => a?.data === today);
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
            <span className="text-xs font-semibold text-green-400">{lang === 'en' ? 'ACTIVE' : 'ATTIVO'}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link to="/inbox">
          <KpiCard title={t.messagesToday} value={todayMessages.length} icon={MessageSquare} trend={12} trendLabel={t.vsYesterday} accent="blue" />
        </Link>
        <Link to="/crm">
          <KpiCard title={t.activeLeads} value={activeLeads.length} icon={Users} trend={8} trendLabel={t.thisWeek} accent="green" />
        </Link>
        <Link to="/calendar">
          <KpiCard title={t.appointments} value={upcomingAppointments.length} icon={CalendarDays} accent="purple" />
        </Link>
        <Link to="/analytics">
          <KpiCard title={t.aiResponse} value={`${aiRate}%`} icon={Zap} trend={5} trendLabel={t.vsLastWeek} accent="cyan" />
        </Link>
      </div>

      {/* ARIA proattiva + Cosa fare oggi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SafeSection label="ARIA Proattiva"><AriaProactiveWidget business={business} messages={safeMessages} leads={safeLeads} /></SafeSection>
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
              <p className="text-sm font-semibold text-foreground">{t.igNotConnected}</p>
              <p className="text-xs text-muted-foreground">{t.igNotConnectedDesc}</p>
            </div>
          </div>
          <Link to="/settings?tab=connections" className="shrink-0 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors">
            {t.connect}
          </Link>
        </div>
      )}

      {/* Azioni urgenti ARIA */}
      <SafeSection label="Azioni Urgenti"><UrgentActionsWidget businessId={business?.id} /></SafeSection>

      {/* Richieste di parlare col titolare */}
      <SafeSection label="Richieste Umane"><HumanRequestsWidget businessId={business?.id} /></SafeSection>

      {/* Appointment Requests */}
      <SafeSection label="Richieste Appuntamento"><AppointmentRequests businessId={business?.id} /></SafeSection>

      {/* Two column: Leads + Messaggi non letti */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ultimi 5 Lead */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">{t.latestLeads}</h3>
            <Link to="/crm" className="text-xs text-primary hover:underline">{t.seeAll}</Link>
          </div>
          <div className="space-y-2">
            {safeLeads.slice(0, 5).length > 0 ? safeLeads.slice(0, 5).map(lead => (
              <Link
                key={lead.id}
                to="/crm"
                className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  {(lead.contact_nome || 'L')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{lead.contact_nome || (lang === 'en' ? 'Unknown' : 'Sconosciuto')}</p>
                  <p className="text-xs text-muted-foreground truncate">{lead.tipo_progetto || (lang === 'en' ? 'Not specified' : 'Non specificato')}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATO_COLORS[lead.stato] || 'text-muted-foreground bg-secondary'}`}>
                    {(lang === 'en' ? STATO_LABELS_EN : STATO_LABELS_IT)[lead.stato] || lead.stato}
                  </span>
                  {lead.canale && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CANALE_COLORS[lead.canale] || 'text-muted-foreground bg-secondary'}`}>
                      {lead.canale === 'instagram' ? 'IG' : 'WA'}
                    </span>
                  )}
                </div>
              </Link>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">{t.noLeadsYet}</p>
            )}
          </div>
        </div>

        {/* Messaggi non letti */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">{t.unreadMessages}</h3>
            <Link to="/inbox" className="text-xs text-primary hover:underline">{t.goToInbox}</Link>
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
                  {formatSafeTimestamp(msg.created_date, 'HH:mm')}
                </span>
              </Link>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">{t.noUnread}</p>
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