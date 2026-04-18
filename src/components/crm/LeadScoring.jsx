import React, { useState, useMemo } from 'react';
import { TrendingUp, Zap, AlertCircle } from 'lucide-react';

const C = {
  card: '#111C30', border: '#1A2E4A', text: '#E8F4FF', muted: '#5A7A9A',
  success: '#00E5A0', warning: '#FF9500', danger: '#FF3860', accent: '#00C6FF',
};

export default function LeadScoring({ leads = [], lang = 'en' }) {
  const scoredLeads = useMemo(() => {
    return leads.map(lead => {
      let score = 0;
      const factors = [];

      // Engagement: messaggi recenti
      const daysAgo = lead.updated_date
        ? Math.floor((Date.now() - new Date(lead.updated_date)) / (1000 * 60 * 60 * 24))
        : 999;
      
      if (daysAgo < 1) { score += 25; factors.push({ label: lang === 'en' ? 'Recent activity' : 'Attività recente', points: 25 }); }
      else if (daysAgo < 3) { score += 15; factors.push({ label: lang === 'en' ? 'Recent activity' : 'Attività recente', points: 15 }); }
      else if (daysAgo < 7) { score += 10; factors.push({ label: lang === 'en' ? 'Recent activity' : 'Attività recente', points: 10 }); }

      // Status progression
      if (lead.stato === 'nuovo') score += 10;
      else if (lead.stato === 'qualificato') { score += 20; factors.push({ label: lang === 'en' ? 'Qualified' : 'Qualificato', points: 20 }); }
      else if (lead.stato === 'preventivo_inviato') { score += 30; factors.push({ label: lang === 'en' ? 'Proposal sent' : 'Preventivo inviato', points: 30 }); }
      else if (lead.stato === 'chiuso_vinto') { score += 50; factors.push({ label: lang === 'en' ? 'Won' : 'Vinto', points: 50 }); }
      else if (lead.stato === 'chiuso_perso') score = Math.max(0, score - 20);

      // Budget indicator
      if (lead.budget_max && lead.budget_max > 5000) { score += 15; factors.push({ label: lang === 'en' ? 'High budget' : 'Budget alto', points: 15 }); }
      else if (lead.budget_max && lead.budget_max > 1000) { score += 8; factors.push({ label: lang === 'en' ? 'Medium budget' : 'Budget medio', points: 8 }); }

      // Channel
      if (lead.canale === 'instagram') score += 5;
      else if (lead.canale === 'whatsapp') score += 8;

      return {
        ...lead,
        score: Math.min(100, score),
        factors: factors.slice(0, 3),
        daysInactive: daysAgo,
      };
    }).sort((a, b) => b.score - a.score);
  }, [leads, lang]);

  const hotLeads = scoredLeads.filter(l => l.score >= 70).length;
  const warmLeads = scoredLeads.filter(l => l.score >= 40 && l.score < 70).length;
  const coldLeads = scoredLeads.filter(l => l.score < 40).length;

  const ScoreBar = ({ score, size = 'normal' }) => {
    let color = C.danger;
    if (score >= 70) color = C.success;
    else if (score >= 40) color = C.warning;
    
    const width = size === 'small' ? 100 : 120;
    return (
      <div style={{
        width, height: size === 'small' ? 4 : 6,
        borderRadius: 20, background: C.border,
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          width: `${score}%`, height: '100%', background: color,
          transition: 'width 0.3s ease', borderRadius: 20,
          boxShadow: `0 0 8px ${color}44`,
        }} />
        {size === 'normal' && (
          <span style={{
            position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
            fontSize: 9, fontWeight: 800, color: C.text,
          }}>
            {Math.round(score)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <div style={{
          background: `${C.success}11`, border: `1px solid ${C.success}44`,
          borderRadius: 12, padding: 14, borderLeft: `3px solid ${C.success}`,
        }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>HOT</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.success }}>{hotLeads}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{lang === 'en' ? 'Ready to close' : 'Pronti a chiudere'}</div>
        </div>
        <div style={{
          background: `${C.warning}11`, border: `1px solid ${C.warning}44`,
          borderRadius: 12, padding: 14, borderLeft: `3px solid ${C.warning}`,
        }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>WARM</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.warning }}>{warmLeads}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{lang === 'en' ? 'Need nurturing' : 'Da nutrir'}</div>
        </div>
        <div style={{
          background: `${C.danger}11`, border: `1px solid ${C.danger}44`,
          borderRadius: 12, padding: 14, borderLeft: `3px solid ${C.danger}`,
        }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>COLD</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.danger }}>{coldLeads}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{lang === 'en' ? 'Need engagement' : 'Da contattare'}</div>
        </div>
      </div>

      {/* Scored leads list */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, background: `${C.border}22` }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={16} style={{ color: C.accent }} />
            {lang === 'en' ? 'Lead scoring' : 'Scoring lead'}
          </div>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {scoredLeads.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 13 }}>
              {lang === 'en' ? 'No leads to score' : 'Nessun lead da valutare'}
            </div>
          ) : (
            scoredLeads.map(lead => (
              <div key={lead.id} style={{
                padding: 12, borderBottom: `1px solid ${C.border}`,
                display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12,
              }}>
                <div>
                  <div style({
                    fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    {lead.contact_nome || 'Sconosciuto'}
                    {lead.score >= 70 && <Zap size={12} style={{ color: C.success }} />}
                    {lead.score < 40 && <AlertCircle size={12} style={{ color: C.danger }} />}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                    {lead.tipo_progetto ? lead.tipo_progetto : '—'} · {lead.canale || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {lead.factors.map((f, i) => (
                      <span key={i} style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px',
                        borderRadius: 4, background: `${C.accent}22`, color: C.accent,
                      }}>
                        {f.label} +{f.points}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <ScoreBar score={lead.score} />
                  <span style={{
                    fontSize: 9, color: C.muted, fontWeight: 700,
                    background: C.border, padding: '2px 6px', borderRadius: 4,
                  }}>
                    {lead.daysInactive === 0 ? lang === 'en' ? 'Today' : 'Oggi' : `${lead.daysInactive}d`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Next actions */}
      <div style={{
        background: `${C.accent}11`, border: `1px solid ${C.accent}33`,
        borderRadius: 12, padding: 14, fontSize: 12, color: C.muted,
      }}>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          💡 {lang === 'en' ? 'Recommended actions' : 'Azioni consigliate'}
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <li>{lang === 'en' ? 'Follow up with top 3 hot leads today' : 'Contatta i 3 top hot lead oggi'}</li>
          <li>{lang === 'en' ? 'Send nurture email to warm leads' : 'Invia email di nurturing ai warm lead'}</li>
          <li>{lang === 'en' ? 'Re-engage cold leads with discount offer' : 'Richiedi attenzione ai cold lead con offerta'}</li>
        </ul>
      </div>
    </div>
  );
}