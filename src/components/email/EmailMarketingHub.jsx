import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import CampaignWizard from './CampaignWizard';

const C = {
  bg: '#070B14', surface: '#0D1525', card: '#111C30', border: '#1A2E4A',
  accent: '#00C6FF', accent2: '#7B2FFF', accent3: '#FF3CAC', gold: '#FFD700',
  text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0', warning: '#FF9500', danger: '#FF3860',
};

const STATO_CONFIG = {
  bozza: { label: 'Bozza', color: C.muted, bg: C.muted + '22' },
  schedulata: { label: 'Programmata', color: C.warning, bg: C.warning + '22' },
  in_corso: { label: 'In corso', color: C.accent, bg: C.accent + '22' },
  inviata: { label: 'Inviata', color: C.success, bg: C.success + '22' },
};

// Template pre-definiti non eliminabili
const READY_TEMPLATES = [
  { id: 'tpl_newsletter', nome: 'Newsletter Settimanale', desc: 'Aggiornamenti settimanali per la tua lista', emoji: '📰', color: C.accent2 },
  { id: 'tpl_benvenuto', nome: 'Benvenuto', desc: 'Email automatica al primo contatto', emoji: '👋', color: C.success },
  { id: 'tpl_offerta', nome: 'Offerta Speciale', desc: 'Promo esclusiva per i tuoi contatti', emoji: '🔥', color: C.gold },
];

function KpiCard({ label, value, sub, color, compare }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: '16px 18px', flex: '1 1 140px',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: color || C.text, letterSpacing: -1, marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>}
      {compare && (
        <div style={{
          fontSize: 10, fontWeight: 700, marginTop: 6,
          color: compare.above ? C.success : C.danger,
          background: compare.above ? C.success + '15' : C.danger + '15',
          borderRadius: 6, padding: '2px 7px', display: 'inline-block',
        }}>
          {compare.above ? '▲ Sopra' : '▼ Sotto'} media settore (22%)
        </div>
      )}
    </div>
  );
}

function CampaignCard({ campaign, onDuplicate, onDelete }) {
  const stato = STATO_CONFIG[campaign.stato] || STATO_CONFIG.bozza;
  const openRate = campaign.destinatari_count > 0 && campaign.aperture > 0
    ? Math.round((campaign.aperture / campaign.destinatari_count) * 100) : null;
  const clickRate = campaign.destinatari_count > 0 && campaign.click > 0
    ? Math.round((campaign.click / campaign.destinatari_count) * 100) : null;

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: C.accent2 + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>📧</div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 2 }}>{campaign.nome}</div>
        {campaign.oggetto && <div style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{campaign.oggetto}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: stato.color, background: stato.bg }}>{stato.label}</span>
          {campaign.sent_at && (
            <span style={{ fontSize: 10, color: C.muted }}>
              {format(new Date(campaign.sent_at), 'd MMM yyyy', { locale: it })}
            </span>
          )}
          {campaign.scheduled_at && !campaign.sent_at && (
            <span style={{ fontSize: 10, color: C.warning }}>
              📅 {format(new Date(campaign.scheduled_at), 'd MMM HH:mm', { locale: it })}
            </span>
          )}
        </div>
      </div>
      {/* Stats */}
      {campaign.stato === 'inviata' && (
        <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{campaign.destinatari_count || 0}</div>
            <div style={{ fontSize: 9, color: C.muted }}>Inviati</div>
          </div>
          {openRate !== null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>{openRate}%</div>
              <div style={{ fontSize: 9, color: C.muted }}>Aperti</div>
            </div>
          )}
          {clickRate !== null && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.success }}>{clickRate}%</div>
              <div style={{ fontSize: 9, color: C.muted }}>Click</div>
            </div>
          )}
        </div>
      )}
      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onDuplicate(campaign)} title="Duplica" style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '5px 10px', color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}>📋</button>
        <button onClick={() => onDelete(campaign.id)} title="Elimina" style={{
          background: C.surface, border: `1px solid ${C.danger}44`, borderRadius: 8,
          padding: '5px 10px', color: C.danger, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
        }}>🗑</button>
      </div>
    </div>
  );
}

function ReadyTemplateCard({ tmpl, onUse }) {
  return (
    <div style={{
      background: C.card, border: `2px solid ${tmpl.color}44`, borderRadius: 14, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: tmpl.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>{tmpl.emoji}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{tmpl.nome}</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: tmpl.color, borderRadius: 20, padding: '2px 8px' }}>PRONTO</div>
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>{tmpl.desc}</div>
      </div>
      <button onClick={() => onUse(tmpl)} style={{
        background: tmpl.color + '22', border: `1px solid ${tmpl.color}55`,
        borderRadius: 10, padding: '7px 14px', color: tmpl.color,
        fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        whiteSpace: 'nowrap',
      }}>
        Usa →
      </button>
    </div>
  );
}

