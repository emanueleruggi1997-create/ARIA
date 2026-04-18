import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  it: {
    dashboard: 'Dashboard',
    inbox: 'Inbox',
    crm: 'CRM',
    calendar: 'Calendario',
    agent: 'Agente',
    analytics: 'Analytics',
    settings: 'Impostazioni',
    admin: 'Admin',
    latestLeads: 'Ultimi Lead',
    quickActions: 'Azioni Rapide',
    goToLeads: 'Vai ai Lead',
    emailMarketing: 'Email Marketing',
    askAria: 'Chiedi ad ARIA',
    totalLeads: 'Lead Totali',
    hotLeads: 'Lead Caldi',
    emailContacts: 'Contatti Email',
    openRate: 'Tasso Apertura',
    conversion: 'Conversione',
    active: 'attivi',
    urgent: 'urgenti',
    total: 'totali',
  },
  en: {
    dashboard: 'Dashboard',
    inbox: 'Inbox',
    crm: 'CRM',
    calendar: 'Calendar',
    agent: 'Agent',
    analytics: 'Analytics',
    settings: 'Settings',
    admin: 'Admin',
    latestLeads: 'Latest Leads',
    quickActions: 'Quick Actions',
    goToLeads: 'Go to Leads',
    emailMarketing: 'Email Marketing',
    askAria: 'Ask ARIA',
    totalLeads: 'Total Leads',
    hotLeads: 'Hot Leads',
    emailContacts: 'Email Contacts',
    openRate: 'Open Rate',
    conversion: 'Conversion',
    active: 'active',
    urgent: 'urgent',
    total: 'total',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('aria_lang') || 'it');

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem('aria_lang', l);
  };

  const t = translations[lang] || translations.it;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}