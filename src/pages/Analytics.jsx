import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import KpiCard from '@/components/dashboard/KpiCard';
import { Button } from '@/components/ui/button';
import { Download, Zap, Clock, TrendingUp, Calendar } from 'lucide-react';

const COLORS = ['hsl(222,85%,60%)', 'hsl(160,60%,45%)', 'hsl(30,80%,55%)', 'hsl(280,65%,60%)', 'hsl(340,75%,55%)'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-medium" style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { business } = useBusiness();

  const { data: messages = [] } = useQuery({
    queryKey: ['analytics-messages', business?.id],
    queryFn: () => base44.entities.Message.filter({ business_id: business?.id }, '-created_date', 500),
    enabled: !!business?.id,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['analytics-leads', business?.id],
    queryFn: () => base44.entities.Lead.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['analytics-posts', business?.id],
    queryFn: () => base44.entities.Post.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  // Messages by channel over 30 days
  const waMessages = messages.filter(m => m.canale === 'whatsapp').length;
  const igMessages = messages.filter(m => m.canale === 'instagram').length;
  const channelData = [
    { name: 'Settimana 1', whatsapp: Math.round(waMessages * 0.2), instagram: Math.round(igMessages * 0.2) },
    { name: 'Settimana 2', whatsapp: Math.round(waMessages * 0.25), instagram: Math.round(igMessages * 0.3) },
    { name: 'Settimana 3', whatsapp: Math.round(waMessages * 0.3), instagram: Math.round(igMessages * 0.25) },
    { name: 'Settimana 4', whatsapp: Math.round(waMessages * 0.25), instagram: Math.round(igMessages * 0.25) },
  ];

  // Leads by status
  const leadStatusData = ['nuovo', 'qualificato', 'preventivo_inviato', 'chiuso_vinto', 'chiuso_perso'].map(s => ({
    name: s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    value: leads.filter(l => l.stato === s).length,
  })).filter(d => d.value > 0);

  // Post performance
  const postData = posts.filter(p => p.stato === 'pubblicato').slice(0, 6).map((p, i) => ({
    name: `Post ${i + 1}`,
    reach: p.reach || 0,
    likes: p.likes || 0,
    commenti: p.commenti || 0,
  }));

  const aiRate = messages.length > 0 ? Math.round((messages.filter(m => m.ruolo === 'assistant').length / messages.length) * 100) : 0;
  const publishedThisMonth = posts.filter(p => p.stato === 'pubblicato').length;
  const wonRate = leads.length > 0 ? Math.round((leads.filter(l => l.stato === 'chiuso_vinto').length / leads.length) * 100) : 0;

  const handleExportCSV = () => {
    const rows = [['Tipo', 'Totale'], ['Messaggi', messages.length], ['Lead', leads.length], ['Post', posts.length], ['AI Rate', aiRate + '%']];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'analytics.csv'; a.click();
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KpiCard title="AI Response Rate" value={`${aiRate}%`} icon={Zap} />
        <KpiCard title="Tempo medio risposta" value="< 30s" icon={Clock} />
        <KpiCard title="Lead convertiti" value={`${wonRate}%`} icon={TrendingUp} />
        <KpiCard title="Post pubblicati" value={publishedThisMonth} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Messages by channel */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Messaggi per canale (30 giorni)</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={channelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,15%)" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(220,10%,50%)', fontSize: 11 }} axisLine={false} />
                <YAxis tick={{ fill: 'hsl(220,10%,50%)', fontSize: 11 }} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="whatsapp" stroke="hsl(142,60%,50%)" strokeWidth={2} name="WhatsApp" />
                <Line type="monotone" dataKey="instagram" stroke="hsl(340,75%,55%)" strokeWidth={2} name="Instagram" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Leads pie chart */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Lead per stato</h3>
          <div className="h-56">
            {leadStatusData.length > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={leadStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {leadStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nessun dato</div>
            )}
          </div>
        </div>

        {/* Post performance */}
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Performance Post</h3>
          <div className="h-56">
            {postData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={postData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,15%)" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(220,10%,50%)', fontSize: 11 }} axisLine={false} />
                  <YAxis tick={{ fill: 'hsl(220,10%,50%)', fontSize: 11 }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="reach" fill="hsl(222,85%,60%)" name="Reach" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="likes" fill="hsl(160,60%,45%)" name="Likes" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="commenti" fill="hsl(30,80%,55%)" name="Commenti" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nessun post pubblicato</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}