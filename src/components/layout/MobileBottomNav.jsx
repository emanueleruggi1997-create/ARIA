import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, Calendar, Menu, Bot, BarChart3, Settings, Shield, X, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/useBusinessContext.jsx';

const mainNav = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/inbox', icon: MessageSquare, label: 'Inbox' },
  { path: '/crm', icon: Users, label: 'CRM' },
  { path: '/social', icon: Calendar, label: 'Social' },
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

  const handleLogout = async () => {
    await base44.auth.logout('/');
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
            className="absolute bottom-0 left-0 right-0 bg-[#0F1219] border-t border-border rounded-t-2xl pb-20"
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
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0F1219] border-t border-border z-40 flex items-center">
        {mainNav.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center justify-center h-full gap-0.5 relative"
            >
              <item.icon className={cn("w-5 h-5 transition-colors", isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn("text-[10px] font-medium transition-colors", isActive ? 'text-primary' : 'text-muted-foreground')}>
                {item.label}
              </span>
              {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary rounded-full" />}
            </Link>
          );
        })}
        {/* Menu button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center h-full gap-0.5"
        >
          <Menu className="w-5 h-5 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">Menu</span>
        </button>
      </nav>
    </>
  );
}