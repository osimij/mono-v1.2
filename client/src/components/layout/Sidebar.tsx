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
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
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
    icon: Home 
  },
  { 
    name: "Data Factory", 
    href: "/data", 
    icon: Database,
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
    icon: MessageSquare
  }
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-detect selected section based on current URL
  useEffect(() => {
    const detectSelectedSection = () => {
      // Find which section the current URL belongs to
      for (const item of navigation) {
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

  const handleSectionClick = (sectionName: string) => {
    if (selectedSection === sectionName) {
      // If clicking the same section, go back to main view
      setSelectedSection(null);
    } else {
      // If section has subsections, show them
      setIsAnimating(true);
      setTimeout(() => {
        setSelectedSection(sectionName);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleBackClick = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setSelectedSection(null);
      setIsAnimating(false);
    }, 150);
  };

  const selectedSectionData = selectedSection 
    ? navigation.find(item => item.name === selectedSection)
    : null;

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
      <div className={cn(
        "fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-40 transform transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <a 
            href="https://monotech-xzp1.onrender.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">Mono-AI</span>
          </a>
          <button 
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ×
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 overflow-hidden relative" role="navigation">
          {/* Back Button */}
          {selectedSection && (
            <div className="mb-4">
              <button
                onClick={handleBackClick}
                className={cn(
                  "flex items-center space-x-2 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200",
                  isAnimating ? "opacity-0 transform -translate-x-4" : "opacity-100 transform translate-x-0"
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
              </button>
            </div>
          )}

          {/* Main Navigation */}
          <div className={cn(
            "transition-all duration-300 ease-in-out",
            selectedSection 
              ? "opacity-0 transform -translate-x-full absolute w-full" 
              : "opacity-100 transform translate-x-0"
          )}>
            <ul className="space-y-2">
              {navigation.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                const hasSubsections = item.subsections && item.subsections.length > 0;
                
                return (
                  <li key={item.name}>
                    {hasSubsections ? (
                      <button
                        onClick={() => handleSectionClick(item.name)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group",
                          isActive 
                            ? "text-primary bg-primary/10 dark:bg-primary/20" 
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transform rotate-180 transition-all duration-200 group-hover:translate-x-1" />
                        </div>
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group",
                          isActive 
                            ? "text-primary bg-primary/10 dark:bg-primary/20" 
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </div>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Subsection Navigation */}
          {selectedSectionData && (
            <div className={cn(
              "transition-all duration-300 ease-in-out",
              isAnimating ? "opacity-0 transform translate-x-full" : "opacity-100 transform translate-x-0"
            )}>
              {/* Section Header */}
              <div className="mb-4">
                <div className="flex items-center space-x-3 p-3 rounded-lg bg-primary/5 dark:bg-primary/10">
                  <selectedSectionData.icon className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {selectedSectionData.name}
                  </span>
                </div>
              </div>

              {/* Subsections */}
              <ul className="space-y-1">
                {selectedSectionData.subsections?.map((subsection, index) => {
                  const isActive = location === subsection.href;
                  const Icon = subsection.icon;
                  
                  return (
                    <li 
                      key={subsection.name}
                      className="animate-in slide-in-from-right-2"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <Link 
                        href={subsection.href}
                        className={cn(
                          "block p-3 rounded-lg transition-all duration-200 group hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-sm",
                          isActive 
                            ? "text-primary bg-primary/10 dark:bg-primary/20 border-l-2 border-primary shadow-sm" 
                            : "text-gray-600 dark:text-gray-300"
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="w-4 h-4" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{subsection.name}</div>
                            {subsection.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {subsection.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>
      </div>
    </>
  );
}
