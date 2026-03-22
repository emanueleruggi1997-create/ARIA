import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationsBell from './NotificationsBell';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className="fixed top-3 right-4 z-30">
          <NotificationsBell />
        </div>
      </div>

      {/* Mobile header (fixed top) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40">
        <MobileHeader />
      </div>

      {/* Main */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        collapsed ? "md:ml-[68px]" : "md:ml-[240px]"
      )}>
        {/* Spacer for mobile fixed header */}
        <div className="h-14 md:hidden" />
        <Outlet />
        {/* Spacer for mobile bottom nav */}
        <div className="h-16 md:hidden" />
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}