import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/Landing";
import About from "@/pages/About";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Calendar from "@/pages/Calendar";
import Projects from "@/pages/Projects";
import Journal from "@/pages/Journal";
import WhatIKnow from "@/pages/WhatIKnow";
import AppShell from "@/components/AppShell";

function Router() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (location === "/about") {
    return <About />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-forest-400">
        Loading&hellip;
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  if (!user?.onboardingCompletedAt) {
    return <Onboarding />;
  }

  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/calendar" component={Calendar} />
        <Route path="/projects" component={Projects} />
        <Route path="/journal" component={Journal} />
        <Route path="/what-i-know" component={WhatIKnow} />
        <Route>
          <div className="text-forest-400">Page not found.</div>
        </Route>
      </Switch>
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}
