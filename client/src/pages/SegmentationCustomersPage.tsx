import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Target, PieChart, BarChart3, Play, Download, Filter, Database, Settings, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Dataset } from "@/types";

interface DataSegment {
  name: string;
  count: number;
  color: string;
  description: string;
  avgValues: { [key: string]: number };
  minValues: { [key: string]: number };
  maxValues: { [key: string]: number };
}

interface SegmentData {
  data: any[];
  count: number;
  avgValues: { [key: string]: number };
  minValues: { [key: string]: number };
  maxValues: { [key: string]: number };
}

interface SegmentationConfig {
  method: 'kmeans' | 'hierarchical' | 'quantile' | 'custom_rules';
  numSegments: number;
  selectedColumns: string[];
  customRules?: string[];
}

export function SegmentationCustomersPage() {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [segments, setSegments] = useState<DataSegment[]>([]);
  const [config, setConfig] = useState<SegmentationConfig>({
    method: 'kmeans',
    numSegments: 4,
    selectedColumns: [],
    customRules: []
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [customRule, setCustomRule] = useState("");

  // Fetch datasets
  const { data: datasets = [], isLoading: datasetsLoading } = useQuery({
    queryKey: ["/api/datasets"],
    queryFn: api.datasets.getAll,
    staleTime: 0,
    refetchOnMount: true
  });

  // Generate segments based on data
  const generateSegments = (data: any[], method: string, numSegments: number, columns: string[]) => {
    if (!data || data.length === 0) return [];

    const numericColumns = columns.filter(col => {
      const sampleValues = data.slice(0, 100).map(row => row[col]);
      return sampleValues.some(val => !isNaN(parseFloat(val)));
    });

    if (numericColumns.length === 0) {
      return [{
        name: "All Data",
        count: data.length,
        color: "bg-blue-500",
        description: "No numeric columns found for segmentation",
        avgValues: {},
        minValues: {},
        maxValues: {}
      }];
    }

    const segmentNames = [
      "Group A", "Group B", "Group C", "Group D", "Group E", 
      "Group F", "Group G", "Group H", "Group I", "Group J"
    ];

    const colors = [
      "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-red-500", 
      "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-orange-500"
    ];

    const descriptions = [
      "High value items", "Medium-high value items", "Medium value items", 
      "Medium-low value items", "Low value items", "Very low value items"
    ];

    let segmentData: any[] = [];

    switch (method) {
      case 'kmeans':
        segmentData = performKMeansSegmentation(data, numericColumns, numSegments);
        break;
      case 'hierarchical':
        segmentData = performHierarchicalSegmentation(data, numericColumns, numSegments);
        break;
      case 'quantile':
        segmentData = performQuantileSegmentation(data, numericColumns, numSegments);
        break;
      case 'custom_rules':
        segmentData = performCustomRuleSegmentation(data, config.customRules || []);
        break;
      default:
        segmentData = performKMeansSegmentation(data, numericColumns, numSegments);
    }

    return segmentData.map((segment, index) => ({
      name: segmentNames[index] || `Group ${index + 1}`,
      count: segment.count,
      color: colors[index % colors.length],
      description: descriptions[index % descriptions.length] || "Data segment",
      avgValues: segment.avgValues,
      minValues: segment.minValues,
      maxValues: segment.maxValues
    }));
  };

  // K-means clustering
  const performKMeansSegmentation = (data: any[], columns: string[], k: number): SegmentData[] => {
    const numericData = data.map(row => 
      columns.map(col => {
        const val = parseFloat(row[col]);
        return isNaN(val) ? 0 : val;
      })
    );

    // Initialize centroids
    const centroids = Array.from({ length: k }, () => 
      columns.map(() => Math.random() * 100)
    );

    const clusters = new Array(data.length).fill(0);
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 100) {
      changed = false;
      iterations++;

      // Assign points to nearest centroid
      numericData.forEach((point, i) => {
        let minDist = Infinity;
        let bestCluster = 0;

        centroids.forEach((centroid, j) => {
          const dist = point.reduce((sum, val, k) => sum + Math.pow(val - centroid[k], 2), 0);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        });

        if (clusters[i] !== bestCluster) {
          clusters[i] = bestCluster;
          changed = true;
        }
      });

      // Update centroids
      for (let i = 0; i < k; i++) {
        const clusterPoints = numericData.filter((_, j) => clusters[j] === i);
        if (clusterPoints.length > 0) {
          centroids[i] = columns.map((_, colIndex) => 
            clusterPoints.reduce((sum, point) => sum + point[colIndex], 0) / clusterPoints.length
          );
        }
      }
    }

    // Group data by clusters
    const segments: SegmentData[] = Array.from({ length: k }, () => ({ 
      data: [] as any[], 
      count: 0, 
      avgValues: {} as { [key: string]: number }, 
      minValues: {} as { [key: string]: number }, 
      maxValues: {} as { [key: string]: number } 
    }));
    
    data.forEach((row, index) => {
      const clusterIndex = clusters[index];
      segments[clusterIndex].data.push(row);
      segments[clusterIndex].count++;
    });

    // Calculate statistics for each segment
    segments.forEach(segment => {
      if (segment.data.length > 0) {
        columns.forEach(col => {
          const values = segment.data.map(row => parseFloat(row[col])).filter(val => !isNaN(val));
          if (values.length > 0) {
            segment.avgValues[col] = values.reduce((sum, val) => sum + val, 0) / values.length;
            segment.minValues[col] = Math.min(...values);
            segment.maxValues[col] = Math.max(...values);
          }
        });
      }
    });

    return segments;
  };

  // Hierarchical clustering (simplified)
  const performHierarchicalSegmentation = (data: any[], columns: string[], k: number): SegmentData[] => {
    // For simplicity, use k-means as a proxy
    return performKMeansSegmentation(data, columns, k);
  };

  // Quantile-based segmentation
  const performQuantileSegmentation = (data: any[], columns: string[], k: number): SegmentData[] => {
    const segments: SegmentData[] = Array.from({ length: k }, () => ({ 
      data: [] as any[], 
      count: 0, 
      avgValues: {} as { [key: string]: number }, 
      minValues: {} as { [key: string]: number }, 
      maxValues: {} as { [key: string]: number } 
    }));
    
    // Use the first numeric column for quantile calculation
    const primaryColumn = columns[0];
    const values = data.map(row => parseFloat(row[primaryColumn])).filter(val => !isNaN(val)).sort((a, b) => a - b);
    
    const segmentSize = Math.ceil(values.length / k);
    
    data.forEach(row => {
      const value = parseFloat(row[primaryColumn]);
      if (!isNaN(value)) {
        const segmentIndex = Math.min(Math.floor(values.indexOf(value) / segmentSize), k - 1);
        segments[segmentIndex].data.push(row);
        segments[segmentIndex].count++;
      }
    });

    // Calculate statistics
    segments.forEach(segment => {
      if (segment.data.length > 0) {
        columns.forEach(col => {
          const values = segment.data.map(row => parseFloat(row[col])).filter(val => !isNaN(val));
          if (values.length > 0) {
            segment.avgValues[col] = values.reduce((sum, val) => sum + val, 0) / values.length;
            segment.minValues[col] = Math.min(...values);
            segment.maxValues[col] = Math.max(...values);
          }
        });
      }
    });

    return segments;
  };

  // Custom rule-based segmentation
  const performCustomRuleSegmentation = (data: any[], rules: string[]) => {
    if (rules.length === 0) {
      return [{
        data,
        count: data.length,
        avgValues: {},
        minValues: {},
        maxValues: {}
      }];
    }

    const segments = rules.map(() => ({ data: [], count: 0, avgValues: {}, minValues: {}, maxValues: {} }));
    const defaultSegment = { data: [], count: 0, avgValues: {}, minValues: {}, maxValues: {} };

    data.forEach(row => {
      let assigned = false;
      
      for (let i = 0; i < rules.length; i++) {
        try {
          // Simple rule evaluation - replace column names with values
          let rule = rules[i];
          Object.keys(row).forEach(col => {
            const value = typeof row[col] === 'string' ? `'${row[col]}'` : row[col];
            rule = rule.replace(new RegExp(`\\b${col}\\b`, 'g'), value);
          });
          
          if (eval(rule)) {
            segments[i].data.push(row);
            segments[i].count++;
            assigned = true;
            break;
          }
        } catch {
          // Invalid rule, skip
        }
      }
      
      if (!assigned) {
        defaultSegment.data.push(row);
        defaultSegment.count++;
      }
    });

    const allSegments = [...segments];
    if (defaultSegment.count > 0) {
      allSegments.push(defaultSegment);
    }

    // Calculate statistics
    allSegments.forEach(segment => {
      if (segment.data.length > 0) {
        const columns = Object.keys(segment.data[0] || {});
        columns.forEach(col => {
          const values = segment.data.map(row => parseFloat(row[col])).filter(val => !isNaN(val));
          if (values.length > 0) {
            segment.avgValues[col] = values.reduce((sum, val) => sum + val, 0) / values.length;
            segment.minValues[col] = Math.min(...values);
            segment.maxValues[col] = Math.max(...values);
          }
        });
      }
    });

    return allSegments;
  };

  const handleAnalyze = async () => {
    if (!selectedDataset || config.selectedColumns.length === 0) {
      return;
    }

    setIsAnalyzing(true);
    
    try {
      // Fetch the full dataset data
      const fullDataset = await api.datasets.getById(selectedDataset.id);
      
      const newSegments = generateSegments(
        fullDataset.data, 
        config.method, 
        config.numSegments, 
        config.selectedColumns
      );
      
      setSegments(newSegments);
      setAnalysisComplete(true);
    } catch (error) {
      console.error('Error analyzing dataset:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = () => {
    const exportData = {
      dataset: selectedDataset?.originalName,
      config,
      segments,
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data-segments.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const addCustomRule = () => {
    if (customRule.trim()) {
      setConfig(prev => ({
        ...prev,
        customRules: [...(prev.customRules || []), customRule.trim()]
      }));
      setCustomRule("");
    }
  };

  const removeCustomRule = (index: number) => {
    setConfig(prev => ({
      ...prev,
      customRules: prev.customRules?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Users className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Segmentation</h1>
          <p className="text-gray-600 dark:text-gray-300">Segment your data for better analysis and insights</p>
        </div>
      </div>

      {/* Dataset Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>Select Dataset</span>
          </CardTitle>
          <CardDescription>Choose a dataset to segment</CardDescription>
        </CardHeader>
        <CardContent>
          {datasetsLoading ? (
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading datasets...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((dataset) => (
                <Card 
                  key={dataset.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedDataset?.id === dataset.id ? "ring-2 ring-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setSelectedDataset(dataset)}
                >
                  <CardContent className="p-4">
                                          <h3 className="font-semibold text-gray-900 dark:text-white">{dataset.originalName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {dataset.rowCount} rows • {dataset.columns.length} columns
                      </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {dataset.columns.slice(0, 3).map(col => (
                        <Badge key={col} variant="outline" className="text-xs">
                          {col}
                        </Badge>
                      ))}
                      {dataset.columns.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{dataset.columns.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDataset && (
        <>
          {/* Segmentation Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              config.method === "kmeans" ? "ring-2 ring-primary bg-primary/5" : ""
            }`} onClick={() => setConfig(prev => ({ ...prev, method: 'kmeans' }))}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  <span>K-Means</span>
                </CardTitle>
                <CardDescription>Clustering by similarity</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Groups similar data points together using distance-based clustering.
                </p>
              </CardContent>
            </Card>

            <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              config.method === "hierarchical" ? "ring-2 ring-primary bg-primary/5" : ""
            }`} onClick={() => setConfig(prev => ({ ...prev, method: 'hierarchical' }))}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="w-5 h-5 text-green-500" />
                  <span>Hierarchical</span>
                </CardTitle>
                <CardDescription>Tree-based grouping</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Creates hierarchical groups based on data relationships.
                </p>
              </CardContent>
            </Card>

            <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              config.method === "quantile" ? "ring-2 ring-primary bg-primary/5" : ""
            }`} onClick={() => setConfig(prev => ({ ...prev, method: 'quantile' }))}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  <span>Quantile</span>
                </CardTitle>
                <CardDescription>Value-based ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Divides data into equal-sized groups based on value ranges.
                </p>
              </CardContent>
            </Card>

            <Card className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              config.method === "custom_rules" ? "ring-2 ring-primary bg-primary/5" : ""
            }`} onClick={() => setConfig(prev => ({ ...prev, method: 'custom_rules' }))}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-orange-500" />
                  <span>Custom Rules</span>
                </CardTitle>
                <CardDescription>User-defined conditions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create segments using your own business rules and conditions.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-primary" />
                <span>Configuration</span>
              </CardTitle>
              <CardDescription>Set up segmentation parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Number of Segments</Label>
                  <Select 
                    value={config.numSegments.toString()} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, numSegments: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2, 3, 4, 5, 6, 7, 8].map(num => (
                        <SelectItem key={num} value={num.toString()}>{num} Segments</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-medium">Columns to Analyze</Label>
                  <Select 
                    value={config.selectedColumns[0] || ""} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, selectedColumns: [value] }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select columns" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedDataset.columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-medium">Minimum Segment Size</Label>
                  <Slider 
                    defaultValue={[5]} 
                    max={20} 
                    step={1} 
                    className="w-full"
                    onValueChange={(value) => console.log(value)}
                  />
                  <span className="text-sm text-gray-500">5%</span>
                </div>
              </div>

              {/* Custom Rules Section */}
              {config.method === 'custom_rules' && (
                <div className="mt-6 space-y-4">
                  <Label className="text-sm font-medium">Custom Rules</Label>
                  <div className="space-y-2">
                    {config.customRules?.map((rule, index) => (
                      <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-sm flex-1">{rule}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeCustomRule(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      value={customRule}
                      onChange={(e) => setCustomRule(e.target.value)}
                      placeholder="Enter rule (e.g., quantity > 100)"
                      className="flex-1"
                    />
                    <Button size="sm" onClick={addCustomRule}>Add Rule</Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Use column names and comparison operators (e.g., &quot;quantity &gt; 100 AND price &lt; 50&quot;)
                  </p>
                </div>
              )}

              <div className="flex space-x-4 mt-6">
                <Button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || config.selectedColumns.length === 0}
                  className="flex items-center space-x-2"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>{isAnalyzing ? "Analyzing..." : "Run Analysis"}</span>
                </Button>
                
                {analysisComplete && (
                  <Button 
                    variant="outline"
                    onClick={handleExport}
                    className="flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Results</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Segmentation Results */}
          {analysisComplete && segments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Segmentation Results</CardTitle>
                <CardDescription>View your data segments and their characteristics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {segments.map((segment) => (
                    <div key={segment.name} className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className={`w-4 h-4 ${segment.color} rounded-full mx-auto mb-2`}></div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{segment.name}</h3>
                      <p className="text-2xl font-bold text-primary">{segment.count.toLocaleString()}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">items</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{segment.description}</p>
                    </div>
                  ))}
                </div>

                {/* Detailed Segment Information */}
                <div className="space-y-4">
                  {segments.map((segment) => (
                    <Card key={segment.name} className="border-l-4 border-l-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 ${segment.color} rounded-full`}></div>
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">{segment.name}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{segment.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">{segment.count.toLocaleString()}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">items</p>
                          </div>
                        </div>
                        
                        {Object.keys(segment.avgValues).length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <h5 className="font-medium text-gray-900 dark:text-white mb-3">Column Statistics</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {Object.keys(segment.avgValues).map(column => (
                                <div key={column} className="space-y-2">
                                  <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300">{column}</h6>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                      <p className="text-gray-500">Min</p>
                                      <p className="font-medium">{segment.minValues[column]?.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Avg</p>
                                      <p className="font-medium">{segment.avgValues[column]?.toFixed(2)}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Max</p>
                                      <p className="font-medium">{segment.maxValues[column]?.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedDataset && (
        <Alert>
          <AlertDescription>
            Please select a dataset to begin segmentation analysis.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
