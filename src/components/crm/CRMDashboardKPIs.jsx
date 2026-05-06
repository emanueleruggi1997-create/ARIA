import React, { useMemo } from 'react';

const C = {
  bg: '#070B14', card: '#111C30', border: '#1A2E4A', accent: '#00C6FF', accent2: '#7B2FFF',
  accent3: '#FF3CAC', gold: '#FFD700', text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0', danger: '#FF3860',
};

function Sparkline({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const height = 24;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height }}>
      {data.map((v, i) => (
        <div key={i} style={{
          width: 4, height: `${(v / max) * height}px`,
          background: `linear-gradient(180deg, #00E5A0, #00C6FF)`,
          borderRadius: 2, opacity: 0.7 + (i / data.length) * 0.3,
        }} />
      ))}
    </div>
  );
}

function ProgressRing({ percentage, color, size = 50 }) {
  const r = size / 2 - 6;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color }}>
        {percentage}%
      </div>
    </div>
  );
}

function KpiCard({ kpi }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 22, opacity: 0.08, color: kpi.color }}>{kpi.icon}</div>
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
        {kpi.title.toUpperCase()}
      </div>

      {kpi.displayType === 'progress' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <ProgressRing percentage={kpi.percentage} color={kpi.color} size={50} />
          <div style={{ fontSize: 22, fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
        </div>
      ) : (
        <div style={{ fontSize: 26, fontWeight: 900, color: kpi.value === 'N/D' ? C.muted : kpi.color, letterSpacing: -1, marginBottom: 8 }}>
          {kpi.value}
        </div>
      )}

      {kpi.sparkline && <div style={{ marginBottom: 8 }}><Sparkline data={kpi.sparkline} /></div>}

      <div style={{ fontSize: 11, color: C.muted }}>{kpi.secondary}</div>
    </div>
  );
}

export default function CRMDashboardKPIs({ leads = [], campaigns = [], emailContacts = [], messages = [], isDesktop }) {
  // ── Lead reali = almeno email o telefono ──
  const qualifiedLeads = leads.filter(l => l.email?.trim() || l.phone?.trim() || l.numero?.trim());
  const activeLeads = qualifiedLeads.filter(l => !['chiuso_vinto', 'chiuso_perso'].includes(l.stato));
  const hotLeads = qualifiedLeads.filter(l => l.stato === 'qualificato');
  const wonLeads = qualifiedLeads.filter(l => l.stato === 'chiuso_vinto');
  const lostLeads = qualifiedLeads.filter(l => l.stato === 'chiuso_perso');
  const closedLeads = wonLeads.length + lostLeads.length;

  // Conversion rate: solo su lead con esito reale
  const convRate = closedLeads > 0 ? Math.round((wonLeads.length / closedLeads) * 100) : null;

  // Sparkline ultimi 7gg (lead qualificati)
  const lastWeekLeads = useMemo(() => {
    const now = new Date();
    return Array(7).fill(0).map((_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      return qualifiedLeads.filter(l => l.created_date?.split('T')[0] === dateStr).length;
    });
  }, [leads]);

  // Email stats
  const validEmailContacts = emailContacts.filter(c => c.email?.includes('@') && c.stato === 'attivo');
  const sentCampaigns = campaigns.filter(c => c.stato === 'inviata');
  const openRate = sentCampaigns.length > 0
    ? Math.round(sentCampaigns.reduce((a, c) => a + (c.destinatari_count > 0 ? (c.aperture / c.destinatari_count * 100) : 0), 0) / sentCampaigns.length)
    : null;
  const clickRate = sentCampaigns.length > 0
    ? Math.round(sentCampaigns.reduce((a, c) => a + (c.destinatari_count > 0 ? (c.click / c.destinatari_count * 100) : 0), 0) / sentCampaigns.length)
    : null;

  // Revenue pipeline: solo lead con valore_stimato o budget_max reale
  const pipelineLeads = activeLeads.filter(l => (l.valore_stimato > 0) || (l.budget_max > 0));
  const revenuePipeline = pipelineLeads.reduce((sum, l) => sum + (l.valore_stimato || l.budget_max || 0), 0);

  // ARIA activity: messaggi reali inviati oggi da assistant
  const today = new Date().toISOString().split('T')[0];
  const ariaToday = messages.filter(m => m.ruolo === 'assistant' && m.created_date?.split('T')[0] === today).length;

  // Response time: calcolato da coppie reali user→assistant
  const avgResponseTime = useMemo(() => {
    const times = [];
    const sorted = [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].ruolo === 'user' && sorted[i+1].ruolo === 'assistant' && sorted[i].contact_id === sorted[i+1].contact_id) {
        const diff = (new Date(sorted[i+1].created_date) - new Date(sorted[i].created_date)) / 1000;
        if (diff > 0 && diff < 300) times.push(diff); // max 5 min per escludere outlier
      }
    }
    return times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : null;
  }, [messages]);

  const nd = 'N/D';

  const kpis = [
    {
      id: 1, title: 'Lead Qualificati', value: qualifiedLeads.length, icon: '◉', color: C.accent,
      sparkline: lastWeekLeads,
      secondary: `${activeLeads.length} attivi · ${qualifiedLeads.length - activeLeads.length} chiusi`,
    },
    {
      id: 2, title: 'Hot Leads', value: hotLeads.length, icon: '🔥', color: C.danger,
      secondary: hotLeads.length > 0 ? 'Lead qualificati da gestire' : 'Nessun lead qualificato',
    },
    {
      id: 3, title: 'Conversion Rate', value: convRate !== null ? `${convRate}%` : nd,
      icon: '◫', color: convRate !== null ? C.accent2 : C.muted,
      displayType: convRate !== null ? 'progress' : 'text',
      percentage: convRate || 0,
      secondary: closedLeads > 0 ? `${wonLeads.length} vinti / ${closedLeads} chiusi` : 'Nessun lead chiuso ancora',
    },
    {
      id: 4, title: 'Tempo Risposta ARIA', value: avgResponseTime ? `${avgResponseTime}s` : nd,
      icon: '⚡', color: avgResponseTime ? C.success : C.muted,
      secondary: avgResponseTime ? 'Media su risposte reali' : 'Nessuna risposta misurata',
    },
    {
      id: 5, title: 'Open Rate Email', value: openRate !== null ? `${openRate}%` : nd,
      icon: '✉', color: openRate !== null ? C.gold : C.muted,
      secondary: sentCampaigns.length > 0 ? `${sentCampaigns.length} campagne inviate` : 'Nessuna campagna inviata',
    },
    {
      id: 6, title: 'Click Rate Email', value: clickRate !== null ? `${clickRate}%` : nd,
      icon: '→', color: clickRate !== null ? C.accent : C.muted,
      secondary: `${validEmailContacts.length} contatti email validi`,
    },
    {
      id: 7, title: 'Revenue Pipeline', value: revenuePipeline > 0 ? `€${(revenuePipeline / 1000).toFixed(1)}k` : nd,
      icon: '💰', color: revenuePipeline > 0 ? C.gold : C.muted,
      secondary: revenuePipeline > 0 ? `${pipelineLeads.length} opportunità con valore` : 'Inserisci valori nei lead',
    },
    {
      id: 8, title: 'ARIA Activity', value: ariaToday, icon: '🤖', color: C.accent3,
      secondary: 'Messaggi inviati oggi da ARIA',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 14 }}>
      {kpis.map(kpi => <KpiCard key={kpi.id} kpi={kpi} />)}
    </div>
  );
}