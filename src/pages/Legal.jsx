import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'termini', label: 'Termini e Condizioni' },
  { id: 'privacy', label: 'Privacy Policy' },
];

const Section = ({ title, children }) => (
  <div className="mb-6">
    <h2 className="text-base font-semibold text-foreground mb-2">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-1">{children}</div>
  </div>
);

const Li = ({ children }) => (
  <li className="ml-4 list-disc">{children}</li>
);

function Termini() {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-6">Ultimo aggiornamento: 2026</p>

      <Section title="1. Oggetto del servizio">
        <p>Emaral Agent AI è una piattaforma digitale che offre strumenti per:</p>
        <ul className="mt-1 space-y-0.5">
          <Li>gestione CRM</Li>
          <Li>automazioni AI</Li>
          <Li>gestione comunicazioni</Li>
          <Li>integrazione social (Facebook, Instagram, ecc.)</Li>
        </ul>
      </Section>

      <Section title="2. Accesso alla piattaforma">
        <p>L'utente è responsabile delle credenziali di accesso e dell'utilizzo del proprio account.</p>
      </Section>

      <Section title="3. Utilizzo corretto">
        <p>È vietato utilizzare la piattaforma per:</p>
        <ul className="mt-1 space-y-0.5">
          <Li>attività illegali</Li>
          <Li>spam</Li>
          <Li>uso improprio delle integrazioni (es. social)</Li>
        </ul>
      </Section>

      <Section title="4. Integrazioni di terze parti">
        <p>L'utente può collegare servizi esterni (es. Meta). Emaral Group non è responsabile per eventuali malfunzionamenti di tali servizi.</p>
      </Section>

      <Section title="5. Limitazione di responsabilità">
        <p>La piattaforma viene fornita "così com'è". Non garantiamo assenza totale di errori o interruzioni.</p>
      </Section>

      <Section title="6. Modifiche">
        <p>Ci riserviamo il diritto di aggiornare i presenti termini in qualsiasi momento.</p>
      </Section>

      <Section title="7. Contatti">
        <p>Per supporto:</p>
        <a href="mailto:info.emaralgroup@gmail.com" className="text-primary hover:underline">
          info.emaralgroup@gmail.com
        </a>
      </Section>
    </div>
  );
}

function Privacy() {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">Ultimo aggiornamento: 2026</p>
      <p className="text-sm text-muted-foreground mb-6">
        Emaral Agent AI è una piattaforma sviluppata da Emaral Group che consente la gestione di clienti, comunicazioni, social media e automazioni tramite intelligenza artificiale.
      </p>

      <Section title="1. Dati raccolti">
        <p>Possiamo raccogliere le seguenti informazioni:</p>
        <ul className="mt-1 space-y-0.5">
          <Li>Nome e cognome</Li>
          <Li>Indirizzo email</Li>
          <Li>Dati aziendali inseriti dall'utente</Li>
          <Li>Dati provenienti da integrazioni (es. Meta, Facebook, Instagram)</Li>
          <Li>Dati di utilizzo della piattaforma</Li>
        </ul>
      </Section>

      <Section title="2. Utilizzo dei dati">
        <p>I dati vengono utilizzati per:</p>
        <ul className="mt-1 space-y-0.5">
          <Li>Fornire e migliorare i servizi</Li>
          <Li>Gestire account e accessi</Li>
          <Li>Automatizzare processi aziendali</Li>
          <Li>Analisi e ottimizzazione delle performance</Li>
        </ul>
      </Section>

      <Section title="3. Integrazioni esterne">
        <p>La piattaforma può collegarsi a servizi terzi (es. Meta, Facebook, Instagram). I dati provenienti da questi servizi sono trattati nel rispetto delle loro policy.</p>
      </Section>

      <Section title="4. Conservazione dei dati">
        <p>I dati vengono conservati per il tempo necessario al funzionamento del servizio o fino a richiesta di cancellazione.</p>
      </Section>

      <Section title="5. Sicurezza">
        <p>Adottiamo misure tecniche e organizzative per proteggere i dati degli utenti.</p>
      </Section>

      <Section title="6. Diritti dell'utente">
        <p>L'utente può richiedere in qualsiasi momento:</p>
        <ul className="mt-1 space-y-0.5">
          <Li>Accesso ai dati</Li>
          <Li>Modifica</Li>
          <Li>Cancellazione</Li>
        </ul>
      </Section>

      <Section title="7. Contatti">
        <p>Per qualsiasi richiesta:</p>
        <a href="mailto:info.emaralgroup@gmail.com" className="text-primary hover:underline">
          info.emaralgroup@gmail.com
        </a>
      </Section>
    </div>
  );
}

export default function Legal() {
  const [active, setActive] = useState('termini');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            ←
          </button>
          <h1 className="text-base font-semibold text-foreground">Note Legali</h1>
        </div>
        {/* Tab switcher */}
        <div className="flex border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className="flex-1 py-3 text-sm font-medium transition-colors"
              style={{
                color: active === tab.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                borderBottom: active === tab.id ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                background: 'transparent',
                border: 'none',
                borderBottom: active === tab.id ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {active === 'termini' ? <Termini /> : <Privacy />}
      </div>
    </div>
  );
}