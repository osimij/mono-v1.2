import { useState, useRef, useEffect, useCallback } from "react";
import type { KeyboardEvent } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  path: string;
}

interface DataFactoryTabNavigationProps {
  currentPath: string;
}

const DATA_FACTORY_TABS: Tab[] = [
  { id: "preview", label: "Data Preview", path: "/data/preview" },
  { id: "upload", label: "Data Upload", path: "/data/upload" },
  { id: "preprocessing", label: "Smart Preprocessing", path: "/data/cleaning" },
  { id: "filtering", label: "Manual Filtering", path: "/data/filtering" },
];

export function DataFactoryTabNavigation({ currentPath }: DataFactoryTabNavigationProps) {
  const [, setLocation] = useLocation();
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  const focusAndActivateTab = useCallback((index: number) => {
    const total = DATA_FACTORY_TABS.length;
    const normalizedIndex = (index + total) % total;
    const tab = DATA_FACTORY_TABS[normalizedIndex];

    tabRefs.current[normalizedIndex]?.focus();
    setLocation(tab.path);
  }, [setLocation]);

  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          focusAndActivateTab(index + 1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          focusAndActivateTab(index - 1);
          break;
        case "Home":
          event.preventDefault();
          focusAndActivateTab(0);
          break;
        case "End":
          event.preventDefault();
          focusAndActivateTab(DATA_FACTORY_TABS.length - 1);
          break;
        case " ":
        case "Enter":
          event.preventDefault();
          setLocation(DATA_FACTORY_TABS[index].path);
          break;
        default:
          break;
      }
    },
    [focusAndActivateTab, setLocation]
  );

  return (
    <nav 
      className="sticky top-0 z-30 border-b border-border/60 bg-surface-elevated/80 backdrop-blur-md"
      role="navigation"
      aria-label="Data Factory Tabs"
    >
      <div className="flex items-center justify-center">
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
          className="overflow-x-auto overflow-y-hidden scrollbar-hide"
          style={{ scrollPaddingLeft: "36px", scrollPaddingRight: "36px" }}
        >
          <div className="flex items-center justify-center min-w-max px-2" role="tablist">
            {DATA_FACTORY_TABS.map((tab, tabIndex) => {
              const isActive = currentPath === tab.path;
              const tabId = `data-tab-${tab.id}`;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setLocation(tab.path)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="data-factory-content-region"
                  id={tabId}
                  tabIndex={isActive ? 0 : -1}
                  ref={element => {
                    tabRefs.current[tabIndex] = element;
                  }}
                  onKeyDown={event => handleTabKeyDown(event, tabIndex)}
                  className={cn(
                    "relative rounded-t-lg px-4 py-4 text-sm font-medium transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:bg-surface-muted/80",
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

