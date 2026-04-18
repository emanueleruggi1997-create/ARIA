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
    // AgentConfig tabs
    agentTabChiSono: '👤 Chi sono', agentTabCosaSo: '🧠 Cosa so',
    agentTabComportamento: '⚙️ Come mi comporto', agentTabParlami: '💬 Parlami', agentTabAvanzato: '🔬 Avanzato',
    // AriaChiSono
    customizeAgent: 'Personalizza', agentName: 'Nome', agentRole: 'Ruolo',
    agentRolePlaceholder: 'Es. Assistente commerciale', agentTone: 'Tono di voce', agentLanguage: 'Lingua',
    agentColor: 'Colore di', agentMood: 'Umore di',
    saveAndUpdate: 'Salva e Aggiorna',
    toneAmichevole: 'Amichevole', toneAmichevoleDesc: 'Caldo, vicino, usa il tu',
    toneProfessionale: 'Professionale', toneProfessionaleDesc: 'Formale, preciso, usa il lei',
    toneDiretto: 'Diretto', toneDirettoDesc: 'Breve, concreto, va al punto',
    moodFelice: 'Felice', moodFeliceDesc: 'Galleggia piano, cuoricini',
    moodDivertito: 'Divertito', moodDivertitoDesc: 'Oscillazione, stelle',
    moodTriste: 'Triste', moodTristeDesc: 'Lento, lacrime',
    moodArrabbiato: 'Arrabbiato', moodArraббiatoDesc: 'Vibra, fiamme',
    moodEccitato: 'Eccitato', moodEccitatoDesc: 'Salti, coriandoli',
    moodStanco: 'Stanco', moodStancoDesc: 'Dondola, ZZZ',
    moodInnamorato: 'Innamorato', moodInnamoratoDesc: 'Trema di gioia, cuori',
    moodEnergetico: 'Energico', moodEnergeticoDesc: 'Rimbalza, fulmini',
    // AriaCosaSo
    businessKnowledge: 'Conoscenza del business', moreDetailsHint: 'Più dettagli dai, meglio ARIA risponderà ai tuoi clienti.',
    yourServices: 'I tuoi servizi', yourPrices: 'I tuoi prezzi',
    neverSay: 'Cosa NON deve mai dire', frequentQuestions: 'Le domande frequenti',
    servicesPlaceholder: 'Descrivi cosa fai, i tuoi servizi e a chi ti rivolgi...',
    pricesPlaceholder: 'Es. Siti web da 500€ a 3000€, gestione social da 200€/mese...',
    neverSayPlaceholder: 'Es. Non promettere consegne in meno di 2 settimane, non parlare della concorrenza...',
    compiled: '✓ Compilato',
    qualityLow: 'ARIA sa poco di te', qualityMed1: 'ARIA ti conosce un po\'',
    qualityMed2: 'ARIA ti conosce bene', qualityHigh: 'ARIA è pronta al 100%',
    // AriaComportamento
    ariaReplyTimes: 'Orari di risposta di ARIA',
    ariaReplyTimesDesc: 'In questi orari ARIA risponde automaticamente ai messaggi. Separati dalla disponibilità del responsabile per gli appuntamenti (gestita in Agenda).',
    ariaAutoReply: 'ARIA risponde automaticamente ai messaggi',
    ariaAutoReplyDesc: 'Attiva per far rispondere ARIA da sola ai DM',
    ariaAutoComments: 'ARIA risponde ai commenti Instagram',
    ariaAutoCommentsDesc: 'ARIA risponderà automaticamente ai commenti sui tuoi post',
    ariaAlways247: '⚡ Rispondi sempre 24/7',
    activeDays: 'Giorni attivi', from: 'Dalle', to: 'Alle',
    outOfHoursMsg: 'Messaggio fuori orario',
    outOfHoursMsgPlaceholder: 'Ciao! Siamo fuori orario. Ti rispondo domani dalle 8:00. A presto!',
    escalationTitle: 'Quando ARIA ti chiama in causa',
    escalationDesc: 'In questi casi ARIA si ferma e ti avvisa',
    escalationNotifyOn: 'Mandami una notifica su:',
    escalationAngry: 'Quando il cliente è arrabbiato',
    escalationPrice: 'Quando chiedono il prezzo esatto',
    escalationDontKnow: 'Quando non sa rispondere',
    escalationTimeout: 'Dopo 5 messaggi senza risposta',
    // AriaAvanzato
    advancedArea: '⚡ Area avanzata — modifica solo se sai cosa stai facendo',
    systemPromptTitle: '🧠 System Prompt completo',
    quality: 'Qualità',
    ariaUpdated: '✓ ARIA aggiornata',
    promptPlaceholder: 'Il prompt viene generato automaticamente dalla tua configurazione...',
    regenerateFromConfig: 'Rigenera da configurazione',
    copy: 'Copia', promptCopied: 'Prompt copiato!',
    qualityIncomplete: '🔴 Incompleta', qualityBase: '🟡 Base', qualityOptimized: '🟢 Ottimizzata',
    // Settings
    settingsTitle: 'Impostazioni', saved: '✓ Salvato', loading: 'Caricamento impostazioni...',
    signOut: 'Esci',
    tabGenerale: '⚙️ Generale', tabConnessioni: '🔗 Connessioni', tabPiano: '💳 Piano',
    tabNotifiche: '🔔 Notifiche', tabAspetto: '🎨 Aspetto',
    metaSuccess: '✓ Account Meta collegato con successo!',
    metaError: '✗ Collegamento Meta non riuscito. Riprova.',
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
    // Settings
    settingsTitle: 'Settings', saved: '✓ Saved', loading: 'Loading settings...',
    signOut: 'Sign Out',
    tabGenerale: '⚙️ General', tabConnessioni: '🔗 Connections', tabPiano: '💳 Plan',
    tabNotifiche: '🔔 Notifications', tabAspetto: '🎨 Appearance',
    metaSuccess: '✓ Meta account connected successfully!',
    metaError: '✗ Meta connection failed. Please try again.',
    // AgentConfig tabs
    agentTabChiSono: '👤 Who I am', agentTabCosaSo: '🧠 What I know',
    agentTabComportamento: '⚙️ How I behave', agentTabParlami: '💬 Talk to me', agentTabAvanzato: '🔬 Advanced',
    // AriaChiSono
    customizeAgent: 'Customize', agentName: 'Name', agentRole: 'Role',
    agentRolePlaceholder: 'E.g. Sales assistant',  agentTone: 'Tone of voice', agentLanguage: 'Language',
    agentColor: 'Color of', agentMood: 'Mood of',
    saveAndUpdate: 'Save & Update',
    toneAmichevole: 'Friendly', toneAmichevoleDesc: 'Warm, close, uses first names',
    toneProfessionale: 'Professional', toneProfessionaleDesc: 'Formal, precise, polite',
    toneDiretto: 'Direct', toneDirettoDesc: 'Short, concrete, to the point',
    moodFelice: 'Happy', moodFeliceDesc: 'Floats gently, hearts',
    moodDivertito: 'Playful', moodDivertitoDesc: 'Swaying, stars',
    moodTriste: 'Sad', moodTristeDesc: 'Slow, tears',
    moodArrabbiato: 'Angry', moodArraббiatoDesc: 'Vibrates, flames',
    moodEccitato: 'Excited', moodEccitatoDesc: 'Jumps, confetti',
    moodStanco: 'Tired', moodStancoDesc: 'Sways, ZZZ',
    moodInnamorato: 'In love', moodInnamoratoDesc: 'Trembles with joy, hearts',
    moodEnergetico: 'Energetic', moodEnergeticoDesc: 'Bounces, lightning',
    // AriaCosaSo
    businessKnowledge: 'Business knowledge', moreDetailsHint: 'The more details you provide, the better ARIA will respond to your clients.',
    yourServices: 'Your services', yourPrices: 'Your prices',
    neverSay: 'What it should NEVER say', frequentQuestions: 'Frequently asked questions',
    servicesPlaceholder: 'Describe what you do, your services and who you target...',
    pricesPlaceholder: 'E.g. Websites from €500 to €3,000, social management from €200/mo...',
    neverSayPlaceholder: 'E.g. Don\'t promise delivery in less than 2 weeks, don\'t mention competitors...',
    compiled: '✓ Filled',
    qualityLow: 'ARIA knows little about you', qualityMed1: 'ARIA knows you a bit',
    qualityMed2: 'ARIA knows you well', qualityHigh: 'ARIA is 100% ready',
    // AriaComportamento
    ariaReplyTimes: 'ARIA reply hours',
    ariaReplyTimesDesc: 'During these hours ARIA replies automatically. Separate from manager availability for appointments (managed in Agenda).',
    ariaAutoReply: 'ARIA replies automatically to messages',
    ariaAutoReplyDesc: 'Enable to let ARIA reply to DMs on its own',
    ariaAutoComments: 'ARIA replies to Instagram comments',
    ariaAutoCommentsDesc: 'ARIA will automatically reply to comments on your posts',
    ariaAlways247: '⚡ Always reply 24/7',
    activeDays: 'Active days', from: 'From', to: 'To',
    outOfHoursMsg: 'Out-of-hours message',
    outOfHoursMsgPlaceholder: 'Hi! We\'re out of hours. I\'ll reply tomorrow from 8:00am. See you soon!',
    escalationTitle: 'When ARIA calls you in',
    escalationDesc: 'In these cases ARIA stops and notifies you',
    escalationNotifyOn: 'Send me a notification at:',
    escalationAngry: 'When the client is angry',
    escalationPrice: 'When they ask for the exact price',
    escalationDontKnow: 'When it doesn\'t know how to answer',
    escalationTimeout: 'After 5 messages without a reply',
    // AriaAvanzato
    advancedArea: '⚡ Advanced area — only edit if you know what you\'re doing',
    systemPromptTitle: '🧠 Full System Prompt',
    quality: 'Quality',
    ariaUpdated: '✓ ARIA updated',
    promptPlaceholder: 'The prompt is auto-generated from your configuration...',
    regenerateFromConfig: 'Regenerate from config',
    copy: 'Copy', promptCopied: 'Prompt copied!',
    qualityIncomplete: '🔴 Incomplete', qualityBase: '🟡 Basic', qualityOptimized: '🟢 Optimized',
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