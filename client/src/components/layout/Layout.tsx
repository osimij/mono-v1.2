import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { OnboardingTour } from "../OnboardingTour";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
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


  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
  }, [sidebarWidth]);

  return (
    <div className="min-h-screen bg-surface-muted text-text-primary">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
      />
      
      <main className="min-h-screen transition-[margin-left] duration-200 lg-ml-sidebar">
        <div className="min-h-screen bg-surface">
          {children}
        </div>
      </main>

      <OnboardingTour 
        isOpen={tourOpen}
        onClose={handleTourClose}
        onNavigate={handleTourNavigate}
      />
    </div>
  );
}
