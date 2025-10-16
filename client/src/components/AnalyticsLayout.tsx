import { ReactNode, useMemo } from "react";
import { useLocation } from "wouter";
import { BarChart3 } from "lucide-react";
import { AnalyticsTabNavigation } from "./AnalyticsTabNavigation";

interface AnalyticsLayoutProps {
  children: ReactNode;
}

export function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
  const [location] = useLocation();
  const messaging = useMemo(() => {
    if (!location) {
      return {
        headline: "Analytics Dashboard",
        summary: "Explore trend views, correlations, and reports built around your business questions.",
        activeTabId: undefined
      };
    }

    if (location.startsWith("/analysis/trends")) {
      return {
        headline: "Trend Analysis",
        summary: "Track how metrics are moving over time so you can highlight accelerations, slowdowns, and turning points quickly.",
        activeTabId: "analytics-tab-trends"
      };
    }

    if (location.startsWith("/analysis/correlation")) {
      return {
        headline: "Correlation Analysis",
        summary: "Compare variables side by side to reveal the strongest relationships and potential drivers behind your results.",
        activeTabId: "analytics-tab-correlation"
      };
    }

    if (location.startsWith("/analysis/distribution")) {
      return {
        headline: "Distribution Analysis",
        summary: "Understand the spread of your values, spot outliers, and identify clusters or gaps that deserve a closer look.",
        activeTabId: "analytics-tab-distribution"
      };
    }

    if (location.startsWith("/analysis/geographic")) {
      return {
        headline: "Geographic Analysis",
        summary: "Map activity across locations to find regional hotspots and emerging opportunities.",
        activeTabId: "analytics-tab-geographic"
      };
    }

    if (location.startsWith("/analysis/reports")) {
      return {
        headline: "Custom Reports",
        summary: "Assemble narrative-ready chart collections that put the latest findings in front of stakeholders.",
        activeTabId: "analytics-tab-reports"
      };
    }

    return {
      headline: "Analytics Dashboard",
      summary: "Explore trend views, correlations, and reports built around your business questions.",
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
                <BarChart3 className="h-5 w-5" />
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
      <AnalyticsTabNavigation currentPath={location} />

      {/* Main Content */}
      <div
        id="analytics-content-region"
        className="flex-1 overflow-auto bg-surface-muted"
        role="tabpanel"
        aria-labelledby={messaging.activeTabId}
      >
        {children}
      </div>
    </div>
  );
}
