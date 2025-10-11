import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Database,
  TrendingUp,
  Bot,
  MessageSquare,
  Brain,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileText,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Settings,
  User,
  Shield,
  Activity,
  Layers,
  Cpu,
  Sparkles,
  BrainCircuit,
  DatabaseZap,
  FileSearch,
  BarChart,
  LineChart,
  ScatterChart,
  PieChart as PieChartIcon,
  Map,
  Globe,
  Calendar,
  Clock,
  Star,
  Award,
  TrendingDown,
  Minus,
  Plus,
  Rocket,
  Code
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (value: number) => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  description?: string;
  subsections?: {
    name: string;
    href: string;
    icon: any;
    description?: string;
  }[];
}

const navigation: NavigationItem[] = [
  { 
    name: "Home", 
    href: "/", 
    icon: Home,
    description: "Overview & quick actions"
  },
  { 
    name: "Data Factory", 
    href: "/data", 
    icon: Database,
    description: "Manage and refine datasets",
    subsections: [
      { name: "Data Preview", href: "/data/preview", icon: FileText, description: "View and explore data" },
      { name: "Upload Data", href: "/data/upload", icon: Upload, description: "Import your datasets" },
      { name: "Data Cleaning", href: "/data/cleaning", icon: DatabaseZap, description: "Clean and prepare data" },
      { name: "Data Validation", href: "/data/validation", icon: Shield, description: "Validate data quality" }
    ]
  },
  { 
    name: "Segmentation & Filtering", 
    href: "/segmentation", 
    icon: Filter,
    description: "Target audiences instantly",
    subsections: [
      { name: "Customer Segmentation", href: "/segmentation/customers", icon: Users, description: "Segment your customers" },
      { name: "Data Filtering", href: "/segmentation/filtering", icon: FileSearch, description: "Filter and subset data" },
      { name: "Advanced Filters", href: "/segmentation/advanced", icon: Layers, description: "Complex filtering rules" },
      { name: "Filter Templates", href: "/segmentation/templates", icon: Star, description: "Save and reuse filters" }
    ]
  },
  { 
    name: "Analysis", 
    href: "/analysis", 
    icon: TrendingUp,
    description: "Visualize patterns & trends",
    subsections: [
      { name: "Overview Dashboard", href: "/analysis/overview", icon: BarChart3, description: "High-level insights" },
      { name: "Trend Analysis", href: "/analysis/trends", icon: TrendingUp, description: "Time-based analysis" },
      { name: "Correlation Analysis", href: "/analysis/correlation", icon: ScatterChart, description: "Find relationships" },
      { name: "Distribution Analysis", href: "/analysis/distribution", icon: PieChartIcon, description: "Data distributions" },
      { name: "Geographic Analysis", href: "/analysis/geographic", icon: Map, description: "Location-based insights" },
      { name: "Custom Reports", href: "/analysis/reports", icon: FileText, description: "Create custom reports" }
    ]
  },
  { 
    name: "ML Modeling", 
    href: "/modeling", 
    icon: Bot,
    description: "Build, deploy, and monitor",
    subsections: [
      { name: "Model Builder", href: "/modeling/builder", icon: Cpu, description: "Build ML models" },
      { name: "Auto ML", href: "/modeling/auto", icon: Zap, description: "Automated model training" },
      { name: "Model Comparison", href: "/modeling/compare", icon: BarChart, description: "Compare model performance" },
      { name: "Feature Engineering", href: "/modeling/features", icon: BrainCircuit, description: "Create new features" },
      { name: "Model Deployment", href: "/modeling/deploy", icon: Rocket, description: "Deploy your models" },
      { name: "Model Monitoring", href: "/modeling/monitor", icon: Activity, description: "Monitor model performance" }
    ]
  },
  { 
    name: "AI Assistant", 
    href: "/assistant", 
    icon: MessageSquare,
    description: "Ask questions about your data"
  }
];

