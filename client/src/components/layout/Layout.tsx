import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { OnboardingTour } from "../OnboardingTour";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [, navigate] = useLocation();

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      <Header onMenuToggle={() => setSidebarOpen(true)} />
      
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
