import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  Lightbulb, 
  Target, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  Info,
  Sparkles 
} from "lucide-react";
import type { Dataset } from "@/types";

interface ModelSuggestion {
  type: 'classification' | 'regression' | 'time_series';
  algorithm: string;
  targetColumn: string;
  features: string[];
  confidence: number;
  explanation: string;
  reasoning: string;
}

interface SmartModelBuilderProps {
  datasets: Dataset[];
  onModelCreate: (modelData: any) => void;
  onBack?: () => void;
}

export function SmartModelBuilder({ datasets, onModelCreate, onBack }: SmartModelBuilderProps) {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [prompt, setPrompt] = useState("");
  const [suggestion, setSuggestion] = useState<ModelSuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const examplePrompts = [
    "I want to predict customer satisfaction ratings based on their purchase history",
    "Help me forecast monthly sales revenue for the next quarter",
    "I need to classify customers into high-value and low-value segments",
    "Predict which products will be most popular next month",
    "Determine if a customer will make a repeat purchase",
    "Estimate delivery time based on location and order details"
  ];

  const analyzePrompt = async () => {
    if (!selectedDataset || !prompt.trim()) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/smart-model-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          datasetId: selectedDataset.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze prompt');
      }

      const result = await response.json();
      setSuggestion(result);
    } catch (error) {
      console.error('Error analyzing prompt:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createModel = async () => {
    if (!suggestion || !selectedDataset) return;

    setIsCreating(true);
    try {
      const modelData = {
        datasetId: selectedDataset.id,
        name: generateModelName(prompt),
        type: suggestion.type,
        algorithm: suggestion.algorithm,
        targetColumn: suggestion.targetColumn,
        prompt: prompt,
        features: suggestion.features
      };

      await onModelCreate(modelData);
    } catch (error) {
      console.error('Error creating model:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const generateModelName = (userPrompt: string): string => {
    const words = userPrompt.toLowerCase().split(' ');
    const keyWords = words.filter(word => 
      ['predict', 'forecast', 'classify', 'estimate', 'determine'].includes(word) ||
      ['sales', 'customer', 'revenue', 'rating', 'price', 'demand'].includes(word)
    );
    
    const name = keyWords.slice(0, 3).join(' ') || 'AI Model';
    return name.charAt(0).toUpperCase() + name.slice(1) + ' Model';
  };

  const getModelTypeColor = (type: string) => {
    switch (type) {
      case 'classification': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'regression': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'time_series': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getAlgorithmDisplayName = (algorithm: string) => {
    const names: { [key: string]: string } = {
      'random_forest': 'Random Forest',
      'linear_regression': 'Linear Regression',
      'logistic_regression': 'Logistic Regression',
      'gradient_boosting': 'Gradient Boosting',
      'decision_tree': 'Decision Tree',
      'neural_network': 'Neural Network'
    };
    return names[algorithm] || algorithm;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Brain className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Smart Model Builder
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Just tell us what you want to predict or analyze in plain English. Our AI will automatically choose the best model type, algorithm, and features for your needs.
        </p>
      </div>

      {/* Step 1: Dataset Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Step 1: Choose Your Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Select Dataset</Label>
            <Select
              value={selectedDataset?.id.toString() || ''}
              onValueChange={(value) => {
                const dataset = datasets.find(d => d.id === parseInt(value));
                setSelectedDataset(dataset || null);
                setSuggestion(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a dataset to build your model with" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map(dataset => (
                  <SelectItem key={dataset.id} value={dataset.id.toString()}>
                    {dataset.originalName} ({dataset.rowCount} rows, {dataset.columns.length} columns)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Describe What You Want */}
      {selectedDataset && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Step 2: Describe What You Want to Achieve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tell us what you want to predict or analyze</Label>
              <Textarea
                placeholder="Example: I want to predict customer satisfaction ratings based on their purchase history and demographics..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] resize-none"
              />
            </div>

            {/* Example Prompts */}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600 dark:text-gray-400">
                Need inspiration? Try these examples:
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {examplePrompts.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setPrompt(example)}
                    className="text-left p-3 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>

            <Button 
              onClick={analyzePrompt}
              disabled={!prompt.trim() || isAnalyzing}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isAnalyzing ? 'Analyzing Your Request...' : 'Analyze & Get AI Suggestions'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: AI Suggestion */}
      {suggestion && (
        <Card className="border-border bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <CheckCircle className="w-5 h-5" />
              AI Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Model Type & Algorithm */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Recommended Model Type</Label>
                <Badge className={getModelTypeColor(suggestion.type)}>
                  {suggestion.type.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Best Algorithm</Label>
                <Badge variant="outline">
                  {getAlgorithmDisplayName(suggestion.algorithm)}
                </Badge>
              </div>
            </div>

            {/* Target & Features */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Target Column (What to Predict)</Label>
                <div className="mt-1">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    {suggestion.targetColumn}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Selected Features ({suggestion.features.length})</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestion.features.map(feature => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Explanation */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Why this works:</strong> {suggestion.explanation}</p>
                  <p><strong>How it works:</strong> {suggestion.reasoning}</p>
                  <p><strong>Confidence:</strong> {suggestion.confidence}% match for your request</p>
                </div>
              </AlertDescription>
            </Alert>

            {/* Create Model Button */}
            <div className="flex gap-3 pt-2">
              <Button 
                onClick={createModel}
                disabled={isCreating}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                {isCreating ? 'Training Model...' : 'Create This Model'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSuggestion(null)}
                disabled={isCreating}
              >
                Try Different Approach
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Button */}
      {onBack && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onBack}>
            Back to Model List
          </Button>
        </div>
      )}
    </div>
  );
}
