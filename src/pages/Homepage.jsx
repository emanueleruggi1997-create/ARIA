import { useState, useEffect } from "react";
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/LanguageContext.jsx';

/* ─── DESIGN TOKENS ─── */
const T = {
  bg:       "#04080F",
  deep:     "#070D1A",
  surface:  "#0A1628",
  card:     "#0D1E35",
  border:   "#142340",
  glow:     "#0066FF",
  cyan:     "#00D4FF",
  violet:   "#7000FF",
  pink:     "#FF0080",
  gold:     "#FFB800",
  text:     "#EDF4FF",
  muted:    "#4A6A8A",
  success:  "#00E5A0",
};

/* ─── STATIC STYLES ─── */
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { background: ${T.bg}; color: ${T.text}; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-thumb { background: ${T.glow}44; border-radius: 2px; }

@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.8; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
}
@keyframes scan {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(400%); }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@keyframes gradShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.slide-up-1 { animation: slideUp 0.7s 0.1s ease both; }
.slide-up-2 { animation: slideUp 0.7s 0.2s ease both; }
.slide-up-3 { animation: slideUp 0.7s 0.35s ease both; }
.slide-up-4 { animation: slideUp 0.7s 0.5s ease both; }
.slide-up-5 { animation: slideUp 0.7s 0.65s ease both; }

.hp-btn-primary {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 16px 32px; border-radius: 14px; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 16px; color: #fff;
  background: linear-gradient(135deg, ${T.glow}, ${T.violet});
  box-shadow: 0 0 40px ${T.glow}55, 0 4px 20px rgba(0,0,0,0.4);
  transition: all 0.25s; letter-spacing: 0.3px; position: relative; overflow: hidden;
}
.hp-btn-primary::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, ${T.violet}, ${T.pink});
  opacity: 0; transition: opacity 0.25s;
}
.hp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 60px ${T.glow}77, 0 8px 30px rgba(0,0,0,0.5); }
.hp-btn-primary:hover::before { opacity: 1; }
.hp-btn-primary span { position: relative; z-index: 1; }

.hp-btn-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 15px 28px; border-radius: 14px; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 15px; color: ${T.text};
  background: transparent; border: 1px solid ${T.border}; transition: all 0.25s;
}
.hp-btn-ghost:hover { border-color: ${T.cyan}66; color: ${T.cyan}; background: ${T.cyan}0A; }

.hp-feature-card {
  background: ${T.card}; border: 1px solid ${T.border}; border-radius: 20px;
  padding: 28px; transition: all 0.3s; cursor: default; position: relative; overflow: hidden;
}
.hp-feature-card:hover { border-color: ${T.glow}44; transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,102,0.25); }

.hp-price-card {
  background: ${T.card}; border: 1px solid ${T.border}; border-radius: 24px;
  padding: 36px 28px; position: relative; overflow: hidden; transition: all 0.3s;
}
.hp-price-card:hover { transform: translateY(-4px); }
.hp-price-card.featured { border-color: ${T.glow}77; box-shadow: 0 0 60px ${T.glow}22; }

.hp-mood-btn {
  padding: 8px 16px; border-radius: 20px; border: 1px solid ${T.border};
  background: transparent; color: ${T.muted}; font-family: 'DM Sans', sans-serif;
  font-size: 13px; cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.hp-mood-btn.active { background: ${T.glow}22; border-color: ${T.glow}66; color: ${T.cyan}; }
.hp-mood-btn:hover { border-color: ${T.border}; color: ${T.text}; }

.hp-nav-link { color: ${T.muted}; font-size: 14px; font-weight: 500; text-decoration: none; cursor: pointer; transition: color 0.2s; }
.hp-nav-link:hover { color: ${T.text}; }
`;

/* ─── SUBCOMPONENTS ─── */
function ARIAOrb({ mood }) {
  const moodColors = {
    felice:     [T.cyan,   T.glow],
    energica:   [T.gold,   "#FF6600"],
    divertita:  [T.pink,   T.violet],
    stanca:     [T.muted,  "#2A4060"],
    innamorata: ["#FF4488", T.pink],
    arrabbiata: ["#FF2200", "#FF6600"],
  };
  const [c1, c2] = moodColors[mood] || [T.cyan, T.glow];
  return (
    <div style={{ position: "relative", width: 220, height: 220, flexShrink: 0 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: `1px solid ${c1}44`,
          animation: `pulse-ring 2.5s ${i * 0.8}s ease-out infinite`,
        }} />
      ))}
      <div style={{ position: "absolute", inset: 10, borderRadius: "50%", border: `1px solid ${c1}33`, boxShadow: `0 0 40px ${c1}33` }} />
      <div style={{
        position: "absolute", inset: 30, borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${c1}cc, ${c2}88 60%, ${T.deep}ff)`,
        boxShadow: `0 0 60px ${c1}66, inset 0 0 40px ${c2}44`,
        animation: "float 4s ease-in-out infinite",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "30%",
          background: `linear-gradient(to bottom, transparent, ${c1}44, transparent)`,
          animation: "scan 2s linear infinite", borderRadius: "50%",
        }} />
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, letterSpacing: 6, color: "#fff", textShadow: `0 0 20px ${c1}`, position: "relative", zIndex: 1 }}>ARIA</div>
      </div>
    </div>
  );
}

