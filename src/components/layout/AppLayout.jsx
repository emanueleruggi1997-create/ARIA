import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationsBell from './NotificationsBell';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import DashboardBgPreview from '@/components/settings/DashboardBgPreview';
import { useLang } from '@/lib/LanguageContext.jsx';

function LangToggle() {
  const { lang, toggleLang } = useLang();
  return (
    <button
      onClick={toggleLang}
      style={{
        background: 'transparent', border: '1px solid #1A2E4A', color: '#5A7A9A',
        fontSize: 12, fontWeight: 700, padding: '5px 10px', borderRadius: 20,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#00D4FF'; e.currentTarget.style.color = '#00D4FF'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1A2E4A'; e.currentTarget.style.color = '#5A7A9A'; }}
    >
      {lang === 'it' ? '🇮🇹 IT · Switch EN' : '🇬🇧 EN · Switch IT'}
    </button>
  );
}

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
        <div className="fixed top-3 right-4 z-30 flex items-center gap-2">
          <LangToggle />
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
        {/* Spacer for mobile bottom nav (68px + safe-area) */}
        <div className="h-[68px] md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <MobileBottomNav />
      </div>
    </div>
  );
}