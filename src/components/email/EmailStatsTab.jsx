import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import KpiCard from '@/components/dashboard/KpiCard';
import { Mail, Eye, MousePointer, Users, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['hsl(142,60%,50%)', 'hsl(340,75%,55%)', 'hsl(222,85%,60%)', 'hsl(30,80%,55%)', 'hsl(280,65%,60%)'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      {payload.map((p, i) => <p key={i} className="text-sm font-medium" style={{ color: p.color }}>{p.name}: {p.value}</p>)}
    </div>
  );
  return null;
};

export default function EmailStatsTab({ businessId }) {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns', businessId],
    queryFn: () => base44.entities.EmailCampaign.filter({ business_id: businessId }, '-sent_at', 50),
    enabled: !!businessId,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-email', businessId],
    queryFn: () => base44.entities.ContactEmail.filter({ business_id: businessId }),
    enabled: !!businessId,
  });

  const inviate = campaigns.filter(c => c.stato === 'inviata');
  const totaleInviati = inviate.reduce((s, c) => s + (c.destinatari_count || 0), 0);
  const totaleAperture = inviate.reduce((s, c) => s + (c.aperture || 0), 0);
  const totaleClick = inviate.reduce((s, c) => s + (c.click || 0), 0);
  const tassoApertura = totaleInviati > 0 ? Math.round((totaleAperture / totaleInviati) * 100) : 0;
  const tassoClick = totaleInviati > 0 ? Math.round((totaleClick / totaleInviati) * 100) : 0;
  const activeContacts = contacts.filter(c => c.stato === 'attivo').length;
  const disiscritti = contacts.filter(c => c.stato === 'disiscritto').length;

  // Chart: last 30 days
  const lineData = Array.from({ length: 10 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (9 - i) * 3);
    const dateStr = d.toDateString();
    return {
      giorno: format(d, 'dd/MM'),
      inviate: inviate.filter(c => c.sent_at && new Date(c.sent_at).toDateString() === dateStr).reduce((s, c) => s + (c.destinatari_count || 0), 0),
    };
  });

  // Bar: campaigns
  const barData = inviate.slice(0, 6).map(c => ({
    name: c.nome.substring(0, 12) + (c.nome.length > 12 ? '...' : ''),
    Aperture: c.aperture || 0,
    Click: c.click || 0,
  }));

  // Donut: contacts by source
  const fontiMap = {};
  contacts.forEach(c => { const f = c.fonte || 'manuale'; fontiMap[f] = (fontiMap[f] || 0) + 1; });
  const donutData = Object.entries(fontiMap).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard title="Email inviate" value={totaleInviati} icon={Mail} />
        <KpiCard title="Tasso apertura" value={`${tassoApertura}%`} icon={Eye} />
        <KpiCard title="Tasso click" value={`${tassoClick}%`} icon={MousePointer} />
        <KpiCard title="Iscritti" value={activeContacts} icon={Users} />
        <KpiCard title="Disiscrizioni" value={disiscritti} icon={TrendingDown} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Email inviate (30 giorni)</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,15%)" />
                <XAxis dataKey="giorno" tick={{ fill: 'hsl(220,10%,50%)', fontSize: 10 }} axisLine={false} />
                <YAxis tick={{ fill: 'hsl(220,10%,50%)', fontSize: 10 }} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="inviate" stroke="hsl(222,85%,60%)" strokeWidth={2} name="Inviate" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Contatti per fonte</h3>
          <div className="h-48">
            {donutData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {donutData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nessun dato</div>
            )}
          </div>
        </div>

        {barData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Confronto campagne</h3>
            <div className="h-48">
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,15%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(220,10%,50%)', fontSize: 10 }} axisLine={false} />
                  <YAxis tick={{ fill: 'hsl(220,10%,50%)', fontSize: 10 }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Aperture" fill="hsl(222,85%,60%)" radius={[4,4,0,0]} />
                  <Bar dataKey="Click" fill="hsl(160,60%,45%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {inviate.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Ultime campagne inviate</h3>
          </div>
          <table className="w-full">
            <thead className="bg-secondary/50">
              <tr>
                {['Nome', 'Inviata il', 'Destinatari', 'Aperture', 'Click', 'Disiscrizioni'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inviate.slice(0, 10).map(c => (
                <tr key={c.id} className="border-t border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{c.nome}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{c.sent_at ? format(new Date(c.sent_at), 'dd/MM/yy HH:mm') : '—'}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{c.destinatari_count}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{c.aperture || 0} {c.destinatari_count > 0 ? `(${Math.round((c.aperture||0)/c.destinatari_count*100)}%)` : ''}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{c.click || 0}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{c.disiscrizioni || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}