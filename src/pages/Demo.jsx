/**
 * Demo pubblica — accessibile da /demo senza login.
 * Mostra la dashboard completa con dati fittizi per la revisione Meta.
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  LayoutDashboard, MessageSquare, Users, CalendarDays,
  Bot, BarChart3, Settings, ChevronLeft, ChevronRight,
  Zap, TrendingUp, CheckCircle2, Clock, Instagram, Phone,
  Mail, Star, ArrowUpRight, Send, ExternalLink
} from 'lucide-react';
import AriaChatCore from '@/components/aria/AriaChatCore';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';

const LOGO_URL = 'https://media.base44.com/images/public/69bfc400a0538988ee3a6cfd/93eb01793_emaralagentai.png';
const ACCENT = '#3B6EF8';

/* ── MOCK DATA ── */
const MOCK_BUSINESS = {
  nome: 'Studio Legale Rossi & Associati',
  settore: 'Studio professionale',
  ig_username: '@studiorossi_avv',
  ig_connesso: true,
  wa_number: '+39 02 1234567',
  wa_connesso: true,
  stato_agente: 'attivo',
  nome_agente: 'ARIA',
  aria_color: ACCENT,
};

const MOCK_MESSAGES = [
  { id: 1, nome: 'Marco Bianchi', testo: 'Salve, vorrei info su una consulenza per separazione', canale: 'instagram', ora: '09:14', letto: false, ruolo: 'user' },
  { id: 2, nome: 'Sara Conti', testo: 'Buongiorno! Ho bisogno di assistenza per un contratto di lavoro', canale: 'whatsapp', ora: '10:32', letto: false, ruolo: 'user' },
  { id: 3, nome: 'Luca Ferrari', testo: 'Quando posso fissare un appuntamento per questa settimana?', canale: 'instagram', ora: '11:05', letto: true, ruolo: 'user' },
  { id: 4, nome: 'Giulia Martini', testo: 'Grazie mille per la risposta rapida, perfetto!', canale: 'whatsapp', ora: '11:47', letto: true, ruolo: 'user' },
  { id: 5, nome: 'Roberto Esposito', testo: 'Avete disponibilità per un consulto su diritto societario?', canale: 'instagram', ora: '13:20', letto: false, ruolo: 'user' },
];

const MOCK_LEADS = [
  { id: 1, nome: 'Marco Bianchi', progetto: 'Consulenza separazione', budget: '€500–1.200', stato: 'qualificato', canale: 'instagram', data: '2 apr' },
  { id: 2, nome: 'Sara Conti', progetto: 'Contratto di lavoro', budget: '€200–400', stato: 'nuovo', canale: 'whatsapp', data: '2 apr' },
  { id: 3, nome: 'Roberto Esposito', progetto: 'Diritto societario', budget: '€800–2.000', stato: 'preventivo_inviato', canale: 'instagram', data: '1 apr' },
  { id: 4, nome: 'Alessia Romano', progetto: 'Consulenza successoria', budget: '€300–600', stato: 'chiuso_vinto', canale: 'whatsapp', data: '28 mar' },
  { id: 5, nome: 'Davide Ricci', progetto: 'Ricorso amministrativo', budget: '€1.000–3.000', stato: 'nuovo', canale: 'instagram', data: '3 apr' },
];

const MOCK_APPOINTMENTS = [
  { id: 1, nome: 'Luca Ferrari', titolo: 'Consulenza diritto di famiglia', data: '4 apr 2026', ora: '10:00', stato: 'confermato' },
  { id: 2, nome: 'Marco Bianchi', titolo: 'Prima consulenza separazione', data: '5 apr 2026', ora: '14:30', stato: 'in_attesa' },
  { id: 3, nome: 'Giulia Martini', titolo: 'Revisione contratto', data: '7 apr 2026', ora: '09:00', stato: 'confermato' },
];

const CHART_DATA = [
  { giorno: 'Lun', messaggi: 12, leads: 2 },
  { giorno: 'Mar', messaggi: 19, leads: 4 },
  { giorno: 'Mer', messaggi: 8, leads: 1 },
  { giorno: 'Gio', messaggi: 24, leads: 5 },
  { giorno: 'Ven', messaggi: 31, leads: 7 },
  { giorno: 'Sab', messaggi: 15, leads: 3 },
  { giorno: 'Dom', messaggi: 9, leads: 2 },
];

