import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from '@/components/ErrorBoundary';
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
import SocialManager from '@/pages/SocialManager';
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

// Contenuto dell'app per utenti autenticati
const AppContent = () => {
  const { business, loading } = useBusiness();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-3">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return <Onboarding />;
  }

  return (
    <Routes>
      <Route path="/aria-chat" element={<AriaChat />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/social" element={<SocialManager />} />
        <Route path="/agent" element={<AgentConfig />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/system-check" element={<SystemCheck />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

// Router principale — gestisce le rotte pubbliche e quelle autenticate
const AppRouter = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Rotte PUBBLICHE — sempre accessibili senza login */}
      <Route path="/" element={<Homepage />} />
      <Route path="/legal" element={<Legal />} />

      {/* Rotte PRIVATE — richiedono autenticazione */}
      <Route path="/*" element={
        (() => {
          if (isLoadingPublicSettings || isLoadingAuth) {
            return (
              <div className="fixed inset-0 flex items-center justify-center bg-background">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            );
          }

          if (authError) {
            if (authError.type === 'user_not_registered') {
              return <UserNotRegisteredError />;
            } else if (authError.type === 'auth_required') {
              // Reindirizza al login e poi torna all'URL corrente
              window.setTimeout(() => {
                import('@/api/base44Client').then(({ base44 }) => {
                  base44.auth.redirectToLogin(window.location.href);
                });
              }, 0);
              return (
                <div className="fixed inset-0 flex items-center justify-center bg-background">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
              );
            }
          }

          return (
            <BusinessProvider>
              <AppContent />
            </BusinessProvider>
          );
        })()
      } />
    </Routes>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AppRouter />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App