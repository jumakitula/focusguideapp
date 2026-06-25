import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { AuthModal } from "@/components/auth-modal";
import { useAuth } from "@/hooks/use-auth";

import Dashboard from "@/pages/dashboard";
import Calendar from "@/pages/calendar";
import Sessions from "@/pages/sessions";
import Settings from "@/pages/settings";
import AndroidSetup from "@/pages/android";

const queryClient = new QueryClient();

function Router() {
  const { email, setEmail, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <>
      <AuthModal isOpen={!email} onComplete={setEmail} />
      
      {email && (
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/calendar" component={Calendar} />
            <Route path="/sessions" component={Sessions} />
            <Route path="/settings" component={Settings} />
            <Route path="/android" component={AndroidSetup} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