export function Sidebar({ isOpen, onClose, width, onWidthChange }: SidebarProps) {
  const [location] = useLocation();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Auto-detect selected section based on current URL
  useEffect(() => {
    const detectSelectedSection = () => {
      // Find which section the current URL belongs to
      for (const item of navigation) {
        // Skip Analysis section - it uses top tab navigation instead
        if (item.name === "Analysis") continue;
        
        if (item.subsections) {
          // Check if current URL matches any subsection
          const matchingSubsection = item.subsections.find(sub => sub.href === location);
          if (matchingSubsection) {
            setSelectedSection(item.name);
            return;
          }
        }
      }
      // If no subsection matches, clear selection
      setSelectedSection(null);
    };

    detectSelectedSection();
  }, [location]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      event.preventDefault();
      const nextWidth = Math.min(Math.max(event.clientX, 240), 360);
      onWidthChange(nextWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseleave", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing]);

  const handleSectionClick = (sectionName: string) => {
    setSelectedSection((current) => (current === sectionName ? null : sectionName));
  };

  const handleBackClick = () => {
    setSelectedSection(null);
  };

  const selectedSectionData = selectedSection 
    ? navigation.find(item => item.name === selectedSection)
    : null;
  const SelectedSectionIcon = selectedSectionData?.icon;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full bg-white dark:bg-[#0F1419] border-r border-[#EFF3F4] dark:border-[#1F2B3A] z-40 transform transition-transform duration-300 shadow-[0_0_12px_rgba(15,20,25,0.08)] flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ width }}
        role="complementary"
        aria-label="Main navigation sidebar"
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#EFF3F4] dark:border-[#1F2B3A]">
          <a 
            href="https://monotech-xzp1.onrender.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full bg-[#0F1419] dark:bg-white flex items-center justify-center shadow-sm">
              <Brain className="w-5 h-5 text-white dark:text-[#0F1419]" />
            </div>
            <span className="font-semibold text-lg text-[#0F1419] dark:text-white tracking-tight">Mono-AI</span>
          </a>
          <button 
            onClick={onClose}
            className="lg:hidden text-[#536471] hover:text-[#0F1419] dark:text-[#8B98A5] dark:hover:text-white transition-colors"
          >
            ×
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 pr-5 overflow-y-auto relative space-y-6" role="navigation">
          {/* Back Button */}
          {selectedSection && (
            <div className="mb-4">
              <button
                onClick={handleBackClick}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#536471] dark:text-[#8B98A5] hover:text-[#0F1419] dark:hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>
          )}

          {/* Main Navigation */}
          <div className={selectedSection ? "hidden" : "block"}>
            <ul className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const hasSubsections = item.subsections && item.subsections.length > 0;
                const isAnalysisSection = item.name === "Analysis";
                const isExpanded = selectedSection === item.name;
                const matchesLocation = isAnalysisSection
                  ? location.startsWith("/analysis")
                  : hasSubsections
                    ? location === item.href || location.startsWith(`${item.href}/`)
                    : location === item.href;
                const isActive = isExpanded || matchesLocation;

                const actionClasses = cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9BF0]/30 transition-colors",
                  isActive
                    ? "bg-[#EFF3F4] text-[#0F1419] dark:bg-[#1D2733] dark:text-[#F7F9F9]"
                    : "text-[#536471] dark:text-[#8B98A5] hover:bg-[#F7F9F9] hover:text-[#0F1419] dark:hover:bg-[#1D2733] dark:hover:text-[#F7F9F9]"
                );

                const iconClasses = cn(
                  "w-5 h-5 transition-colors",
                  isActive
                    ? "text-[#0F1419] dark:text-white"
                    : "text-[#536471] dark:text-[#8B98A5] group-hover:text-[#0F1419] dark:group-hover:text-white"
                );

                const titleClasses = cn(
                  "text-sm font-semibold transition-colors",
                  isActive
                    ? "text-[#0F1419] dark:text-white"
                    : "text-[#0F1419] dark:text-white"
                );

                const descriptionClasses = cn(
                  "text-xs text-[#536471] dark:text-[#8B98A5] transition-colors",
                  isActive ? "text-[#536471] dark:text-[#8B98A5]" : "group-hover:text-[#0F1419] dark:group-hover:text-white"
                );

                const chevronClasses = cn(
                  "w-4 h-4 transition-colors",
                  isActive
                    ? "text-[#0F1419] dark:text-white"
                    : "text-[#AAB8C2] dark:text-[#657786] group-hover:text-[#0F1419] dark:group-hover:text-white"
                );

                return (
                  <li key={item.name} className="relative">
                    {hasSubsections && !isAnalysisSection ? (
                      <button
                        type="button"
                        onClick={() => handleSectionClick(item.name)}
                        aria-expanded={isExpanded}
                        className={actionClasses}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Icon className={iconClasses} />
                          <div className="flex-1 min-w-0 text-left">
                            <div className={titleClasses}>{item.name}</div>
                            {item.description && (
                              <div className={descriptionClasses}>{item.description}</div>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={chevronClasses} />
                      </button>
                    ) : (
                      <Link
                        href={isAnalysisSection ? "/analysis/overview" : item.href}
                        className={actionClasses}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Icon className={iconClasses} />
                          <div className="flex-1 min-w-0 text-left">
                            <div className={titleClasses}>{item.name}</div>
                            {item.description && (
                              <div className={descriptionClasses}>{item.description}</div>
                            )}
                          </div>
                        </div>
                        <ChevronRight className={chevronClasses} />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Subsection Navigation */}
          {selectedSectionData && (
            <div>
              {/* Section Header */}
              <div className="mb-3">
                <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#EFF3F4] dark:bg-[#1D2733] text-[#0F1419] dark:text-[#F7F9F9]">
                  {SelectedSectionIcon ? (
                    <SelectedSectionIcon className="w-5 h-5 text-[#0F1419] dark:text-[#F7F9F9]" />
                  ) : null}
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    {selectedSectionData.name}
                  </span>
                </div>
              </div>

              {/* Subsections */}
              <ul className="space-y-2">
                {selectedSectionData.subsections?.map((subsection) => {
                  const isActive = location === subsection.href;
                  const Icon = subsection.icon;
                  
                  const subsectionClasses = cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9BF0]/30 transition-colors",
                    isActive
                      ? "bg-[#EFF3F4] text-[#0F1419] dark:bg-[#1D2733] dark:text-[#F7F9F9]"
                      : "text-[#536471] dark:text-[#8B98A5] hover:bg-[#F7F9F9] hover:text-[#0F1419] dark:hover:bg-[#1D2733] dark:hover:text-[#F7F9F9]"
                  );

                  const subsectionIconClasses = cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-[#0F1419] dark:text-[#F7F9F9]"
                      : "text-[#536471] dark:text-[#8B98A5] group-hover:text-[#0F1419] dark:group-hover:text-[#F7F9F9]"
                  );

                  const subsectionDescriptionClasses = cn(
                    "text-xs text-[#536471] dark:text-[#8B98A5] transition-colors",
                    isActive ? "text-[#536471] dark:text-[#8B98A5]" : "group-hover:text-[#0F1419] dark:group-hover:text-[#F7F9F9]"
                  );
                  
                  const subsectionChevronClasses = cn(
                    "w-4 h-4 transition-colors",
                    isActive
                      ? "text-[#0F1419] dark:text-[#F7F9F9]"
                      : "text-[#AAB8C2] dark:text-[#657786] group-hover:text-[#0F1419] dark:group-hover:text-[#F7F9F9]"
                  );

                  return (
                    <li 
                      key={subsection.name}
                    >
                      <Link 
                        href={subsection.href}
                        className={subsectionClasses}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <Icon className={subsectionIconClasses} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {subsection.name}
                          </div>
                          {subsection.description && (
                            <div className={subsectionDescriptionClasses}>
                              {subsection.description}
                            </div>
                          )}
                        </div>
                        <ChevronRight className={subsectionChevronClasses} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>
      </div>
      <div
        className="fixed top-0 hidden h-full w-[3px] -ml-[1.5px] cursor-col-resize select-none lg:block group z-50"
        style={{ left: `${width}px` }}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          setIsResizing(true);
        }}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-full bg-transparent transition-colors",
            isResizing ? "bg-[#1D9BF0]/70" : "group-hover:bg-[#1D9BF0]/50"
          )}
        />
      </div>
    </>
  );
}
