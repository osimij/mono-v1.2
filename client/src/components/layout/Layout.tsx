import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { OnboardingTour } from "../OnboardingTour";
import { useMode } from "@/hooks/useMode";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const { isProMode, toggleMode } = useMode();
  const [location, navigate] = useLocation();
  const [sidebarWidth, setSidebarWidth] = useState(260);

  useEffect(() => {
    // Check if user has completed the tour
    const hasCompletedTour = localStorage.getItem('mono-ai-tour-completed');
    if (!hasCompletedTour) {
      // Auto-start tour after a brief delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setTourOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleTourClose = () => {
    setTourOpen(false);
    localStorage.setItem('mono-ai-tour-completed', 'true');
  };

  const handleTourNavigate = (path: string) => {
    navigate(path);
  };

  // Get page title and description based on current route
  const getPageInfo = (path: string): { title?: string; description?: string } => {
    switch (path) {
      case '/':
        return { title: 'Home' };
      
      // Data Factory Routes
      case '/data':
        return { 
          title: 'Data Factory',
          description: 'Upload and prepare your data for analysis'
        };
      case '/data/upload':
        return { 
          title: 'Upload Data',
          description: 'Import your datasets'
        };
      case '/data/preview':
        return { 
          title: 'Data Preview',
          description: 'View and explore data'
        };
      case '/data/cleaning':
        return { 
          title: 'Data Cleaning',
          description: 'Clean and prepare data'
        };
      case '/data/validation':
        return { 
          title: 'Data Validation',
          description: 'Validate data quality'
        };
      
      // Segmentation Routes
      case '/segmentation':
        return { 
          title: 'Segmentation & Filtering',
          description: 'Segment and filter your data'
        };
      case '/segmentation/customers':
        return { 
          title: 'Customer Segmentation',
          description: 'Segment your customers'
        };
      case '/segmentation/filtering':
        return { 
          title: 'Data Filtering',
          description: 'Filter and subset data'
        };
      case '/segmentation/advanced':
        return { 
          title: 'Advanced Filters',
          description: 'Complex filtering rules'
        };
      case '/segmentation/templates':
        return { 
          title: 'Filter Templates',
          description: 'Save and reuse filters'
        };
      
      // Analysis Routes
      case '/analysis':
        return { 
          title: 'Analysis',
          description: 'Create custom visualizations and discover insights'
        };
      case '/analysis/overview':
        return { 
          title: 'Overview Dashboard',
          description: 'High-level insights'
        };
      case '/analysis/trends':
        return { 
          title: 'Trend Analysis',
          description: 'Time-based analysis'
        };
      case '/analysis/correlation':
        return { 
          title: 'Correlation Analysis',
          description: 'Find relationships'
        };
      case '/analysis/distribution':
        return { 
          title: 'Distribution Analysis',
          description: 'Data distributions'
        };
      case '/analysis/geographic':
        return { 
          title: 'Geographic Analysis',
          description: 'Location-based insights'
        };
      case '/analysis/reports':
        return { 
          title: 'Custom Reports',
          description: 'Create custom reports'
        };
      
      // ML Modeling Routes
      case '/modeling':
        return { 
          title: 'AI Modeling',
          description: 'Build predictive models with one-click training'
        };
      case '/modeling/builder':
        return { 
          title: 'Model Builder',
          description: 'Build ML models'
        };
      case '/modeling/auto':
        return { 
          title: 'Auto ML',
          description: 'Automated model training'
        };
      case '/modeling/compare':
        return { 
          title: 'Model Comparison',
          description: 'Compare model performance'
        };
      case '/modeling/features':
        return { 
          title: 'Feature Engineering',
          description: 'Create new features'
        };
      case '/modeling/deploy':
        return { 
          title: 'Model Deployment',
          description: 'Deploy your models'
        };
      case '/modeling/monitor':
        return { 
          title: 'Model Monitoring',
          description: 'Monitor model performance'
        };
      
      // AI Assistant Routes
      case '/assistant':
        return { 
          title: 'AI Assistant',
          description: 'Chat with your data and get intelligent insights'
        };
      case '/assistant/chat':
        return { 
          title: 'Chat Interface',
          description: 'Chat with your data'
        };
      case '/assistant/query':
        return { 
          title: 'Query Builder',
          description: 'Build complex queries'
        };
      case '/assistant/insights':
        return { 
          title: 'Insight Generator',
          description: 'Generate insights'
        };
      case '/assistant/reports':
        return { 
          title: 'Report Assistant',
          description: 'Create reports with AI'
        };
      case '/assistant/code':
        return { 
          title: 'Code Assistant',
          description: 'Get coding help'
        };
      
      case '/settings':
        return { 
          title: 'Settings',
          description: 'Configure your preferences and manage your data'
        };
      case '/profile':
        return { 
          title: 'Profile',
          description: 'Manage your models, datasets, and chat history'
        };
      case '/admin':
        return { 
          title: 'Admin Panel',
          description: 'Monitor platform performance and user analytics'
        };
      default:
        return {};
    }
  };

  const pageInfo = getPageInfo(location);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
  }, [sidebarWidth]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
      />
      <Header 
        onMenuToggle={() => setSidebarOpen(true)} 
        title={pageInfo.title}
        description={pageInfo.description}
        isProMode={isProMode}
        onModeToggle={toggleMode}
      />
      
      <main className="pt-16 min-h-screen transition-[margin-left] duration-200 lg-ml-sidebar">
        {children}
      </main>

      <OnboardingTour 
        isOpen={tourOpen}
        onClose={handleTourClose}
        onNavigate={handleTourNavigate}
      />
    </div>
  );
}
