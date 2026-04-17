import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import AdminBusiness from '@/components/admin/AdminBusiness';
import AdminPerformance from '@/components/admin/AdminPerformance';
import AdminLogs from '@/components/admin/AdminLogs';
import AdminSistema from '@/components/admin/AdminSistema';
import { useAuth } from '@/lib/AuthContext';

const TABS = [
  { id: 'business',     label: '👥 Business' },
  { id: 'performance',  label: '⚡ Performance' },
  { id: 'log',          label: '📋 Log' },
  { id: 'sistema',      label: '🔧 Sistema' },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState('business');
  const [logFilter, setLogFilter] = useState('Tutti');
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: () => base44.entities.Business.list('-created_date'),
    enabled: isAdmin,
  });

  // Blocca accesso a non-admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <Shield className="w-12 h-12 text-destructive/60" />
        <h2 className="text-xl font-bold text-foreground">Accesso negato</h2>
        <p className="text-muted-foreground text-sm">Questa sezione è riservata agli amministratori.</p>
      </div>
    );
  }

  const goToLogs = (filter = 'ERROR') => {
    setLogFilter(filter);
    setActiveTab('log');
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-destructive" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-destructive text-white">ADMIN</span>
          </div>
          <p className="text-xs text-muted-foreground">Solo owner Emaral Group</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 min-w-fit px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'business' && <AdminBusiness businesses={businesses} isLoading={isLoading} />}
      {activeTab === 'performance' && <AdminPerformance onGoToLogs={() => goToLogs('ERROR')} />}
      {activeTab === 'log' && <AdminLogs key={logFilter} initialFilter={logFilter} />}
      {activeTab === 'sistema' && <AdminSistema businessCount={businesses.length} />}
    </div>
  );
}