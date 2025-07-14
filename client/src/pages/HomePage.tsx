import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Upload, BarChart3, Bot, Rocket } from "lucide-react";
import { Link, useLocation } from "wouter";
import { OnboardingTour } from "@/components/OnboardingTour";

const steps = [
  {
    icon: Upload,
    title: "Upload Data",
    description: "Drop your Excel or CSV files and let AI handle the rest",
    color: "text-primary-600 dark:text-primary-400"
  },
  {
    icon: BarChart3,
    title: "Instant Insights",
    description: "Get automated analysis and beautiful visualizations",
    color: "text-emerald-600 dark:text-emerald-400"
  },
  {
    icon: Bot,
    title: "AI Models",
    description: "Create predictive models with one-click training",
    color: "text-violet-600 dark:text-violet-400"
  },
  {
    icon: Rocket,
    title: "Deploy & Share",
    description: "Export models and share insights with your team",
    color: "text-orange-600 dark:text-orange-400"
  }
];

export function HomePage() {
  const [, setLocation] = useLocation();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('mono-ai-onboarding-seen');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    localStorage.setItem('mono-ai-onboarding-seen', 'true');
  };

  const handleOnboardingNavigate = (path: string) => {
    setLocation(path);
  };

  const startOnboarding = () => {
    setShowOnboarding(true);
  };

  return (
    <>
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onNavigate={handleOnboardingNavigate}
      />
      
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-2xl mb-4">
                <Brain className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to Mono-AI
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Transform your business data into actionable insights with AI. No coding required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/data">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg">
                  <Brain className="w-5 h-5 mr-2" />
                  Explore Demo Data
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="px-8 py-3 text-lg"
                onClick={startOnboarding}
              >
                <Bot className="w-5 h-5 mr-2" />
                Take Tour
              </Button>
            </div>
            
            <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                <strong>Ready to explore:</strong> E-commerce customer dataset with 50 records • 2 trained ML models • AI chat history
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                      index === 0 ? 'bg-primary/10' :
                      index === 1 ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                      index === 2 ? 'bg-violet-100 dark:bg-violet-900/30' :
                      'bg-orange-100 dark:bg-orange-900/30'
                    }`}>
                      <Icon className={`w-6 h-6 ${step.color}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Upload className="w-8 h-8 text-primary mr-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Sample Dataset</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  E-commerce customer data with 50 records including demographics, purchase history, and engagement metrics.
                </p>
                <Link href="/data">
                  <Button variant="outline" size="sm" className="w-full">
                    View Data →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <BarChart3 className="w-8 h-8 text-emerald-600 mr-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Pre-built Models</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Customer churn prediction (94.2% accuracy) and spending score regression models ready to explore.
                </p>
                <Link href="/modeling">
                  <Button variant="outline" size="sm" className="w-full">
                    View Models →
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Bot className="w-8 h-8 text-violet-600 mr-3" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Get intelligent insights and recommendations from your data with conversational AI.
                </p>
                <Link href="/assistant">
                  <Button variant="outline" size="sm" className="w-full">
                    Chat with AI →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}