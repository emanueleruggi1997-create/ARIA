import React from 'react';
import BrandLogo from '@/components/layout/BrandLogo.jsx';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, MessageSquare, Users, CalendarDays, 
  Bot, BarChart3, Settings, Shield, ChevronLeft, ChevronRight
} from 'lucide-react';

const LOGO_URL = 'https://media.base44.com/images/public/69bfc400a0538988ee3a6cfd/56749d76c_logoemaralagentaitrasparente.png';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { useLang } from '@/lib/LanguageContext.jsx';

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const { business } = useBusiness();
  const { user } = useAuth();
  const { t, lang } = useLang();
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t.dashboard },
    { path: '/inbox', icon: MessageSquare, label: t.inbox },
    { path: '/crm', icon: Users, label: t.crm },
    { path: '/calendar', icon: CalendarDays, label: t.calendar },
    { path: '/agent', icon: null, label: t.agent },
    { path: '/analytics', icon: BarChart3, label: t.analytics },
    { path: '/settings', icon: Settings, label: t.settings },
  ];

  return (
    <aside className={cn(
      "hidden md:flex fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 flex-col",
      "transition-[width] duration-200 ease-out will-change-[width]",
      collapsed ? "w-[68px]" : "w-[240px]"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <img src={LOGO_URL} alt="Emaral" className="shrink-0" style={{ width: 96, height: 64, objectFit: 'contain', mixBlendMode: 'screen' }} />
          {!collapsed && (
            <div className="whitespace-nowrap">
              <BrandLogo size="md" />
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isAria = item.path === '/agent';
          const ariaColor = business?.robot_color || business?.avatar_agente || '#3B6EF8';
          const ariaName = business?.robot_name || business?.nome_agente || 'ARIA';
          const ariaActive = business?.stato_agente === 'attivo';

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                "transition-colors duration-100",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {isAria ? (
                <div className="relative shrink-0">
                  <div
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: ariaColor }}
                  >
                    {ariaName[0]?.toUpperCase()}
                  </div>
                  {ariaActive && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-sidebar" />
                  )}
                </div>
              ) : (
                <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-primary")} />
              )}
              {!collapsed && <span>{isAria ? ariaName : item.label}</span>}
            </Link>
          );
        })}

        {/* Admin link — solo per admin */}
        {isAdmin && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              location.pathname === '/admin'
                ? "bg-primary/10 text-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Shield className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span>Admin</span>}
          </Link>
        )}
      </nav>

      {/* Legal link */}
      {!collapsed && (
        <div className="px-4 pt-2 pb-1">
          <Link to="/legal" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {t.termsPrivacy || 'Termini & Privacy'}
          </Link>
        </div>
      )}

      {/* Agent status */}
      {business && !collapsed && (
        <div className="px-4 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              business.stato_agente === 'attivo' ? 'bg-green-500' :
              business.stato_agente === 'pausa' ? 'bg-yellow-500' : 'bg-red-500'
            )} />
            <span className="text-xs text-muted-foreground">
              {business.stato_agente === 'attivo' ? t.agentActive : business.stato_agente === 'pausa' ? t.agentPaused : t.agentOff}
            </span>
          </div>
        </div>
      )}

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="h-10 flex items-center justify-center border-t border-sidebar-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}