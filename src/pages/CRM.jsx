import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/useBusinessContext.jsx';
import { useLang } from '@/lib/LanguageContext.jsx';
import { formatSafeTimestamp } from '@/lib/safeDate.js';
import { safeArray, safeInitials, safeNumber } from '@/lib/safeData.js';
import SafeSection from '@/components/ui/SafeSection.jsx';
import LeadDetailModal from '@/components/crm/LeadDetailModal';
import MailingListNew from '@/components/email/MailingListNew';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import LeadsKanban from '@/components/crm/LeadsKanban';

// Lazy-load heavy components — only download JS when actually navigated to
const CRMDashboardKPIs = lazy(() => import('@/components/crm/CRMDashboardKPIs'));
const EmailMarketingHubLazy = lazy(() => import('@/components/email/EmailMarketingHub'));

function TabSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="shimmer" style={{ height: 80, borderRadius: 14 }} />
      ))}
    </div>
  );
}

// ─── Design tokens ───────────────────────────────────────────────
const C = {
  bg: '#070B14',
  surface: '#0D1525',
  card: '#111C30',
  border: '#1A2E4A',
  accent: '#00C6FF',
  accent2: '#7B2FFF',
  accent3: '#FF3CAC',
  gold: '#FFD700',
  text: '#E8F4FF',
  muted: '#5A7A9A',
  success: '#00E5A0',
  warning: '#FF9500',
  danger: '#FF3860',
};

const KANBAN_COLS_IT = [
  { id: 'nuovo', label: 'Nuovo', color: C.accent },
  { id: 'qualificato', label: 'Qualificato', color: C.warning },
  { id: 'preventivo_inviato', label: 'Preventivo', color: C.accent2 },
  { id: 'chiuso_vinto', label: 'Convertito', color: C.success },
  { id: 'chiuso_perso', label: 'Perso', color: C.danger },
];
const KANBAN_COLS_EN = [
  { id: 'nuovo', label: 'New', color: C.accent },
  { id: 'qualificato', label: 'Qualified', color: C.warning },
  { id: 'preventivo_inviato', label: 'Proposal', color: C.accent2 },
  { id: 'chiuso_vinto', label: 'Converted', color: C.success },
  { id: 'chiuso_perso', label: 'Lost', color: C.danger },
];

// ─── Atom components ─────────────────────────────────────────────
function StatusDot({ color }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0,
    }} />
  );
}

function Avatar({ initials, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff', flexShrink: 0,
      boxShadow: `0 0 12px ${C.accent2}55`,
    }}>{initials}</div>
  );
}

function GlowBtn({ children, onClick, variant = 'primary', small, disabled }) {
  const styles = {
    primary: { bg: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`, shadow: C.accent },
    success: { bg: `linear-gradient(135deg, ${C.success}, #00a87a)`, shadow: C.success },
    ghost: { bg: 'transparent', border: `1px solid ${C.border}`, shadow: 'transparent' },
    danger: { bg: `linear-gradient(135deg, ${C.danger}, #c0004e)`, shadow: C.danger },
  };
  const s = styles[variant] || styles.primary;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: s.bg, border: s.border || 'none', color: '#fff', fontWeight: 700,
      fontSize: small ? 12 : 13, padding: small ? '6px 14px' : '10px 20px', borderRadius: 12,
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: s.shadow !== 'transparent' ? `0 0 20px ${s.shadow}44` : 'none',
      fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap',
      opacity: disabled ? 0.5 : 1,
    }}>
      {children}
    </button>
  );
}

