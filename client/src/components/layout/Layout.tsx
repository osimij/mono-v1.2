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
      case '/data':
        return { 
          title: 'Data Factory',
          description: 'Upload and prepare your data for analysis'
        };
      case '/modeling':
        return { 
          title: 'AI Modeling',
          description: 'Build predictive models with one-click training'
        };
      case '/analysis':
        return { 
          title: 'Analysis',
          description: 'Create custom visualizations and discover insights'
        };
      case '/assistant':
        return { 
          title: 'AI Assistant',
          description: 'Chat with your data and get intelligent insights'
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      <Header 
        onMenuToggle={() => setSidebarOpen(true)} 
        title={pageInfo.title}
        description={pageInfo.description}
        isProMode={isProMode}
        onModeToggle={toggleMode}
      />
      
      <main className="lg:ml-64 pt-16 min-h-screen">
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
