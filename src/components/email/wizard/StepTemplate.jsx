import React, { useState } from 'react';

const C = {
  card: '#111C30', border: '#1A2E4A', surface: '#0D1525',
  accent: '#00C6FF', accent2: '#7B2FFF', accent3: '#FF3CAC', gold: '#FFD700',
  text: '#E8F4FF', muted: '#5A7A9A', success: '#00E5A0',
};

const TEMPLATES = [
  {
    id: 'newsletter', category: 'Newsletter',
    emoji: '📰', color: C.accent2,
    name: 'Newsletter Periodica',
    desc: 'Aggiornamenti e notizie per la tua lista',
    goal: 'Brand awareness & retention',
    example: 'Le novità di questo mese, tips esclusivi, aggiornamenti prodotto...',
  },
  {
    id: 'promo', category: 'Promozione',
    emoji: '🔥', color: '#FFD700',
    name: 'Offerta Commerciale',
    desc: 'Promozione a tempo o sconto esclusivo',
    goal: 'Conversione immediata',
    example: 'Sconto 20% solo per te — valido fino a domenica...',
  },
  {
    id: 'followup', category: 'Follow-up Lead',
    emoji: '🎯', color: C.success,
    name: 'Follow-up Lead',
    desc: 'Per chi ha mostrato interesse ma non ha convertito',
    goal: 'Riattivare lead tiepidi',
    example: 'Ciao [Nome], ti ho pensato. Hai ancora domande sul nostro servizio?',
  },
  {
    id: 'reminder', category: 'Reminder Appuntamento',
    emoji: '📅', color: C.accent,
    name: 'Reminder Appuntamento',
    desc: 'Promemoria per appuntamenti o eventi programmati',
    goal: 'Ridurre no-show',
    example: 'Ricordati: domani alle 10:00 hai un appuntamento con noi...',
  },
  {
    id: 'offerta', category: 'Offerta Commerciale',
    emoji: '💼', color: '#FF9500',
    name: 'Preventivo / Proposta',
    desc: 'Invio di un preventivo personalizzato',
    goal: 'Chiudere trattative in corso',
    example: 'Come promesso, ecco il preventivo su misura per il tuo progetto...',
  },
  {
    id: 'lancio', category: 'Lancio Prodotto',
    emoji: '🚀', color: C.accent3,
    name: 'Lancio Prodotto/Servizio',
    desc: 'Annuncio di un nuovo prodotto o servizio',
    goal: 'Generare curiosità e prime vendite',
    example: 'Finalmente ci siamo — presentiamo il nostro nuovo servizio...',
  },
  {
    id: 'riattiva', category: 'Recupero Clienti Inattivi',
    emoji: '💫', color: '#FF6B9D',
    name: 'Recupero Inattivi',
    desc: 'Per chi non interagisce da più di 30 giorni',
    goal: 'Win-back clienti dormienti',
    example: 'Ci sei ancora? Abbiamo qualcosa di speciale per te...',
  },
  {
    id: 'custom', category: 'Template Personalizzato',
    emoji: '✨', color: C.muted,
    name: 'Blank — Personalizzato',
    desc: 'Inizia da zero con il tuo design',
    goal: 'Massima libertà creativa',
    example: 'Editor libero — scrivi il tuo contenuto da zero',
  },
];

function TemplateCard({ tmpl, selected, onSelect, onPreview }) {
  const isSelected = selected === tmpl.id;

  return (
    <div
      onClick={() => onSelect(tmpl)}
      style={{
        background: C.card, borderRadius: 14,
        border: `2px solid ${isSelected ? tmpl.color : C.border}`,
        overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isSelected ? `0 0 20px ${tmpl.color}44` : 'none',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Color bar + emoji */}
      <div style={{
        height: 72, background: `linear-gradient(135deg, ${tmpl.color}22, ${tmpl.color}11)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: `1px solid ${C.border}`,
        position: 'relative',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: tmpl.color + '22', border: `2px solid ${tmpl.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>
          {tmpl.emoji}
        </div>
        {isSelected && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 20, height: 20, borderRadius: '50%',
            background: tmpl.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff', fontWeight: 800,
          }}>✓</div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px 14px', flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 4 }}>{tmpl.name}</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.4 }}>{tmpl.desc}</div>
        <div style={{
          fontSize: 10, fontWeight: 700, color: tmpl.color,
          background: tmpl.color + '15', borderRadius: 6, padding: '3px 8px', display: 'inline-block',
        }}>
          🎯 {tmpl.goal}
        </div>
      </div>

      {/* Example */}
      <div style={{
        padding: '8px 14px 12px', borderTop: `1px solid ${C.border}`,
        fontSize: 10, color: C.muted, fontStyle: 'italic', lineHeight: 1.4,
      }}>
        "{tmpl.example}"
      </div>
    </div>
  );
}

export default function StepTemplate({ selected, onSelect }) {
  const [filter, setFilter] = useState('Tutti');
  const categories = ['Tutti', ...new Set(TEMPLATES.map(t => t.category))];
  const filtered = filter === 'Tutti' ? TEMPLATES : TEMPLATES.filter(t => t.category === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 900, fontSize: 17, color: '#E8F4FF', marginBottom: 4 }}>Scegli il template</div>
        <div style={{ fontSize: 13, color: '#5A7A9A' }}>Ogni template è ottimizzato per un obiettivo specifico. Puoi modificarlo liberamente nell'editor.</div>
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{
            background: filter === cat ? C.accent2 + '22' : C.card,
            border: `1px solid ${filter === cat ? C.accent2 : C.border}`,
            borderRadius: 20, padding: '5px 12px',
            color: filter === cat ? C.accent2 : C.muted,
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 12,
      }}>
        {filtered.map(tmpl => (
          <TemplateCard
            key={tmpl.id}
            tmpl={tmpl}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}