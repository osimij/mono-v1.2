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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-7 h-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Visualize and analyze your data</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <AnalyticsTabNavigation currentPath={location} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
}

