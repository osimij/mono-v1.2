import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataTable } from "./DataTable";
import { FileUpload } from "./FileUpload";
import { useMode } from "@/hooks/useMode";
import { 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  BarChart3, 
  FileText,
  Trash2,
  Zap,
  Info,
  Download,
  Save,
  Sparkles,
  Brain,
  Database
} from "lucide-react";
import type { Dataset } from "@/types";

interface PreprocessingOptions {
  removeEmptyRows: boolean;
  removeEmptyColumns: boolean;
  handleMissingValues: 'remove' | 'fill' | 'keep';
  fillStrategy: 'mean' | 'median' | 'mode' | 'zero' | 'forward' | 'backward';
  removeDuplicates: boolean;
  // Pro mode options
  normalizeText: boolean;
  detectOutliers: boolean;
  removeOutliers: boolean;
  convertTypes: boolean;
  trimWhitespace: boolean;
  standardizeFormats: boolean;
  encodeCategorical: boolean;
  encodingStrategy: 'auto' | 'onehot' | 'label' | 'target' | 'frequency';
  handleHighCardinality: boolean;
  cardinalityThreshold: number;
  scaleNumerical: boolean;
  scalingMethod: 'standard' | 'minmax' | 'robust' | 'none';
  handleTextData: boolean;
  textProcessingLevel: 'basic' | 'advanced' | 'nlp';
  extractDateFeatures: boolean;
  dateFeatureLevel: 'basic' | 'detailed' | 'engineering';
  handleSkewness: boolean;
  skewnessThreshold: number;
  transformMethod: 'log' | 'sqrt' | 'boxcox' | 'yeo-johnson' | 'auto';
  binNumerical: boolean;
  binningStrategy: 'equal-width' | 'equal-frequency' | 'kmeans' | 'quantile';
  numberOfBins: number;
  featureSelection: boolean;
  selectionMethod: 'correlation' | 'variance' | 'mutual-info' | 'chi2' | 'auto';
  correlationThreshold: number;
  varianceThreshold: number;
}

interface DataIssue {
  type: 'missing_values' | 'duplicates' | 'outliers' | 'inconsistent_types' | 'invalid_formats' | 'empty_columns';
  column?: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface DataStatistics {
  totalColumns: number;
  numericalColumns: number;
  categoricalColumns: number;
  dateColumns: number;
  missingValuePercentage: number;
  duplicateRowPercentage: number;
  dataQualityScore: number;
}

interface PreprocessingResult {
  preview: any[];
  columns: string[];
  originalRows: number;
  processedRows: number;
  removedRows: number;
  issues: DataIssue[];
  suggestions: string[];
  statistics: DataStatistics;
}

interface DataPreprocessorProps {
  onComplete: (data: any, options: PreprocessingOptions) => void;
  onBack?: () => void;
  datasets?: Dataset[];
  initialDataset?: Dataset;
}

export function DataPreprocessor({ onComplete, onBack, datasets = [], initialDataset }: DataPreprocessorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(initialDataset || null);
  const { isProMode, toggleMode } = useMode();
  const [options, setOptions] = useState<PreprocessingOptions>({
    removeEmptyRows: true,
    removeEmptyColumns: true,
    handleMissingValues: 'keep',
    fillStrategy: 'mean',
    removeDuplicates: true,
    normalizeText: true,
    detectOutliers: true,
    removeOutliers: false,
    convertTypes: true,
    trimWhitespace: true,
    standardizeFormats: true,
    encodeCategorical: true,
    encodingStrategy: 'auto',
    handleHighCardinality: true,
    cardinalityThreshold: 50,
    scaleNumerical: false,
    scalingMethod: 'standard',
    handleTextData: true,
    textProcessingLevel: 'basic',
    extractDateFeatures: true,
    dateFeatureLevel: 'basic',
    handleSkewness: false,
    skewnessThreshold: 2.0,
    transformMethod: 'auto',
    binNumerical: false,
    binningStrategy: 'equal-width',
    numberOfBins: 5,
    featureSelection: false,
    selectionMethod: 'auto',
    correlationThreshold: 0.95,
    varianceThreshold: 0.01
  });
  const [result, setResult] = useState<PreprocessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setResult(null);
    setError(null);
  };

