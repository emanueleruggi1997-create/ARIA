import React from 'react';
import { Bot } from 'lucide-react';
import NotificationsBell from './NotificationsBell';
import { useAuth } from '@/lib/AuthContext';

export default function MobileHeader() {
  const { user } = useAuth();
  const initial = (user?.full_name || 'U')[0].toUpperCase();

  return (
    <header className="h-14 bg-[#080A0F] border-b border-border flex items-center justify-between px-4 shrink-0 z-40">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold text-foreground tracking-tight">Emaral Agent AI</span>
      </div>
      <div className="flex items-center gap-2">
        <NotificationsBell />
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-xs font-bold text-primary">{initial}</span>
        </div>
      </div>
    </header>
  );
}