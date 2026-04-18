import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext(null);

// ─── All translations ───────────────────────────────────────────
export const T = {
  it: {
    // Nav
    dashboard: 'Dashboard', inbox: 'Inbox', crm: 'CRM',
    calendar: 'Calendario', agent: 'Agente', analytics: 'Analytics',
    settings: 'Impostazioni', admin: 'Admin',
    termsPrivacy: 'Termini & Privacy', logout: 'Logout',
    // Agent status
    agentActive: 'Attivo', agentPaused: 'In pausa', agentOff: 'Off',
    // Dashboard
    latestLeads: 'Ultimi Lead', unreadMessages: 'Messaggi non letti',
    messagesToday: 'Messaggi oggi', activeLeads: 'Lead attivi',
    appointments: 'Appuntamenti', aiResponse: 'Risposta AI',
    vsYesterday: 'vs ieri', thisWeek: 'questa settimana',
    vsLastWeek: 'vs sett. scorsa', seeAll: 'Vedi tutti →',
    goToInbox: "Vai all'inbox →", noLeadsYet: 'Nessun lead ancora',
    noUnread: 'Nessun messaggio non letto 🎉',
    igNotConnected: 'Instagram non connesso',
    igNotConnectedDesc: 'Collega il tuo account per ricevere i DM',
    connect: 'Connetti →',
    // CRM
    totalLeads: 'Lead Totali', hotLeads: 'Lead Caldi',
    emailContacts: 'Contatti Email', openRate: 'Tasso Apertura',
    conversion: 'Conversione', active: 'attivi', urgent: 'urgenti', total: 'totali',
    quickActions: 'Azioni Rapide', goToLeads: 'Vai ai Lead',
    emailMarketing: 'Email Marketing', askAria: 'Chiedi ad ARIA',
    newLead: 'Nuovo Lead', noLeads: 'Nessun lead ancora',
    searchLeads: '🔍  Cerca nome o servizio...',
    all: 'Tutti', hot: 'Caldi', warm: 'Tiepidi', cold: 'Freddi',
    createLead: 'Crea Lead', creating: 'Creazione...',
    contactName: 'Nome contatto', interest: 'Interesse / Servizio',
    channel: 'Canale', igDm: 'Instagram DM', whatsapp: 'WhatsApp',
    leadSources: 'SORGENTI LEAD',
    // CRM tabs
    commandCenter: 'Command Center',
    // Status labels
    nuovo: 'Nuovo', qualificato: 'Qualificato', preventivoInviato: 'Preventivo',
    chiusoVinto: 'Vinto', chiusoPerso: 'Perso',
    bozza: 'Bozza', schedulata: 'Schedulata', inCorso: 'In corso', inviata: 'Inviata',
    // Calendar
    agenda: 'Agenda', todayLabel: 'Oggi', tomorrowLabel: 'Domani',
    newAppointment: 'Nuovo Appuntamento', editAppointment: 'Modifica Appuntamento',
    noAppointments: 'Nessun appuntamento',
    addFirstAppointment: 'Aggiungi il primo appuntamento per iniziare',
    createAppointment: 'Crea appuntamento', saveChanges: 'Salva modifiche',
    saving: 'Salvataggio...',
    titleField: 'Titolo *', clientField: 'Cliente', dateField: 'Data *',
    timeField: 'Ora', typeField: 'Tipo', statusField: 'Stato', notesField: 'Note',
    noContact: 'Nessun contatto', selectContact: 'Seleziona contatto (opzionale)',
    notesPlaceholder: 'Note aggiuntive...',
    deleteForever: '🗑️ Elimina definitivamente',
    inAttesa: 'In attesa', confermato: 'Confermato', completato: 'Completato', annullato: 'Annullato',
    chiamata: 'Chiamata', riunione: 'Riunione', servizio: 'Servizio', altro: 'Altro',
    filterAll: 'Tutti', filterPending: 'In attesa', filterConfirmed: 'Confermati',
    filterCompleted: 'Completati', filterCancelled: 'Annullati',
    // Analytics
    aiResponseRate: 'AI Response Rate', avgResponseTime: 'Tempo medio risposta',
    leadsConverted: 'Lead convertiti', confirmedAppointments: 'Appuntamenti confermati',
    messagesByChannel: 'Messaggi per canale (30 giorni)', leadsByStatus: 'Lead per stato',
    appointmentsLast7: 'Appuntamenti ultimi 7 giorni',
    week: 'Sett.',
    // Inbox
    conversations: 'conversazioni', unread: 'non letti', ariaOnline: 'ARIA online',
    noConversations: 'Nessuna conversazione ancora',
    noConversationsDesc: 'I messaggi WhatsApp e Instagram appariranno qui',
    selectConversation: 'Seleziona una conversazione',
    manual: 'Manuale', manualModeActive: 'Modalità manuale attiva — l\'AI non risponde automaticamente',
    replyAsAria: 'Rispondi come ARIA...',
    generating: 'ARIA sta scrivendo…',
    aiSuggestion: '✨ Risposta AI suggerita:',
    send: 'Invia', edit: 'Modifica', cancel: 'Annulla',
    // ARIA chat
    ariaChatIntro: 'Come posso aiutarti?',
    ariaTyping: 'ARIA sta scrivendo...',
    writeToAria: 'Scrivi ad',
    conversazioni: 'Conversazioni', noConvSaved: 'Nessuna conversazione salvata',
    nuovaConv: 'Nuova conversazione', cancellaChat: 'Cancella questa chat',
    esportaConv: 'Esporta conversazione', impostazioniAria: 'Impostazioni ARIA',
    online: 'online',
    quickCards: [
      { emoji: '📊', title: 'Come va oggi?', sub: 'Analisi dati business in tempo reale' },
      { emoji: '✍️', title: 'Aiutami con un post', sub: 'Generiamo contenuti per i social' },
      { emoji: '👥', title: 'Dimmi dei lead', sub: 'Chi devo seguire adesso?' },
      { emoji: '💡', title: 'Dammi un consiglio', sub: 'Business, marketing, strategia' },
    ],
  },
  en: {
    // Nav
    dashboard: 'Dashboard', inbox: 'Inbox', crm: 'CRM',
    calendar: 'Calendar', agent: 'Agent', analytics: 'Analytics',
    settings: 'Settings', admin: 'Admin',
    termsPrivacy: 'Terms & Privacy', logout: 'Logout',
    // Agent status
    agentActive: 'Active', agentPaused: 'Paused', agentOff: 'Off',
    // Dashboard
    latestLeads: 'Latest Leads', unreadMessages: 'Unread messages',
    messagesToday: 'Messages today', activeLeads: 'Active leads',
    appointments: 'Appointments', aiResponse: 'AI Response',
    vsYesterday: 'vs yesterday', thisWeek: 'this week',
    vsLastWeek: 'vs last week', seeAll: 'See all →',
    goToInbox: 'Go to inbox →', noLeadsYet: 'No leads yet',
    noUnread: 'No unread messages 🎉',
    igNotConnected: 'Instagram not connected',
    igNotConnectedDesc: 'Connect your account to receive DMs',
    connect: 'Connect →',
    // CRM
    totalLeads: 'Total Leads', hotLeads: 'Hot Leads',
    emailContacts: 'Email Contacts', openRate: 'Open Rate',
    conversion: 'Conversion', active: 'active', urgent: 'urgent', total: 'total',
    quickActions: 'Quick Actions', goToLeads: 'Go to Leads',
    emailMarketing: 'Email Marketing', askAria: 'Ask ARIA',
    newLead: 'New Lead', noLeads: 'No leads yet',
    searchLeads: '🔍  Search name or service...',
    all: 'All', hot: 'Hot', warm: 'Warm', cold: 'Cold',
    createLead: 'Create Lead', creating: 'Creating...',
    contactName: 'Contact name', interest: 'Interest / Service',
    channel: 'Channel', igDm: 'Instagram DM', whatsapp: 'WhatsApp',
    leadSources: 'LEAD SOURCES',
    // CRM tabs
    commandCenter: 'Command Center',
    // Status labels
    nuovo: 'New', qualificato: 'Qualified', preventivoInviato: 'Proposal',
    chiusoVinto: 'Won', chiusoPerso: 'Lost',
    bozza: 'Draft', schedulata: 'Scheduled', inCorso: 'In progress', inviata: 'Sent',
    // Calendar
    agenda: 'Agenda', todayLabel: 'Today', tomorrowLabel: 'Tomorrow',
    newAppointment: 'New Appointment', editAppointment: 'Edit Appointment',
    noAppointments: 'No appointments',
    addFirstAppointment: 'Add your first appointment to get started',
    createAppointment: 'Create appointment', saveChanges: 'Save changes',
    saving: 'Saving...',
    titleField: 'Title *', clientField: 'Client', dateField: 'Date *',
    timeField: 'Time', typeField: 'Type', statusField: 'Status', notesField: 'Notes',
    noContact: 'No contact', selectContact: 'Select contact (optional)',
    notesPlaceholder: 'Additional notes...',
    deleteForever: '🗑️ Delete permanently',
    inAttesa: 'Pending', confermato: 'Confirmed', completato: 'Completed', annullato: 'Cancelled',
    chiamata: 'Call', riunione: 'Meeting', servizio: 'Service', altro: 'Other',
    filterAll: 'All', filterPending: 'Pending', filterConfirmed: 'Confirmed',
    filterCompleted: 'Completed', filterCancelled: 'Cancelled',
    // Analytics
    aiResponseRate: 'AI Response Rate', avgResponseTime: 'Avg response time',
    leadsConverted: 'Leads converted', confirmedAppointments: 'Confirmed appointments',
    messagesByChannel: 'Messages by channel (30 days)', leadsByStatus: 'Leads by status',
    appointmentsLast7: 'Appointments last 7 days',
    week: 'Week',
    // Inbox
    conversations: 'conversations', unread: 'unread', ariaOnline: 'ARIA online',
    noConversations: 'No conversations yet',
    noConversationsDesc: 'WhatsApp and Instagram messages will appear here',
    selectConversation: 'Select a conversation',
    manual: 'Manual', manualModeActive: 'Manual mode active — AI won\'t reply automatically',
    replyAsAria: 'Reply as ARIA...',
    generating: 'ARIA is typing…',
    aiSuggestion: '✨ AI suggested reply:',
    send: 'Send', edit: 'Edit', cancel: 'Cancel',
    // ARIA chat
    ariaChatIntro: 'How can I help you?',
    ariaTyping: 'ARIA is typing...',
    writeToAria: 'Write to',
    conversazioni: 'Conversations', noConvSaved: 'No saved conversations',
    nuovaConv: 'New conversation', cancellaChat: 'Clear this chat',
    esportaConv: 'Export conversation', impostazioniAria: 'ARIA Settings',
    online: 'online',
    quickCards: [
      { emoji: '📊', title: 'How\'s today going?', sub: 'Real-time business data analysis' },
      { emoji: '✍️', title: 'Help me with a post', sub: 'Generate social media content' },
      { emoji: '👥', title: 'Tell me about leads', sub: 'Who should I follow up with?' },
      { emoji: '💡', title: 'Give me advice', sub: 'Business, marketing, strategy' },
    ],
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('aria_lang') || 'it');

  const toggleLang = () => {
    const newLang = lang === 'it' ? 'en' : 'it';
    setLangState(newLang);
    localStorage.setItem('aria_lang', newLang);
  };

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem('aria_lang', l);
  };

  const t = T[lang] || T.it;

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}