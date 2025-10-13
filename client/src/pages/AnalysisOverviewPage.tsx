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
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";
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
      <AnalyticsLayout>
        <PageShell padding="lg" className="bg-transparent">
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-surface-elevated/60 p-10 shadow-sm ring-1 ring-border/60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </PageShell>
      </AnalyticsLayout>
    );
  }

  if (!datasets || datasets.length === 0) {
    return (
      <AnalyticsLayout>
        <PageShell padding="lg" className="bg-transparent">
          <Card className="flex flex-col items-center gap-4 rounded-2xl border-border/60 bg-surface-elevated p-10 text-center shadow-sm">
            <AlertCircle className="mx-auto h-12 w-12 text-text-subtle" />
            <h3 className="text-xl font-semibold text-text-primary">
              No datasets found
            </h3>
            <p className="max-w-md text-sm text-text-muted">
              Upload a CSV file to start building custom dashboards tailored to your
              business metrics.
            </p>
            <Button onClick={() => (window.location.href = "/data/upload")}>
              Upload dataset
            </Button>
          </Card>
        </PageShell>
      </AnalyticsLayout>
    );
  }

  return (
    <AnalyticsLayout>
      <PageShell padding="lg" className="bg-transparent">
        <PageHeader
          title="Overview dashboard"
          description="Compose high-impact metrics and visualizations tailored to each dataset."
          actions={
            <Select
              value={selectedDatasetId?.toString()}
              onValueChange={(value) => setSelectedDatasetId(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((ds) => (
                  <SelectItem key={ds.id} value={ds.id.toString()}>
                    {ds.originalName || ds.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {loadingDataset || loadingConfig ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-surface-elevated/60 p-12 shadow-sm ring-1 ring-border/60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : dataset && datasetAnalysis ? (
          <>
            <PageSection
              surface="card"
              title="Dashboard builder"
              description="Metric cards highlight key KPIs while charts reveal deeper trends across your dataset."
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => setShowAddMetric(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add metric card
                  </Button>
                  <Button onClick={() => setShowAddChart(true)} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add chart
                  </Button>
                </div>
              }
              contentClassName="gap-10"
            >
              {metrics.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                  {metrics.map((metric) => (
                    <DynamicMetricCard
                      key={metric.id}
                      metric={metric}
                      data={dataset.data as any[]}
                      onEdit={() => setEditingMetric(metric)}
                      onDelete={() => handleDeleteMetric(metric.id)}
                    />
                  ))}
                </div>
              ) : null}

              {charts.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                  {charts.map((chart) => (
                    <div
                      key={chart.id}
                      className={cn(
                        "col-span-1",
                        chart.size === "large"
                          ? "lg:col-span-12"
                          : chart.size === "small"
                            ? "lg:col-span-4"
                            : "lg:col-span-6",
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
              ) : null}

              {metrics.length === 0 && charts.length === 0 ? (
                <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border/60 bg-surface-muted/60 px-10 py-12 text-center">
                  <BarChart3 className="h-16 w-16 text-text-subtle" />
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-text-primary">
                      Start building your dashboard
                    </h3>
                    <p className="max-w-xl text-sm text-text-muted">
                      Add metric cards and charts to visualize how your data is evolving.
                      Use the actions above to start designing your workspace.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button onClick={() => setShowAddMetric(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add metric card
                    </Button>
                    <Button onClick={() => setShowAddChart(true)} variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add chart
                    </Button>
                  </div>
                </div>
              ) : null}
            </PageSection>

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
      </PageShell>
    </AnalyticsLayout>
  );
}
