import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MessagesChartEnhanced({ messages }) {
  const [range, setRange] = useState('settimana');

  const data = useMemo(() => {
    const now = new Date();
    if (range === 'settimana') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const ds = d.toDateString();
        const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
        return {
          label: giorni[d.getDay()],
          instagram: messages.filter(m => m.canale === 'instagram' && new Date(m.created_date).toDateString() === ds).length,
          whatsapp: messages.filter(m => m.canale === 'whatsapp' && new Date(m.created_date).toDateString() === ds).length,
        };
      });
    } else if (range === 'mese') {
      return Array.from({ length: 4 }, (_, i) => {
        const wStart = new Date(now); wStart.setDate(wStart.getDate() - (3 - i) * 7 - 6);
        const wEnd = new Date(now); wEnd.setDate(wEnd.getDate() - (3 - i) * 7 + 1);
        return {
          label: `Sett. ${i + 1}`,
          instagram: messages.filter(m => m.canale === 'instagram' && new Date(m.created_date) >= wStart && new Date(m.created_date) <= wEnd).length,
          whatsapp: messages.filter(m => m.canale === 'whatsapp' && new Date(m.created_date) >= wStart && new Date(m.created_date) <= wEnd).length,
        };
      });
    } else {
      return Array.from({ length: 3 }, (_, i) => {
        const mDate = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
        const mEnd = new Date(now.getFullYear(), now.getMonth() - (2 - i) + 1, 0);
        const mesi = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
        return {
          label: mesi[mDate.getMonth()],
          instagram: messages.filter(m => m.canale === 'instagram' && new Date(m.created_date) >= mDate && new Date(m.created_date) <= mEnd).length,
          whatsapp: messages.filter(m => m.canale === 'whatsapp' && new Date(m.created_date) >= mDate && new Date(m.created_date) <= mEnd).length,
        };
      });
    }
  }, [messages, range]);

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Messaggi per canale</h3>
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {[['settimana', '7G'], ['mese', '30G'], ['3mesi', '3M']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRange(val)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                range === val ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,15%)" />
            <XAxis dataKey="label" tick={{ fill: 'hsl(220,10%,50%)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(220,10%,50%)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span style={{ color: 'hsl(220,10%,60%)', fontSize: 11 }}>{value}</span>}
            />
            <Line type="monotone" dataKey="instagram" stroke="hsl(340,75%,65%)" strokeWidth={2.5} name="Instagram" dot={{ fill: 'hsl(340,75%,65%)', r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="whatsapp" stroke="hsl(142,60%,50%)" strokeWidth={2.5} name="WhatsApp" dot={{ fill: 'hsl(142,60%,50%)', r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}