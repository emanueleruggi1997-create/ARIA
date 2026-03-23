import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationsBell from './NotificationsBell';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import DashboardBgPreview from '@/components/settings/DashboardBgPreview';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { business } = useBusiness();
  const location = useLocation();
  const isDashboard = location.pathname === '/';
  const dashBg = business?.dashboard_bg || 'pure';
  const accent = business?.theme_accent || '#3B6EF8';
  const bgUrl = business?.custom_bg_url || '';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Dashboard background layer */}
      {isDashboard && dashBg !== 'pure' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <DashboardBgPreview type={dashBg} accent={accent} bgUrl={bgUrl} absolute />
        </div>
      )}

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
      <main className={cn("relative z-10",
        "min-h-screen transition-all duration-300",
        collapsed ? "md:ml-[68px]" : "md:ml-[240px]",
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