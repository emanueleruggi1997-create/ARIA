import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import KpiCard from '@/components/dashboard/KpiCard';
import AgentStatusBadge from '@/components/dashboard/AgentStatusBadge';
import MessagesChart from '@/components/dashboard/MessagesChart';
import RobotMascot from '@/components/dashboard/RobotMascot';
import AppointmentRequests from '@/components/dashboard/AppointmentRequests';
import { MessageSquare, Users, CalendarDays, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const GIORNI_LABELS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export default function Dashboard() {
  const { business } = useBusiness();
  const { user } = useAuth();

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', business?.id],
    queryFn: () => base44.entities.Message.filter({ business_id: business?.id }, '-created_date', 50),
    enabled: !!business?.id,
    staleTime: 30_000,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', business?.id],
    queryFn: () => base44.entities.Lead.filter({ business_id: business?.id }, '-created_date', 10),
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

  const unreadMessages = messages.filter(m => !m.letto && m.ruolo === 'user');
  const todayMessages = messages.filter(m => {
    const d = new Date(m.created_date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const activeLeads = leads.filter(l => !['chiuso_vinto', 'chiuso_perso'].includes(l.stato));
  const aiMessages = messages.filter(m => m.ruolo === 'assistant');
  const aiRate = messages.length > 0 ? Math.round((aiMessages.length / messages.length) * 100) : 0;
  const unreadCount = unreadMessages.length;
  const upcomingAppointments = appointments.filter(a => a.stato === 'in_attesa' || a.stato === 'confermato');

  // Build real chart data from last 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toDateString();
    return {
      giorno: GIORNI_LABELS[d.getDay()],
      messaggi: messages.filter(m => new Date(m.created_date).toDateString() === dateStr).length,
    };
  });

  const statoLabels = {
    nuovo: 'Nuovo',
    qualificato: 'Qualificato',
    preventivo_inviato: 'Preventivo',
    chiuso_vinto: 'Vinto',
    chiuso_perso: 'Perso',
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {business?.nome || 'Il tuo business'} — {format(new Date(), 'd MMMM yyyy', { locale: it })}
          </p>
        </div>
        <AgentStatusBadge status={business?.stato_agente} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard title="Messaggi oggi" value={todayMessages.length} icon={MessageSquare} trend={12} trendLabel="vs ieri" />
        <KpiCard title="Lead attivi" value={activeLeads.length} icon={Users} trend={8} trendLabel="questa settimana" />
        <KpiCard title="Appuntamenti" value={upcomingAppointments.length} icon={CalendarDays} />
        <KpiCard title="Tasso risposta AI" value={`${aiRate}%`} icon={Zap} trend={5} trendLabel="vs sett. scorsa" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2">
          <MessagesChart data={chartData} />
        </div>

        {/* Recent leads */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Ultimi Lead</h3>
          <div className="space-y-3">
            {leads.slice(0, 3).length > 0 ? leads.slice(0, 3).map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{lead.contact_nome || 'Lead'}</p>
                  <p className="text-xs text-muted-foreground">{lead.tipo_progetto || 'Non specificato'}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {statoLabels[lead.stato] || lead.stato}
                </Badge>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">Nessun lead ancora</p>
            )}
          </div>
        </div>
      </div>

      {/* Instagram connection notice */}
      {business && !igReallyConnected && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-3">
            <span className="text-xl">📸</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Instagram non connesso</p>
              <p className="text-xs text-muted-foreground">Collega il tuo account per ricevere i DM</p>
            </div>
          </div>
          <Link to="/settings?tab=connections" className="shrink-0 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors">
            Connetti →
          </Link>
        </div>
      )}

      {/* Appointment Requests */}
      <AppointmentRequests businessId={business?.id} />

      {/* Recent unread messages */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Messaggi non letti</h3>
        <div className="space-y-2">
          {unreadMessages.slice(0, 5).length > 0 ? unreadMessages.slice(0, 5).map(msg => (
            <div key={msg.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{msg.testo}</p>
                <p className="text-xs text-muted-foreground">{msg.canale === 'whatsapp' ? 'WhatsApp' : 'Instagram'}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {msg.created_date ? format(new Date(msg.created_date), 'HH:mm') : ''}
              </span>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground text-center py-6">Nessun messaggio non letto</p>
          )}
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