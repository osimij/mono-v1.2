import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertCircle, Loader2, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { analyzeDataset } from "@/lib/dataAnalyzer";
import { DynamicMetricCard } from "@/components/DynamicMetricCard";
import { DynamicChart } from "@/components/DynamicChart";
import { AddMetricCardDialog } from "@/components/AddMetricCardDialog";
import { AddChartDialog } from "@/components/AddChartDialog";
import { AnalyticsLayout } from "@/components/AnalyticsLayout";
import { cn } from "@/lib/utils";
import type { DashboardMetricCard, DashboardChart, Dataset } from "@shared/schema";

export function AnalysisOverviewPage() {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetricCard[]>([]);
  const [charts, setCharts] = useState<DashboardChart[]>([]);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [showAddChart, setShowAddChart] = useState(false);
  const [editingMetric, setEditingMetric] = useState<DashboardMetricCard | undefined>();
  const [editingChart, setEditingChart] = useState<DashboardChart | undefined>();
  const [dashboardConfigId, setDashboardConfigId] = useState<number | null>(null);

  // Fetch datasets
  const { data: datasets, isLoading: loadingDatasets } = useQuery<Dataset[]>({
    queryKey: ["datasets"],
    queryFn: () => api.datasets.getAll()
  });

  // Fetch selected dataset data
  const { data: dataset, isLoading: loadingDataset } = useQuery<Dataset>({
    queryKey: ["dataset", selectedDatasetId],
    queryFn: () => api.datasets.getById(selectedDatasetId!),
    enabled: !!selectedDatasetId
  });

  // Fetch dashboard configuration
  const { data: dashboardConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ["dashboard-config", selectedDatasetId],
    queryFn: () => api.dashboards.getConfig(selectedDatasetId!),
    enabled: !!selectedDatasetId
  });

  // Load dashboard config when it's fetched
  useEffect(() => {
    if (dashboardConfig) {
      setDashboardConfigId(dashboardConfig.id);
      setMetrics(dashboardConfig.metrics || []);
      setCharts(dashboardConfig.charts || []);
    }
  }, [dashboardConfig]);

  // Auto-select first dataset if available
  useEffect(() => {
    if (datasets && datasets.length > 0 && !selectedDatasetId) {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets, selectedDatasetId]);

  // Analyze dataset structure
  const datasetAnalysis = dataset?.data ? analyzeDataset(dataset.data as any[]) : null;

  // Save dashboard configuration
  const saveDashboardConfig = async () => {
    if (!selectedDatasetId) return;
    
    try {
      const config = {
        id: dashboardConfigId,
        datasetId: selectedDatasetId,
        name: "My Dashboard",
        metrics,
        charts
      };
      
      const saved = await api.dashboards.saveConfig(config);
      setDashboardConfigId(saved.id);
    } catch (error) {
      console.error("Failed to save dashboard config:", error);
    }
  };

  // Auto-save when metrics or charts change
  useEffect(() => {
    if (selectedDatasetId && (metrics.length > 0 || charts.length > 0)) {
      const timeoutId = setTimeout(() => {
        saveDashboardConfig();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [metrics, charts, selectedDatasetId]);

  const handleAddMetric = (metric: DashboardMetricCard) => {
    setMetrics([...metrics, metric]);
    setShowAddMetric(false);
  };

  const handleUpdateMetric = (metric: DashboardMetricCard) => {
    setMetrics(metrics.map(m => m.id === metric.id ? metric : m));
    setEditingMetric(undefined);
  };

  const handleDeleteMetric = (metricId: string) => {
    setMetrics(metrics.filter(m => m.id !== metricId));
  };

  const handleAddChart = (chart: DashboardChart) => {
    setCharts([...charts, chart]);
    setShowAddChart(false);
  };

  const handleUpdateChart = (chart: DashboardChart) => {
    setCharts(prev => prev.map(c => c.id === chart.id ? chart : c));
    setEditingChart(undefined);
  };

  const handleDeleteChart = (chartId: string) => {
    setCharts(charts.filter(c => c.id !== chartId));
  };

  if (loadingDatasets) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!datasets || datasets.length === 0) {
    return (
      <AnalyticsLayout>
        <div className="container mx-auto p-6">
          <Card className="p-8">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-semibold">No Datasets Found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Upload a CSV file to start building custom dashboards
              </p>
              <Button onClick={() => window.location.href = '/data/upload'}>
                Upload Dataset
              </Button>
            </div>
          </Card>
        </div>
      </AnalyticsLayout>
    );
  }

  return (
    <AnalyticsLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Dataset Selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Overview Dashboard</h2>
          <Select
            value={selectedDatasetId?.toString()}
            onValueChange={(value) => setSelectedDatasetId(parseInt(value))}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map(ds => (
                <SelectItem key={ds.id} value={ds.id.toString()}>
                  {ds.originalName || ds.filename}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

          {loadingDataset || loadingConfig ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : dataset && datasetAnalysis ? (
            <>
              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button onClick={() => setShowAddMetric(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Metric Card
                </Button>
                <Button onClick={() => setShowAddChart(true)} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Chart
                </Button>
              </div>

              {/* Metrics Grid */}
              {metrics.length > 0 && (
                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))' }}>
                  {metrics.map(metric => (
                    <DynamicMetricCard
                      key={metric.id}
                      metric={metric}
                      data={dataset.data as any[]}
                      onEdit={() => setEditingMetric(metric)}
                      onDelete={() => handleDeleteMetric(metric.id)}
                    />
                  ))}
                </div>
              )}

              {/* Charts Grid */}
              {charts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {charts.map(chart => (
                    <div
                      key={chart.id}
                      className={cn(
                        "col-span-1",
                        chart.size === "large"
                          ? "lg:col-span-12"
                          : chart.size === "small"
                            ? "lg:col-span-4"
                            : "lg:col-span-6"
                      )}
                    >
                      <DynamicChart
                        chart={chart}
                        data={dataset.data as any[]}
                        datasetAnalysis={datasetAnalysis}
                        onUpdate={handleUpdateChart}
                        onEdit={() => setEditingChart(chart)}
                        onDelete={() => handleDeleteChart(chart.id)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {metrics.length === 0 && charts.length === 0 && (
                <Card className="p-12 bg-white dark:bg-gray-950">
                  <div className="text-center space-y-4">
                    <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Start Building Your Dashboard</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Add metric cards and charts to visualize your data.<br />
                        Click the buttons above to get started!
                      </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => setShowAddMetric(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Metric Card
                      </Button>
                      <Button onClick={() => setShowAddChart(true)} variant="outline" className="gap-2">
                        <Plus className="w-4 h-4" />
                        Add Chart
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Dialogs */}
              <AddMetricCardDialog
                open={showAddMetric || !!editingMetric}
                onOpenChange={(open) => {
                  setShowAddMetric(open);
                  if (!open) setEditingMetric(undefined);
                }}
                onSave={editingMetric ? handleUpdateMetric : handleAddMetric}
                columns={datasetAnalysis.columns}
                existingMetric={editingMetric}
              />

              <AddChartDialog
                open={showAddChart || !!editingChart}
                onOpenChange={(open) => {
                  setShowAddChart(open);
                  if (!open) setEditingChart(undefined);
                }}
                onSave={editingChart ? handleUpdateChart : handleAddChart}
                columns={datasetAnalysis.columns}
                existingChart={editingChart}
              />
            </>
          ) : null}
      </div>
    </AnalyticsLayout>
  );
}
