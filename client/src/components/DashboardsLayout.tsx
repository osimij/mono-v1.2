import { ReactNode, useMemo } from "react";
import { useLocation } from "wouter";
import { LayoutDashboard } from "lucide-react";
import { DashboardsTabNavigation } from "./DashboardsTabNavigation";

interface DashboardsLayoutProps {
  children: ReactNode;
}

export function DashboardsLayout({ children }: DashboardsLayoutProps) {
  const [location] = useLocation();
  const messaging = useMemo(() => {
    if (!location) {
      return {
        headline: "Dashboards",
        summary: "Create and view multi-dataset dashboards with custom metrics and visualizations.",
        activeTabId: undefined
      };
    }

    if (location.startsWith("/dashboards/viewer")) {
      return {
        headline: "Dashboard Viewer",
        summary: "Choose a saved dashboard to explore its live metrics and charts.",
        activeTabId: "dashboards-tab-viewer"
      };
    }

    if (location.startsWith("/dashboards/builder")) {
      return {
        headline: "Dashboard Builder",
        summary: "Create new dashboards or refine existing ones with custom metrics and visualizations.",
        activeTabId: "dashboards-tab-builder"
      };
    }

    return {
      headline: "Dashboards",
      summary: "Create and view multi-dataset dashboards with custom metrics and visualizations.",
      activeTabId: undefined
    };
  }, [location]);

  return (
    <div className="flex h-full flex-col bg-surface text-text-primary">
      {/* Header */}
      <div className="border-b border-border/60 bg-surface-elevated/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LayoutDashboard className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold text-text-primary">
                  {messaging.headline}
                </h1>
                <p
                  className="text-sm text-text-muted"
                  role="status"
                  aria-live="polite"
                >
                  {messaging.summary}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <DashboardsTabNavigation currentPath={location} />

      {/* Main Content */}
      <div
        id="dashboards-content-region"
        className="flex-1 overflow-auto bg-surface-muted"
        role="tabpanel"
        aria-labelledby={messaging.activeTabId}
      >
        {children}
      </div>
    </div>
  );
}

