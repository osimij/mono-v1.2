import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, PieChart, BarChart3, Play, Download, Filter, Database, Settings, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Dataset } from "@/types";
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";

type DatasetRow = Record<string, unknown>;

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
  data: DatasetRow[];
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

const createEmptySegment = (): SegmentData => ({
  data: [],
  count: 0,
  avgValues: {} as Record<string, number>,
  minValues: {} as Record<string, number>,
  maxValues: {} as Record<string, number>,
});

const toNumericValue = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? NaN : parsed;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  const coerced = Number(value);
  return Number.isNaN(coerced) ? NaN : coerced;
};

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
  const { data: datasets = [] as Dataset[], isLoading: datasetsLoading } = useQuery<Dataset[]>({
    queryKey: ["/api/datasets"],
    queryFn: async () => (await api.datasets.getAll()) as Dataset[],
    staleTime: 0,
    refetchOnMount: true
  });

  // Generate segments based on data
  const generateSegments = (data: DatasetRow[], method: string, numSegments: number, columns: string[]) => {
    if (!data || data.length === 0) return [];

    const numericColumns = columns.filter((col) => {
      const sampleValues = data
        .slice(0, 100)
        .map((row) => toNumericValue(row[col]));
      return sampleValues.some((val) => Number.isFinite(val));
    });

    if (numericColumns.length === 0) {
      return [{
        name: "All Data",
        count: data.length,
        color: "bg-primary",
        description: "No numeric columns found for segmentation",
        avgValues: {} as Record<string, number>,
        minValues: {} as Record<string, number>,
        maxValues: {} as Record<string, number>
      }];
    }

    const segmentNames = [
      "Group A", "Group B", "Group C", "Group D", "Group E", 
      "Group F", "Group G", "Group H", "Group I", "Group J"
    ];

    const colors = [
      "bg-primary",
      "bg-success",
      "bg-secondary",
      "bg-warning",
      "bg-accent",
      "bg-info",
      "bg-primary/70",
      "bg-success/70",
    ];

    const descriptions = [
      "High value items", "Medium-high value items", "Medium value items", 
      "Medium-low value items", "Low value items", "Very low value items"
    ];

    let segmentData: SegmentData[] = [];

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
    const numericData = data.map((row) =>
      columns.map((col) => {
        const val = toNumericValue(row[col]);
        return Number.isNaN(val) ? 0 : val;
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
    const segments: SegmentData[] = Array.from({ length: k }, () => createEmptySegment());
    
    data.forEach((row, index) => {
      const clusterIndex = clusters[index];
      segments[clusterIndex].data.push(row);
      segments[clusterIndex].count++;
    });

    // Calculate statistics for each segment
    segments.forEach(segment => {
      if (segment.data.length > 0) {
        columns.forEach(col => {
          const values = segment.data
            .map((row) => toNumericValue(row[col]))
            .filter((val): val is number => Number.isFinite(val));
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
  const performHierarchicalSegmentation = (data: DatasetRow[], columns: string[], k: number): SegmentData[] => {
    // For simplicity, use k-means as a proxy
    return performKMeansSegmentation(data, columns, k);
  };

  // Quantile-based segmentation
  const performQuantileSegmentation = (data: DatasetRow[], columns: string[], k: number): SegmentData[] => {
    const segments: SegmentData[] = Array.from({ length: k }, () => createEmptySegment());
    
    // Use the first numeric column for quantile calculation
    const primaryColumn = columns[0];
    const values = data
      .map((row) => toNumericValue(row[primaryColumn]))
      .filter((val): val is number => Number.isFinite(val))
      .sort((a, b) => a - b);
    
    const segmentSize = Math.ceil(values.length / k);
    
    data.forEach(row => {
      const value = toNumericValue(row[primaryColumn]);
      if (!Number.isNaN(value)) {
        const segmentIndex = Math.min(Math.floor(values.indexOf(value) / segmentSize), k - 1);
        segments[segmentIndex].data.push(row);
        segments[segmentIndex].count++;
      }
    });

    // Calculate statistics
    segments.forEach(segment => {
      if (segment.data.length > 0) {
        columns.forEach(col => {
          const values = segment.data
            .map((row) => toNumericValue(row[col]))
            .filter((val): val is number => Number.isFinite(val));
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
  const performCustomRuleSegmentation = (data: DatasetRow[], rules: string[]) => {
    if (rules.length === 0) {
      return [{
        data,
        count: data.length,
        avgValues: {},
        minValues: {},
        maxValues: {}
      }];
    }

    const segments = rules.map(() => createEmptySegment());
    const defaultSegment = createEmptySegment();

    data.forEach(row => {
      let assigned = false;
      
      for (let i = 0; i < rules.length; i++) {
        try {
          // Simple rule evaluation - replace column names with values
          let rule = rules[i];
          Object.keys(row).forEach((col) => {
            const rawValue = row[col];
            const replacement = typeof rawValue === 'string' ? `'${rawValue}'` : String(rawValue);
            rule = rule.replace(new RegExp(`\\b${col}\\b`, 'g'), replacement);
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
        columns.forEach((col) => {
          const values = segment.data
            .map((row) => toNumericValue(row[col]))
            .filter((val): val is number => Number.isFinite(val));
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
    <PageShell padding="lg">
      <PageHeader
        eyebrow="Segmentation"
        title="Customer segmentation"
        description="Segment your datasets to surface distinct groups and export the results."
      />

      <PageSection surface="transparent" contentClassName="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <span>Select dataset</span>
            </CardTitle>
            <CardDescription>Choose a dataset to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            {datasetsLoading ? (
              <div className="flex items-center gap-2 text-text-muted">
                <RefreshCw className="h-4 w-4 animate-spin text-text-subtle" />
                <span>Loading datasets…</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {datasets.map((dataset) => (
                  <Card
                    key={dataset.id}
                    className={`cursor-pointer transition-colors hover:bg-surface-muted ${
                      selectedDataset?.id === dataset.id
                        ? "ring-2 ring-primary bg-primary/5"
                        : "ring-1 ring-border"
                    }`}
                    onClick={() => setSelectedDataset(dataset)}
                  >
                    <CardContent className="flex flex-col gap-2 p-4">
                      <h3 className="font-semibold text-text-primary">
                        {dataset.originalName}
                      </h3>
                      <p className="text-sm text-text-muted">
                        {dataset.rowCount.toLocaleString()} rows • {dataset.columns.length} columns
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {dataset.columns.slice(0, 3).map((col) => (
                          <Badge key={col} variant="outline" className="text-xs text-text-soft">
                            {col}
                          </Badge>
                        ))}
                        {dataset.columns.length > 3 && (
                          <Badge variant="outline" className="text-xs text-text-soft">
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

        {selectedDataset ? (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card
                className={`cursor-pointer transition-colors ${
                  config.method === "kmeans"
                    ? "ring-2 ring-primary bg-primary/5"
                    : "ring-1 ring-border hover:bg-surface-muted"
                }`}
                onClick={() => setConfig((prev) => ({ ...prev, method: "kmeans" }))}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <span>K-Means</span>
                  </CardTitle>
                  <CardDescription>Clustering by similarity</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted">
                    Groups similar data points together using distance-based clustering.
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${
                  config.method === "hierarchical"
                    ? "ring-2 ring-primary bg-primary/5"
                    : "ring-1 ring-border hover:bg-surface-muted"
                }`}
                onClick={() => setConfig((prev) => ({ ...prev, method: "hierarchical" }))}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-success" />
                    <span>Hierarchical</span>
                  </CardTitle>
                  <CardDescription>Tree-based grouping</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted">
                    Creates hierarchical groups based on data relationships.
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${
                  config.method === "quantile"
                    ? "ring-2 ring-primary bg-primary/5"
                    : "ring-1 ring-border hover:bg-surface-muted"
                }`}
                onClick={() => setConfig((prev) => ({ ...prev, method: "quantile" }))}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-accent" />
                    <span>Quantile</span>
                  </CardTitle>
                  <CardDescription>Value-based ranges</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted">
                    Divides data into equal-sized groups based on value ranges.
                  </p>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${
                  config.method === "custom_rules"
                    ? "ring-2 ring-primary bg-primary/5"
                    : "ring-1 ring-border hover:bg-surface-muted"
                }`}
                onClick={() => setConfig((prev) => ({ ...prev, method: "custom_rules" }))}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-warning" />
                    <span>Custom rules</span>
                  </CardTitle>
                  <CardDescription>User-defined conditions</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted">
                    Create segments using your own business rules and conditions.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  <span>Configuration</span>
                </CardTitle>
                <CardDescription>Set up segmentation parameters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-text-soft">Number of segments</Label>
                    <Select
                      value={config.numSegments.toString()}
                      onValueChange={(value) =>
                        setConfig((prev) => ({ ...prev, numSegments: parseInt(value, 10) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} segments
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-text-soft">Columns to analyze</Label>
                    <Select
                      value={config.selectedColumns[0] || ""}
                      onValueChange={(value) =>
                        setConfig((prev) => ({ ...prev, selectedColumns: [value] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select columns" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDataset.columns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-text-soft">Minimum segment size</Label>
                    <Slider defaultValue={[5]} max={20} step={1} className="w-full" />
                    <span className="text-sm text-text-subtle">5%</span>
                  </div>
                </div>

                {config.method === "custom_rules" && (
                  <div className="mt-6 space-y-4">
                    <Label className="text-sm font-medium text-text-soft">Custom rules</Label>
                    <div className="space-y-2">
                      {config.customRules?.map((rule, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 rounded-lg bg-surface-muted p-2 ring-1 ring-border/60"
                        >
                          <span className="flex-1 text-sm text-text-primary">{rule}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomRule(index)}
                            className="text-danger hover:text-danger/80"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={customRule}
                        onChange={(e) => setCustomRule(e.target.value)}
                        placeholder="Enter rule (e.g., quantity > 100)"
                        className="flex-1"
                      />
                      <Button size="sm" onClick={addCustomRule}>
                        Add rule
                      </Button>
                    </div>
                    <p className="text-xs text-text-subtle">
                      Use column names and comparison operators (e.g., &quot;quantity &gt; 100 AND price &lt; 50&quot;)
                    </p>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-4">
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || config.selectedColumns.length === 0}
                    className="flex items-center gap-2"
                  >
                    {isAnalyzing ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-text-subtle" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span>{isAnalyzing ? "Analyzing…" : "Run analysis"}</span>
                  </Button>

                  {analysisComplete && (
                    <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      <span>Export results</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {analysisComplete && segments.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Segmentation results</CardTitle>
                  <CardDescription>
                    View your data segments and their characteristics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {segments.map((segment) => (
                      <div
                        key={segment.name}
                        className="rounded-xl bg-surface-muted p-4 text-center ring-1 ring-border/60"
                      >
                        <div className={`mx-auto mb-2 h-4 w-4 rounded-full ${segment.color}`} />
                        <h3 className="font-semibold text-text-primary">{segment.name}</h3>
                        <p className="text-2xl font-bold text-primary">
                          {segment.count.toLocaleString()}
                        </p>
                        <p className="text-sm text-text-muted">items</p>
                        <p className="mt-1 text-xs text-text-subtle">{segment.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    {segments.map((segment) => (
                      <Card key={segment.name} className="border-l-4 border-l-border">
                        <CardContent className="flex flex-col gap-4 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-3 w-3 rounded-full ${segment.color}`} />
                              <div>
                                <h4 className="font-semibold text-text-primary">{segment.name}</h4>
                                <p className="text-sm text-text-muted">{segment.description}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary">
                                {segment.count.toLocaleString()}
                              </p>
                              <p className="text-sm text-text-muted">items</p>
                            </div>
                          </div>

                          {Object.keys(segment.avgValues).length > 0 && (
                            <div className="border-t border-border pt-4">
                              <h5 className="mb-3 font-medium text-text-primary">Column statistics</h5>
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {Object.keys(segment.avgValues).map((column) => (
                                  <div key={column} className="space-y-2">
                                    <h6 className="text-sm font-medium text-text-soft">{column}</h6>
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                      <div>
                                        <p className="text-text-subtle">Min</p>
                                        <p className="font-medium text-text-primary">
                                          {segment.minValues[column]?.toFixed(2)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-text-subtle">Avg</p>
                                        <p className="font-medium text-text-primary">
                                          {segment.avgValues[column]?.toFixed(2)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-text-subtle">Max</p>
                                        <p className="font-medium text-text-primary">
                                          {segment.maxValues[column]?.toFixed(2)}
                                        </p>
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
            ) : null}
          </>
        ) : (
          <Alert>
            <AlertDescription>
              Please select a dataset to begin segmentation analysis.
            </AlertDescription>
          </Alert>
        )}
      </PageSection>
    </PageShell>
  );
}