function ChatBubble({ from, text, delay = 0 }) {
  const isAria = from === "aria";
  return (
    <div style={{ display: "flex", justifyContent: isAria ? "flex-start" : "flex-end", animation: `slideUp 0.4s ${delay}s ease both`, opacity: 0 }}>
      {isAria && (
        <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, marginRight: 8, background: `linear-gradient(135deg, ${T.violet}, ${T.pink})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>A</div>
      )}
      <div style={{
        maxWidth: "75%", padding: "10px 14px", fontSize: 13, lineHeight: 1.55,
        borderRadius: isAria ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
        background: isAria ? T.card : `linear-gradient(135deg, ${T.glow}, ${T.violet})`,
        border: isAria ? `1px solid ${T.border}` : "none", color: T.text,
        boxShadow: isAria ? "none" : `0 0 20px ${T.glow}44`,
      }}>
        {isAria && <div style={{ fontSize: 10, color: T.cyan, fontWeight: 700, marginBottom: 3 }}>ARIA ·</div>}
        {text}
      </div>
    </div>
  );
}

function StatBadge({ value, label, color }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 22px", textAlign: "center", minWidth: 100 }}>
      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 38, letterSpacing: 2, color, lineHeight: 1, textShadow: `0 0 20px ${color}88` }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 4, fontWeight: 500, letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function Ticker({ lang }) {
  const en = lang === 'en';
  const items = en ? [
    "◈ 24/7 RESPONSE", "◉ ZERO ABSENCES", "◈ QUALIFIED LEADS",
    "◉ AUTOMATIC CRM", "◈ WHATSAPP + INSTAGRAM", "◉ AI APPOINTMENTS",
    "◈ 24/7 RESPONSE", "◉ ZERO ABSENCES", "◈ QUALIFIED LEADS",
    "◉ AUTOMATIC CRM", "◈ WHATSAPP + INSTAGRAM", "◉ AI APPOINTMENTS",
  ] : [
    "◈ RISPOSTA H24", "◉ ZERO ASSENZE", "◈ LEAD QUALIFICATI",
    "◉ CRM AUTOMATICO", "◈ WHATSAPP + INSTAGRAM", "◉ APPUNTAMENTI AI",
    "◈ RISPOSTA H24", "◉ ZERO ASSENZE", "◈ LEAD QUALIFICATI",
    "◉ CRM AUTOMATICO", "◈ WHATSAPP + INSTAGRAM", "◉ APPUNTAMENTI AI",
  ];
  return (
    <div style={{ overflow: "hidden", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, padding: "12px 0", background: T.deep }}>
      <div style={{ display: "flex", gap: 48, animation: "ticker 18s linear infinite", width: "max-content" }}>
        {items.map((item, i) => (
          <span key={i} style={{ fontSize: 12, fontWeight: 700, color: T.muted, letterSpacing: 2, whiteSpace: "nowrap" }}>{item}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─── */
export default function Homepage() {
  const { lang, toggleLang } = useLang();
  const en = lang === 'en';
  const [mood, setMood] = useState("felice");
  const [activeStep, setActiveStep] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const moods = ["felice", "energica", "divertita", "stanca", "innamorata", "arrabbiata"];
  const moodEmoji = { felice: "😊", energica: "⚡", divertita: "😄", stanca: "😴", innamorata: "🥰", arrabbiata: "😤" };
  const moodLabels = en
    ? { felice: "Happy", energica: "Energetic", divertita: "Playful", stanca: "Tired", innamorata: "In love", arrabbiata: "Angry" }
    : { felice: "Felice", energica: "Energica", divertita: "Divertita", stanca: "Stanca", innamorata: "Innamorata", arrabbiata: "Arrabbiata" };

  // Se già autenticato, vai direttamente alla dashboard
  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) window.location.href = '/dashboard';
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % 4), 2800);
    return () => clearInterval(t);
  }, []);

  const handleLogin = () => base44.auth.redirectToLogin('/dashboard');

  const steps = en ? [
    { n: "01", title: "Client writes", desc: "On WhatsApp or Instagram. Day or night, weekends or holidays.", icon: "💬" },
    { n: "02", title: "ARIA replies", desc: "Naturally, with your business tone. Qualifies the lead.", icon: "🤖" },
    { n: "03", title: "Lead in CRM", desc: "With all gathered info, ready to be followed up.", icon: "◉" },
    { n: "04", title: "You close", desc: "Receive only warm, pre-qualified contacts. Zero time wasted.", icon: "🎯" },
  ] : [
    { n: "01", title: "Il cliente scrive", desc: "Su WhatsApp o Instagram. Giorno o notte, weekend o festivi.", icon: "💬" },
    { n: "02", title: "ARIA risponde", desc: "In modo naturale, con il tono della tua attività. Qualifica il lead.", icon: "🤖" },
    { n: "03", title: "Lead nel CRM", desc: "Con tutte le informazioni raccolte, pronto per essere seguito.", icon: "◉" },
    { n: "04", title: "Tu chiudi", desc: "Ricevi solo i contatti caldi, già qualificati. Zero tempo perso.", icon: "🎯" },
  ];

  const features = en ? [
    { icon: "💬", title: "WhatsApp Business", desc: "ARIA responds 24/7, qualifies leads and alerts you only when needed.", tag: "PRO PLAN" },
    { icon: "📷", title: "Instagram DM", desc: "Automatic management of direct messages. No customer left without a reply.", tag: "ALL PLANS" },
    { icon: "◉", title: "CRM & Leads", desc: "Kanban board, qualified leads and always up-to-date sales pipeline.", tag: "ALL PLANS" },
    { icon: "📅", title: "AI Agenda", desc: "ARIA books appointments automatically directly from the chat.", tag: "ALL PLANS" },
    { icon: "✉", title: "Email Marketing", desc: "Automated campaigns, personalized newsletters, real-time stats.", tag: "ALL PLANS" },
    { icon: "📊", title: "Analytics", desc: "Reports on messages, converted leads and performance. Real data, better decisions.", tag: "ALL PLANS" },
  ] : [
    { icon: "💬", title: "WhatsApp Business", desc: "ARIA risponde H24, qualifica i lead e ti avvisa solo quando serve davvero.", tag: "PIANO PRO" },
    { icon: "📷", title: "Instagram DM", desc: "Gestione automatica dei messaggi diretti. Nessun cliente senza risposta.", tag: "TUTTI I PIANI" },
    { icon: "◉", title: "CRM & Lead", desc: "Kanban board, lead qualificati e pipeline di vendita sempre aggiornata.", tag: "TUTTI I PIANI" },
    { icon: "📅", title: "Agenda AI", desc: "ARIA prenota appuntamenti in automatico direttamente dalla chat.", tag: "TUTTI I PIANI" },
    { icon: "✉", title: "Email Marketing", desc: "Campagne automatiche, newsletter personalizzate, statistiche in tempo reale.", tag: "TUTTI I PIANI" },
    { icon: "📊", title: "Analytics", desc: "Report su messaggi, lead convertiti e performance. Dati reali, decisioni migliori.", tag: "TUTTI I PIANI" },
  ];

  const plans = en ? [
    { name: "STARTER", price: "49", oldPrice: "98", featured: false, items: ["Automatic Instagram DM", "Social posting (20 posts/mo)", "CRM & Lead management", "Email marketing (1,000/mo)", "ARIA AI assistant"] },
    { name: "PRO", price: "99", oldPrice: "198", featured: true, items: ["Everything in Starter +", "WhatsApp Business ✓", "3 manageable accounts", "60 posts/mo", "Email marketing (10,000/mo)", "CRM + AI quotes", "White label"] },
    { name: "AGENCY", price: "249", oldPrice: "498", featured: false, items: ["Everything in Pro +", "Unlimited accounts", "Full white label", "Unlimited emails", "API access", "Priority support", "Dedicated onboarding"] },
  ] : [
    { name: "STARTER", price: "49", oldPrice: "98", featured: false, items: ["Instagram DM automatico", "Social posting (20 post/mese)", "CRM & Lead management", "Email marketing (1.000/mese)", "ARIA assistente AI"] },
    { name: "PRO", price: "99", oldPrice: "198", featured: true, items: ["Tutto Starter +", "WhatsApp Business ✓", "3 account gestibili", "60 post/mese", "Email marketing (10.000/mese)", "CRM + preventivi AI", "White label"] },
    { name: "AGENCY", price: "249", oldPrice: "498", featured: false, items: ["Tutto Pro +", "Account illimitati", "White label completo", "Email illimitate", "API access", "Priority support", "Onboarding dedicato"] },
  ];

  return (
    <>
      <style>{STYLE}</style>

      {/* ── LAUNCH BANNER ── */}
      {bannerVisible && (
        <div style={{
          height: isDesktop ? 36 : "auto",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: isDesktop ? "0 40px" : "8px 36px 8px 12px",
          background: "#0D1525", borderBottom: "1px solid #1A2E4A",
          position: "relative", zIndex: 101,
          fontSize: isDesktop ? 13 : 11,
          lineHeight: isDesktop ? 1 : 1.4,
          whiteSpace: isDesktop ? "nowrap" : "normal",
          overflow: "hidden",
          color: "#5A7A9A",
        }}>
          🎁 {en ? 'Launch offer:' : 'Offerta lancio:'}{" "}
          <span style={{ color: "#FFB800", fontWeight: 700, marginLeft: 4 }}>{en ? '2 months for the price of 1' : '2 mesi al prezzo di 1'}</span>
          <span style={{ marginLeft: 4 }}>— {en ? 'First sign-ups only · No card required' : 'Solo per le prime iscrizioni · Nessuna carta richiesta'}</span>
          <button
            onClick={() => setBannerVisible(false)}
            style={{
              position: "absolute",
              right: 12,
              top: isDesktop ? "50%" : 8,
              transform: isDesktop ? "translateY(-50%)" : "none",
              background: "none", border: "none", color: "#5A7A9A", fontSize: 18, cursor: "pointer", lineHeight: 1,
            }}
          >✕</button>
        </div>
      )}

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: `${T.bg}e8`, backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`,
        padding: isDesktop ? "0 40px" : "0 24px",
        height: isDesktop ? 64 : 60,
        display: "flex", alignItems: "center", gap: 24,
      }}>
        <div style={{ maxWidth: isDesktop ? 1200 : "none", margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${T.glow}, ${T.violet})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px ${T.glow}66` }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" strokeWidth="1.5" fill="none"/><circle cx="8" cy="8" r="2" fill="white"/></svg>
            </div>
            <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 2, color: T.text }}>EMARAL</span>
            <span style={{ fontSize: 10, color: T.muted, marginLeft: -4 }}>AGENT AI</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: isDesktop ? 28 : 12 }}>
            {isDesktop && (en
              ? ["Features", "ARIA", "Pricing"].map((l, i) => (
                  <a key={l} className="hp-nav-link" href={`#${["funzionalità","aria","prezzi"][i]}`}>{l}</a>
                ))
              : ["Funzionalità", "ARIA", "Prezzi"].map(l => (
                  <a key={l} className="hp-nav-link" href={`#${l.toLowerCase()}`}>{l}</a>
                ))
            )}
            {isDesktop && <div style={{ width: 1, height: 20, background: T.border }} />}
            <button
              onClick={toggleLang}
              style={{ background: "transparent", border: `1px solid ${T.border}`, color: T.muted, padding: "7px 14px", borderRadius: 20, fontSize: 12, fontFamily: "inherit", cursor: "pointer", fontWeight: 700 }}
            >
              {en ? '🇮🇹 IT' : '🇬🇧 EN'}
            </button>
            <button
              onClick={handleLogin}
              style={{ background: "transparent", border: "1px solid #1A2E4A", color: "#C8D8E8", padding: "9px 20px", borderRadius: 12, fontSize: 13, fontFamily: "inherit", cursor: "pointer", transition: "all 0.25s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#00D4FF"; e.currentTarget.style.color = "#00D4FF"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#1A2E4A"; e.currentTarget.style.color = "#C8D8E8"; }}
            >
              {en ? 'Login' : 'Accedi'}
            </button>
            <button className="hp-btn-primary" style={{ padding: "9px 20px", fontSize: 13 }} onClick={handleLogin}>
              <span>{en ? 'Start free' : 'Inizia gratis'}</span>
              <span style={{ position: "relative", zIndex: 1 }}>→</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: isDesktop ? "100px 40px 60px" : "80px 24px 40px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 700, height: 500, background: `radial-gradient(ellipse, ${T.glow}18 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "40%", left: "20%", width: 400, height: 400, background: `radial-gradient(ellipse, ${T.violet}0E 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: `linear-gradient(${T.border}18 1px, transparent 1px), linear-gradient(90deg, ${T.border}18 1px, transparent 1px)`, backgroundSize: "50px 50px" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: 60, flexDirection: isDesktop ? "row" : "column", flexWrap: isDesktop ? "nowrap" : "wrap" }}>
          {/* LEFT */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <div className="slide-up-1" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${T.glow}18`, border: `1px solid ${T.glow}44`, borderRadius: 20, padding: "6px 14px", marginBottom: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.success, boxShadow: `0 0 8px ${T.success}` }} />
              <span style={{ fontSize: 12, color: T.cyan, fontWeight: 600, letterSpacing: 0.5 }}>LIVE — {en ? '2 months for the price of 1' : '2 mesi al prezzo di 1'}</span>
            </div>

            <h1 className="slide-up-2" style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "clamp(52px, 6vw, 88px)", lineHeight: 0.92, letterSpacing: -1, marginBottom: 24, color: T.text, maxWidth: isDesktop ? 560 : "none" }}>
              {en ? 'YOUR' : 'LA TUA'}<br />
              <span style={{ background: `linear-gradient(90deg, ${T.cyan}, ${T.glow}, ${T.violet})`, backgroundSize: "200% 100%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "gradShift 4s ease infinite" }}>{en ? 'SECRETARY' : 'SEGRETERIA'}</span><br />
              {en ? 'AT €49/MO' : 'A 49€/MESE'}
            </h1>

            <p className="slide-up-3" style={{ fontSize: 17, lineHeight: 1.7, color: T.muted, maxWidth: 480, marginBottom: 12 }}>
              {en
                ? <><span>A human secretary costs </span><span style={{ color: T.pink, fontWeight: 700, textDecoration: "line-through" }}>€3,000/mo</span><span>. ARIA does the same job — 24/7, no holidays, no mistakes — starting from </span><span style={{ color: T.success, fontWeight: 700 }}>€49</span>.</>
                : <><span>Una segretaria umana costa </span><span style={{ color: T.pink, fontWeight: 700, textDecoration: "line-through" }}>3.000€/mese</span><span>. ARIA fa lo stesso lavoro — H24, senza ferie, senza errori — a partire da </span><span style={{ color: T.success, fontWeight: 700 }}>49€</span>.</>
              }
            </p>
            <p className="slide-up-3" style={{ fontSize: 15, lineHeight: 1.6, color: T.muted, maxWidth: 480, marginBottom: 36 }}>
              {en
                ? 'Replies on WhatsApp and Instagram, manages the CRM, books appointments and qualifies leads. You wake up with a full pipeline.'
                : 'Risponde su WhatsApp e Instagram, gestisce il CRM, prenota appuntamenti e qualifica i lead. Tu ti svegli con la pipeline già piena.'
              }
            </p>

            <div className="slide-up-4" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 40 }}>
              <button className="hp-btn-primary" onClick={handleLogin}>
                <span>{en ? 'Activate ARIA free' : 'Attiva ARIA gratis'}</span>
                <span>→</span>
              </button>
              <a href="https://wa.me/393784056561?text=Ciao%20Emaral%2C%20vorrei%20info%20su%20Emaral%20Agent%20AI" target="_blank" rel="noreferrer" className="hp-btn-ghost">
                <span>💬</span>
                <span>{en ? 'Chat on WhatsApp' : 'Parla su WhatsApp'}</span>
              </a>
            </div>

            <div className="slide-up-5" style={{ display: "flex", gap: isDesktop ? 32 : 16, flexWrap: "nowrap", flexDirection: "row" }}>
              {(en
                ? [{ v: "24/7", l: "Automatic reply" }, { v: "8+", l: "Modules included" }, { v: "€49", l: "Starting plan" }, { v: "100%", l: "Made in Italy" }]
                : [{ v: "H24", l: "Risposta automatica" }, { v: "8+", l: "Moduli inclusi" }, { v: "49€", l: "Piano di partenza" }, { v: "100%", l: "Made in Italy" }]
              ).map(s => (
                <div key={s.v} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 26, letterSpacing: 1, color: T.cyan }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — ARIA orb + live chat */}
          <div className="slide-up-3" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            <ARIAOrb mood={mood} />
            <div style={{ width: "100%", maxWidth: 340, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden" }}>
              <div style={{ background: T.card, padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.success, boxShadow: `0 0 8px ${T.success}` }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>ARIA — Online</span>
                <span style={{ fontSize: 10, color: T.muted, marginLeft: "auto" }}>WhatsApp · 09:41</span>
              </div>
              <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <ChatBubble from="client" text={en ? "Hi! I'd like info on your services 😊" : "Ciao! Vorrei info sui vostri servizi 😊"} delay={0} />
                <ChatBubble from="aria" text={en ? `Hi! I'm ARIA ${moodEmoji[mood]} I'm the Emaral Group assistant. I can help you right away — what are you looking for?` : `Ciao! Sono ARIA ${moodEmoji[mood]} Sono l'assistente di Emaral Group. Posso aiutarti subito — cosa stai cercando?`} delay={0.3} />
                <ChatBubble from="client" text={en ? "I'd like to book a consultation" : "Vorrei prenotare una consulenza"} delay={0.6} />
                <ChatBubble from="aria" text={en ? "Perfect! I have availability tomorrow at 3:00pm or Thursday at 11:00am. Which do you prefer? 📅" : "Perfetto! Ho un posto libero domani alle 15:00 o giovedì alle 11:00. Quale preferisci? 📅"} delay={0.9} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TICKER ── */}
      <Ticker lang={lang} />

      {/* ── VS COMPARISON ── */}
      <section style={{ padding: isDesktop ? "80px 40px" : "80px 24px", background: T.deep }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "clamp(36px, 6vw, 64px)", letterSpacing: 1, lineHeight: 0.95, color: T.text, marginBottom: 12 }}>
              {en ? 'HUMAN SECRETARY' : 'SEGRETARIA UMANA'}<br />
              <span style={{ color: T.pink }}>VS</span>{" "}
              <span style={{ background: `linear-gradient(90deg, ${T.cyan}, ${T.glow})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ARIA</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: isDesktop ? 24 : 16 }}>
            <div style={{ background: T.card, border: `1px solid ${T.pink}33`, borderRadius: 20, padding: 28 }}>
              <div style={{ fontSize: 13, color: T.pink, fontWeight: 700, letterSpacing: 1, marginBottom: 20 }}>{en ? 'HUMAN SECRETARY' : 'SEGRETARIA UMANA'}</div>
              {(en
                ? [["💰", "~€3,000/mo", "Salary + benefits"], ["🕐", "8h/day", "Working days only"], ["😴", "Holidays, sick leave", "Guaranteed absences"], ["😤", "Stress, errors", "Variable performance"], ["📋", "One channel at a time", "WhatsApp OR phone"]]
                : [["💰", "~3.000€/mese", "Stipendio + contributi"], ["🕐", "8h/giorno", "Solo giorni lavorativi"], ["😴", "Ferie, malattia", "Assenze garantite"], ["😤", "Stress, errori", "Performance variabile"], ["📋", "Un canale alla volta", "WhatsApp O telefono"]]
              ).map(([icon, val, sub], i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{val}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: `linear-gradient(135deg, ${T.glow}12, ${T.violet}12)`, border: `1px solid ${T.glow}44`, borderRadius: 20, padding: 28, boxShadow: `0 0 40px ${T.glow}18` }}>
              <div style={{ fontSize: 13, color: T.cyan, fontWeight: 700, letterSpacing: 1, marginBottom: 20 }}>ARIA — EMARAL AGENT AI</div>
              {(en
                ? [["💎", "From €49/mo", "All included, zero surprises"], ["⚡", "24/7 · 365 days", "Never offline, never late"], ["🚀", "Zero absences", "Always 100% operational"], ["🎯", "Consistent performance", "Same quality always"], ["🌐", "All channels together", "WA + IG + CRM + Email"]]
                : [["💎", "Da 49€/mese", "Tutto incluso, zero sorprese"], ["⚡", "H24 · 365 giorni", "Mai offline, mai in ritardo"], ["🚀", "Zero assenze", "Sempre operativa al 100%"], ["🎯", "Performance costante", "Stessa qualità sempre"], ["🌐", "Tutti i canali insieme", "WA + IG + CRM + Email"]]
              ).map(([icon, val, sub], i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{val}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 24, background: `${T.success}12`, border: `1px solid ${T.success}44`, borderRadius: 16, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 28 }}>💡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: T.success }}>{en ? 'Real savings: up to €2,951 per month' : 'Risparmio reale: fino a 2.951€ al mese'}</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{en ? 'With ARIA Starter at €49 you do the work of a €3,000 secretary. ROI visible from day one.' : 'Con ARIA Starter a 49€ fai il lavoro di una segretaria da 3.000€. Il ROI si vede dal primo giorno.'}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="funzionalità" style={{ padding: isDesktop ? "80px 40px" : "80px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ marginBottom: 52, maxWidth: 600 }}>
            <div style={{ fontSize: 12, color: T.cyan, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>{en ? 'FEATURES' : 'FUNZIONALITÀ'}</div>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "clamp(34px, 5vw, 56px)", letterSpacing: 0.5, lineHeight: 0.95, color: T.text }}>
              {en ? 'EVERYTHING YOU NEED.' : 'TUTTO QUELLO CHE SERVE.'}<br />
              <span style={{ color: T.muted }}>{en ? 'ONE SINGLE PLATFORM.' : 'IN UNA SOLA PIATTAFORMA.'}</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(280px, 1fr))", gap: isDesktop ? 20 : 16 }}>
            {features.map((f, i) => (
              <div key={i} className="hp-feature-card">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, fontSize: 22, background: `${T.glow}18`, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{f.icon}</div>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: "3px 8px", borderRadius: 6, background: `${T.glow}18`, border: `1px solid ${T.border}`, color: T.cyan }}>{f.tag}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARIA PERSONALITY ── */}
      <section id="aria" style={{ padding: isDesktop ? "80px 40px" : "80px 24px", background: T.deep, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", right: "10%", transform: "translateY(-50%)", width: 500, height: 500, background: `radial-gradient(ellipse, ${T.violet}12 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 60, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 440px" }}>
            <div style={{ fontSize: 12, color: T.cyan, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>{en ? 'YOUR PERSONAL ASSISTANT' : 'IL TUO ASSISTENTE PERSONALE'}</div>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "clamp(40px, 6vw, 68px)", letterSpacing: 0.5, lineHeight: 0.92, color: T.text, marginBottom: 20 }}>
              {en ? 'MEET' : 'INCONTRA'}<br />
              <span style={{ background: `linear-gradient(90deg, ${T.violet}, ${T.pink})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>ARIA.</span>
            </h2>
            <p style={{ fontSize: 16, color: T.muted, lineHeight: 1.7, marginBottom: 28, maxWidth: 440 }}>
              {en
                ? "It's not a chatbot. It's a digital person with character, memory and personality. Changes mood, remembers past conversations, never responds like a robot."
                : "Non è un chatbot. È una persona digitale con carattere, memoria e personalità. Cambia umore, ricorda le conversazioni precedenti, non risponde mai come un robot."
              }
            </p>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>{en ? "CHOOSE HER MOOD" : "SCEGLI IL SUO UMORE"}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {moods.map(m => (
                  <button key={m} className={`hp-mood-btn ${mood === m ? "active" : ""}`} onClick={() => setMood(m)}>
                    {moodEmoji[m]} {moodLabels[m]}
                  </button>
                ))}
              </div>
            </div>
            {(en ? [
              { title: "Replies to clients", desc: "On WhatsApp and Instagram, like a real collaborator. Without sounding like a bot." },
              { title: "Helps you work", desc: "Generates quotes, analyzes leads, creates posts. All from the dashboard." },
              { title: "Has a real personality", desc: "Changes mood, remembers conversations, never replies the same way twice." },
            ] : [
              { title: "Risponde ai clienti", desc: "Su WhatsApp e Instagram, come un vero collaboratore. Senza sembrare un bot." },
              { title: "Ti aiuta nel lavoro", desc: "Genera preventivi, analizza lead, crea post. Tutto dalla dashboard." },
              { title: "Ha una personalità vera", desc: "Cambia umore, ricorda le conversazioni, non risponde mai uguale." },
            ]).map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 4, borderRadius: 2, background: `linear-gradient(to bottom, ${T.violet}, ${T.pink})`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
            <ARIAOrb mood={mood} />
            <div style={{ display: "flex", gap: 12 }}>
              <StatBadge value="H24" label="Sempre online" color={T.cyan} />
              <StatBadge value="0s" label="Tempo risposta" color={T.success} />
              <StatBadge value="∞" label="Conversazioni" color={T.violet} />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: isDesktop ? "80px 40px" : "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ fontSize: 12, color: T.cyan, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>{en ? 'HOW IT WORKS' : 'COME FUNZIONA'}</div>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "clamp(36px, 5vw, 58px)", letterSpacing: 0.5, color: T.text }}>
              4 STEP. <span style={{ color: T.muted }}>{en ? 'ZERO EFFORT.' : 'ZERO FATICA.'}</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(4, 1fr)" : "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
            {steps.map((s, i) => (
              <div key={i} onClick={() => setActiveStep(i)} style={{
                background: activeStep === i ? `linear-gradient(135deg, ${T.glow}18, ${T.violet}18)` : T.card,
                border: `1px solid ${activeStep === i ? T.glow + "66" : T.border}`,
                borderRadius: 20, padding: "24px 20px", cursor: "pointer", transition: "all 0.3s",
                boxShadow: activeStep === i ? `0 0 30px ${T.glow}22` : "none",
              }}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 13, color: activeStep === i ? T.cyan : T.muted, letterSpacing: 2, marginBottom: 12 }}>{s.n}</div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="prezzi" style={{ padding: isDesktop ? "80px 40px" : "80px 24px", background: T.deep }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: T.cyan, fontWeight: 700, letterSpacing: 2, marginBottom: 12 }}>{en ? 'PRICING' : 'PREZZI'}</div>
            <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "clamp(36px, 5vw, 58px)", letterSpacing: 0.5, color: T.text, marginBottom: 10 }}>
              {en ? 'SIMPLE.' : 'SEMPLICE.'} <span style={{ color: T.muted }}>{en ? 'TRANSPARENT.' : 'TRASPARENTE.'}</span>
            </h2>
          </div>
          <div style={{ background: `linear-gradient(135deg, ${T.gold}18, ${T.gold}08)`, border: `1px solid ${T.gold}44`, borderRadius: 14, padding: "12px 20px", textAlign: "center", marginBottom: 36 }}>
            <span style={{ fontSize: 14, color: T.gold, fontWeight: 700 }}>🎁 {en ? 'Launch offer: 2 months for the price of 1 · First sign-ups only · Non-renewable' : 'Offerta lancio: 2 mesi al prezzo di 1 · Solo per le prime iscrizioni · Non rinnovabile'}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, alignItems: "start" }}>
            {plans.map((p, i) => (
              <div key={i} className={`hp-price-card ${p.featured ? "featured" : ""}`} style={{ transform: isDesktop && p.featured ? "scale(1.04)" : "none" }}>
                {p.featured && (
                  <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(90deg, ${T.glow}, ${T.violet})`, padding: "5px 18px", borderRadius: "0 0 12px 12px", fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>PIÙ SCELTO</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 800, color: T.muted, letterSpacing: 2, marginBottom: 20, marginTop: p.featured ? 16 : 0 }}>{p.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 54, letterSpacing: -1, color: T.text, lineHeight: 1 }}>{p.price}€</span>
                  <span style={{ color: T.muted, fontSize: 13 }}>/mese</span>
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 24 }}>{en ? 'instead of' : 'invece di'} <span style={{ textDecoration: "line-through" }}>{p.oldPrice}€</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                  {p.items.map((item, j) => (
                    <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: T.success, fontSize: 14, flexShrink: 0, marginTop: 1 }}>✓</span>
                      <span style={{ fontSize: 13, color: T.muted }}>{item}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleLogin}
                  className={p.featured ? "hp-btn-primary" : "hp-btn-ghost"}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <span>{en ? `Start with ${p.name}` : `Inizia con ${p.name}`}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: isDesktop ? "100px 40px" : "100px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, background: `radial-gradient(ellipse, ${T.glow}14 0%, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ maxWidth: 680, margin: "0 auto", position: "relative" }}>
          <div style={{ fontSize: 12, color: T.cyan, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>{en ? 'START TODAY' : 'INIZIA OGGI'}</div>
          <h2 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: "clamp(44px, 7vw, 80px)", letterSpacing: -0.5, lineHeight: 0.92, color: T.text, marginBottom: 20 }}>
            {en ? 'READY TO LET' : 'PRONTO A FAR'}<br />
            <span style={{ background: `linear-gradient(90deg, ${T.cyan}, ${T.glow}, ${T.violet})`, backgroundSize: "200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "gradShift 4s ease infinite" }}>{en ? 'AI WORK' : "LAVORARE L'AI"}</span><br />
            {en ? 'FOR YOU?' : 'PER TE?'}
          </h2>
          <p style={{ fontSize: 16, color: T.muted, marginBottom: 36, lineHeight: 1.7 }}>
            {en ? 'No card required right now.' : 'Nessuna carta richiesta subito.'}<br />{en ? 'Activate and test ARIA in less than 5 minutes.' : 'Attiva e testa ARIA in meno di 5 minuti.'}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="hp-btn-primary" style={{ fontSize: 16, padding: "18px 36px" }} onClick={handleLogin}>
              <span>{en ? 'Activate Emaral Agent AI' : 'Attiva Emaral Agent AI'}</span>
              <span>→</span>
            </button>
            <a href="https://wa.me/393784056561?text=Ciao%20Emaral%2C%20vorrei%20info%20su%20Emaral%20Agent%20AI" target="_blank" rel="noreferrer" className="hp-btn-ghost" style={{ fontSize: 15 }}>
              <span>💬</span>
              <span>{en ? 'Chat on WhatsApp' : 'Parla su WhatsApp'}</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: T.deep, borderTop: `1px solid ${T.border}`, padding: "28px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(135deg, ${T.glow}, ${T.violet})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" strokeWidth="1.5" fill="none"/><circle cx="8" cy="8" r="2" fill="white"/></svg>
            </div>
            <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 16, letterSpacing: 2 }}>EMARAL AGENT AI</span>
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>by Emaral Group · emaral.it</div>
          <div style={{ fontSize: 12, color: T.muted }}>© 2026 Emaral Group. {en ? 'All rights reserved.' : 'Tutti i diritti riservati.'}</div>
        </div>
      </footer>
    </>
  );
}