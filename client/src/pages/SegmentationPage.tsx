import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataTable } from "@/components/DataTable";
import { SegmentationFiltering } from "@/components/SegmentationFiltering";
import { api } from "@/lib/api";
import { Dataset } from "@/types";
import { Database, Filter, Users, BarChart3, Download, Save, RefreshCw, ChevronDown, ChevronRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";

export function SegmentationPage() {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [activeSegments, setActiveSegments] = useState<any[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<{
    datasetSelection: boolean;
    filtering: boolean;
    segmentation: boolean;
    summary: boolean;
  }>({
    datasetSelection: true,
    filtering: false,
    segmentation: false,
    summary: false
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch datasets
  const { data: datasets = [] as Dataset[], isLoading: datasetsLoading } = useQuery<Dataset[]>({
    queryKey: ["/api/datasets"],
    queryFn: async () => (await api.datasets.getAll()) as Dataset[],
    staleTime: 0,
    refetchOnMount: true
  });

  // Handle dataset selection
  const handleDatasetSelect = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setProcessedData(dataset.data ?? []);
    setActiveFilters([]);
    setActiveSegments([]);
    // Auto-expand filtering section after dataset selection
    setExpandedSections({
      datasetSelection: true,
      filtering: true,
      segmentation: false,
      summary: false
    });
  };

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle filters change
  const handleFiltersChange = (filters: any[]) => {
    setActiveFilters(filters);
    // Apply filters to the selected dataset
    if (selectedDataset) {
      let filteredData = [...(selectedDataset.data ?? [])];
      
      // Apply filters
      filters.forEach(filter => {
        filteredData = filteredData.filter((row: any) => {
          const value = row[filter.column];
          
          switch (filter.operator) {
            case 'equals':
              return String(value) === filter.value;
            case 'not_equals':
              return String(value) !== filter.value;
            case 'contains':
              return String(value).toLowerCase().includes(filter.value.toLowerCase());
            case 'greater_than':
              return Number(value) > Number(filter.value);
            case 'less_than':
              return Number(value) < Number(filter.value);
            case 'between':
              return Number(value) >= Number(filter.value) && Number(value) <= Number(filter.value2 || filter.value);
            case 'in_list':
              return filter.values?.includes(String(value));
            default:
              return true;
          }
        });
      });
      
      setProcessedData(filteredData);
      
      // Auto-expand summary section when filters are applied
      if (filters.length > 0) {
        setExpandedSections(prev => ({
          ...prev,
          summary: true
        }));
      }
    }
  };

  // Handle segments change
  const handleSegmentsChange = (segments: any[]) => {
    setActiveSegments(segments);
    // Apply segmentation to the filtered data
    if (selectedDataset && processedData.length > 0) {
      let segmentedData = [...processedData];
      
      segments.forEach(segment => {
        const columnName = `${segment.name}_cluster`;
        
        switch (segment.method) {
          case 'kmeans':
            // Simple k-means implementation
            const clusters = performKMeans(segmentedData, segment.columns, segment.numClusters || 3);
            segmentedData.forEach((row: any, index: number) => {
              row[columnName] = `Cluster ${clusters[index] + 1}`;
            });
            break;
            
          case 'hierarchical':
            // Simple hierarchical clustering
            const hierarchicalClusters = performHierarchicalClustering(segmentedData, segment.columns, segment.numClusters || 3);
            segmentedData.forEach((row: any, index: number) => {
              row[columnName] = `Group ${hierarchicalClusters[index] + 1}`;
            });
            break;
            
          case 'rule_based':
            // Rule-based segmentation
            segmentedData.forEach((row: any) => {
              row[columnName] = applyRules(row, segment.rules || []);
            });
            break;
        }
      });
      
      setProcessedData(segmentedData);
      
      // Auto-expand summary section when segments are applied
      if (segments.length > 0) {
        setExpandedSections(prev => ({
          ...prev,
          summary: true
        }));
      }
    }
  };

  // Simple k-means implementation
  const performKMeans = (data: any[], columns: string[], k: number): number[] => {
    // Extract numeric data
    const numericData = data.map(row => 
      columns.map(col => {
        const val = parseFloat(row[col]);
        return isNaN(val) ? 0 : val;
      })
    );

    // Initialize centroids randomly
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

    return clusters;
  };

  // Simple hierarchical clustering
  const performHierarchicalClustering = (data: any[], columns: string[], k: number): number[] => {
    // For simplicity, use k-means as a proxy for hierarchical clustering
    return performKMeans(data, columns, k);
  };

  // Apply rule-based segmentation
  const applyRules = (row: any, rules: any[]): string => {
    for (const rule of rules) {
      // Simple rule evaluation - in a real implementation, you'd want a more sophisticated parser
      if (evaluateRule(row, rule.condition)) {
        return rule.clusterLabel;
      }
    }
    return 'Default';
  };

  // Simple rule evaluation
  const evaluateRule = (row: any, condition: string): boolean => {
    // Very basic rule evaluation - in production, you'd want a proper expression parser
    try {
      // Replace column names with actual values
      let evalCondition = condition;
      Object.keys(row).forEach(col => {
        const value = typeof row[col] === 'string' ? `'${row[col]}'` : row[col];
        evalCondition = evalCondition.replace(new RegExp(`\\b${col}\\b`, 'g'), value);
      });
      
      // Basic safety check - only allow simple comparisons
      if (!/^[a-zA-Z0-9\s<>=!&|()'.,]+$/.test(evalCondition)) {
        return false;
      }
      
      return eval(evalCondition);
    } catch {
      return false;
    }
  };

  // Export processed data
  const exportData = () => {
    if (!processedData.length) {
      toast({
        title: "No data to export",
        description: "Please select a dataset and apply filters/segmentation first",
        variant: "destructive"
      });
      return;
    }

    const csvContent = [
      // Header row
      Object.keys(processedData[0]).join(','),
      // Data rows
      ...processedData.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `segmented_data_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Data exported",
      description: `Exported ${processedData.length} rows to CSV file`
    });
  };

  // Save processed dataset
  const saveProcessedDataset = async () => {
    if (!processedData.length || !user) {
      toast({
        title: "Cannot save",
        description: "Please sign in and process a dataset first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Convert processed data to CSV string
      const csvContent = [
        Object.keys(processedData[0]).join(','),
        ...processedData.map(row => 
          Object.values(row).map(value => 
            typeof value === 'string' && value.includes(',') ? `"${value}"` : value
          ).join(',')
        )
      ].join('\n');

      // Create a file from the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], `${selectedDataset?.originalName}_processed.csv`, { type: 'text/csv' });

      // Upload the processed dataset
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/datasets', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to save dataset');
      }

      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      
      toast({
        title: "Dataset saved",
        description: "Processed dataset has been saved to your collection"
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save the processed dataset",
        variant: "destructive"
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <PageShell>
      <PageHeader
        title="Segmentation & Filtering"
        description="Filter your data and create meaningful segments for better analysis"
      />
      <PageSection surface="transparent" contentClassName="grid gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Dataset Selection Section */}
            <Card>
              <CardHeader 
                className="cursor-pointer hover:bg-surface-muted transition-colors"
                onClick={() => toggleSection('datasetSelection')}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Database className="w-5 h-5" />
                    <span>Dataset Selection</span>
                    {selectedDataset && (
                      <CheckCircle className="w-5 h-5 text-success" />
                    )}
                  </CardTitle>
                  {expandedSections.datasetSelection ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronRight className="w-5 h-5" />
                  )}
                </div>
              </CardHeader>
              {expandedSections.datasetSelection && (
                <CardContent className="space-y-4">
                  {datasetsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="w-5 h-5 animate-spin text-text-subtle" />
                      <span className="ml-2 text-sm text-text-muted">Loading...</span>
                    </div>
                  ) : datasets.length > 0 ? (
                    <div className="space-y-3">
                      {datasets.map((dataset: Dataset) => (
                        <div
                          key={dataset.id}
                          className={`p-3 rounded-lg border border-border cursor-pointer transition-colors ${
                            selectedDataset?.id === dataset.id 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:bg-surface-muted'
                          }`}
                          onClick={() => handleDatasetSelect(dataset)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-sm text-text-primary">
                                {dataset.originalName}
                              </h4>
                              <p className="text-xs text-text-muted">
                                {dataset.rowCount.toLocaleString()} rows • {dataset.columns.length} columns
                              </p>
                            </div>
                            {selectedDataset?.id === dataset.id && (
                              <CheckCircle className="w-4 h-4 text-success" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Database className="w-8 h-8 text-text-subtle mx-auto mb-2" />
                      <p className="text-sm text-text-muted">
                        No datasets available
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Filtering Section */}
            {selectedDataset && (
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-surface-muted transition-colors"
                  onClick={() => toggleSection('filtering')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Filter className="w-5 h-5" />
                      <span>Filtering</span>
                      {activeFilters.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {activeFilters.length}
                        </Badge>
                      )}
                    </CardTitle>
                    {expandedSections.filtering ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </div>
                </CardHeader>
                {expandedSections.filtering && (
                  <CardContent>
                    <SegmentationFiltering
                      dataset={selectedDataset}
                      onFiltersChange={handleFiltersChange}
                      onSegmentationChange={handleSegmentsChange}
                      showOnlyFiltering={true}
                    />
                  </CardContent>
                )}
              </Card>
            )}

            {/* Segmentation Section */}
            {selectedDataset && (
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-surface-muted transition-colors"
                  onClick={() => toggleSection('segmentation')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Users className="w-5 h-5" />
                      <span>Segmentation</span>
                      {activeSegments.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {activeSegments.length}
                        </Badge>
                      )}
                    </CardTitle>
                    {expandedSections.segmentation ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </div>
                </CardHeader>
                {expandedSections.segmentation && (
                  <CardContent>
                    <SegmentationFiltering
                      dataset={selectedDataset}
                      onFiltersChange={handleFiltersChange}
                      onSegmentationChange={handleSegmentsChange}
                      showOnlySegmentation={true}
                    />
                  </CardContent>
                )}
              </Card>
            )}

            {/* Summary Section */}
            {selectedDataset && (
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-surface-muted transition-colors"
                  onClick={() => toggleSection('summary')}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <BarChart3 className="w-5 h-5" />
                      <span>Summary</span>
                    </CardTitle>
                    {expandedSections.summary ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </div>
                </CardHeader>
                {expandedSections.summary && (
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Original rows:</span>
                          <span className="font-medium">{selectedDataset.data?.length ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>After filtering:</span>
                          <span className="font-medium">{processedData.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Active filters:</span>
                          <span className="font-medium">{activeFilters.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Active segments:</span>
                          <span className="font-medium">{activeSegments.length}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={exportData}
                          disabled={!processedData.length}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={saveProcessedDataset}
                          disabled={!processedData.length || !user}
                          className="flex-1"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedDataset ? (
              <>
                {/* Dataset Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="w-5 h-5" />
                      <span>Selected Dataset: {selectedDataset.originalName}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-text-muted">
                          {selectedDataset.rowCount.toLocaleString()} rows • {selectedDataset.columns.length} columns • {formatFileSize(selectedDataset.fileSize)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-text-muted">
                          Processed: {processedData.length.toLocaleString()} rows
                        </div>
                        <div className="text-sm text-text-muted">
                          {selectedDataset.columns.length + activeSegments.length} columns
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Data Preview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Data Preview</CardTitle>
                      <div className="flex items-center space-x-2 text-sm text-text-muted">
                        <span>{processedData.length.toLocaleString()} rows</span>
                        <span>•</span>
                        <span>{selectedDataset.columns.length + activeSegments.length} columns</span>
                        {(activeFilters.length > 0 || activeSegments.length > 0) && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              {activeFilters.length} filters, {activeSegments.length} segments
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DataTable 
                      data={processedData}
                      columns={[
                        ...selectedDataset.columns,
                        ...activeSegments.map(segment => `${segment.name}_cluster`)
                      ]}
                      pageSize={10}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Filter className="w-12 h-12 text-text-subtle mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    No Dataset Selected
                  </h3>
                  <p className="text-text-muted mb-4">
                    Please select a dataset from the sidebar to begin filtering and segmentation
                  </p>
                  <Button onClick={() => setExpandedSections(prev => ({ ...prev, datasetSelection: true }))}>
                    Choose Dataset
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
      </PageSection>
    </PageShell>
  );
}