function AnalyticsTab({ campaigns }) {
  const sentCampaigns = campaigns.filter(c => c.stato === 'inviata');
  const totalSent = sentCampaigns.reduce((a, c) => a + (c.destinatari_count || 0), 0);
  const totalOpen = sentCampaigns.reduce((a, c) => a + (c.aperture || 0), 0);
  const totalClick = sentCampaigns.reduce((a, c) => a + (c.click || 0), 0);
  const totalUnsub = sentCampaigns.reduce((a, c) => a + (c.disiscrizioni || 0), 0);
  const avgOpen = totalSent > 0 ? Math.round((totalOpen / totalSent) * 100) : null;
  const avgClick = totalSent > 0 ? Math.round((totalClick / totalSent) * 100) : null;

  if (sentCampaigns.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>Nessun dato ancora</div>
        <div style={{ fontSize: 13 }}>Le analytics appariranno dopo il primo invio reale.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 4 KPI cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard label="Email inviate" value={totalSent} color={C.accent} />
        <KpiCard
          label="Open rate medio"
          value={avgOpen !== null ? `${avgOpen}%` : 'N/D'}
          color={avgOpen !== null ? C.success : C.muted}
          compare={avgOpen !== null ? { above: avgOpen >= 22 } : null}
        />
        <KpiCard label="Click rate medio" value={avgClick !== null ? `${avgClick}%` : 'N/D'} color={C.gold} />
        <KpiCard label="Disiscrizioni" value={totalUnsub} color={totalUnsub > 0 ? C.danger : C.muted} />
      </div>

      {/* Bar chart last 4 campaigns */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 14 }}>Ultime campagne</div>
        {sentCampaigns.slice(0, 4).map(c => {
          const max = c.destinatari_count || 1;
          const openPct = Math.round(((c.aperture || 0) / max) * 100);
          const clickPct = Math.round(((c.click || 0) / max) * 100);
          return (
            <div key={c.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  Inviati: {c.destinatari_count || 0} | Aperti: {c.aperture || 0} ({openPct}%) | Cliccati: {c.click || 0} ({clickPct}%)
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: 'Inviati', val: 100, color: C.border },
                  { label: 'Aperti', val: openPct, color: C.accent },
                  { label: 'Cliccati', val: clickPct, color: C.success },
                ].map((bar, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 10, color: C.muted, width: 48, flexShrink: 0 }}>{bar.label}</div>
                    <div style={{ flex: 1, height: 8, background: C.surface, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${bar.val}%`, background: bar.color, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: bar.color, width: 32, textAlign: 'right' }}>{bar.val}%</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EmailMarketingHub({ businessId }) {
  const queryClient = useQueryClient();
  const [showWizard, setShowWizard] = useState(false);
  const [tab, setTab] = useState('campaigns');

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

  const handleWizardComplete = () => {
    setShowWizard(false);
    queryClient.invalidateQueries({ queryKey: ['email-campaigns', businessId] });
  };

  const handleDuplicate = async (campaign) => {
    await base44.entities.EmailCampaign.create({
      ...campaign,
      id: undefined,
      nome: `${campaign.nome} (copia)`,
      stato: 'bozza',
      sent_at: '',
      aperture: 0,
      click: 0,
      disiscrizioni: 0,
    });
    queryClient.invalidateQueries({ queryKey: ['email-campaigns', businessId] });
  };

  const handleDelete = async (id) => {
    await base44.entities.EmailCampaign.delete(id);
    queryClient.invalidateQueries({ queryKey: ['email-campaigns', businessId] });
  };

  const TABS = [
    { id: 'campaigns', label: '◈ Campagne' },
    { id: 'stats', label: '◉ Analytics' },
  ];

  const sentCount = campaigns.filter(c => c.stato === 'inviata').length;
  const scheduledCount = campaigns.filter(c => c.stato === 'schedulata').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'inherit' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 900, fontSize: 22, letterSpacing: -0.5, color: C.text }}>
            Email <span style={{ color: C.accent2 }}>Marketing</span>
          </h2>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {activeContacts.length} contatti attivi · {sentCount} inviate · {scheduledCount} programmate
          </div>
        </div>
        <button onClick={() => setShowWizard(true)} style={{
          background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
          border: 'none', borderRadius: 12, padding: '10px 20px',
          color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: `0 0 20px ${C.accent2}44`, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          + Nuova Campagna
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: 'none', border: 'none',
            borderBottom: tab === t.id ? `2px solid ${C.accent}` : '2px solid transparent',
            color: tab === t.id ? C.accent : C.muted,
            fontWeight: 700, fontSize: 13, padding: '8px 16px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Campaigns tab */}
      {tab === 'campaigns' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: `3px solid ${C.accent}33`, borderTopColor: C.accent, animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* Ready templates */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Modelli pronti</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {READY_TEMPLATES.map(tmpl => (
                    <ReadyTemplateCard key={tmpl.id} tmpl={tmpl} onUse={() => setShowWizard(true)} />
                  ))}
                </div>
              </div>

              {/* User campaigns */}
              {campaigns.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Le tue campagne</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {campaigns.map(c => (
                      <CampaignCard key={c.id} campaign={c} onDuplicate={handleDuplicate} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}

              {campaigns.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: C.muted }}>
                  <div style={{ fontSize: 13 }}>Nessuna campagna ancora. Crea la tua prima campagna usando uno dei modelli pronti sopra.</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Analytics tab */}
      {tab === 'stats' && <AnalyticsTab campaigns={campaigns} />}

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