import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Users, CalendarDays, Mail, ChevronRight } from 'lucide-react';

export default function TodayTasks({ unreadMessages, pendingLeads, todayAppointments, pendingCampaigns }) {
  const tasks = [
    {
      icon: '💬',
      label: unreadMessages > 0
        ? `${unreadMessages} messagg${unreadMessages === 1 ? 'io non letto' : 'i non letti'} da rispondere`
        : 'Nessun messaggio non letto',
      to: '/inbox',
      urgent: unreadMessages > 0,
    },
    {
      icon: '👥',
      label: pendingLeads > 0
        ? `${pendingLeads} lead in attesa di follow-up`
        : 'Nessun lead in attesa',
      to: '/crm',
      urgent: pendingLeads > 0,
    },
    {
      icon: '📅',
      label: todayAppointments > 0
        ? `${todayAppointments} appuntament${todayAppointments === 1 ? 'o' : 'i'} oggi`
        : 'Nessun appuntamento oggi',
      to: '/calendar',
      urgent: todayAppointments > 0,
    },
    {
      icon: '📧',
      label: pendingCampaigns > 0
        ? `${pendingCampaigns} campagna email programmata`
        : 'Nessuna campagna email programmata',
      to: '/crm',
      urgent: false,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">✅ Cosa fare oggi</h3>
      <div className="space-y-2">
        {tasks.map((task, i) => (
          <Link
            key={i}
            to={task.to}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/60 transition-colors group"
          >
            <span className="text-base shrink-0">{task.icon}</span>
            <span className={`flex-1 text-sm ${task.urgent ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {task.label}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}