import { ReactNode, useMemo } from "react";
import { useLocation } from "wouter";
import { Database } from "lucide-react";
import { DataFactoryTabNavigation } from "./DataFactoryTabNavigation";

interface DataFactoryLayoutProps {
  children: ReactNode;
}

export function DataFactoryLayout({ children }: DataFactoryLayoutProps) {
  const [location] = useLocation();
  const messaging = useMemo(() => {
    if (!location) {
      return {
        headline: "Data Factory",
        summary: "Import, preview, clean, and filter your datasets to prepare them for analysis.",
        activeTabId: undefined
      };
    }

    if (location.startsWith("/data/preview")) {
      return {
        headline: "Data Preview",
        summary: "Browse and inspect your uploaded datasets, view metadata, and explore data quality metrics.",
        activeTabId: "data-tab-preview"
      };
    }

    if (location.startsWith("/data/upload")) {
      return {
        headline: "Data Upload",
        summary: "Import CSV, Excel, or JSON files to start exploring and analyzing your data.",
        activeTabId: "data-tab-upload"
      };
    }

    if (location.startsWith("/data/cleaning")) {
      return {
        headline: "Smart Preprocessing",
        summary: "Apply intelligent data cleaning pipelines to handle missing values, outliers, and data quality issues automatically.",
        activeTabId: "data-tab-preprocessing"
      };
    }

    if (location.startsWith("/data/filtering")) {
      return {
        headline: "Manual Filtering",
        summary: "Build custom filter rules to refine your datasets and create targeted subsets for analysis.",
        activeTabId: "data-tab-filtering"
      };
    }

    return {
      headline: "Data Factory",
      summary: "Import, preview, clean, and filter your datasets to prepare them for analysis.",
      activeTabId: undefined
    };
  }, [location]);

  return (
    <div className="flex h-full flex-col bg-surface text-text-primary">
      {/* Header */}
      <div className="border-b border-border/60 bg-surface-elevated/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
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

      {/* Tab Navigation */}
      <DataFactoryTabNavigation currentPath={location} />

      {/* Main Content */}
      <div
        id="data-factory-content-region"
        className="flex-1 overflow-auto bg-surface-muted"
        role="tabpanel"
        aria-labelledby={messaging.activeTabId}
      >
        {children}
      </div>
    </div>
  );
}
