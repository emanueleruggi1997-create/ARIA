import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-primary">{payload[0].value} messaggi</p>
      </div>
    );
  }
  return null;
};

export default function MessagesChart({ data }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Messaggi — Ultimi 7 giorni</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15%)" />
            <XAxis dataKey="giorno" tick={{ fill: 'hsl(220 10% 50%)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(220 10% 50%)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="messaggi" stroke="hsl(222 85% 60%)" strokeWidth={2} dot={{ fill: 'hsl(222 85% 60%)', r: 4 }} activeDot={{ r: 6, stroke: 'hsl(222 85% 60%)', strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}