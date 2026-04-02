import React, { useState } from 'react';

export default function Homepage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ background: '#06080E', color: '#F0F4FF', fontFamily: "'DM Sans', system-ui, sans-serif", overflowX: 'hidden', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        .aria-float { animation: float 4s ease-in-out infinite; }
        .aria-float2 { animation: float 3.5s ease-in-out infinite; }
        .hero-badge-dot { animation: blink 2s infinite; }
        .fade-up-1 { animation: fadeUp 0.8s ease both; }
        .fade-up-2 { animation: fadeUp 0.8s 0.1s ease both; }
        .fade-up-3 { animation: fadeUp 0.8s 0.2s ease both; }
        .fade-up-4 { animation: fadeUp 0.8s 0.3s ease both; }
        .fade-up-5 { animation: fadeUp 0.8s 0.4s ease both; }
        .fade-up-6 { animation: fadeUp 0.8s 0.5s ease both; }
        .feature-card { transition: border-color 0.25s, transform 0.25s; }
        .feature-card:hover { border-color: rgba(59,110,248,0.25) !important; transform: translateY(-3px); }
        .price-card { transition: transform 0.25s; }
        .price-card:hover { transform: translateY(-4px); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 40px rgba(59,110,248,0.4) !important; }
        .btn-secondary:hover { border-color: rgba(255,255,255,0.15) !important; transform: translateY(-2px); }
        .nav-cta:hover { opacity: 0.9; transform: translateY(-1px); }
        .mood-pill { cursor: default; transition: all 0.2s; }
      `}</style>

      {/* BG ORBS */}
      <div style={{ position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, width: 600, height: 600, top: -200, left: '50%', transform: 'translateX(-50%)', background: 'radial-gradient(circle,rgba(59,110,248,0.12) 0%,transparent 70%)' }} />
      <div style={{ position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, width: 400, height: 400, bottom: '20%', right: -100, background: 'radial-gradient(circle,rgba(124,58,237,0.08) 0%,transparent 70%)' }} />
      <div style={{ position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, width: 300, height: 300, bottom: '10%', left: -50, background: 'radial-gradient(circle,rgba(59,110,248,0.06) 0%,transparent 70%)' }} />
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none', zIndex: 0 }} />

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6,8,14,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <svg width="28" height="26" viewBox="0 0 100 90">
            <polygon points="12,5 78,5 72,20 12,20" fill="#F0F4FF"/>
            <polygon points="12,26 76,26 70,42 12,42" fill="#F0F4FF"/>
            <polygon points="36,26 76,26 54,42 36,42 56,34" fill="#06080E"/>
            <polygon points="12,48 72,48 66,63 12,63" fill="#F0F4FF"/>
            <circle cx="84" cy="8" r="9" fill="#3B6EF8">
              <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite"/>
            </circle>
          </svg>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.1rem', fontWeight: 700, color: '#F0F4FF', letterSpacing: '0.04em', lineHeight: 1.2 }}>
            Emaral Agent AI
            <span style={{ color: '#3B6EF8', fontWeight: 400, fontSize: '0.85rem', letterSpacing: '0.1em', display: 'block', lineHeight: 1 }}>by Emaral Group</span>
          </div>
        </a>

        {/* Desktop nav */}
        <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 32 }}>
          <a href="#features" style={{ textDecoration: 'none', color: '#8A9AB5', fontSize: '0.875rem', fontWeight: 400, transition: 'color 0.2s' }} onMouseEnter={e=>e.target.style.color='#F0F4FF'} onMouseLeave={e=>e.target.style.color='#8A9AB5'}>Funzionalità</a>
          <a href="#aria" style={{ textDecoration: 'none', color: '#8A9AB5', fontSize: '0.875rem', fontWeight: 400, transition: 'color 0.2s' }} onMouseEnter={e=>e.target.style.color='#F0F4FF'} onMouseLeave={e=>e.target.style.color='#8A9AB5'}>ARIA</a>
          <a href="#pricing" style={{ textDecoration: 'none', color: '#8A9AB5', fontSize: '0.875rem', fontWeight: 400, transition: 'color 0.2s' }} onMouseEnter={e=>e.target.style.color='#F0F4FF'} onMouseLeave={e=>e.target.style.color='#8A9AB5'}>Prezzi</a>
          <a href="https://emaral.it" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#8A9AB5', fontSize: '0.875rem', fontWeight: 400, transition: 'color 0.2s' }} onMouseEnter={e=>e.target.style.color='#F0F4FF'} onMouseLeave={e=>e.target.style.color='#8A9AB5'}>Emaral Group</a>
          <a href="https://emaral-systems-ai.base44.app/dashboard" className="nav-cta" style={{ background: '#3B6EF8', color: '#fff', padding: '10px 22px', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', transition: 'opacity 0.2s, transform 0.2s', display: 'inline-block' }}>Accedi →</a>
        </div>

        {/* Mobile burger */}
        <button className="flex lg:hidden" onClick={() => setMobileMenuOpen(v => !v)} style={{ flexDirection: 'column', gap: 5, cursor: 'pointer', padding: 4, background: 'none', border: 'none' }}>
          <span style={{ width: 22, height: 1.5, background: '#8A9AB5', borderRadius: 2, display: 'block' }}/>
          <span style={{ width: 22, height: 1.5, background: '#8A9AB5', borderRadius: 2, display: 'block' }}/>
          <span style={{ width: 22, height: 1.5, background: '#8A9AB5', borderRadius: 2, display: 'block' }}/>
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', top: 65, left: 0, right: 0, zIndex: 99, background: 'rgba(6,8,14,0.98)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['#features|Funzionalità','#aria|ARIA','#pricing|Prezzi'].map(item => {
            const [href, label] = item.split('|');
            return <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} style={{ color: '#8A9AB5', fontSize: '1rem', textDecoration: 'none' }}>{label}</a>;
          })}
          <a href="https://emaral.it" target="_blank" rel="noreferrer" style={{ color: '#8A9AB5', fontSize: '1rem', textDecoration: 'none' }}>Emaral Group</a>
          <a href="https://emaral-systems-ai.base44.app/dashboard" target="_blank" rel="noreferrer" style={{ background: '#3B6EF8', color: '#fff', padding: '12px 22px', borderRadius: 8, fontSize: '0.95rem', fontWeight: 500, textDecoration: 'none', textAlign: 'center' }}>Accedi →</a>
        </div>
      )}

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center' }}>
        <div className="fade-up-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', border: '1px solid rgba(59,110,248,0.3)', borderRadius: 20, fontSize: '0.7rem', letterSpacing: '0.18em', color: '#5B8BFF', textTransform: 'uppercase', fontWeight: 500, marginBottom: 32 }}>
          <span className="hero-badge-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B6EF8', boxShadow: '0 0 8px #3B6EF8', flexShrink: 0, display: 'inline-block' }}/>
          Emaral Agent AI — Ora disponibile
        </div>

        <h1 className="fade-up-2" style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(2.1rem,6vw,3.75rem)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 24 }}>
          Il tuo assistente AI<br/>
          <em style={{ fontStyle: 'normal', color: '#3B6EF8' }}>che lavora</em>
          <span style={{ display: 'block', color: 'rgba(240,244,255,0.70)', fontWeight: 600 }}>mentre tu cresci.</span>
        </h1>

        <p className="fade-up-3" style={{ fontSize: 'clamp(0.94rem,2vw,1.1rem)', color: 'rgba(255,255,255,0.70)', maxWidth: 560, lineHeight: 1.65, marginBottom: 44, fontWeight: 400 }}>
          ARIA risponde ai tuoi clienti su WhatsApp e Instagram H24, gestisce i lead, pubblica i post e fa email marketing. Tu chiudi. Lei fa il resto.
        </p>

        <div className="fade-up-4" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 72 }}>
          <a href="https://emaral-systems-ai.base44.app" target="_blank" rel="noreferrer" className="btn-primary" style={{ background: '#3B6EF8', color: '#fff', padding: '15px 32px', borderRadius: 10, fontSize: '0.94rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 24px rgba(59,110,248,0.2)' }}>
            Inizia gratis — 2 mesi al prezzo di 1
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
          <a href="#features" className="btn-secondary" style={{ background: 'transparent', color: '#F0F4FF', padding: '15px 32px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 400, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.06)', transition: 'border-color 0.2s, transform 0.2s' }}>
            Scopri come funziona
          </a>
        </div>

        <div className="fade-up-5 aria-float">
          <svg width="160" height="200" viewBox="0 0 110 140">
            <g transform="translate(18,0) scale(0.68)">
              <polygon points="18,8 82,8 76,22 18,22" fill="#F0F4FF"/>
              <polygon points="18,28 80,28 74,42 18,42" fill="#F0F4FF"/>
              <polygon points="42,28 80,28 58,42 42,42 62,35" fill="#06080E"/>
              <polygon points="18,48 76,48 70,62 18,62" fill="#F0F4FF"/>
              <circle cx="88" cy="6" r="8" fill="#3B6EF8">
                <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
              </circle>
            </g>
            <rect x="6" y="54" width="20" height="7" rx="3.5" fill="#3B6EF8" fillOpacity="0.6" transform="rotate(-32 6 54)"/>
            <rect x="74" y="54" width="20" height="7" rx="3.5" fill="#3B6EF8" fillOpacity="0.6" transform="rotate(32 94 54)"/>
            <rect x="26" y="52" width="58" height="38" rx="13" fill="#3B6EF8" fillOpacity="0.12" stroke="#3B6EF8" strokeWidth="1.5"/>
            <circle cx="40" cy="71" r="6" fill="#3B6EF8"/>
            <circle cx="70" cy="71" r="6" fill="#3B6EF8"/>
            <circle cx="41" cy="70" r="2.5" fill="#F0F4FF"/>
            <circle cx="71" cy="70" r="2.5" fill="#F0F4FF"/>
            <path d="M42 82 Q55 89 68 82" fill="none" stroke="#3B6EF8" strokeWidth="2.5" strokeLinecap="round"/>
            <rect x="22" y="96" width="66" height="30" rx="10" fill="#3B6EF8" fillOpacity="0.1" stroke="#3B6EF8" strokeWidth="1.5"/>
            <rect x="34" y="104" width="11" height="11" rx="4" fill="#3B6EF8" fillOpacity="0.4"/>
            <rect x="50" y="104" width="11" height="11" rx="4" fill="#3B6EF8" fillOpacity="0.4"/>
            <rect x="66" y="104" width="11" height="11" rx="4" fill="#3B6EF8" fillOpacity="0.4"/>
            <rect x="32" y="126" width="16" height="12" rx="5" fill="#3B6EF8" fillOpacity="0.35"/>
            <rect x="62" y="126" width="16" height="12" rx="5" fill="#3B6EF8" fillOpacity="0.35"/>
          </svg>
        </div>

        <div className="fade-up-6" style={{ display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[['H24','Risposta automatica'],['8+','Moduli inclusi'],['49€','Piano di partenza'],['100%','Made in Italy']].map(([num, label], i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.06)' }} className="hidden sm:block"/>}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.75rem', fontWeight: 700, color: '#3B6EF8', lineHeight: 1 }}>{num}</div>
                <div style={{ fontSize: '0.69rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em', marginTop: 4, fontWeight: 400 }}>{label}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* PROOF STRIP */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, flexWrap: 'wrap', padding: '48px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {[['WhatsApp','Risposte automatiche'],['Instagram','DM + Post AI'],['CRM','Lead qualificati'],['Email','Campagne automatiche'],['ARIA','Assistente personale']].map(([num, label]) => (
          <div key={num} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.1rem', fontWeight: 600, color: '#3B6EF8' }}>{num}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em', marginTop: 4, fontWeight: 400 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <section id="features" style={{ position: 'relative', zIndex: 1, padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3B6EF8', fontWeight: 500, marginBottom: 16 }}>Funzionalità</div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 16 }}>Tutto quello che serve.<br/>In un'unica piattaforma.</h2>
          <p style={{ fontSize: 'clamp(0.94rem,1.5vw,1.05rem)', color: 'rgba(255,255,255,0.70)', maxWidth: 500, lineHeight: 1.65, fontWeight: 400 }}>Nessun altro tool. Nessun costo nascosto. Un solo abbonamento per gestire tutta la comunicazione della tua attività.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 56 }}>
            {[
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" fill="#25D366"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.524 3.66 1.438 5.168L2.05 21.95l4.896-1.372A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.955 7.955 0 01-4.065-1.115l-.292-.173-3.024.847.862-2.95-.19-.304A7.955 7.955 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8z" fill="#25D366"/></svg>, title: 'WhatsApp Business', desc: 'ARIA risponde ai tuoi clienti su WhatsApp in modo naturale, qualifica i lead e ti avvisa solo quando serve davvero.', tag: 'Piano Pro', tagColor: { bg: 'rgba(37,211,102,0.12)', color: '#25D366' } },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig1)" strokeWidth="1.8"/><circle cx="12" cy="12" r="4" stroke="url(#ig1)" strokeWidth="1.8"/><circle cx="17.5" cy="6.5" r="1" fill="#E1306C"/><defs><linearGradient id="ig1" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse"><stop stopColor="#F58529"/><stop offset="0.5" stopColor="#E1306C"/><stop offset="1" stopColor="#833AB4"/></linearGradient></defs></svg>, title: 'Instagram DM + Post', desc: 'Gestione automatica dei DM e calendario editoriale con caption generate dall\'AI. Pubblica al momento giusto.', tag: 'Tutti i piani', tagColor: { bg: 'rgba(225,48,108,0.12)', color: '#E1306C' } },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3" stroke="#3B6EF8" strokeWidth="1.8"/><path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#3B6EF8" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 11l2 2 4-4" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: 'CRM & Lead', desc: 'Kanban board per gestire i lead, preventivi generati dall\'AI e pipeline di vendita sempre aggiornata.', tag: 'Tutti i piani', tagColor: { bg: 'rgba(124,58,237,0.12)', color: '#A78BFA' } },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke="#F59E0B" strokeWidth="1.8"/><path d="M2 8l10 7 10-7" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round"/></svg>, title: 'Email Marketing', desc: 'Template professionali, campagne automatiche e automazioni per benvenuto, follow-up e re-engagement.', tag: 'Tutti i piani', tagColor: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B' } },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="12" width="4" height="9" rx="1.5" fill="#EC4899"/><rect x="10" y="7" width="4" height="14" rx="1.5" fill="#EC4899"/><rect x="17" y="3" width="4" height="18" rx="1.5" fill="#EC4899"/></svg>, title: 'Analytics', desc: 'Report settimanali automatici su messaggi, lead convertiti e performance dei post. Dati reali, decisioni migliori.', tag: 'Tutti i piani', tagColor: { bg: 'rgba(236,72,153,0.12)', color: '#EC4899' } },
              { icon: <svg width="22" height="22" viewBox="0 0 60 75" fill="none"><rect x="10" y="14" width="40" height="26" rx="8" fill="#7C3AED" fillOpacity="0.3" stroke="#7C3AED" strokeWidth="1.8"/><circle cx="21" cy="27" r="4" fill="#7C3AED"/><circle cx="39" cy="27" r="4" fill="#7C3AED"/><path d="M22 35 Q30 39 38 35" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round"/><rect x="6" y="46" width="48" height="22" rx="6" fill="#7C3AED" fillOpacity="0.2" stroke="#7C3AED" strokeWidth="1.8"/></svg>, title: 'ARIA — Assistente personale', desc: 'Non solo un bot. ARIA ricorda le conversazioni, ha personalità propria e ti aiuta a gestire il business ogni giorno.', tag: 'Esclusivo', tagColor: { bg: 'rgba(124,58,237,0.12)', color: '#A78BFA' }, special: true },
            ].map((f, i) => (
              <div key={i} className="feature-card" style={{ background: f.special ? 'linear-gradient(135deg,rgba(124,58,237,0.06),#0C0F1A)' : '#0C0F1A', border: f.special ? '1px solid rgba(124,58,237,0.2)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 28, position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: f.special ? 'rgba(124,58,237,0.1)' : 'rgba(59,110,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>{f.icon}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.70)', lineHeight: 1.6, fontWeight: 400 }}>{f.desc}</div>
                <span style={{ display: 'inline-block', fontSize: '0.65rem', padding: '3px 8px', borderRadius: 6, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 14, background: f.tagColor.bg, color: f.tagColor.color }}>{f.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ARIA SECTION */}
      <section id="aria" style={{ position: 'relative', zIndex: 1, padding: '100px 24px', background: '#0C0F1A', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 80, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3B6EF8', fontWeight: 500, marginBottom: 16 }}>Il tuo assistente personale</div>
              <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 16 }}>Incontra ARIA.</h2>
              <p style={{ fontSize: 'clamp(0.94rem,1.5vw,1.05rem)', color: 'rgba(255,255,255,0.70)', maxWidth: 500, lineHeight: 1.65, fontWeight: 400 }}>Non è un chatbot. È una persona digitale con carattere, memoria e personalità. Puoi darle il nome che vuoi, scegliere il suo colore e persino il suo umore.</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
                {['😊 Felice','😂 Divertita','⚡ Energica','😴 Stanca','🥰 Innamorata','😠 Arrabbiata','🤩 Eccitata','😢 Triste'].map((m, i) => (
                  <span key={m} className="mood-pill" style={{ padding: '5px 12px', borderRadius: 20, fontSize: '0.81rem', fontWeight: 500, border: '1px solid', borderColor: i === 0 ? 'rgba(59,110,248,0.3)' : 'rgba(255,255,255,0.06)', color: i === 0 ? '#5B8BFF' : 'rgba(255,255,255,0.55)', background: i === 0 ? 'rgba(59,110,248,0.12)' : 'transparent' }}>{m}</span>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 28 }}>
                {[
                  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B6EF8" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, title: 'Risponde ai clienti', desc: 'Su WhatsApp e Instagram, come un vero collaboratore. Senza sembrare un bot.' },
                  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B6EF8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>, title: 'Ti aiuta nel lavoro', desc: 'Generare preventivi, analizzare i lead, creare post. Tutto dalla chat nella dashboard.' },
                  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B6EF8" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>, title: 'Ha una personalità vera', desc: 'Cambia umore, ricorda le conversazioni precedenti, non risponde mai come un robot.' },
                ].map(f => (
                  <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: 18, background: '#121626', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(59,110,248,0.1)' }}>{f.icon}</div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 3 }}>{f.title}</div>
                      <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, fontWeight: 400 }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
              <div style={{ background: '#121626', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 20, padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, maxWidth: 320, width: '100%' }}>
                <svg className="aria-float2" width="100" height="130" viewBox="0 0 110 140">
                  <g transform="translate(18,0) scale(0.68)">
                    <polygon points="18,8 82,8 76,22 18,22" fill="#F0F4FF"/>
                    <polygon points="18,28 80,28 74,42 18,42" fill="#F0F4FF"/>
                    <polygon points="42,28 80,28 58,42 42,42 62,35" fill="#06080E"/>
                    <polygon points="18,48 76,48 70,62 18,62" fill="#F0F4FF"/>
                  </g>
                  <rect x="8" y="52" width="20" height="7" rx="3.5" fill="#7C3AED" fillOpacity="0.6" transform="rotate(-32 8 52)"/>
                  <rect x="74" y="52" width="20" height="7" rx="3.5" fill="#7C3AED" fillOpacity="0.6" transform="rotate(32 94 52)"/>
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
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.3rem', fontWeight: 700, color: '#F0F4FF' }}>ARIA</div>
                  <div style={{ fontSize: '0.75rem', color: '#8A9AB5', marginTop: 2 }}>Il tuo assistente personale</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '4px 10px', borderRadius: 12 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}/>
                    <span style={{ fontSize: '0.65rem', color: '#10B981', fontWeight: 500 }}>ATTIVA</span>
                  </div>
                </div>
                <div style={{ width: '100%', background: 'rgba(6,8,14,0.6)', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ background: 'rgba(124,58,237,0.15)', borderRadius: '10px 10px 10px 2px', padding: '8px 12px', fontSize: '0.75rem', color: '#C4B5FD', maxWidth: '85%' }}>Ciao! Hai 3 nuovi lead da seguire oggi 👋</div>
                  <div style={{ background: 'rgba(59,110,248,0.15)', borderRadius: '10px 10px 2px 10px', padding: '8px 12px', fontSize: '0.75rem', color: '#93C5FD', maxWidth: '85%', alignSelf: 'flex-end' }}>Genera i preventivi per i nuovi lead</div>
                  <div style={{ background: 'rgba(124,58,237,0.15)', borderRadius: '10px 10px 10px 2px', padding: '8px 12px', fontSize: '0.75rem', color: '#C4B5FD', maxWidth: '90%' }}>Fatto. Ho preparato 3 preventivi personalizzati ✅</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3B6EF8', fontWeight: 500, marginBottom: 16 }}>Come funziona</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em' }}>4 step. Zero fatica.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { n: '01', title: 'Il cliente scrive', desc: 'Su WhatsApp o Instagram. Giorno o notte, weekend o festivi.' },
              { n: '02', title: 'ARIA risponde', desc: 'In modo naturale, con il tono della tua attività. Qualifica il lead automaticamente.' },
              { n: '03', title: 'Lead salvato nel CRM', desc: 'Con tutte le informazioni raccolte, pronto per essere seguito da te o da ARIA.' },
              { n: '04', title: 'Tu chiudi il cliente', desc: 'Ricevi solo i contatti caldi, già qualificati. Nessun tempo perso.' },
            ].map(s => (
              <div key={s.n} style={{ background: '#0C0F1A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '1.8rem', fontWeight: 700, color: 'rgba(59,110,248,0.15)', lineHeight: 1, marginBottom: 12 }}>{s.n}</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, fontWeight: 400 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ position: 'relative', zIndex: 1, padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3B6EF8', fontWeight: 500, marginBottom: 16 }}>Prezzi</div>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(1.75rem,4vw,2.75rem)', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 12 }}>Semplice. Trasparente.</h2>
            <p style={{ fontSize: 'clamp(0.94rem,1.5vw,1.05rem)', color: 'rgba(255,255,255,0.70)', maxWidth: 500, lineHeight: 1.65, margin: '0 auto', fontWeight: 400 }}>Inizia subito con 2 mesi al prezzo di 1 — solo per le prime iscrizioni.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { name: 'Starter', price: '49', features: ['Instagram DM automatico','Social posting (20 post/mese)','CRM & Lead management','Email marketing (1.000/mese)','ARIA assistente AI'], noFeatures: ['WhatsApp Business','Account multipli'], btn: 'Inizia con Starter', btnStyle: 'ghost' },
              { name: 'Pro', price: '99', featured: true, badge: '⭐ Più scelto', features: ['Tutto lo Starter +','WhatsApp Business ✓','3 account gestibili','60 post/mese','Email marketing (10.000/mese)','CRM + preventivi AI'], noFeatures: ['White label'], btn: 'Inizia con Pro', btnStyle: 'main' },
              { name: 'Agency', price: '249', features: ['Tutto il Pro +','Account illimitati','White label completo','Email illimitate','API access','Priority support','Onboarding dedicato'], noFeatures: [], btn: 'Inizia con Agency', btnStyle: 'ghost' },
            ].map(p => (
              <div key={p.name} className="price-card" style={{ background: p.featured ? 'linear-gradient(135deg,rgba(59,110,248,0.08),#0C0F1A)' : '#0C0F1A', border: p.featured ? '1px solid rgba(59,110,248,0.4)' : '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 32, position: 'relative' }}>
                {p.badge && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#3B6EF8', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '4px 14px', borderRadius: 12, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{p.badge}</div>}
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>{p.name}</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '3rem', fontWeight: 700, color: p.featured ? '#3B6EF8' : '#F0F4FF', lineHeight: 1 }}>{p.price}<span style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>€</span></div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginBottom: 4, fontWeight: 400 }}>/mese</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.30)', textDecoration: 'line-through', marginBottom: 24, fontWeight: 400 }}>invece di {parseInt(p.price) * 2}€</div>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }}/>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {p.features.map(f => <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'rgba(255,255,255,0.70)', fontWeight: 400 }}><span style={{ width: 4, height: 4, borderRadius: '50%', background: '#3B6EF8', flexShrink: 0, display: 'inline-block' }}/>{f}</div>)}
                  {p.noFeatures.map(f => <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}><span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', flexShrink: 0, display: 'inline-block' }}/>{f}</div>)}
                </div>
                <a href="https://emaral-systems-ai.base44.app" target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', padding: 13, borderRadius: 10, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s', background: p.btnStyle === 'main' ? '#3B6EF8' : 'transparent', color: p.btnStyle === 'main' ? '#fff' : '#F0F4FF', border: p.btnStyle === 'main' ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>{p.btn}</a>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(59,110,248,0.08)', border: '1px solid rgba(59,110,248,0.2)', borderRadius: 12, padding: '16px 24px', textAlign: 'center', marginTop: 32, fontSize: '0.875rem', color: '#8A9AB5' }}>
            🎁 <strong style={{ color: '#F0F4FF' }}>Offerta prima iscrizione:</strong> 2 mesi al prezzo di 1 · Solo per i nuovi account · Non rinnovabile
          </div>
        </div>
      </section>

      {/* CTA FINALE */}
      <section style={{ textAlign: 'center', padding: '120px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ background: '#0C0F1A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 'clamp(48px,8vw,72px) clamp(24px,6vw,48px)', maxWidth: 700, margin: '0 auto', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%,rgba(59,110,248,0.08) 0%,transparent 70%)', pointerEvents: 'none' }}/>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(1.6rem,4vw,2.5rem)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 16, position: 'relative', lineHeight: 1.15 }}>Pronto a far lavorare<br/><span style={{ color: '#3B6EF8' }}>l'AI per te?</span></h2>
            <p style={{ color: 'rgba(255,255,255,0.70)', fontSize: 'clamp(0.94rem,1.5vw,1.05rem)', marginBottom: 36, position: 'relative', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65, fontWeight: 400 }}>Inizia oggi con 2 mesi al prezzo di 1. Nessuna carta richiesta subito. Attiva e testa ARIA in meno di 5 minuti.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <a href="https://emaral-systems-ai.base44.app" target="_blank" rel="noreferrer" className="btn-primary" style={{ background: '#3B6EF8', color: '#fff', padding: '15px 32px', borderRadius: 10, fontSize: '0.94rem', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 24px rgba(59,110,248,0.2)' }}>
                Attiva Emaral Agent AI →
              </a>
              <a href="https://wa.me/393784056561?text=Ciao%20Emaral%2C%20vorrei%20info%20su%20Emaral%20Agent%20AI" target="_blank" rel="noreferrer" className="btn-secondary" style={{ background: 'transparent', color: '#F0F4FF', padding: '15px 32px', borderRadius: 10, fontSize: '0.95rem', fontWeight: 400, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.06)', transition: 'border-color 0.2s, transform 0.2s' }}>
                Parla con noi su WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '0.9rem', fontWeight: 700, color: '#F0F4FF' }}>Emaral Agent AI</div>
          <div style={{ color: '#8A9AB5', fontWeight: 300, fontSize: '0.75rem', marginTop: 2, letterSpacing: '0.08em' }}>by Emaral Group — emaral.it</div>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[['#features','Funzionalità'],['#aria','ARIA'],['#pricing','Prezzi'],['https://emaral.it','Emaral Group'],['https://wa.me/393784056561','Contatto']].map(([href, label]) => (
            <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" style={{ color: '#8A9AB5', fontSize: '0.8rem', textDecoration: 'none' }} onMouseEnter={e=>e.target.style.color='#F0F4FF'} onMouseLeave={e=>e.target.style.color='#8A9AB5'}>{label}</a>
          ))}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#3D4F68' }}>© 2026 Emaral Group. Tutti i diritti riservati.</div>
      </footer>
    </div>
  );
}