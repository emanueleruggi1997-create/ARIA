import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Send, BarChart2, Users, Mail, TrendingUp, Eye, Clock, CheckCircle, AlertCircle, Zap, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import CampaignWizard from './CampaignWizard';

const C = {
  bg: '#070B14', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  accent: '#00C6FF', accent2: '#7B2FFF', accent3: '#FF3CAC', gold: '#FFD700',
  text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0', warning: '#FF9500', danger: '#FF3860',
};

const STATO_CONFIG = {
  bozza: { label: 'Bozza', color: C.muted, bg: C.muted + '20' },
  schedulata: { label: 'Schedulata', color: C.warning, bg: C.warning + '20' },
  in_corso: { label: 'In corso', color: C.accent, bg: C.accent + '20' },
  inviata: { label: 'Inviata', color: C.success, bg: C.success + '20' },
};

function KpiBox({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: color || C.text, letterSpacing: -1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function CampaignRow({ campaign, onClick }) {
  const stato = STATO_CONFIG[campaign.stato] || STATO_CONFIG.bozza;
  const openRate = campaign.destinatari_count > 0 && campaign.aperture > 0
    ? Math.round((campaign.aperture / campaign.destinatari_count) * 100)
    : null;
  const clickRate = campaign.destinatari_count > 0 && campaign.click > 0
    ? Math.round((campaign.click / campaign.destinatari_count) * 100)
    : null;

  return (
    <div
      onClick={() => onClick(campaign)}
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: '16px 18px', cursor: 'pointer', transition: 'border-color 0.2s',
        display: 'flex', alignItems: 'center', gap: 16,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.accent + '66'}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(135deg, ${C.accent2}33, ${C.accent}33)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>📧</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 2 }}>{campaign.nome}</div>
        {campaign.oggetto && <div style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{campaign.oggetto}</div>}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
        {openRate !== null && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>{openRate}%</div>
            <div style={{ fontSize: 10, color: C.muted }}>apertura</div>
          </div>
        )}
        {clickRate !== null && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.success }}>{clickRate}%</div>
            <div style={{ fontSize: 10, color: C.muted }}>click</div>
          </div>
        )}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{campaign.destinatari_count || 0}</div>
          <div style={{ fontSize: 10, color: C.muted }}>dest.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: stato.color, background: stato.bg }}>{stato.label}</span>
          <span style={{ fontSize: 10, color: C.muted }}>
            {campaign.sent_at
              ? format(new Date(campaign.sent_at), 'd MMM', { locale: it })
              : campaign.scheduled_at
                ? `📅 ${format(new Date(campaign.scheduled_at), 'd MMM HH:mm', { locale: it })}`
                : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onNew }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 20px' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
        background: `linear-gradient(135deg, ${C.accent2}33, ${C.accent}33)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
      }}>📧</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: C.text, marginBottom: 8 }}>Nessuna campagna ancora</div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
        Crea la tua prima campagna email professionale in pochi click. ARIA ti aiuta con il contenuto.
      </div>
      <button onClick={onNew} style={{
        background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
        border: 'none', borderRadius: 12, padding: '12px 28px',
        color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: `0 0 24px ${C.accent2}55`,
      }}>
        + Crea la prima campagna
      </button>
    </div>
  );
}

export default function EmailMarketingHub({ businessId }) {
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [tab, setTab] = useState('campaigns'); // 'campaigns' | 'stats'

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['email-campaigns', businessId],
    queryFn: () => base44.entities.EmailCampaign.filter({ business_id: businessId }, '-created_date'),
    enabled: !!businessId,
    staleTime: 30_000,
  });

  const { data: emailContacts = [] } = useQuery({
    queryKey: ['email-contacts', businessId],
    queryFn: () => base44.entities.ContactEmail.filter({ business_id: businessId }),
    enabled: !!businessId,
    staleTime: 60_000,
  });

  const validContacts = emailContacts.filter(c => c.email?.includes('@'));
  const activeContacts = validContacts.filter(c => c.stato === 'attivo');

  const sentCampaigns = campaigns.filter(c => c.stato === 'inviata');
  const totalSent = sentCampaigns.reduce((a, c) => a + (c.destinatari_count || 0), 0);
  const totalAperture = sentCampaigns.reduce((a, c) => a + (c.aperture || 0), 0);
  const totalClick = sentCampaigns.reduce((a, c) => a + (c.click || 0), 0);
  const totalUnsub = sentCampaigns.reduce((a, c) => a + (c.disiscrizioni || 0), 0);

  const avgOpenRate = totalSent > 0 ? Math.round((totalAperture / totalSent) * 100) : null;
  const avgClickRate = totalSent > 0 ? Math.round((totalClick / totalSent) * 100) : null;
  const avgUnsubRate = totalSent > 0 ? Math.round((totalUnsub / totalSent) * 100) : null;

  const handleWizardComplete = () => {
    setShowWizard(false);
    queryClient.invalidateQueries({ queryKey: ['email-campaigns', businessId] });
    queryClient.invalidateQueries({ queryKey: ['email-contacts', businessId] });
  };

  const TABS = [
    { id: 'campaigns', label: 'Campagne', icon: '◈' },
    { id: 'stats', label: 'Analytics', icon: '◉' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 900, fontSize: 22, letterSpacing: -0.5, color: C.text }}>
            Email <span style={{ color: C.accent2 }}>Marketing</span>
          </h2>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {activeContacts.length} contatti attivi · {campaigns.length} campagne
          </div>
        </div>
        <button onClick={() => setShowWizard(true)} style={{
          background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
          border: 'none', borderRadius: 12, padding: '10px 20px',
          color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: `0 0 20px ${C.accent2}44`,
        }}>
          + Nuova Campagna
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        <KpiBox label="Contatti email" value={activeContacts.length} sub={`${validContacts.length} totali`} color={C.accent} icon="👥" />
        <KpiBox label="Campagne inviate" value={sentCampaigns.length} sub={`${campaigns.length} totali`} color={C.accent2} icon="🚀" />
        <KpiBox label="Open rate medio" value={avgOpenRate !== null ? `${avgOpenRate}%` : 'N/D'} sub={avgOpenRate !== null ? 'da campagne reali' : 'nessun dato'} color={avgOpenRate !== null ? C.success : C.muted} icon="📬" />
        <KpiBox label="Click rate medio" value={avgClickRate !== null ? `${avgClickRate}%` : 'N/D'} sub={avgClickRate !== null ? 'da campagne reali' : 'nessun dato'} color={avgClickRate !== null ? C.gold : C.muted} icon="🖱️" />
        <KpiBox label="Disiscrizioni" value={avgUnsubRate !== null ? `${avgUnsubRate}%` : 'N/D'} sub={totalUnsub > 0 ? `${totalUnsub} totali` : 'nessun dato'} color={avgUnsubRate !== null ? C.warning : C.muted} icon="🚫" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none', borderBottom: tab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
            color: tab === t.id ? C.accent : C.muted, fontWeight: 700, fontSize: 13,
            padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Campaign list */}
      {tab === 'campaigns' && (
        isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: `3px solid ${C.accent}33`, borderTopColor: C.accent, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState onNew={() => setShowWizard(true)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {campaigns.map(c => (
              <CampaignRow key={c.id} campaign={c} onClick={() => {}} />
            ))}
          </div>
        )
      )}

      {/* Analytics tab */}
      {tab === 'stats' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sentCampaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>Nessun dato disponibile</div>
              <div style={{ fontSize: 13 }}>Le analytics appariranno dopo il primo invio reale.</div>
            </div>
          ) : (
            sentCampaigns.map(c => {
              const open = c.destinatari_count > 0 ? Math.round((c.aperture / c.destinatari_count) * 100) : 0;
              const click = c.destinatari_count > 0 ? Math.round((c.click / c.destinatari_count) * 100) : 0;
              return (
                <div key={c.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 12 }}>{c.nome}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {[
                      { label: 'Inviati', val: c.destinatari_count || 0, color: C.accent },
                      { label: 'Aperture', val: `${open}%`, color: C.success },
                      { label: 'Click', val: `${click}%`, color: C.gold },
                      { label: 'Disiscritti', val: c.disiscrizioni || 0, color: C.danger },
                    ].map((m, i) => (
                      <div key={i} style={{ textAlign: 'center', background: C.surface, borderRadius: 10, padding: '10px 8px' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: m.color }}>{m.val}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {showWizard && (
        <CampaignWizard
          businessId={businessId}
          emailContacts={emailContacts}
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}