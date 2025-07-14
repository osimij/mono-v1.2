import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft, Upload, BarChart3, Bot, Target, MessageSquare } from "lucide-react";

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
}

interface TourStep {
  id: number;
  title: string;
  description: string;
  icon: any;
  target?: string; // CSS selector for element to highlight
  path?: string;   // Path to navigate to
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    id: 1,
    title: "Welcome to Mono-AI",
    description: "Your no-code AI analytics platform. Let's take a quick tour to show you where everything is located.",
    icon: Bot,
    position: 'bottom'
  },
  {
    id: 2,
    title: "Navigation Menu",
    description: "Use this menu to navigate between different sections. Each tab takes you to a specific feature.",
    icon: Target,
    target: 'nav[role="navigation"], .navigation-menu, [data-nav]',
    position: 'bottom'
  },
  {
    id: 3,
    title: "Data Factory",
    description: "This is where you upload your CSV or Excel files. Click here to get started with your data.",
    icon: Upload,
    target: 'a[href="/data"], [data-nav="data"]',
    path: "/data",
    position: 'bottom'
  },
  {
    id: 4,
    title: "Upload Your Files",
    description: "Drag and drop your files here or click to browse. We'll automatically analyze your data structure.",
    icon: Upload,
    target: '.file-upload, [data-upload], input[type="file"]',
    position: 'top'
  },
  {
    id: 5,
    title: "Analysis & Charts",
    description: "Create interactive visualizations here. This is where you'll explore patterns in your data.",
    icon: BarChart3,
    target: 'a[href="/analysis"], [data-nav="analysis"]',
    path: "/analysis",
    position: 'bottom'
  },
  {
    id: 6,
    title: "Chart Creation",
    description: "Choose chart types and configure your visualizations. Everything is point-and-click.",
    icon: BarChart3,
    target: '.chart-controls, [data-chart], .chart-config',
    position: 'left'
  },
  {
    id: 7,
    title: "AI Modeling",
    description: "Build predictive models with one click. No coding required - just select your target and go.",
    icon: Bot,
    target: 'a[href="/modeling"], [data-nav="modeling"]',
    path: "/modeling",
    position: 'bottom'
  },
  {
    id: 8,
    title: "Model Training",
    description: "Configure and train your AI models here. Choose your algorithm and target column.",
    icon: Target,
    target: '.model-config, [data-model], .training-section',
    position: 'right'
  },
  {
    id: 9,
    title: "AI Assistant",
    description: "Chat with your data using natural language. Ask questions and get instant insights.",
    icon: MessageSquare,
    target: 'a[href="/assistant"], [data-nav="assistant"]',
    path: "/assistant",
    position: 'bottom'
  },
  {
    id: 10,
    title: "You're All Set!",
    description: "You now know where to find everything. Start by uploading your data or exploring with the demo dataset.",
    icon: Target,
    position: 'bottom'
  }
];

export function OnboardingTour({ isOpen, onClose, onNavigate }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = tourSteps[currentStep];

  // Highlight target element and position tooltip
  useEffect(() => {
    if (!isOpen || !step?.target) {
      setHighlightedElement(null);
      return;
    }

    const findAndHighlightElement = () => {
      const element = document.querySelector(step.target!) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        positionTooltip(element);
      }
    };

    // Wait a bit for navigation to complete
    const timer = setTimeout(findAndHighlightElement, 100);
    return () => clearTimeout(timer);
  }, [isOpen, step, currentStep]);

  // Create highlight overlay
  useEffect(() => {
    if (!isOpen) return;

    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);

    return () => {
      document.body.removeChild(overlay);
    };
  }, [isOpen]);

  // Position tooltip relative to highlighted element
  const positionTooltip = (element: HTMLElement) => {
    if (!tooltipRef.current) return;

    const rect = element.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top, left;
    
    switch (step.position) {
      case 'top':
        top = rect.top - tooltipRect.height - 10;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = rect.bottom + 10;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.left - tooltipRect.width - 10;
        break;
      case 'right':
        top = rect.top + (rect.height - tooltipRect.height) / 2;
        left = rect.right + 10;
        break;
      default:
        top = rect.bottom + 10;
        left = rect.left + (rect.width - tooltipRect.width) / 2;
    }

    // Keep tooltip within viewport
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  };

  // Create spotlight effect for highlighted element
  useEffect(() => {
    if (!highlightedElement) return;

    const rect = highlightedElement.getBoundingClientRect();
    
    // Create spotlight
    const spotlight = document.createElement('div');
    spotlight.className = 'onboarding-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      top: ${rect.top - 4}px;
      left: ${rect.left - 4}px;
      width: ${rect.width + 8}px;
      height: ${rect.height + 8}px;
      border: 3px solid #f97316;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(249, 115, 22, 0.5);
      z-index: 9999;
      pointer-events: none;
      animation: pulse 2s infinite;
    `;

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.02); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(spotlight);

    return () => {
      document.body.removeChild(spotlight);
      document.head.removeChild(style);
    };
  }, [highlightedElement]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      const nextStep = tourSteps[currentStep + 1];
      if (nextStep.path) {
        onNavigate(nextStep.path);
      }
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = tourSteps[currentStep - 1];
      if (prevStep.path) {
        onNavigate(prevStep.path);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] max-w-sm"
        style={{ 
          top: highlightedElement ? '0px' : '50%', 
          left: highlightedElement ? '0px' : '50%',
          transform: highlightedElement ? 'none' : 'translate(-50%, -50%)'
        }}
      >
        <Card className="bg-white dark:bg-gray-800 border-orange-200 dark:border-orange-800 shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <step.icon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {step.title}
                  </h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Step {currentStep + 1} of {tourSteps.length}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              {step.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                )}
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-gray-500 dark:text-gray-400"
                >
                  Skip Tour
                </Button>
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {currentStep === tourSteps.length - 1 ? (
                    'Finish'
                  ) : (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex space-x-1">
                {tourSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 flex-1 rounded-full ${
                      index <= currentStep
                        ? 'bg-orange-500'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}