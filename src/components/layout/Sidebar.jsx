import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, MessageSquare, Users, Calendar, 
  Bot, BarChart3, Settings, Shield, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/inbox', icon: MessageSquare, label: 'Inbox' },
  { path: '/crm', icon: Users, label: 'CRM & Email' },
  { path: '/social', icon: Calendar, label: 'Social Manager' },
  { path: '/agent', icon: Bot, label: 'Agente AI' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Impostazioni' },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const { business } = useBusiness();

  return (
    <aside className={cn(
      "hidden md:flex fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 flex-col transition-all duration-300",
      collapsed ? "w-[68px]" : "w-[240px]"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap">
              <p className="text-sm font-bold text-foreground tracking-tight">Emaral Agent AI</p>
              <p className="text-[10px] text-muted-foreground">by Emaral Group</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive && "text-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Admin link */}
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
      </nav>

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
              Agente {business.stato_agente === 'attivo' ? 'Attivo' : business.stato_agente === 'pausa' ? 'In Pausa' : 'Disattivo'}
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