  const processData = async () => {
    if (!file && !selectedDataset) return;

    setIsProcessing(true);
    setError(null);

    try {
      let response;
      
      if (file) {
        // Process uploaded file
        const formData = new FormData();
        formData.append('file', file);
        
        // Add preprocessing options
        Object.entries(options).forEach(([key, value]) => {
          formData.append(key, String(value));
        });

        response = await fetch('/api/datasets/preprocess', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
          },
          body: formData
        });
      } else if (selectedDataset) {
        // Process existing dataset
        const requestBody = {
          datasetId: selectedDataset.id,
          ...options
        };

        response = await fetch('/api/datasets/preprocess-existing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('sessionId')}`,
          },
          body: JSON.stringify(requestBody)
        });
      }

      if (!response || !response.ok) {
        const errorData = await response?.json();
        throw new Error(errorData?.error || 'Failed to process data');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = () => {
    if (result && (file || selectedDataset)) {
      onComplete({ file, dataset: selectedDataset, result }, options);
    }
  };

  const downloadProcessedData = () => {
    if (!result) return;

    // Convert processed data to CSV
    const headers = result.columns;
    const rows = result.preview;
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle values that contain commas or quotes
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `processed_${file?.name || 'dataset.csv'}`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-border';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-border';
      case 'low': return 'bg-blue-100 text-blue-800 border-border';
      default: return 'bg-gray-100 text-gray-800 border-border';
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Data Preprocessing</h2>
          <p className="text-gray-600 dark:text-gray-300">Clean and prepare your data for analysis with AI-powered preprocessing</p>
        </div>
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left Column - Dataset Selection and Preview */}
        <div className="lg:col-span-6 space-y-6">
          {/* Dataset Selection - Slim Line */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="w-4 h-4" />
                Select Dataset
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {datasets.length > 0 ? (
                  datasets.map((dataset: Dataset) => (
                    <div
                      key={dataset.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDataset?.id === dataset.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => {
                        setSelectedDataset(dataset);
                        setFile(null);
                        setResult(null);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {dataset.originalName}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {dataset.rowCount.toLocaleString()} rows • {dataset.columns.length} columns
                          </p>
                        </div>
                        {selectedDataset?.id === dataset.id && (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No datasets available. Upload one first.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dataset Preview */}
          {(selectedDataset || file) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" />
                  Dataset Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <p><strong>File:</strong> {selectedDataset?.originalName || file?.name}</p>
                  <p><strong>Rows:</strong> {selectedDataset?.rowCount || 'Unknown'}</p>
                  <p><strong>Columns:</strong> {selectedDataset?.columns?.length || 'Unknown'}</p>
                </div>
                {selectedDataset?.data && selectedDataset.data.length > 0 && (
                  <div className="max-h-64 overflow-auto">
                    <DataTable 
                      data={selectedDataset.data.slice(0, 5)} 
                      columns={selectedDataset.columns}
                      pageSize={5}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

                 {/* Right Column - Preprocessing Options */}
         <div className="lg:col-span-4">
           <Card className="h-fit">
             <CardHeader className="pb-3">
               <CardTitle className="flex items-center gap-2 text-base">
                 <Settings className="w-4 h-4" />
                 Preprocessing Options
               </CardTitle>
               <div className="flex items-center gap-2 mt-1">
                 <Badge variant={isProMode ? "default" : "secondary"} className="flex items-center gap-1 text-xs">
                   {isProMode ? <Sparkles className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
                   {isProMode ? "Pro Mode" : "Light Mode"}
                 </Badge>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={toggleMode}
                   className="ml-auto text-xs"
                 >
                   Switch to {isProMode ? "Light" : "Pro"} Mode
                 </Button>
               </div>
             </CardHeader>
             <CardContent className="pt-0 space-y-3">
                             {/* Light Mode Options - Always visible */}
               <div className="space-y-2">
                 <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                   <Brain className="w-4 h-4" />
                   Essential Cleaning
                 </h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="removeEmptyRows">Remove Empty Rows</Label>
                  <Switch
                    id="removeEmptyRows"
                    checked={options.removeEmptyRows}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, removeEmptyRows: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="removeEmptyColumns">Remove Empty Columns</Label>
                  <Switch
                    id="removeEmptyColumns"
                    checked={options.removeEmptyColumns}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, removeEmptyColumns: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Handle Missing Values</Label>
                  <Select
                    value={options.handleMissingValues}
                    onValueChange={(value: any) => 
                      setOptions(prev => ({ ...prev, handleMissingValues: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keep">Keep as is</SelectItem>
                      <SelectItem value="fill">Fill missing values</SelectItem>
                      <SelectItem value="remove">Remove rows with missing values</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {options.handleMissingValues === 'fill' && (
                  <div className="space-y-2">
                    <Label>Fill Strategy</Label>
                    <Select
                      value={options.fillStrategy}
                      onValueChange={(value: any) => 
                        setOptions(prev => ({ ...prev, fillStrategy: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mean">Mean (for numbers)</SelectItem>
                        <SelectItem value="median">Median (for numbers)</SelectItem>
                        <SelectItem value="mode">Most common value</SelectItem>
                        <SelectItem value="zero">Zero/Empty</SelectItem>
                        <SelectItem value="forward">Forward fill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="removeDuplicates">Remove Duplicates</Label>
                  <Switch
                    id="removeDuplicates"
                    checked={options.removeDuplicates}
                    onCheckedChange={(checked) => 
                      setOptions(prev => ({ ...prev, removeDuplicates: checked }))
                    }
                  />
                </div>
              </div>

                             {/* Pro Mode Options - Only visible in Pro mode */}
               {isProMode && (
                 <div className="border-t pt-3 space-y-2">
                   <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                     <Sparkles className="w-4 h-4" />
                     Advanced Processing
                   </h4>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="normalizeText">Normalize Text</Label>
                    <Switch
                      id="normalizeText"
                      checked={options.normalizeText}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, normalizeText: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="convertTypes">Auto-convert Types</Label>
                    <Switch
                      id="convertTypes"
                      checked={options.convertTypes}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, convertTypes: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="detectOutliers">Detect Outliers</Label>
                    <Switch
                      id="detectOutliers"
                      checked={options.detectOutliers}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, detectOutliers: checked }))
                      }
                    />
                  </div>

                  {options.detectOutliers && (
                    <div className="flex items-center justify-between">
                      <Label htmlFor="removeOutliers">Remove Outliers</Label>
                      <Switch
                        id="removeOutliers"
                        checked={options.removeOutliers}
                        onCheckedChange={(checked) => 
                          setOptions(prev => ({ ...prev, removeOutliers: checked }))
                        }
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="encodeCategorical">Smart Categorical Encoding</Label>
                    <Switch
                      id="encodeCategorical"
                      checked={options.encodeCategorical}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, encodeCategorical: checked }))
                      }
                    />
                  </div>

                  {options.encodeCategorical && (
                    <div className="space-y-2">
                      <Label>Encoding Strategy</Label>
                      <Select
                        value={options.encodingStrategy}
                        onValueChange={(value: any) => 
                          setOptions(prev => ({ ...prev, encodingStrategy: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Smart Auto-Detection</SelectItem>
                          <SelectItem value="onehot">One-Hot Encoding</SelectItem>
                          <SelectItem value="label">Label Encoding</SelectItem>
                          <SelectItem value="frequency">Frequency Encoding</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="scaleNumerical">Scale Numerical Features</Label>
                    <Switch
                      id="scaleNumerical"
                      checked={options.scaleNumerical}
                      onCheckedChange={(checked) => 
                        setOptions(prev => ({ ...prev, scaleNumerical: checked }))
                      }
                    />
                  </div>

                  {options.scaleNumerical && (
                    <div className="space-y-2">
                      <Label>Scaling Method</Label>
                      <Select
                        value={options.scalingMethod}
                        onValueChange={(value: any) => 
                          setOptions(prev => ({ ...prev, scalingMethod: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard (Z-score)</SelectItem>
                          <SelectItem value="minmax">Min-Max (0-1)</SelectItem>
                          <SelectItem value="robust">Robust (Median/IQR)</SelectItem>
                          <SelectItem value="none">No Scaling</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

                             <Button 
                 onClick={processData} 
                 disabled={(!file && !selectedDataset) || isProcessing}
                 className="w-full bg-orange-600 hover:bg-orange-700 mt-3"
               >
                 <Zap className="w-4 h-4 mr-2" />
                 {isProcessing ? 'Processing...' : 'Process Data'}
               </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results Section - Full Width */}
      <div className="space-y-6">
        {error && (
          <Alert className="border-border bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="statistics">Statistics</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Data Preview
                  </CardTitle>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Rows: {result.originalRows} → {result.processedRows}</span>
                    <span>Columns: {result.columns.length}</span>
                    {result.removedRows > 0 && (
                      <span className="text-orange-600">Removed: {result.removedRows} rows</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable 
                    data={result.preview} 
                    columns={result.columns}
                    pageSize={10}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Data Quality Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.issues.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                      <p>No data quality issues detected!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {result.issues.map((issue, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                          <Badge className={getSeverityColor(issue.severity)}>
                            {issue.severity}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium">{issue.description}</p>
                            {issue.column && (
                              <p className="text-sm text-gray-500">Column: {issue.column}</p>
                            )}
                          </div>
                          <span className="text-sm font-medium">{issue.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Data Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {result.statistics.totalColumns}
                      </div>
                      <div className="text-sm text-gray-500">Total Columns</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.statistics.numericalColumns}
                      </div>
                      <div className="text-sm text-gray-500">Numerical</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {result.statistics.categoricalColumns}
                      </div>
                      <div className="text-sm text-gray-500">Categorical</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {result.statistics.dateColumns}
                      </div>
                      <div className="text-sm text-gray-500">Date</div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Data Quality Score</span>
                      <span className={`text-2xl font-bold ${getQualityScoreColor(result.statistics.dataQualityScore)}`}>
                        {result.statistics.dataQualityScore.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Missing Values</span>
                      <span>{result.statistics.missingValuePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duplicate Rows</span>
                      <span>{result.statistics.duplicateRowPercentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suggestions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Processing Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.suggestions.length === 0 ? (
                    <p className="text-gray-500">No processing steps were applied.</p>
                  ) : (
                    <div className="space-y-2">
                      {result.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-green-50 border border-border rounded">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-800">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {result && (
          <div className="flex gap-3">
            <Button 
              onClick={handleComplete}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save to Account
            </Button>
            <Button 
              onClick={downloadProcessedData}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setResult(null)}
              className="px-3"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