const PIE_DATA = [
  { name: 'Instagram DM', value: 58, color: '#E1306C' },
  { name: 'WhatsApp', value: 42, color: '#25D366' },
];

const ARIA_CHAT = [
  { role: 'user', text: 'Ciao, avrei bisogno di una consulenza per la separazione', ts: '09:14' },
  { role: 'bot', text: 'Buongiorno! Sono ARIA, l\'assistente dello Studio Legale Rossi. Sarò felice di aiutarla. Per una consulenza sulla separazione possiamo fissare un primo colloquio con l\'avvocato. Ha preferenze di giorno o orario?', ts: '09:14' },
  { role: 'user', text: 'Preferisco il pomeriggio, magari giovedì o venerdì', ts: '09:15' },
  { role: 'bot', text: 'Perfetto! Ho disponibilità giovedì 4 aprile alle 15:00 oppure venerdì 5 aprile alle 14:30. Quale preferisce? La consulenza iniziale dura circa 45 minuti.', ts: '09:15' },
  { role: 'user', text: 'Venerdì alle 14:30 va benissimo', ts: '09:16' },
  { role: 'bot', text: 'Ottimo! Ho prenotato per lei venerdì 5 aprile alle 14:30 con l\'Avv. Rossi. Riceverà una conferma via email. C\'è altro in cui posso aiutarla?', ts: '09:16' },
];

