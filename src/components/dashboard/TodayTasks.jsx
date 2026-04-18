import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext.jsx';

export default function TodayTasks({ unreadMessages, pendingLeads, todayAppointments, pendingCampaigns }) {
  const { lang } = useLang();
  const en = lang === 'en';

  const tasks = [
    {
      icon: '💬',
      label: unreadMessages > 0
        ? en
          ? `${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'} to reply to`
          : `${unreadMessages} messagg${unreadMessages === 1 ? 'io non letto' : 'i non letti'} da rispondere`
        : en ? 'No unread messages' : 'Nessun messaggio non letto',
      to: '/inbox',
      urgent: unreadMessages > 0,
    },
    {
      icon: '👥',
      label: pendingLeads > 0
        ? en
          ? `${pendingLeads} lead${pendingLeads === 1 ? '' : 's'} waiting for follow-up`
          : `${pendingLeads} lead in attesa di follow-up`
        : en ? 'No leads waiting' : 'Nessun lead in attesa',
      to: '/crm',
      urgent: pendingLeads > 0,
    },
    {
      icon: '📅',
      label: todayAppointments > 0
        ? en
          ? `${todayAppointments} appointment${todayAppointments === 1 ? '' : 's'} today`
          : `${todayAppointments} appuntament${todayAppointments === 1 ? 'o' : 'i'} oggi`
        : en ? 'No appointments today' : 'Nessun appuntamento oggi',
      to: '/calendar',
      urgent: todayAppointments > 0,
    },
    {
      icon: '📧',
      label: pendingCampaigns > 0
        ? en
          ? `${pendingCampaigns} scheduled email campaign${pendingCampaigns === 1 ? '' : 's'}`
          : `${pendingCampaigns} campagna email programmata`
        : en ? 'No scheduled email campaigns' : 'Nessuna campagna email programmata',
      to: '/crm',
      urgent: false,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        {en ? '✅ What to do today' : '✅ Cosa fare oggi'}
      </h3>
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