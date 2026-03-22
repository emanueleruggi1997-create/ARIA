import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Shield, DollarSign, Users } from 'lucide-react';
import KpiCard from '@/components/dashboard/KpiCard';

const pianoPrezzo = { starter: 99, pro: 199, agency: 399 };

export default function Admin() {
  const queryClient = useQueryClient();

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: () => base44.entities.Business.list('-created_date'),
  });

  const activeBusinesses = businesses.filter(b => b.attivo !== false);
  const mrr = activeBusinesses.reduce((sum, b) => sum + (pianoPrezzo[b.piano] || 0), 0);

  const handleToggle = async (business) => {
    await base44.entities.Business.update(business.id, { attivo: !business.attivo });
    queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">Solo owner Emaral Group</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Business totali" value={businesses.length} icon={Users} />
        <KpiCard title="Business attivi" value={activeBusinesses.length} icon={Shield} />
        <KpiCard title="MRR Totale" value={`€${mrr.toLocaleString()}`} icon={DollarSign} />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Business</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Settore</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Piano</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">MRR</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Stato</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map(b => (
                <tr key={b.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                  <td className="p-4">
                    <p className="text-sm font-medium text-foreground">{b.nome}</p>
                    <p className="text-xs text-muted-foreground">{b.created_by}</p>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{b.settore || '—'}</td>
                  <td className="p-4">
                    <Badge variant="outline" className="text-xs capitalize">{b.piano}</Badge>
                  </td>
                  <td className="p-4 text-sm font-medium text-foreground">€{pianoPrezzo[b.piano] || 0}</td>
                  <td className="p-4">
                    <Badge className={b.attivo !== false ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}>
                      {b.attivo !== false ? 'Attivo' : 'Disattivo'}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Switch checked={b.attivo !== false} onCheckedChange={() => handleToggle(b)} />
                  </td>
                </tr>
              ))}
              {businesses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                    {isLoading ? 'Caricamento...' : 'Nessun business registrato'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}