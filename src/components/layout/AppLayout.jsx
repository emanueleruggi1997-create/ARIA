import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationsBell from './NotificationsBell';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      {/* Notification bell — fixed top right */}
      <div className="fixed top-3 right-4 z-30">
        <NotificationsBell />
      </div>
      <main className={cn(
        "min-h-screen transition-all duration-300",
        collapsed ? "ml-[68px]" : "ml-[240px]"
      )}>
        <Outlet />
      </main>
    </div>
  );
}