import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from '@/components/ErrorBoundary';
import SafeSection from '@/components/ui/SafeSection.jsx';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { BusinessProvider, useBusiness } from '@/lib/useBusinessContext.jsx';

import Dashboard from '@/pages/Dashboard';
import Inbox from '@/pages/Inbox';
import CRM from '@/pages/CRM';
import Calendar from '@/pages/Calendar';
import AgentConfig from '@/pages/AgentConfig';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings.jsx';
import Admin from '@/pages/Admin';
import Onboarding from '@/pages/Onboarding';
import SystemCheck from '@/pages/SystemCheck';
import AppLayout from '@/components/layout/AppLayout';
import AriaChat from '@/pages/AriaChat';
import Legal from '@/pages/Legal';
import Homepage from '@/pages/Homepage';
import Demo from '@/pages/Demo';
import { base44 } from '@/api/base44Client';
import { LanguageProvider } from '@/lib/LanguageContext.jsx';

const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

// Contenuto app per utenti autenticati (con business già caricato)
const AppContent = () => {
  const { business, loading } = useBusiness();

  if (loading) return <Spinner />;

  if (!business) return <Onboarding />;

  return (
    <Routes>
      <Route path="/aria-chat" element={<SafeSection label="AriaChat"><AriaChat /></SafeSection>} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<SafeSection label="Dashboard"><Dashboard /></SafeSection>} />
        <Route path="/inbox" element={<SafeSection label="Inbox"><Inbox /></SafeSection>} />
        <Route path="/crm" element={<SafeSection label="CRM"><CRM /></SafeSection>} />
        <Route path="/calendar" element={<SafeSection label="Calendar"><Calendar /></SafeSection>} />
        <Route path="/agent" element={<SafeSection label="AgentConfig"><AgentConfig /></SafeSection>} />
        <Route path="/analytics" element={<SafeSection label="Analytics"><Analytics /></SafeSection>} />
        <Route path="/settings" element={<SafeSection label="Settings"><Settings /></SafeSection>} />
        <Route path="/admin" element={<SafeSection label="Admin"><Admin /></SafeSection>} />
        <Route path="/system-check" element={<SafeSection label="SystemCheck"><SystemCheck /></SafeSection>} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

// Guard per le rotte private
const PrivateZone = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  // Ancora in caricamento
  if (isLoadingPublicSettings || isLoadingAuth) return <Spinner />;

  // Errore utente non registrato
  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;

  // Non autenticato → vai al login
  if (!isAuthenticated) {
    base44.auth.redirectToLogin(window.location.href);
    return <Spinner />;
  }

  // Autenticato → carica BusinessProvider e mostra l'app
  return (
    <BusinessProvider>
      <AppContent />
    </BusinessProvider>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <Routes>
              {/* Rotte pubbliche — nessun auth check */}
              <Route path="/" element={<Homepage />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/legal" element={<Legal />} />

              {/* Tutte le altre rotte richiedono autenticazione */}
              <Route path="/*" element={<PrivateZone />} />
            </Routes>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App