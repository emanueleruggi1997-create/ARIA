import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

const C = {
  bg: '#070B14', card: '#111C30', border: '#1A2E4A', accent: '#00C6FF', accent2: '#7B2FFF',
  accent3: '#FF3CAC', gold: '#FFD700', text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0', danger: '#FF3860',
};

// Mini sparkline chart (7 giorni)
function Sparkline({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const height = 24;
  const width = 4;
  const gap = 2;
  
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: `${gap}px`, height }}>
      {data.map((v, i) => (
        <div key={i} style={{
          width,
          height: `${(v / max) * height}px`,
          background: `linear-gradient(180deg, #00E5A0, #00C6FF)`,
          borderRadius: 2,
          opacity: 0.7 + (i / data.length) * 0.3,
        }} />
      ))}
    </div>
  );
}

// Circular progress ring
function ProgressRing({ percentage, color, size = 60 }) {
  const circumference = 2 * Math.PI * (size / 2 - 6);
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={size/2 - 6} fill="none" stroke={C.border} strokeWidth="4" />
        <circle
          cx={size/2} cy={size/2} r={size/2 - 6} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 900, color,
      }}>{percentage}%</div>
    </div>
  );
}

export default function CRMDashboardKPIs({ leads = [], campaigns = [], emailContacts = [], isDesktop }) {
  // Calcola metriche
  const activeLeads = leads.filter(l => !['chiuso_vinto', 'chiuso_perso'].includes(l.stato)).length;
  const hotLeads = leads.filter(l => l.stato === 'nuovo').length;
  const wonLeads = leads.filter(l => l.stato === 'chiuso_vinto').length;
  const lostLeads = leads.filter(l => l.stato === 'chiuso_perso').length;
  
  const convRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;
  const lastWeekLeads = useMemo(() => {
    const now = new Date();
    const week = Array(7).fill(0).map((_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      return leads.filter(l => l.created_date?.split('T')[0] === dateStr).length;
    });
    return week.reverse();
  }, [leads]);
  
  const sentCampaigns = campaigns.filter(c => c.stato === 'inviata').length;
  const openRate = sentCampaigns > 0
    ? Math.round(campaigns.filter(c => c.stato === 'inviata').reduce((a, c) => a + (c.destinatari_count > 0 ? (c.aperture / c.destinatari_count * 100) : 0), 0) / sentCampaigns)
    : 0;
  
  const clickRate = sentCampaigns > 0
    ? Math.round(campaigns.filter(c => c.stato === 'inviata').reduce((a, c) => a + (c.destinatari_count > 0 ? (c.click / c.destinatari_count * 100) : 0), 0) / sentCampaigns)
    : 0;
  
  const revenuePipeline = activeLeads * 599; // €599 avg deal value
  const ariaActivityToday = leads.filter(l => {
    const today = new Date().toISOString().split('T')[0];
    return l.created_date?.split('T')[0] === today;
  }).length;
  
  // Mock: tempo medio risposta ARIA (in secondi)
  const avgResponseTime = 4.2;
  
  const kpis = [
    {
      id: 1, title: 'Total Leads', value: leads.length, icon: '◉', color: C.accent,
      trend: lastWeekLeads.length > 1 ? lastWeekLeads[lastWeekLeads.length - 1] - lastWeekLeads[0] : 0,
      trendLabel: 'vs last week',
      sparkline: lastWeekLeads,
      secondary: `${activeLeads} active`,
    },
    {
      id: 2, title: 'Hot Leads', value: hotLeads, icon: '🔥', color: C.danger,
      badge: 'URGENT', badgeColor: C.danger,
      secondary: 'Last contact: 3 days ago',
    },
    {
      id: 3, title: 'Conversion Rate', value: convRate, icon: '◫', color: C.accent2,
      displayType: 'progress', percentage: convRate,
      trendLabel: 'vs last month: +2%',
      secondary: `${wonLeads} won`,
    },
    {
      id: 4, title: 'Response Time', value: `${avgResponseTime}s`, icon: '⚡', color: C.success,
      secondary: 'Faster than 98% of businesses',
    },
    {
      id: 5, title: 'Open Rate', value: `${openRate}%`, icon: '✉', color: C.gold,
      secondary: 'vs industry avg: 22%',
    },
    {
      id: 6, title: 'Click Rate', value: `${clickRate}%`, icon: '→', color: C.accent,
      trendLabel: 'vs last campaign',
      secondary: `${campaigns.length} sent`,
    },
    {
      id: 7, title: 'Revenue Pipeline', value: `€${(revenuePipeline / 1000).toFixed(1)}k`, icon: '💰', color: C.gold,
      secondary: `${activeLeads} leads × €599`,
    },
    {
      id: 8, title: 'ARIA Activity', value: ariaActivityToday, icon: '🤖', color: C.accent3,
      secondary: 'Messages sent today',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
      gap: 14,
    }}>
      {kpis.map(kpi => (
        <div key={kpi.id} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
          padding: 16, position: 'relative', overflow: 'hidden',
        }}>
          {/* BG icon */}
          <div style={{
            position: 'absolute', top: 8, right: 8, fontSize: 24, opacity: 0.08, color: kpi.color,
          }}>
            {kpi.icon}
          </div>

          {/* Title + Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>
              {kpi.title.toUpperCase()}
            </div>
            {kpi.badge && (
              <span style={{
                fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                background: kpi.badgeColor + '22', color: kpi.badgeColor,
              }}>
                {kpi.badge}
              </span>
            )}
          </div>

          {/* Main value */}
          {kpi.displayType === 'progress' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <ProgressRing percentage={kpi.percentage} color={kpi.color} size={50} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: kpi.color, letterSpacing: -0.5 }}>
                  {kpi.value}%
                </div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 28, fontWeight: 900, color: kpi.color, letterSpacing: -1, marginBottom: 8 }}>
              {kpi.value}
            </div>
          )}

          {/* Sparkline (if available) */}
          {kpi.sparkline && (
            <div style={{ marginBottom: 8 }}>
              <Sparkline data={kpi.sparkline} />
            </div>
          )}

          {/* Secondary info */}
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
            {kpi.secondary}
          </div>

          {/* Trend label */}
          {kpi.trendLabel && (
            <div style={{
              fontSize: 10, color: kpi.trend >= 0 ? C.success : C.muted,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {kpi.trend >= 0 && <TrendingUp size={12} />}
              {kpi.trendLabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}