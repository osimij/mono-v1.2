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
      className="relative border-b border-border/60 bg-surface-elevated/80 backdrop-blur-md"
      role="navigation"
      aria-label="Analytics Tabs"
    >
      <div className="flex items-center">
        {/* Left Arrow Button */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            aria-label="Previous"
            className="absolute left-0 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-inverted/80 text-text-inverted shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-inverted/95"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >
            <ChevronLeft className="h-5 w-5" />
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
                    "relative rounded-t-lg px-4 py-4 text-sm font-medium transition-colors",
                    "focus:outline-none hover:bg-surface-muted/80",
                    isActive
                      ? "text-text-primary"
                      : "text-text-muted"
                  )}
                >
                  <span className="whitespace-nowrap">{tab.label}</span>
                  
                  {/* Active Indicator */}
                  {isActive && (
                    <div 
                      className="absolute bottom-0 left-3 right-3 h-1 rounded-full bg-primary"
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
            className="absolute right-0 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-inverted/80 text-text-inverted shadow-sm backdrop-blur-sm transition-colors hover:bg-surface-inverted/95"
            style={{ top: "50%", transform: "translateY(-50%)" }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </nav>
  );
}
