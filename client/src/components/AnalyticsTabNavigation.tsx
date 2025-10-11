import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  path: string;
}

interface AnalyticsTabNavigationProps {
  currentPath: string;
}

const ANALYTICS_TABS: Tab[] = [
  { id: "overview", label: "Overview Dashboard", path: "/analysis/overview" },
  { id: "trends", label: "Trend Analysis", path: "/analysis/trends" },
  { id: "correlation", label: "Correlation Analysis", path: "/analysis/correlation" },
  { id: "distribution", label: "Distribution Analysis", path: "/analysis/distribution" },
  { id: "geographic", label: "Geographic Analysis", path: "/analysis/geographic" },
  { id: "reports", label: "Custom Reports", path: "/analysis/reports" },
];

export function AnalyticsTabNavigation({ currentPath }: AnalyticsTabNavigationProps) {
  const [, setLocation] = useLocation();
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
    
    setTimeout(checkScroll, 300);
  };

  return (
    <nav 
      className="relative border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950"
      role="navigation"
      aria-label="Analytics Tabs"
    >
      <div className="flex items-center">
        {/* Left Arrow Button */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            aria-label="Previous"
            className="absolute left-0 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-gray-900/75 dark:bg-gray-100/75 backdrop-blur-sm hover:bg-gray-900/90 dark:hover:bg-gray-100/90 transition-colors"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >
            <ChevronLeft className="w-5 h-5 text-white dark:text-gray-900" />
          </button>
        )}

        {/* Tabs Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
          style={{ scrollPaddingLeft: "36px", scrollPaddingRight: "36px" }}
        >
          <div className="flex items-center min-w-max px-2" role="tablist">
            {ANALYTICS_TABS.map((tab) => {
              const isActive = currentPath === tab.path;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setLocation(tab.path)}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "relative px-4 py-4 text-sm font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50",
                    "focus:outline-none rounded-t-lg",
                    isActive
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400"
                  )}
                >
                  <span className="whitespace-nowrap">{tab.label}</span>
                  
                  {/* Active Indicator */}
                  {isActive && (
                    <div 
                      className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Arrow Button */}
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            aria-label="Next"
            className="absolute right-0 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-gray-900/75 dark:bg-gray-100/75 backdrop-blur-sm hover:bg-gray-900/90 dark:hover:bg-gray-100/90 transition-colors"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >
            <ChevronRight className="w-5 h-5 text-white dark:text-gray-900" />
          </button>
        )}
      </div>
    </nav>
  );
}