// ─── ARIA Chat Panel (usa InvokeLLM interno) ─────────────────────
function ARIAPanel({ onClose, business, stats }) {
  const { lang } = useLang();
  const en = lang === 'en';
  const [msg, setMsg] = useState('');
  const [chat, setChat] = useState([
    { role: 'aria', text: en
      ? `Hi! I'm ARIA 🤖 I manage your leads, email campaigns and appointments for ${business?.nome || 'your business'}. How can I help you?`
      : `Ciao! Sono ARIA 🤖 Gestisco i tuoi lead, campagne email e appuntamenti per ${business?.nome || 'il tuo business'}. Come posso aiutarti?`
    },
  ]);
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => { chatRef.current?.scrollTo(0, 9999); }, [chat]);

  const sendMessage = async () => {
    if (!msg.trim() || loading) return;
    const userMsg = msg;
    setMsg('');
    setChat(c => [...c, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const systemCtx = en
        ? `You are ARIA, the AI agent of "${business?.nome || 'Emaral'}". You manage CRM, leads from Instagram and WhatsApp, email campaigns and appointments. Reply in English concisely and professionally. Current CRM data: ${stats.totalLeads} total leads, ${stats.activeLeads} active, ${stats.emailContacts} email contacts, ${stats.campaigns} campaigns.`
        : `Sei ARIA, l'agente AI di "${business?.nome || 'Emaral'}". Gestisci CRM, lead da Instagram e WhatsApp, campagne email e appuntamenti. Rispondi in italiano in modo conciso e professionale. Dati CRM attuali: ${stats.totalLeads} lead totali, ${stats.activeLeads} attivi, ${stats.emailContacts} contatti email, ${stats.campaigns} campagne.`;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${systemCtx}\n\n${en ? 'User question' : 'Domanda utente'}: ${userMsg}`,
        model: 'gpt_5_mini',
      });
      const text = typeof result === 'string' ? result : result?.text || (en ? "I didn't understand, try again." : 'Non ho capito, riprova.');
      setChat(c => [...c, { role: 'aria', text }]);
    } catch {
      setChat(c => [...c, { role: 'aria', text: en ? 'Connection lost. Try again shortly.' : 'Connessione interrotta. Riprova tra poco.' }]);
    }
    setLoading(false);
  };

  const isDesktop = window.innerWidth >= 768;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#000000cc', backdropFilter: 'blur(8px)', display: 'flex', alignItems: isDesktop ? 'center' : 'flex-end', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: isDesktop ? 600 : 520, height: isDesktop ? '85vh' : '82vh', background: C.surface, borderRadius: isDesktop ? 20 : '24px 24px 0 0', border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${C.accent2}, ${C.accent3})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>ARIA — {en ? 'AI Agent' : 'Agente AI'}</div>
            <div style={{ fontSize: 11, color: C.success, display: 'flex', alignItems: 'center', gap: 4 }}>
              <StatusDot color={C.success} /> Online · {en ? 'Connected to CRM' : 'Collegata al CRM'}
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.muted, fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        {/* Messages */}
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {chat.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '10px 14px',
                borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: m.role === 'user' ? `linear-gradient(135deg, ${C.accent2}, ${C.accent})` : C.card,
                color: C.text, fontSize: 13, lineHeight: 1.5,
                border: m.role === 'aria' ? `1px solid ${C.border}` : 'none',
              }}>{m.text}</div>
            </div>
          ))}
          {loading && <div style={{ color: C.muted, fontSize: 12 }}>{en ? 'ARIA is typing…' : 'ARIA sta scrivendo…'}</div>}
        </div>
        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
          <input
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder={en ? 'Ask ARIA…' : 'Chiedi ad ARIA…'}
            style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
          <GlowBtn onClick={sendMessage} disabled={loading || !msg.trim()}>↑</GlowBtn>
        </div>
      </div>
    </div>
  );
}

// ─── Leads Kanban (full real data) ───────────────────────────────
function LeadsSection({ businessId, onOpenAria }) {
  const { lang } = useLang();
  const en = lang === 'en';
  const KANBAN_COLS = en ? KANBAN_COLS_EN : KANBAN_COLS_IT;
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newLead, setNewLead] = useState({ contact_nome: '', tipo_progetto: '', canale: 'instagram' });
  const [mobileFilter, setMobileFilter] = useState('tutti');
  const [creating, setCreating] = useState(false);
  const [movingId, setMovingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', businessId],
    queryFn: () => base44.entities.Lead.filter({ business_id: businessId }),
    enabled: !!businessId,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['leads', businessId] });

  const handleUpdate = async (id, data) => { await base44.entities.Lead.update(id, data); invalidate(); setSelectedLead(null); };
  const handleDelete = async (id) => { if (deletingId === id) return; setDeletingId(id); try { await base44.entities.Lead.delete(id); invalidate(); } finally { setDeletingId(null); } };
  const handleMove = async (lead, stato) => { if (movingId === lead.id) return; setMovingId(lead.id); try { await base44.entities.Lead.update(lead.id, { stato }); invalidate(); } finally { setMovingId(null); } };
  const handleCreate = async () => {
    if (!newLead.contact_nome.trim() || creating) return;
    setCreating(true);
    try { await base44.entities.Lead.create({ ...newLead, business_id: businessId, stato: 'nuovo' }); invalidate(); setShowCreate(false); setNewLead({ contact_nome: '', tipo_progetto: '', canale: 'instagram' }); }
    finally { setCreating(false); }
  };

  const statusMap = { all: 'all', hot: 'nuovo', warm: 'qualificato', cold: 'preventivo_inviato' };
  const filteredLeads = leads.filter(l => {
    const matchStatus = filterStatus === 'all' || l.stato === statusMap[filterStatus] || l.stato === filterStatus;
    const matchSearch = !search || (l.contact_nome || '').toLowerCase().includes(search.toLowerCase()) || (l.tipo_progetto || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Source breakdown from canale
  const sources = [
    { src: 'Instagram', count: leads.filter(l => l.canale === 'instagram').length, color: '#E1306C' },
    { src: 'WhatsApp', count: leads.filter(l => l.canale === 'whatsapp').length, color: '#25D366' },
  ].filter(s => s.count > 0);

  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 80, background: C.card, borderRadius: 14, animation: 'pulse 1.5s infinite' }} />)}
    </div>
  );

  const getInitials = (nome) => (nome || 'NN').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colColor = (stato) => KANBAN_COLS.find(c => c.id === stato)?.color || C.muted;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
       <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
         <h2 style={{ margin: 0, fontWeight: 900, fontSize: 22, letterSpacing: -0.5, color: C.text }}>
           {en ? 'Leads & ' : 'Lead & '}<span style={{ color: C.accent }}>{en ? 'Contacts' : 'Contatti'}</span>
         </h2>
         <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
           <GlowBtn small onClick={() => setShowCreate(true)}>+ {en ? 'New Lead' : 'Nuovo Lead'}</GlowBtn>
           <button onClick={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')} style={{
             background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
             padding: '6px 12px', color: C.muted, fontSize: 12, fontWeight: 700,
             cursor: 'pointer', fontFamily: 'inherit',
           }}>
             {viewMode === 'list' ? '⊞ Kanban' : '≡ List'}
           </button>
           <GlowBtn variant="ghost" small onClick={onOpenAria}>🤖 ARIA</GlowBtn>
         </div>
       </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={en ? '🔍  Search name or service...' : '🔍  Cerca nome o servizio...'}
          style={{ flex: 1, minWidth: 180, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
        />
        {['all', 'hot', 'warm', 'cold'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            background: filterStatus === s ? `${C.accent}22` : C.card,
            border: `1px solid ${filterStatus === s ? C.accent : C.border}`,
            borderRadius: 10, padding: '8px 14px', color: filterStatus === s ? C.accent : C.muted,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {s === 'all' ? (en ? 'All' : 'Tutti') : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {leads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>{en ? 'No leads yet' : 'Nessun lead ancora'}</div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>{en ? 'Leads appear when messages arrive from Instagram or WhatsApp' : 'I lead appaiono quando arrivano messaggi da Instagram o WhatsApp'}</div>
          <GlowBtn onClick={() => setShowCreate(true)}>+ {en ? 'Add manually' : 'Aggiungi manualmente'}</GlowBtn>
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            /* Lead list */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredLeads.map(l => (
                <div key={l.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar initials={getInitials(l.contact_nome)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{l.contact_nome || 'Sconosciuto'}</span>
                      <StatusDot color={colColor(l.stato)} />
                      <span style={{ fontSize: 11, color: C.muted }}>
                        {KANBAN_COLS.find(c => c.id === l.stato)?.label || l.stato}
                      </span>
                    </div>
                    {l.tipo_progetto && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{l.tipo_progetto}</div>}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {l.canale && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: (l.canale === 'instagram' ? '#E1306C' : '#25D366') + '22', color: l.canale === 'instagram' ? '#E1306C' : '#25D366', border: `1px solid ${(l.canale === 'instagram' ? '#E1306C' : '#25D366')}44` }}>
                          {l.canale === 'instagram' ? 'IG' : 'WA'}
                        </span>
                      )}
                      {l.budget_max && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: C.gold + '22', color: C.gold, border: `1px solid ${C.gold}44` }}>€{l.budget_max.toLocaleString('it-IT')}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: C.muted }}>{formatSafeTimestamp(l.created_date, 'dd/MM', '')}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button onClick={() => setSelectedLead(l)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', color: C.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✏</button>
                      <button onClick={() => handleDelete(l.id)} style={{ background: C.surface, border: `1px solid ${C.danger}44`, borderRadius: 8, padding: '5px 10px', color: C.danger, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Kanban view */
            <LeadsKanban leads={leads} onMove={handleMove} onEdit={setSelectedLead} lang={en ? 'en' : 'it'} />
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: C.muted, marginBottom: 12, letterSpacing: 1 }}>{en ? 'LEAD SOURCES' : 'SORGENTI LEAD'}</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {sources.map(s => (
                  <div key={s.src} style={{ display: 'flex', alignItems: 'center', gap: 8, background: s.color + '11', borderRadius: 10, padding: '8px 14px', border: `1px solid ${s.color}33` }}>
                    <span style={{ color: s.color, fontWeight: 800, fontSize: 12 }}>{s.src}</span>
                    <span style={{ background: s.color, color: '#fff', fontWeight: 800, fontSize: 11, borderRadius: 20, padding: '1px 7px' }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <LeadDetailModal lead={selectedLead} open={!!selectedLead} onClose={() => setSelectedLead(null)} onUpdate={handleUpdate} />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle>{en ? 'New Lead' : 'Nuovo Lead'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{en ? 'Contact name' : 'Nome contatto'}</Label>
              <Input value={newLead.contact_nome} onChange={e => setNewLead(p => ({ ...p, contact_nome: e.target.value }))} className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <Label>{en ? 'Interest / Service' : 'Interesse / Servizio'}</Label>
              <Input value={newLead.tipo_progetto} onChange={e => setNewLead(p => ({ ...p, tipo_progetto: e.target.value }))} placeholder={en ? 'E.g. Consulting, Course, Product...' : 'Es: Consulenza, Corso, Prodotto...'} className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <Label>{en ? 'Channel' : 'Canale'}</Label>
              <Select value={newLead.canale} onValueChange={v => setNewLead(p => ({ ...p, canale: v }))}>
                <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram DM</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={!newLead.contact_nome.trim() || creating}>
              {creating ? (en ? 'Creating...' : 'Creazione...') : (en ? 'Create Lead' : 'Crea Lead')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Campaigns wrapper — lazy loaded ─────────────────────────────
function CampaignsSection({ businessId }) {
  return (
    <React.Suspense fallback={<TabSkeleton />}>
      <EmailMarketingHubLazy businessId={businessId} />
    </React.Suspense>
  );
}

function MailingSection({ businessId }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontWeight: 900, fontSize: 22, letterSpacing: -0.5, color: C.text }}>
        Mailing <span style={{ color: C.success }}>List</span>
      </h2>
      <MailingListNew businessId={businessId} />
    </div>
  );
}

// ─── Main CRM page ───────────────────────────────────────────────
const ARIA_TIPS_IT = [
  '📊 Analizza i tuoi lead e ottimizza il funnel di conversione',
  '📧 Usa le campagne email per nurturare i contatti warm',
  '💡 Suggerisco una follow-up ai lead inattivi da più di 7 giorni',
  '🔥 Prioritizza i lead "nuovo" che arrivano da Instagram',
];
const ARIA_TIPS_EN = [
  '📊 Analyze your leads and optimize the conversion funnel',
  '📧 Use email campaigns to nurture warm contacts',
  '💡 I suggest following up on leads inactive for more than 7 days',
  '🔥 Prioritize "new" leads coming from Instagram',
];

const TABS_IT = [
  { id: 'dashboard', icon: '◈', label: 'Dashboard' },
  { id: 'leads', icon: '◉', label: 'Lead & CRM' },
  { id: 'email', icon: '◫', label: 'Email Mkt' },
  { id: 'mailing', icon: '✉', label: 'Mailing' },
];
const TABS_EN = [
  { id: 'dashboard', icon: '◈', label: 'Dashboard' },
  { id: 'leads', icon: '◉', label: 'Leads & CRM' },
  { id: 'email', icon: '◫', label: 'Email Mkt' },
  { id: 'mailing', icon: '✉', label: 'Mailing' },
];

export default function CRM() {
  const { business } = useBusiness();
  const { lang, t } = useLang();
  const [tab, setTab] = useState('dashboard');
  const [ariaOpen, setAriaOpen] = useState(false);
  const [ariaIdx, setAriaIdx] = useState(0);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', business?.id],
    queryFn: () => base44.entities.Lead.filter({ business_id: business?.id }),
    enabled: !!business?.id,
    staleTime: 30_000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages-crm', business?.id],
    queryFn: () => base44.entities.Message.filter({ business_id: business?.id }, '-created_date', 500),
    enabled: !!business?.id,
    staleTime: 60_000,
  });

  const { data: emailContacts = [] } = useQuery({
    queryKey: ['email-contacts', business?.id],
    queryFn: () => base44.entities.ContactEmail.filter({ business_id: business?.id }),
    enabled: !!business?.id,
    staleTime: 60_000,
  });

  const { data: campaigns = [] } = useQuery({
    queryKey: ['email-campaigns', business?.id],
    queryFn: () => base44.entities.EmailCampaign.filter({ business_id: business?.id }),
    enabled: !!business?.id,
    staleTime: 60_000,
  });

  const ARIA_TIPS = lang === 'en' ? ARIA_TIPS_EN : ARIA_TIPS_IT;

  useEffect(() => {
    const interval = setInterval(() => setAriaIdx(i => (i + 1) % ARIA_TIPS.length), 4000);
    return () => clearInterval(interval);
  }, [ARIA_TIPS.length]);

  const safeLeads = safeArray(leads);
  const safeEmailContacts = safeArray(emailContacts);
  const safeCampaigns = safeArray(campaigns);

  const activeLeads = safeLeads.filter(l => !['chiuso_vinto', 'chiuso_perso'].includes(l?.stato)).length;
  const hotLeads = safeLeads.filter(l => l?.stato === 'nuovo').length;
  const wonLeads = safeLeads.filter(l => l?.stato === 'chiuso_vinto').length;
  const convRate = safeLeads.length > 0 ? Math.round((wonLeads / safeLeads.length) * 100) : 0;
  const activeContacts = safeEmailContacts.filter(c => c?.stato === 'attivo').length;
  const sentCampaigns = safeCampaigns.filter(c => c?.stato === 'inviata').length;
  const avgOpen = sentCampaigns > 0
    ? Math.round(safeCampaigns.filter(c => c?.stato === 'inviata').reduce((a, c) => a + (safeNumber(c?.destinatari_count) > 0 ? Math.round((safeNumber(c?.aperture) / safeNumber(c?.destinatari_count)) * 100) : 0), 0) / sentCampaigns)
    : 0;

  const stats = { totalLeads: safeLeads.length, activeLeads, emailContacts: activeContacts, campaigns: safeCampaigns.length };

  const TABS = lang === 'en' ? TABS_EN : TABS_IT;
  const KANBAN_COLS = lang === 'en' ? KANBAN_COLS_EN : KANBAN_COLS_IT;
  const getInitials = (nome) => safeInitials(nome, 'NN');
  const colColor = (stato) => KANBAN_COLS.find(c => c.id === stato)?.color || C.muted;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Sora', 'Inter', sans-serif", color: C.text, position: 'relative', overflowX: 'hidden' }}>
      {/* BG grid */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `linear-gradient(${C.border}22 1px, transparent 1px), linear-gradient(90deg, ${C.border}22 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: C.bg + 'ee', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.border}`, padding: '0 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${C.accent2}, ${C.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: `0 0 16px ${C.accent2}66` }}>⬡</div>
            <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: -0.5 }}>CRM</span>
          </div>

          {/* Desktop tabs */}
          <div style={{ display: 'flex', gap: 2, marginLeft: 24, flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? `${C.accent}18` : 'none',
                border: tab === t.id ? `1px solid ${C.accent}44` : '1px solid transparent',
                color: tab === t.id ? C.accent : C.muted,
                padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: 12,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>{t.icon}</span><span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setAriaOpen(true)} style={{
              background: `linear-gradient(135deg, ${C.accent2}22, ${C.accent3}22)`,
              border: `1px solid ${C.accent2}55`, borderRadius: 12, padding: '8px 14px',
              color: C.text, fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 6, boxShadow: `0 0 20px ${C.accent2}33`,
            }}>
              🤖 <span>ARIA</span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.success, boxShadow: `0 0 8px ${C.success}` }} />
            </button>
          </div>
        </div>
      </div>

      {/* ARIA tip banner */}
      <div style={{ background: `linear-gradient(90deg, ${C.accent2}11, ${C.accent}11)`, borderBottom: `1px solid ${C.border}`, padding: '8px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: C.accent2, fontWeight: 700 }}>ARIA</span>
          <span style={{ color: C.accent2 }}>›</span>
          <span>{ARIA_TIPS[ariaIdx]}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isDesktop ? '24px 40px 96px' : '24px 20px 96px', position: 'relative', zIndex: 1 }}>

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, margin: 0 }}>
                Command <span style={{ background: `linear-gradient(90deg, ${C.accent}, ${C.accent2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Center</span>
              </h1>
              <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
                {new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {business?.nome || ''}
              </p>
            </div>

            {/* KPIs — Lazy loaded heavy chart component */}
            <SafeSection label="CRM KPIs">
              <React.Suspense fallback={<TabSkeleton />}>
                <CRMDashboardKPIs leads={safeLeads} campaigns={safeCampaigns} emailContacts={safeEmailContacts} messages={safeArray(messages)} isDesktop={isDesktop} />
              </React.Suspense>
            </SafeSection>

            {/* Recent leads + Quick actions */}
            <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 16 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: C.accent }}>◉</span> {t.latestLeads}
                </div>
                {leads.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>{lang === 'en' ? 'No leads yet' : 'Nessun lead ancora'}</div>}
                {leads.slice(0, 4).map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                    <Avatar initials={getInitials(l.contact_nome)} size={30} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.contact_nome || 'Sconosciuto'}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{l.canale || '—'} · {formatSafeTimestamp(l.created_date, 'dd/MM', '')}</div>
                    </div>
                    <StatusDot color={colColor(l.stato)} />
                  </div>
                ))}
              </div>

              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: C.accent2 }}>⚡</span> {t.quickActions}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: `➕ ${t.goToLeads}`, action: () => setTab('leads'), color: C.accent },
                    { label: `✉ ${t.emailMarketing}`, action: () => setTab('email'), color: C.accent2 },
                    { label: `📋 ${lang === 'en' ? 'Mailing List' : 'Mailing List'}`, action: () => setTab('mailing'), color: C.success },
                    { label: `🤖 ${t.askAria}`, action: () => setAriaOpen(true), color: C.accent3 },
                  ].map((a, i) => (
                    <button key={i} onClick={a.action} style={{
                      background: a.color + '14', border: `1px solid ${a.color}33`, borderRadius: 10,
                      padding: '10px 14px', color: a.color, fontSize: 13, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.2s',
                    }}>{a.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'leads' && <LeadsSection businessId={business?.id} onOpenAria={() => setAriaOpen(true)} />}
        {tab === 'email' && <CampaignsSection businessId={business?.id} onOpenAria={() => setAriaOpen(true)} />}
        {tab === 'mailing' && <MailingSection businessId={business?.id} />}
      </div>

      {/* Mobile tab nav (only visible on small screens, sits above app bottom nav) */}
      <div style={{ position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 40, background: C.surface + 'f0', backdropFilter: 'blur(16px)', borderTop: `1px solid ${C.border}`, display: isDesktop ? 'none' : 'flex', padding: '6px 0 8px' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: 'none', border: 'none', color: tab === t.id ? C.accent : C.muted,
            fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '3px 0',
          }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
        <button onClick={() => setAriaOpen(true)} style={{
          flex: 1, background: 'none', border: 'none', color: C.accent3,
          fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '3px 0',
        }}>
          <span style={{ fontSize: 16 }}>🤖</span><span>ARIA</span>
        </button>
      </div>

      {/* Modals */}
      {ariaOpen && <ARIAPanel onClose={() => setAriaOpen(false)} business={business} stats={stats} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;700;800;900&display=swap');
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}