import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, CalendarDays, Menu, Bot, BarChart3, Settings, Shield, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { useQuery } from '@tanstack/react-query';

const mainNav = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { path: '/inbox', icon: MessageSquare, label: 'Inbox' },
  { path: '/crm', icon: Users, label: 'CRM' },
  { path: '/calendar', icon: CalendarDays, label: 'Agenda' },
];

const menuItems = [
  { path: '/agent', icon: Bot, label: 'ARIA', isAria: true },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Impostazioni' },
  { path: '/admin', icon: Shield, label: 'Admin' },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { business } = useBusiness();
  const ariaColor = business?.robot_color || business?.avatar_agente || '#3B6EF8';
  const ariaName = business?.robot_name || business?.nome_agente || 'ARIA';
  const ariaActive = business?.stato_agente === 'attivo';

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', business?.id],
    queryFn: () => base44.entities.Lead.filter({ business_id: business?.id }),
    enabled: !!business?.id,
    staleTime: 60_000,
  });
  const activeLeadCount = leads.filter(l => !['chiuso_vinto', 'chiuso_perso'].includes(l.stato)).length;

  const handleLogout = async () => {
    base44.auth.logout('/');
  };

  const handleMenuNav = (path) => {
    setDrawerOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#0C0F1A] border-t border-white/[0.05] rounded-t-2xl pb-24"
            style={{ paddingBottom: 'calc(96px + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Menu</p>
              <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="py-2">
              {menuItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => handleMenuNav(item.path)}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-4 text-left transition-colors",
                    location.pathname === item.path ? 'text-primary' : 'text-foreground hover:bg-secondary/50'
                  )}
                >
                  {item.isAria ? (
                    <div className="relative">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: ariaColor }}
                      >
                        {ariaName[0]?.toUpperCase()}
                      </div>
                      {ariaActive && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-[#0F1219]" />
                      )}
                    </div>
                  ) : (
                    <item.icon className="w-5 h-5" />
                  )}
                  <span className="text-[15px] font-medium">{item.isAria ? ariaName : item.label}</span>
                </button>
              ))}
              <button
                onClick={() => handleMenuNav('/legal')}
                className="w-full flex items-center gap-4 px-5 py-4 text-left text-muted-foreground hover:bg-secondary/50 transition-colors"
              >
                <span className="text-[15px]">📄</span>
                <span className="text-[15px] font-medium">Termini & Privacy</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-5 py-4 text-left text-red-400 hover:bg-red-500/10 transition-colors border-t border-border mt-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-[15px] font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch bg-[#0C0F1A]"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex w-full h-[68px]">
          {mainNav.map(item => {
            const isActive = location.pathname === item.path;
            const isCRM = item.path === '/crm';
            const isInbox = item.path === '/inbox';
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative min-h-[44px]"
              >
                <div className="relative">
                  <item.icon className={cn("w-6 h-6 transition-colors", isActive ? 'text-primary' : 'text-muted-foreground')} />
                  {isCRM && activeLeadCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                      {activeLeadCount > 99 ? '99+' : activeLeadCount}
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px] font-medium transition-colors", isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-primary rounded-full" />
                )}
              </Link>
            );
          })}
          {/* Menu button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px]"
          >
            <Menu className="w-6 h-6 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}