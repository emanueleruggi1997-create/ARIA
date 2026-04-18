import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChevronDown } from 'lucide-react';

const C = {
  card: '#111C30', border: '#1A2E4A', text: '#E8F4FF', muted: '#5A7A9A',
  success: '#00E5A0', warning: '#FF9500', danger: '#FF3860', accent: '#00C6FF', accent2: '#7B2FFF',
};

export default function EmailAnalytics({ campaign, lang = 'en' }) {
  const [expanded, setExpanded] = useState(false);

  if (!campaign) return null;

  // Mock data for charts
  const opensByHour = [
    { hour: '8', opens: 5 },
    { hour: '9', opens: 12 },
    { hour: '10', opens: 28 },
    { hour: '11', opens: 18 },
    { hour: '12', opens: 15 },
    { hour: '13', opens: 8 },
    { hour: '14', opens: 22 },
    { hour: '15', opens: 14 },
    { hour: '16', opens: 11 },
  ];

  const deviceData = [
    { name: 'Mobile', value: 65, fill: C.accent },
    { name: 'Desktop', value: 35, fill: C.accent2 },
  ];

  const openRate = campaign.destinatari_count > 0 ? Math.round((campaign.aperture / campaign.destinatari_count) * 100) : 0;
  const clickRate = campaign.destinatari_count > 0 ? Math.round((campaign.click / campaign.destinatari_count) * 100) : 0;
  const unsubRate = campaign.destinatari_count > 0 ? Math.round((campaign.disiscrizioni / campaign.destinatari_count) * 100) : 0;

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div onClick={() => setExpanded(!expanded)} style={{
        padding: 16, display: 'flex', alignItems: 'center', gap: 12,
        cursor: 'pointer', userSelect: 'none',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            📊 {campaign.nome}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>
            {lang === 'en' ? 'Open rate' : 'Tasso apertura'}: {openRate}% · {lang === 'en' ? 'Clicks' : 'Click'}: {clickRate}%
          </div>
        </div>
        <ChevronDown size={16} style={{
          color: C.muted, transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s',
        }} />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 16 }}>
          {/* Key metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: `${C.success}11`, borderRadius: 10, padding: 12, borderLeft: `3px solid ${C.success}` }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>SENT</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.success }}>{campaign.destinatari_count}</div>
            </div>
            <div style={{ background: `${C.accent}11`, borderRadius: 10, padding: 12, borderLeft: `3px solid ${C.accent}` }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>OPENED</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.accent }}>
                {campaign.aperture} ({openRate}%)
              </div>
            </div>
            <div style={{ background: `${C.accent2}11`, borderRadius: 10, padding: 12, borderLeft: `3px solid ${C.accent2}` }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>CLICKED</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.accent2 }}>
                {campaign.click} ({clickRate}%)
              </div>
            </div>
            <div style={{ background: `${C.danger}11`, borderRadius: 10, padding: 12, borderLeft: `3px solid ${C.danger}` }}>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 4 }}>UNSUBSCRIBED</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.danger }}>
                {campaign.disiscrizioni} ({unsubRate}%)
              </div>
            </div>
          </div>

          {/* Industry comparison */}
          <div style={{
            background: `${C.warning}11`, borderRadius: 10, padding: 12, marginBottom: 20,
            fontSize: 12, color: C.muted, borderLeft: `3px solid ${C.warning}`,
          }}>
            <span style={{ fontWeight: 700 }}>{lang === 'en' ? 'vs Industry Avg' : 'vs Media industriale'}:</span> {lang === 'en' ? 'Your open rate' : 'Tasso apertura'}: {openRate}% vs 22% industry avg
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Opens by hour */}
            <div style={{ background: `${C.border}33`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                {lang === 'en' ? 'Opens by hour (24h)' : 'Aperture per ora (24h)'}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={opensByHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: C.muted }} />
                  <YAxis tick={{ fontSize: 10, fill: C.muted }} />
                  <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}` }} />
                  <Bar dataKey="opens" fill={C.accent} radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Device breakdown */}
            <div style={{ background: `${C.border}33`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                {lang === 'en' ? 'Device breakdown' : 'Dispositivi'}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={deviceData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={value => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 12 }}>
                <div>📱 Mobile: 65%</div>
                <div>💻 Desktop: 35%</div>
              </div>
            </div>
          </div>

          {/* Top clicked link */}
          <div style={{
            background: `${C.accent}11`, borderRadius: 10, padding: 12,
            borderLeft: `3px solid ${C.accent}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
              {lang === 'en' ? 'Top clicked link' : 'Link più cliccato'}
            </div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              https://example.com/offer?utm_campaign={campaign.id}
            </div>
            <div style={{ fontSize: 11, color: C.accent, marginTop: 4, fontWeight: 700 }}>
              45 {lang === 'en' ? 'clicks' : 'clic'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}