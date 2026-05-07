import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import MapPage from "@/pages/map";
import CatchDetailPage from "@/pages/catch-detail";
import ProfilePage from "@/pages/profile";
import LeaderboardPage from "@/pages/leaderboard";
import AdminPage from "@/pages/admin";
import LoginPage from "@/pages/login";
import ForgotPasswordPage from "@/pages/forgot-password";
import RegisterPage from "@/pages/register";
import TestCatchPage from "@/pages/test-catch";
import EditProfilePage from "@/pages/edit-profile";
import SettingsPage from "@/pages/settings";
import OfflineCatchesPage from "@/pages/offline-catches";
import MySpotsPage from "@/pages/my-spots";
import SpotDetailPage from "@/pages/spot-detail";
import Layout from "@/components/layout/Layout";
import { useEffect } from "react";
import { initSyncModule } from "@/lib/localStorageSync";
import { SettingsProvider } from "@/hooks/useSettings";
import { AuthLocalStorageSync } from "@/components/auth/AuthLocalStorageSync";

// Register service worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service worker registered:', registration);
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    });
  }
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={LoginPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/map" component={MapPage} />
        <Route path="/catches">
          <Redirect to="/map?tab=list" />
        </Route>
        <Route path="/catches/:id" component={CatchDetailPage} />
        <Route path="/profile/:id?" component={ProfilePage} />
        <Route path="/edit-profile" component={EditProfilePage} />
        <Route path="/leaderboard" component={LeaderboardPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/test-catch" component={TestCatchPage} />
        <Route path="/offline-catches" component={OfflineCatchesPage} />
        <Route path="/my-spot/:id">
          {(params) => <Redirect to={`/my-spots/${params.id}`} />}
        </Route>
        <Route path="/my-spot">
          <Redirect to="/my-spots" />
        </Route>
        <Route path="/my-spots" component={MySpotsPage} />
        <Route path="/my-spots/:id" component={SpotDetailPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    // Initialize offline sync
    initSyncModule();
    
    // Register service worker
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SettingsProvider>
          <Toaster />
          <AuthLocalStorageSync />
          <Router />
        </SettingsProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