const STATO_CONFIG = {
  nuovo: { label: 'Nuovo', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  qualificato: { label: 'Qualificato', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  preventivo_inviato: { label: 'Preventivo', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  chiuso_vinto: { label: 'Vinto ✓', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  chiuso_perso: { label: 'Perso', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'inbox', icon: MessageSquare, label: 'Inbox' },
  { id: 'crm', icon: Users, label: 'CRM' },
  { id: 'calendar', icon: CalendarDays, label: 'Agenda' },
  { id: 'aria', icon: Bot, label: 'ARIA' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'connections', icon: Settings, label: 'Connessioni' },
];

/* ══════════════════════════════════════════ */
export default function Demo() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [ariaInput, setAriaInput] = useState('');
  const [ariaMessages, setAriaMessages] = useState(ARIA_CHAT);
  const [ariaLoading, setAriaLoading] = useState(false);

  // ARIA robot chat (floating, sempre visibile)
  const [chatOpen, setChatOpen] = useState(false);
  const [ariaChatExpanded, setAriaChatExpanded] = useState(false);

  const handleAriaSend = () => {
    if (!ariaInput.trim()) return;
    const msg = { role: 'user', text: ariaInput, ts: format(new Date(), 'HH:mm') };
    setAriaMessages(prev => [...prev, msg]);
    setAriaInput('');
    setAriaLoading(true);
    setTimeout(() => {
      setAriaMessages(prev => [...prev, {
        role: 'bot',
        text: 'Questa è una demo interattiva. In produzione ARIA risponde in tempo reale usando GPT-4 con la conoscenza completa del tuo business.',
        ts: format(new Date(), 'HH:mm'),
      }]);
      setAriaLoading(false);
    }, 1200);
  };

  const SIDEBAR_TOP = 36; // altezza banner demo

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220 20% 4%)', display: 'flex', fontFamily: "'Inter', sans-serif" }}>

      {/* ── DEMO BANNER ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        background: 'linear-gradient(90deg, #7C3AED, #3B6EF8)',
        padding: '6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        fontSize: 12, color: '#fff', fontWeight: 500, height: SIDEBAR_TOP,
      }}>
        <span style={{ lineHeight: 1.4 }}>
          🚀 <strong>MODALITÀ DEMO</strong> — Stai esplorando Emaral Agent AI. Gestisci messaggi WhatsApp e Instagram con ARIA, il tuo assistente AI. CRM, Agenda, Analytics e molto altro — tutto in un'unica piattaforma. Accedi o registrati per usare la versione reale.
        </span>
        <a href="https://emaral-systems-ai.base44.app" target="_blank" rel="noreferrer"
          style={{ color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.18)', padding: '5px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
          Inizia gratis → 
        </a>
      </div>

      {/* ── SIDEBAR ── */}
      <aside style={{
        position: 'fixed', left: 0, top: SIDEBAR_TOP, bottom: 0, zIndex: 40,
        width: collapsed ? 68 : 240, transition: 'width 0.3s',
        background: 'hsl(220 18% 5%)', borderRight: '1px solid hsl(220 15% 12%)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid hsl(220 15% 12%)', gap: 12, flexShrink: 0 }}>
          <img src={LOGO_URL} alt="Emaral" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(220 10% 95%)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>Emaral Agent AI</p>
              <p style={{ fontSize: 10, color: 'hsl(220 10% 50%)', whiteSpace: 'nowrap' }}>by Emaral Group</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const active = activeTab === item.id;
            const isAria = item.id === 'aria';
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? `${ACCENT}1A` : 'transparent',
                  color: active ? ACCENT : 'hsl(220 10% 70%)',
                  fontSize: 13, fontWeight: active ? 600 : 400, textAlign: 'left',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}>
                {isAria ? (
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>A</div>
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 7, height: 7, borderRadius: '50%', background: '#10B981', border: '1.5px solid hsl(220 18% 5%)' }} />
                  </div>
                ) : (
                  <item.icon size={18} style={{ flexShrink: 0 }} />
                )}
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Legal link */}
        {!collapsed && (
          <div style={{ padding: '8px 16px' }}>
            <span style={{ fontSize: 10, color: 'hsl(220 10% 40%)' }}>Termini & Privacy</span>
          </div>
        )}

        {/* Agent status */}
        {!collapsed && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid hsl(220 15% 12%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 11, color: 'hsl(220 10% 50%)' }}>Agente Attivo</span>
            </div>
          </div>
        )}

        {/* Collapse btn */}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid hsl(220 15% 12%)', background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220 10% 50%)', flexShrink: 0 }}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ marginLeft: collapsed ? 68 : 240, marginTop: SIDEBAR_TOP, flex: 1, transition: 'margin-left 0.3s', minHeight: `calc(100vh - ${SIDEBAR_TOP}px)` }}>
        {/* Top header bar — come nella app reale */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', background: 'hsl(220 20% 4%)', borderBottom: '1px solid hsl(220 15% 12%)' }}>
          {/* Notification bell mock */}
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'hsl(220 15% 10%)', border: '1px solid hsl(220 15% 15%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(220 10% 70%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: ACCENT, border: '1.5px solid hsl(220 20% 4%)' }} />
          </div>
        </div>

        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'inbox' && <InboxTab />}
        {activeTab === 'crm' && <CrmTab />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'aria' && <AriaTab messages={ariaMessages} input={ariaInput} setInput={setAriaInput} onSend={handleAriaSend} loading={ariaLoading} />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'connections' && <ConnectionsTab />}
      </main>

      {/* ── ARIA REALE — robot mascot + chat panel (come nella app reale) ── */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        {/* AriaChatCore reale */}
        {chatOpen && (
          <div style={{
            width: ariaChatExpanded ? 520 : 380,
            height: ariaChatExpanded ? 600 : 500,
            background: '#0A0D14',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 20,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 24px rgba(124,58,237,0.12)',
            overflow: 'hidden',
            transition: 'width 0.25s, height 0.25s',
          }}>
            <AriaChatCore
              color="#7C3AED"
              name="ARIA"
              mood="felice"
              business={MOCK_BUSINESS}
              form={{ tono: 'professionale', lingua: 'Italiano', servizi: MOCK_BUSINESS.settore }}
              unreadCount={3}
              activeLeads={4}
              scheduledPosts={2}
              lastLead={{ contact_nome: 'Marco Bianchi', stato: 'qualificato' }}
              onClose={() => setChatOpen(false)}
              expanded={ariaChatExpanded}
              onToggleExpand={() => setAriaChatExpanded(e => !e)}
              isMobile={false}
            />
          </div>
        )}

        {/* Robot mascot button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            onClick={() => setChatOpen(o => !o)}
            style={{ cursor: 'pointer', opacity: 0.82, transition: 'transform 0.2s, opacity 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '0.82'; }}
          >
            <svg width="80" height="100" viewBox="0 0 110 140" style={{ filter: 'drop-shadow(0 4px 20px rgba(124,58,237,0.55))' }}>
              <g transform="translate(18,0) scale(0.68)">
                <polygon points="18,8 82,8 76,22 18,22" fill="#F0F4FF"/>
                <polygon points="18,28 80,28 74,42 18,42" fill="#F0F4FF"/>
                <polygon points="42,28 80,28 58,42 42,42 62,35" fill="#06080E"/>
                <polygon points="18,48 76,48 70,62 18,62" fill="#F0F4FF"/>
                <circle cx="88" cy="6" r="8" fill="#7C3AED">
                  <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
                </circle>
              </g>
              <rect x="8" y="52" width="18" height="6" rx="3" fill="#7C3AED" fillOpacity="0.6" transform="rotate(-32 8 52)"/>
              <rect x="76" y="52" width="18" height="6" rx="3" fill="#7C3AED" fillOpacity="0.6" transform="rotate(32 94 52)"/>
              <rect x="26" y="52" width="58" height="38" rx="13" fill="#7C3AED" fillOpacity="0.12" stroke="#7C3AED" strokeWidth="1.5"/>
              <circle cx="40" cy="71" r="6" fill="#7C3AED"/>
              <circle cx="70" cy="71" r="6" fill="#7C3AED"/>
              <circle cx="41" cy="70" r="2.5" fill="#F0F4FF"/>
              <circle cx="71" cy="70" r="2.5" fill="#F0F4FF"/>
              <path d="M42 82 Q55 89 68 82" fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round"/>
              <rect x="22" y="96" width="66" height="30" rx="10" fill="#7C3AED" fillOpacity="0.1" stroke="#7C3AED" strokeWidth="1.5"/>
              <rect x="34" y="104" width="11" height="11" rx="4" fill="#7C3AED" fillOpacity="0.4"/>
              <rect x="50" y="104" width="11" height="11" rx="4" fill="#7C3AED" fillOpacity="0.4"/>
              <rect x="66" y="104" width="11" height="11" rx="4" fill="#7C3AED" fillOpacity="0.4"/>
              <rect x="32" y="126" width="16" height="12" rx="5" fill="#7C3AED" fillOpacity="0.35"/>
              <rect x="62" y="126" width="16" height="12" rx="5" fill="#7C3AED" fillOpacity="0.35"/>
            </svg>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#7C3AED', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>ARIA</span>
        </div>
      </div>
    </div>
  );
}

/* ══ TAB: DASHBOARD ══ */
function DashboardTab() {
  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(220 10% 95%)' }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: 'hsl(220 10% 50%)', marginTop: 2 }}>
          {MOCK_BUSINESS.nome} — {format(new Date(), 'd MMMM yyyy', { locale: it })}
        </p>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        {[
          { label: 'Messaggi oggi', value: 24, icon: MessageSquare, trend: '+12%' },
          { label: 'Lead attivi', value: 4, icon: Users, trend: '+8%' },
          { label: 'Appuntamenti', value: 3, icon: CalendarDays, trend: null },
          { label: 'Tasso risposta AI', value: '94%', icon: Zap, trend: '+5%' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'hsl(220 10% 50%)' }}>{kpi.label}</span>
              <kpi.icon size={16} color={ACCENT} />
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'hsl(220 10% 95%)', lineHeight: 1 }}>{kpi.value}</div>
            {kpi.trend && <div style={{ fontSize: 11, color: '#10B981', marginTop: 6 }}>{kpi.trend} vs ieri</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Chart */}
        <div style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'hsl(220 10% 95%)', marginBottom: 16 }}>Messaggi questa settimana</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={CHART_DATA}>
              <XAxis dataKey="giorno" tick={{ fontSize: 11, fill: 'hsl(220 10% 50%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220 10% 50%)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="messaggi" stroke={ACCENT} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent leads */}
        <div style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'hsl(220 10% 95%)', marginBottom: 16 }}>Ultimi Lead</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MOCK_LEADS.slice(0, 3).map(lead => (
              <div key={lead.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'hsl(220 15% 13%)', borderRadius: 8 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(220 10% 95%)' }}>{lead.nome}</p>
                  <p style={{ fontSize: 10, color: 'hsl(220 10% 50%)', marginTop: 1 }}>{lead.progetto}</p>
                </div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: '1px solid', ...(STATO_CONFIG[lead.stato] ? { background: '', color: '' } : {}) }} className={STATO_CONFIG[lead.stato]?.color}>
                  {STATO_CONFIG[lead.stato]?.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unread messages */}
      <div style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'hsl(220 10% 95%)', marginBottom: 16 }}>Messaggi non letti ({MOCK_MESSAGES.filter(m => !m.letto).length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MOCK_MESSAGES.filter(m => !m.letto).map(msg => (
            <div key={msg.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'hsl(220 15% 13%)', borderRadius: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT }}>{msg.nome[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(220 10% 95%)' }}>{msg.nome}</p>
                <p style={{ fontSize: 12, color: 'hsl(220 10% 60%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.testo}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: 'hsl(220 10% 50%)' }}>{msg.ora}</span>
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: msg.canale === 'instagram' ? '#E1306C20' : '#25D36620', color: msg.canale === 'instagram' ? '#E1306C' : '#25D366' }}>
                  {msg.canale === 'instagram' ? 'IG' : 'WA'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

/* ══ TAB: INBOX ══ */
function InboxTab() {
  const [selected, setSelected] = useState(MOCK_MESSAGES[0]);
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 36px)' }}>
      {/* Conversation list */}
      <div style={{ width: 300, borderRight: '1px solid hsl(220 15% 15%)', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'hsl(220 10% 95%)', marginBottom: 8, padding: '0 4px' }}>Conversazioni</h2>
        {MOCK_MESSAGES.map(msg => (
          <button key={msg.id} onClick={() => setSelected(msg)}
            style={{ width: '100%', textAlign: 'left', padding: 12, borderRadius: 10, border: 'none', cursor: 'pointer', background: selected?.id === msg.id ? `${ACCENT}15` : 'transparent', transition: 'background 0.15s', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'hsl(220 15% 13%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'hsl(220 10% 95%)' }}>{msg.nome[0]}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(220 10% 95%)' }}>{msg.nome}</span>
                <span style={{ fontSize: 10, color: 'hsl(220 10% 50%)' }}>{msg.ora}</span>
              </div>
              <p style={{ fontSize: 11, color: 'hsl(220 10% 55%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{msg.testo}</p>
            </div>
            {!msg.letto && <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />}
          </button>
        ))}
      </div>

      {/* Chat view */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selected && (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid hsl(220 15% 15%)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${ACCENT}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontWeight: 700, color: ACCENT }}>{selected.nome[0]}</span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(220 10% 95%)' }}>{selected.nome}</p>
                <p style={{ fontSize: 11, color: 'hsl(220 10% 50%)' }}>{selected.canale === 'instagram' ? '📸 Instagram DM' : '📱 WhatsApp'}</p>
              </div>
            </div>
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
              <div style={{ alignSelf: 'flex-start', maxWidth: '70%', background: 'hsl(220 15% 13%)', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', fontSize: 13, color: 'hsl(220 10% 85%)' }}>
                {selected.testo}
              </div>
              <div style={{ alignSelf: 'flex-end', maxWidth: '70%', background: ACCENT, borderRadius: '16px 16px 4px 16px', padding: '10px 14px', fontSize: 13, color: '#fff' }}>
                Grazie per averci contattato! Sono ARIA, l'assistente dello Studio Rossi. Sarò felice di aiutarla. Può dirmi di più su ciò di cui ha bisogno?
              </div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '70%', background: 'hsl(220 15% 13%)', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', fontSize: 13, color: 'hsl(220 10% 85%)' }}>
                Sì, avrei bisogno di una consulenza quanto prima possibile.
              </div>
              <div style={{ alignSelf: 'flex-end', maxWidth: '70%', background: ACCENT, borderRadius: '16px 16px 4px 16px', padding: '10px 14px', fontSize: 13, color: '#fff' }}>
                Certo! Abbiamo disponibilità questa settimana. Preferisce la mattina o il pomeriggio?
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid hsl(220 15% 15%)', display: 'flex', gap: 12 }}>
              <input style={{ flex: 1, background: 'hsl(220 15% 13%)', border: '1px solid hsl(220 15% 20%)', borderRadius: 20, padding: '10px 16px', color: 'hsl(220 10% 95%)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} placeholder="Scrivi un messaggio..." />
              <button style={{ width: 40, height: 40, borderRadius: '50%', background: ACCENT, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={16} color="#fff" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══ TAB: CRM ══ */
function CrmTab() {
  const columns = ['nuovo', 'qualificato', 'preventivo_inviato', 'chiuso_vinto'];
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(220 10% 95%)', marginBottom: 24 }}>CRM — Pipeline Lead</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, overflowX: 'auto' }}>
        {columns.map(col => (
          <div key={col} style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: 16, minHeight: 300 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'hsl(220 10% 70%)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{STATO_CONFIG[col]?.label}</h3>
              <span style={{ fontSize: 11, background: 'hsl(220 15% 13%)', color: 'hsl(220 10% 60%)', padding: '2px 8px', borderRadius: 10 }}>
                {MOCK_LEADS.filter(l => l.stato === col).length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {MOCK_LEADS.filter(l => l.stato === col).map(lead => (
                <div key={lead.id} style={{ background: 'hsl(220 15% 10%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 10, padding: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(220 10% 95%)', marginBottom: 4 }}>{lead.nome}</p>
                  <p style={{ fontSize: 11, color: 'hsl(220 10% 55%)', marginBottom: 8 }}>{lead.progetto}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>{lead.budget}</span>
                    <span style={{ fontSize: 10, color: 'hsl(220 10% 45%)' }}>{lead.data}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 10, color: lead.canale === 'instagram' ? '#E1306C' : '#25D366' }}>
                    {lead.canale === 'instagram' ? '📸 Instagram' : '📱 WhatsApp'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ TAB: CALENDAR ══ */
function CalendarTab() {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(220 10% 95%)', marginBottom: 24 }}>Agenda</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MOCK_APPOINTMENTS.map(apt => (
          <div key={apt.id} style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: `${ACCENT}15`, border: `1.5px solid ${ACCENT}30`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: ACCENT }}>{apt.data.split(' ')[0]}</span>
              <span style={{ fontSize: 9, color: ACCENT, opacity: 0.7 }}>{apt.data.split(' ')[1]?.toUpperCase()}</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(220 10% 95%)' }}>{apt.titolo}</p>
              <p style={{ fontSize: 12, color: 'hsl(220 10% 55%)', marginTop: 2 }}>con {apt.nome} — ore {apt.ora}</p>
            </div>
            <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 8, background: apt.stato === 'confermato' ? '#10B98115' : '#F59E0B15', color: apt.stato === 'confermato' ? '#10B981' : '#F59E0B', border: `1px solid ${apt.stato === 'confermato' ? '#10B98130' : '#F59E0B30'}`, fontWeight: 500 }}>
              {apt.stato === 'confermato' ? '✓ Confermato' : '⏳ In attesa'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══ TAB: ARIA CHAT ══ */
function AriaTab({ messages, input, setInput, onSend, loading }) {
  const endRef = React.useRef(null);
  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 36px)' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid hsl(220 15% 15%)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>A</div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(220 10% 95%)' }}>ARIA</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: 10, color: '#10B981' }}>online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '70%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? ACCENT : 'hsl(220 15% 13%)',
              fontSize: 13, color: msg.role === 'user' ? '#fff' : 'hsl(220 10% 90%)', lineHeight: 1.55,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ background: 'hsl(220 15% 13%)', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', display: 'flex', gap: 5 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, animation: `typingDot 1.2s ${i*0.2}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid hsl(220 15% 15%)', display: 'flex', gap: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSend()}
          placeholder="Scrivi ad ARIA..."
          style={{ flex: 1, background: 'hsl(220 15% 13%)', border: '1px solid hsl(220 15% 20%)', borderRadius: 20, padding: '10px 16px', color: 'hsl(220 10% 95%)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        />
        <button onClick={onSend} style={{ width: 40, height: 40, borderRadius: '50%', background: input.trim() ? ACCENT : 'hsl(220 15% 13%)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}

/* ══ TAB: ANALYTICS ══ */
function AnalyticsTab() {
  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(220 10% 95%)' }}>Analytics</h1>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        {[
          { label: 'Messaggi totali', value: '1.247', sub: 'ultimi 30 giorni' },
          { label: 'Lead generati', value: '38', sub: '+22% vs mese scorso' },
          { label: 'Tasso conversione', value: '18%', sub: 'lead → cliente' },
          { label: 'Risposta media', value: '< 2 min', sub: 'tempo medio AI' },
        ].map(k => (
          <div key={k.label} style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: 20 }}>
            <p style={{ fontSize: 11, color: 'hsl(220 10% 50%)', marginBottom: 8 }}>{k.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: 'hsl(220 10% 95%)' }}>{k.value}</p>
            <p style={{ fontSize: 10, color: '#10B981', marginTop: 4 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Bar chart */}
        <div style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'hsl(220 10% 95%)', marginBottom: 16 }}>Lead per giorno</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={CHART_DATA}>
              <XAxis dataKey="giorno" tick={{ fontSize: 11, fill: 'hsl(220 10% 50%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(220 10% 50%)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="leads" fill={ACCENT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'hsl(220 10% 95%)', marginBottom: 16 }}>Canali</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                {PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {PIE_DATA.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'hsl(220 10% 70%)' }}>{d.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'hsl(220 10% 95%)' }}>{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══ TAB: CONNECTIONS ══ */
function ConnectionsTab() {
  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'hsl(220 10% 95%)', marginBottom: 8 }}>Connessioni</h1>
      <p style={{ fontSize: 13, color: 'hsl(220 10% 50%)', marginBottom: 24 }}>Gestisci i canali di comunicazione collegati alla piattaforma.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Instagram */}
        <div style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Instagram size={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(220 10% 95%)' }}>Instagram Business</p>
            <p style={{ fontSize: 12, color: '#10B981', marginTop: 2 }}>✓ Connesso — @{MOCK_BUSINESS.ig_username?.replace('@', '')}</p>
            <p style={{ fontSize: 11, color: 'hsl(220 10% 50%)', marginTop: 1 }}>DM automatici, gestione commenti, analytics</p>
          </div>
          <div style={{ padding: '6px 16px', borderRadius: 8, background: '#10B98115', color: '#10B981', fontSize: 12, fontWeight: 600, border: '1px solid #10B98130' }}>Attivo</div>
        </div>

        {/* WhatsApp */}
        <div style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#25D36620', border: '1px solid #25D36630', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Phone size={24} color="#25D366" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(220 10% 95%)' }}>WhatsApp Business</p>
            <p style={{ fontSize: 12, color: '#10B981', marginTop: 2 }}>✓ Connesso — {MOCK_BUSINESS.wa_number}</p>
            <p style={{ fontSize: 11, color: 'hsl(220 10% 50%)', marginTop: 1 }}>Risposte automatiche, gestione lead</p>
          </div>
          <div style={{ padding: '6px 16px', borderRadius: 8, background: '#10B98115', color: '#10B981', fontSize: 12, fontWeight: 600, border: '1px solid #10B98130' }}>Attivo</div>
        </div>

        {/* Email */}
        <div style={{ background: 'hsl(220 18% 7%)', border: '1px solid hsl(220 15% 15%)', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F59E0B15', border: '1px solid #F59E0B30', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Mail size={24} color="#F59E0B" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'hsl(220 10% 95%)' }}>Email Marketing</p>
            <p style={{ fontSize: 12, color: 'hsl(220 10% 50%)', marginTop: 2 }}>Non configurato</p>
            <p style={{ fontSize: 11, color: 'hsl(220 10% 40%)', marginTop: 1 }}>Campagne email, automazioni, newsletter</p>
          </div>
          <button style={{ padding: '6px 16px', borderRadius: 8, background: `${ACCENT}15`, color: ACCENT, fontSize: 12, fontWeight: 600, border: `1px solid ${ACCENT}30`, cursor: 'pointer', fontFamily: 'inherit' }}>Configura</button>
        </div>

        {/* Meta Graph API info */}
        <div style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}25`, borderRadius: 12, padding: 20, marginTop: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(220 10% 90%)', marginBottom: 8 }}>📡 Meta Graph API</p>
          <p style={{ fontSize: 12, color: 'hsl(220 10% 60%)', lineHeight: 1.6 }}>
            La piattaforma utilizza le API ufficiali di Meta (Instagram Graph API v21.0) per gestire messaggi diretti,
            notifiche e analytics. Tutti i dati vengono elaborati nel rispetto delle policy Meta e del GDPR.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            {['instagram_business_basic', 'instagram_business_manage_messages', 'instagram_business_manage_comments', 'instagram_business_manage_insights'].map(scope => (
              <span key={scope} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: `${ACCENT}15`, color: ACCENT, border: `1px solid ${ACCENT}30`, fontFamily: 'monospace' }}>{scope}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}