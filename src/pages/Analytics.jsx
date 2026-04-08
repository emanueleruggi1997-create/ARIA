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
    staleTime: 120_000,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['analytics-leads', business?.id],
    queryFn: () => base44.entities.Lead.filter({ business_id: business?.id }),
    enabled: !!business?.id,
    staleTime: 120_000,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['analytics-appointments', business?.id],
    queryFn: () => base44.entities.Appointment.filter({ business_id: business?.id }),
    enabled: !!business?.id,
    staleTime: 120_000,
  });

  // Messages by channel — real weekly buckets (last 4 weeks)
  const channelData = Array.from({ length: 4 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (3 - i) * 7 - 6);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - (3 - i) * 7 + 1);
    const weekMsgs = messages.filter(m => {
      const d = new Date(m.created_date);
      return d >= weekStart && d <= weekEnd;
    });
    return {
      name: `Sett. ${i + 1}`,
      whatsapp: weekMsgs.filter(m => m.canale === 'whatsapp').length,
      instagram: weekMsgs.filter(m => m.canale === 'instagram').length,
    };
  });

  const LEAD_STATI = [
    { key: 'nuovo', label: 'Nuovo', color: 'hsl(222,85%,60%)' },
    { key: 'qualificato', label: 'Qualificato', color: 'hsl(45,90%,55%)' },
    { key: 'preventivo_inviato', label: 'Preventivo', color: 'hsl(280,65%,60%)' },
    { key: 'chiuso_vinto', label: 'Vinto', color: 'hsl(142,60%,50%)' },
    { key: 'chiuso_perso', label: 'Perso', color: 'hsl(0,72%,51%)' },
  ];

  // Leads by status — always include all stati so the donut is always complete
  const leadStatusData = LEAD_STATI.map(s => ({
    name: s.label,
    value: leads.filter(l => l.stato === s.key).length,
    color: s.color,
  }));

  // Appointments by day (last 7 days)
  const appointmentData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toDateString();
    return {
      name: ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][d.getDay()],
      appuntamenti: appointments.filter(a => new Date(a.created_date).toDateString() === dateStr).length,
    };
  });

  const aiRate = messages.length > 0 ? Math.round((messages.filter(m => m.ruolo === 'assistant').length / messages.length) * 100) : 0;
  const confirmedAppointments = appointments.filter(a => a.stato === 'confermato').length;
  const wonRate = leads.length > 0 ? Math.round((leads.filter(l => l.stato === 'chiuso_vinto').length / leads.length) * 100) : 0;

  const handleExportCSV = () => {
    const rows = [['Tipo', 'Totale'], ['Messaggi', messages.length], ['Lead', leads.length], ['AI Rate', aiRate + '%']];
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
        <KpiCard title="Appuntamenti confermati" value={confirmedAppointments} icon={Calendar} />
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

        {/* Leads donut chart — fixed */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Lead per stato</h3>
          <div className="flex items-center gap-4">
            <div className="h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(220,18%,7%)"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {leadStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.value > 0 ? entry.color : 'hsl(220,15%,15%)'} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                          <p className="text-sm font-medium" style={{ color: payload[0].payload.color }}>{payload[0].name}: {payload[0].value}</p>
                        </div>
                      ) : null
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {leadStatusData.map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                    <span className="text-xs text-muted-foreground">{entry.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Appointments trend */}
        <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Appuntamenti ultimi 7 giorni</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={appointmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,15%)" />
                <XAxis dataKey="name" tick={{ fill: 'hsl(220,10%,50%)', fontSize: 11 }} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'hsl(220,10%,50%)', fontSize: 11 }} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="appuntamenti" fill="hsl(160,60%,45%)" name="Appuntamenti" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}