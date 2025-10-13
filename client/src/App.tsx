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
import { SegmentationPage } from "@/pages/SegmentationPage";
import { AnalysisPage } from "@/pages/AnalysisPage";
import { ModelingPage } from "@/pages/ModelingPage";
import { AssistantPage } from "@/pages/AssistantPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LoginPage } from "@/pages/LoginPage";
import { AdminPage } from "@/pages/AdminPage";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import NotFound from "@/pages/not-found";

// Subsection Pages
import { DataUploadPage } from "@/pages/DataUploadPage";
import { DataPreviewPage } from "@/pages/DataPreviewPage";
import { DataCleaningPage } from "@/pages/DataCleaningPage";
import { SegmentationCustomersPage } from "@/pages/SegmentationCustomersPage";
import { DataFilteringPage } from "@/pages/DataFilteringPage";
import { AnalysisOverviewPage } from "@/pages/AnalysisOverviewPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

// Icons for placeholder pages
import { 
  DatabaseZap, 
  Shield, 
  FileSearch, 
  Layers, 
  Star, 
  TrendingUp, 
  ScatterChart, 
  PieChart as PieChartIcon, 
  Map, 
  FileText,
  Cpu,
  Zap,
  BarChart,
  BrainCircuit,
  Rocket,
  Activity,
  Code
} from "lucide-react";

function PublicRouter() {
  const { user, login, register, isAuthenticated } = useAuth();
  
  return (
    <Layout>
      <Switch>
        <Route path="/" component={HomePage} />
        
        {/* Data Factory Routes */}
        <Route path="/data" component={DataPage} />
        <Route path="/data/upload" component={DataUploadPage} />
        <Route path="/data/preview" component={DataPreviewPage} />
        <Route path="/data/cleaning" component={DataCleaningPage} />
        <Route path="/data/validation">
          {() => <PlaceholderPage title="Data Validation" description="Validate data quality" icon={Shield} parentPath="/data" />}
        </Route>
        
        {/* Segmentation & Filtering Routes */}
        <Route path="/segmentation" component={SegmentationPage} />
        <Route path="/segmentation/customers" component={SegmentationCustomersPage} />
        <Route path="/segmentation/filtering" component={DataFilteringPage} />
        <Route path="/segmentation/advanced">
          {() => <PlaceholderPage title="Advanced Filters" description="Complex filtering rules" icon={Layers} parentPath="/segmentation" />}
        </Route>
        <Route path="/segmentation/templates">
          {() => <PlaceholderPage title="Filter Templates" description="Save and reuse filters" icon={Star} parentPath="/segmentation" />}
        </Route>
        
        {/* Analysis Routes */}
        <Route path="/analysis" component={AnalysisPage} />
        <Route path="/analysis/overview" component={AnalysisOverviewPage} />
        <Route path="/analysis/trends">
          {() => <PlaceholderPage title="Trend Analysis" description="Time-based analysis" icon={TrendingUp} parentPath="/analysis" />}
        </Route>
        <Route path="/analysis/correlation">
          {() => <PlaceholderPage title="Correlation Analysis" description="Find relationships" icon={ScatterChart} parentPath="/analysis" />}
        </Route>
        <Route path="/analysis/distribution">
          {() => <PlaceholderPage title="Distribution Analysis" description="Data distributions" icon={PieChartIcon} parentPath="/analysis" />}
        </Route>
        <Route path="/analysis/geographic">
          {() => <PlaceholderPage title="Geographic Analysis" description="Location-based insights" icon={Map} parentPath="/analysis" />}
        </Route>
        <Route path="/analysis/reports">
          {() => <PlaceholderPage title="Custom Reports" description="Create custom reports" icon={FileText} parentPath="/analysis" />}
        </Route>
        
        {/* ML Modeling Routes */}
        <Route path="/modeling" component={ModelingPage} />
        <Route path="/modeling/builder">
          {() => <PlaceholderPage title="Model Builder" description="Build ML models" icon={Cpu} parentPath="/modeling" />}
        </Route>
        <Route path="/modeling/auto">
          {() => <PlaceholderPage title="Auto ML" description="Automated model training" icon={Zap} parentPath="/modeling" />}
        </Route>
        <Route path="/modeling/compare">
          {() => <PlaceholderPage title="Model Comparison" description="Compare model performance" icon={BarChart} parentPath="/modeling" />}
        </Route>
        <Route path="/modeling/features">
          {() => <PlaceholderPage title="Feature Engineering" description="Create new features" icon={BrainCircuit} parentPath="/modeling" />}
        </Route>
        <Route path="/modeling/deploy">
          {() => <PlaceholderPage title="Model Deployment" description="Deploy your models" icon={Rocket} parentPath="/modeling" />}
        </Route>
        <Route path="/modeling/monitor">
          {() => <PlaceholderPage title="Model Monitoring" description="Monitor model performance" icon={Activity} parentPath="/modeling" />}
        </Route>
        
        {/* AI Assistant Routes */}
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
      <div className="flex min-h-screen items-center justify-center bg-surface text-text-primary">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-elevated/80 px-10 py-8 text-center shadow-md ring-1 ring-border/60 backdrop-blur">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-text-muted">Loading Mono-AI&hellip;</p>
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
