import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const MOCK_NOTIFICATIONS = [
  { id: 1, text: '🤖 Agente ha risposto a Marco Rossi', time: '2 min fa', path: '/inbox', read: false },
  { id: 2, text: '⚠️ Messaggio scalato da Giulia Bianchi', time: '15 min fa', path: '/inbox', read: false },
  { id: 3, text: '✅ Post pubblicato su Instagram', time: '1 ora fa', path: '/social', read: false },
  { id: 4, text: '🎯 Nuovo lead qualificato: Luca Ferrari', time: '2 ore fa', path: '/crm', read: true },
  { id: 5, text: '🤖 Agente ha risposto a Anna Verdi', time: '3 ore fa', path: '/inbox', read: true },
];

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const navigate = useNavigate();

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => setNotifications(p => p.map(n => ({ ...n, read: true })));

  const toggleOpen = () => {
    if (!open) {
      // Mark all as read when opening
      setNotifications(p => p.map(n => ({ ...n, read: true })));
    }
    setOpen(v => !v);
  };

  const handleClick = (n) => {
    setOpen(false);
    navigate(n.path);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleOpen}
        className="relative w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center hover:border-primary/30 transition-all"
      >
        <Bell className="w-4 h-4 text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Notifiche</p>
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Segna tutte come lette
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn("w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors relative", !n.read && "bg-primary/5")}
                >
                  {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-primary absolute right-4 top-1/2 -translate-y-1/2" />}
                  <p className="text-sm text-foreground pr-4">{n.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}