import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { ModeProvider } from "@/hooks/useMode";

// Pages
import { HomePage } from "@/pages/HomePage";
import { DataPage } from "@/pages/DataPage";
import { AnalysisPage } from "@/pages/AnalysisPage";
import { ModelingPage } from "@/pages/ModelingPage";
import { AssistantPage } from "@/pages/AssistantPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LoginPage } from "@/pages/LoginPage";
import { AdminPage } from "@/pages/AdminPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import NotFound from "@/pages/not-found";

function PublicRouter() {
  const { user, login, register, isAuthenticated } = useAuth();
  
  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/data" component={DataPage} />
        <Route path="/analysis" component={AnalysisPage} />
        <Route path="/modeling" component={ModelingPage} />
        <Route path="/assistant" component={AssistantPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/login">
          {() => (
            <LoginPage 
              onLogin={async (credentials) => {
                try {
                  if (credentials.firstName) {
                    await register(credentials);
                  } else {
                    await login(credentials);
                  }
                  // After successful login/register, the user will be automatically redirected
                  // because the useAuth hook will detect the authenticated state
                } catch (error) {
                  console.error('Authentication error:', error);
                  throw error;
                }
              }}
            />
          )}
        </Route>
        <Route path="/admin-login">
          {() => <AdminLoginPage />}
        </Route>
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function AppRouter() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading Mono-AI...</p>
        </div>
      </div>
    );
  }

  return <PublicRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ModeProvider>
          <TooltipProvider>
            <Toaster />
            <AppRouter />
          </TooltipProvider>
        </ModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
