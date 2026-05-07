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
import { LanguageProvider } from '@/lib/LanguageContext.jsx';
import { base44 } from '@/api/base44Client';
import React, { lazy, Suspense } from 'react';

// ─── Eager imports (critical path — small, always needed) ─────────────────────
import AppLayout from '@/components/layout/AppLayout';
import Onboarding from '@/pages/Onboarding';
import Homepage from '@/pages/Homepage';

// ─── Lazy imports (code-split — loaded only when navigated to) ────────────────
const Dashboard   = lazy(() => import('@/pages/Dashboard'));
const Inbox       = lazy(() => import('@/pages/Inbox'));
const CRM         = lazy(() => import('@/pages/CRM'));
const Calendar    = lazy(() => import('@/pages/Calendar'));
const AgentConfig = lazy(() => import('@/pages/AgentConfig'));
const Analytics   = lazy(() => import('@/pages/Analytics'));
const Settings    = lazy(() => import('@/pages/Settings'));
const Admin       = lazy(() => import('@/pages/Admin'));
const SystemCheck = lazy(() => import('@/pages/SystemCheck'));
const AriaChat    = lazy(() => import('@/pages/AriaChat'));
const Legal       = lazy(() => import('@/pages/Legal'));
const Demo        = lazy(() => import('@/pages/Demo'));

// ─── Page skeleton — shown instantly while lazy page loads ────────────────────
function SkeletonBox({ className }) {
  return <div className={`shimmer rounded-xl ${className}`} />;
}

function PageSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-5">
      <SkeletonBox className="h-8 w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <SkeletonBox key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonBox className="h-48" />
        <SkeletonBox className="h-48" />
      </div>
      <SkeletonBox className="h-64" />
    </div>
  );
}

// ─── App shell skeleton — shows layout immediately while business loads ────────
function AppShellSkeleton() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar skeleton (desktop only) */}
      <div className="hidden md:flex w-[240px] h-screen bg-sidebar border-r border-sidebar-border fixed left-0 top-0 flex-col">
        <div className="h-16 border-b border-sidebar-border px-4 flex items-center gap-3">
          <div className="shimmer w-24 h-8 rounded-lg" />
        </div>
        <div className="p-3 space-y-1 flex-1">
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="shimmer h-10 rounded-lg" />
          ))}
        </div>
      </div>
      <main className="md:ml-[240px] flex-1">
        <PageSkeleton />
      </main>
    </div>
  );
}

// ─── Full app spinner (auth check only) ───────────────────────────────────────
const Spinner = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-xs text-muted-foreground font-medium tracking-wide">Emaral Agent AI</span>
    </div>
  </div>
);

// ─── App content ──────────────────────────────────────────────────────────────
const AppContent = () => {
  const { business, loading } = useBusiness();

  // While business loads, show layout shell immediately (not full-screen spinner)
  if (loading) return <AppShellSkeleton />;
  if (!business) return <Onboarding />;

  return (
    <Routes>
      <Route path="/aria-chat" element={
        <Suspense fallback={<PageSkeleton />}>
          <SafeSection label="AriaChat"><AriaChat /></SafeSection>
        </Suspense>
      } />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={
          <Suspense fallback={<PageSkeleton />}>
            <SafeSection label="Dashboard"><Dashboard /></SafeSection>
          </Suspense>
        } />
        <Route path="/inbox" element={
          <Suspense fallback={<PageSkeleton />}>
            <SafeSection label="Inbox"><Inbox /></SafeSection>
          </Suspense>
        } />
        <Route path="/crm" element={
          <Suspense fallback={<PageSkeleton />}>
            <SafeSection label="CRM"><CRM /></SafeSection>
          </Suspense>
        } />
        <Route path="/calendar" element={
          <Suspense fallback={<PageSkeleton />}>
            <SafeSection label="Calendar"><Calendar /></SafeSection>
          </Suspense>
        } />
        <Route path="/agent" element={
          <Suspense fallback={<PageSkeleton />}>
            <SafeSection label="AgentConfig"><AgentConfig /></SafeSection>
          </Suspense>
        } />
        <Route path="/analytics" element={
          <Suspense fallback={<PageSkeleton />}>
            <SafeSection label="Analytics"><Analytics /></SafeSection>
          </Suspense>
        } />
        <Route path="/settings" element={
          <Suspense fallback={<PageSkeleton />}>
            <SafeSection label="Settings"><Settings /></SafeSection>
          </Suspense>
        } />
        <Route path="/admin" element={
          <Suspense fallback={<PageSkeleton />}>
            <SafeSection label="Admin"><Admin /></SafeSection>
          </Suspense>
        } />
        <Route path="/system-check" element={
          <Suspense fallback={<PageSkeleton />}>
            <SafeSection label="SystemCheck"><SystemCheck /></SafeSection>
          </Suspense>
        } />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

// ─── Private zone ─────────────────────────────────────────────────────────────
const PrivateZone = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) return <Spinner />;
  if (authError?.type === 'user_not_registered') return <UserNotRegisteredError />;

  if (!isAuthenticated) {
    base44.auth.redirectToLogin(window.location.href);
    return <Spinner />;
  }

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
                <Route path="/" element={<Homepage />} />
                <Route path="/demo" element={
                  <Suspense fallback={<Spinner />}><Demo /></Suspense>
                } />
                <Route path="/legal" element={
                  <Suspense fallback={<Spinner />}><Legal /></Suspense>
                } />
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

export default App;