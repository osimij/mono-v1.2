import { ReactNode } from "react";
import { useLocation } from "wouter";
import { BarChart3 } from "lucide-react";
import { AnalyticsTabNavigation } from "./AnalyticsTabNavigation";

interface AnalyticsLayoutProps {
  children: ReactNode;
}

export function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-full flex-col bg-surface text-text-primary">
      {/* Header */}
      <div className="border-b border-border/60 bg-surface-elevated/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold text-text-primary">
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-text-muted">
                  Visualize and analyze your data
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <AnalyticsTabNavigation currentPath={location} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-surface-muted">
        {children}
      </div>
    </div>
  );
}
