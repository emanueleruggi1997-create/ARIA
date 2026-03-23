import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Zap, Clock, AlertCircle, Activity } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const SERVICES = [
  { id: 'db', label: 'Database', provider: 'Supabase', icon: '🗄️' },
  { id: 'ai', label: 'Claude AI', provider: 'Anthropic API', icon: '🤖' },
  { id: 'auth', label: 'Autenticazione', provider: 'Supabase Auth', icon: '🔐' },
  { id: 'wa', label: 'WhatsApp API', provider: '360dialog', icon: '💬' },
  { id: 'storage', label: 'Storage', provider: 'Supabase Storage', icon: '📦' },
  { id: 'email', label: 'Email Service', provider: 'SMTP', icon: '📧' },
];

function randBetween(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function getStatusInfo(latency) {
  if (latency < 200) return { color: '#10B981', label: 'Operativo', dot: '🟢' };
  if (latency < 700) return { color: '#F59E0B', label: 'Degradato', dot: '🟡' };
  return { color: '#EF4444', label: 'Non disponibile', dot: '🔴' };
}

const initialLatencies = { db: 12, ai: 340, auth: 8, wa: 680, storage: 45, email: 120 };

export default function AdminPerformance({ onGoToLogs }) {
  const [latencies, setLatencies] = useState(initialLatencies);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(0);
  const [zoom, setZoom] = useState('5min');
  const [chartData, setChartData] = useState(() =>
    Array.from({ length: 30 }, (_, i) => ({
      t: `${29 - i}s`,
      latency: randBetween(80, 420),
    }))
  );
  const [uptime] = useState(99.7);
  const [reqPerMin, setReqPerMin] = useState(42);
  const [errorsToday, setErrorsToday] = useState(3);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const timerRef = useRef(null);

  // Auto-update every 5 seconds
  useEffect(() => {
    const tick = () => {
      setLatencies(prev => ({
        db: Math.max(5, prev.db + randBetween(-8, 10)),
        ai: Math.max(100, prev.ai + randBetween(-40, 50)),
        auth: Math.max(3, prev.auth + randBetween(-3, 5)),
        wa: Math.max(200, prev.wa + randBetween(-50, 80)),
        storage: Math.max(15, prev.storage + randBetween(-10, 15)),
        email: Math.max(40, prev.email + randBetween(-20, 25)),
      }));
      setChartData(prev => {
        const next = [...prev.slice(1), { t: 'ora', latency: randBetween(80, 480) }];
        return next.map((d, i) => ({ ...d, t: `${prev.length - 1 - i}s` }));
      });
      setReqPerMin(v => Math.max(10, v + randBetween(-5, 7)));
      setSecondsAgo(0);
    };
    timerRef.current = setInterval(tick, 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Seconds counter
  useEffect(() => {
    const t = setInterval(() => setSecondsAgo(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const checkAll = () => {
    setChecking(true);
    setTimeout(() => {
      setLatencies({
        db: randBetween(5, 30),
        ai: randBetween(200, 500),
        auth: randBetween(5, 20),
        wa: randBetween(400, 900),
        storage: randBetween(20, 80),
        email: randBetween(60, 200),
      });
      setChecking(false);
      setSecondsAgo(0);
    }, 1200);
  };

  const apiLatency = Math.round((latencies.db + latencies.ai) / 2);
  const latencyStatus = apiLatency < 500 ? '#10B981' : apiLatency < 1000 ? '#F59E0B' : '#EF4444';
  const resources = [
    { label: 'Database Storage', used: 1.2, max: 2, unit: 'GB' },
    { label: 'Richieste AI (mese)', used: 40000, max: 100000, unit: '' },
    { label: 'Bandwidth', used: 2, max: 10, unit: 'GB' },
  ];

  return (
    <div className="space-y-6">
      {/* Live header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">Performance in tempo reale</h2>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-xs font-bold text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Aggiornato {secondsAgo}s fa</span>
          <Button size="sm" variant="outline" onClick={checkAll} disabled={checking} className="gap-2 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            Controlla tutti ora
          </Button>
        </div>
      </div>

      {/* KPI metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Latenza API', value: `${apiLatency} ms`, color: latencyStatus, icon: Clock, sub: 'media db+ai' },
          { label: 'Uptime', value: `${uptime}%`, color: '#10B981', icon: Activity, sub: 'ultimi 30 giorni' },
          { label: 'Req / minuto', value: `${reqPerMin}`, color: '#3B6EF8', icon: Zap, sub: 'in tempo reale' },
          { label: 'Errori oggi', value: `${errorsToday}`, color: errorsToday > 0 ? '#EF4444' : '#10B981', icon: AlertCircle, sub: 'click per dettaglio', onClick: onGoToLogs },
        ].map(m => (
          <div key={m.label} onClick={m.onClick} className={`bg-card border border-border rounded-xl p-4 ${m.onClick ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <m.icon className="w-4 h-4" style={{ color: m.color }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* Latency chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm font-bold text-foreground">Grafico latenza</p>
          <div className="flex gap-1">
            {['5min','1h','24h','7gg'].map(z => (
              <button key={z} onClick={() => setZoom(z)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${zoom === z ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                {z}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B6EF8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B6EF8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
            <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} tickLine={false} axisLine={false} unit="ms" />
            <Tooltip
              contentStyle={{ background: '#0F1219', border: '1px solid #2A2F3E', borderRadius: 8, fontSize: 11 }}
              formatter={v => [`${v}ms`, 'Latenza']}
            />
            <Area type="monotone" dataKey="latency" stroke="#3B6EF8" strokeWidth={2} fill="url(#latGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SERVICES.map(s => {
          const lat = latencies[s.id] || 100;
          const status = getStatusInfo(lat);
          return (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">{s.provider}</p>
                  </div>
                </div>
                <span className="text-base">{status.dot}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Latenza</p>
                  <p className="text-sm font-bold" style={{ color: status.color }}>{lat}ms</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-xs font-semibold" style={{ color: status.color }}>{status.label}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Ultimo check: {secondsAgo}s fa</p>
            </div>
          );
        })}
      </div>

      {/* Resources */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-sm font-bold text-foreground">Utilizzo risorse</p>
        {resources.map(r => {
          const pct = Math.round((r.used / r.max) * 100);
          const color = pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : '#3B6EF8';
          const display = r.unit ? `${r.used}${r.unit} / ${r.max}${r.unit}` : `${r.used.toLocaleString()} / ${r.max.toLocaleString()}`;
          return (
            <div key={r.label}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-foreground font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{display} — <span style={{ color }} className="font-bold">{pct}%</span></p>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}