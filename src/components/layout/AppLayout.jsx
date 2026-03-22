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
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className="fixed top-3 right-4 z-30">
          <NotificationsBell />
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40">
        <MobileHeader />
      </div>

      {/* Main content */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        /* desktop */ "md:ml-[240px]",
      )}
        style={{ marginLeft: undefined }}
      >
        {/* Desktop uses sidebar margin; mobile uses top/bottom padding */}
        <div className="md:hidden h-14" />
        <div
          className={cn(
            "md:transition-all md:duration-300",
            collapsed ? "md:ml-[68px]" : "md:ml-[240px]",
          )}
          style={{}}
        >
          <Outlet />
        </div>
        {/* Mobile bottom bar spacer */}
        <div className="md:hidden h-16" />
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}