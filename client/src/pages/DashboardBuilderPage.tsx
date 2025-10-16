import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, Loader2, BarChart3 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { analyzeDataset } from "@/lib/dataAnalyzer";
import { DynamicMetricCard } from "@/components/DynamicMetricCard";
import { DynamicChart } from "@/components/DynamicChart";
import { AddMetricCardDialog } from "@/components/AddMetricCardDialog";
import { AddChartDialog } from "@/components/AddChartDialog";
import { PageSection, PageShell } from "@/components/layout/Page";
import { cn } from "@/lib/utils";
import { getDatasetLabel, generateDashboardName, type DatasetDetail, type DashboardDraft } from "@/lib/dashboardUtils";
import type { DashboardChart, DashboardConfig, DashboardMetricCard, Dataset } from "@shared/schema";

export function DashboardBuilderPage() {
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);
  const datasetDetailsRef = useRef<Record<number, DatasetDetail>>({});

  const [builderSelectionId, setBuilderSelectionId] = useState<number | null>(null);
  const [dashboardDraft, setDashboardDraft] = useState<DashboardDraft | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [showAddChart, setShowAddChart] = useState(false);
  const [editingMetric, setEditingMetric] = useState<DashboardMetricCard | undefined>();
  const [editingChart, setEditingChart] = useState<DashboardChart | undefined>();
  const [datasetDetailsCache, setDatasetDetailsCache] = useState<Record<number, DatasetDetail>>({});
  const [datasetErrors, setDatasetErrors] = useState<Record<number, string>>({});
  const [isCreatingDashboard, setIsCreatingDashboard] = useState(false);

  const { data: datasets, isLoading: loadingDatasets } = useQuery<Dataset[]>({
    queryKey: ["datasets"],
    queryFn: () => api.datasets.getAll()
  });

  const { data: dashboards, isLoading: loadingDashboards } = useQuery<DashboardConfig[]>({
    queryKey: ["dashboards"],
    queryFn: () => api.dashboards.list()
  });

  const dashboardsList = dashboards ?? [];

  const datasetOptions = useMemo(
    () =>
      (datasets ?? []).map((dataset) => ({
        id: dataset.id,
        label: getDatasetLabel(dataset)
      })),
    [datasets]
  );

  const datasetLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    datasetOptions.forEach((option) => {
      map.set(option.id, option.label);
    });
    return map;
  }, [datasetOptions]);

  const normalizeDashboard = useCallback(
    (config?: DashboardConfig | null): DashboardDraft | null => {
      if (!config) return null;

      const fallbackDatasetId = config.datasetId ?? datasetOptions[0]?.id ?? null;

      const resolveDatasetId = (candidate?: number | null) => {
        if (typeof candidate === "number") return candidate;
        if (typeof fallbackDatasetId === "number") return fallbackDatasetId;
        return datasetOptions[0]?.id ?? null;
      };

      const attachDatasetName = (datasetId: number | null | undefined) =>
        datasetId != null ? datasetLabelMap.get(datasetId) ?? undefined : undefined;

      const metrics = (config.metrics ?? []).reduce<DashboardMetricCard[]>((acc, metric) => {
        const datasetId = resolveDatasetId(metric.datasetId);
        if (datasetId == null) return acc;
        acc.push({
          ...metric,
          datasetId,
          datasetName: metric.datasetName ?? attachDatasetName(datasetId),
        });
        return acc;
      }, []);

      const charts = (config.charts ?? []).reduce<DashboardChart[]>((acc, chart) => {
        const datasetId = resolveDatasetId(chart.datasetId);
        if (datasetId == null) return acc;
        acc.push({
          ...chart,
          datasetId,
          datasetName: chart.datasetName ?? attachDatasetName(datasetId),
        });
        return acc;
      }, []);

      return {
        id: config.id ?? null,
        name: config.name ?? "Untitled dashboard",
        metrics,
        charts,
      };
    },
    [datasetLabelMap, datasetOptions]
  );

  const ensureDatasetDetails = useCallback(
    async (datasetId: number): Promise<DatasetDetail> => {
      if (!datasetId) {
        throw new Error("Invalid dataset id");
      }

      const cached = datasetDetailsRef.current[datasetId];
      if (cached) {
        return cached;
      }

      try {
        const dataset = await api.datasets.getById(datasetId);
        const analysis = dataset?.data ? analyzeDataset(dataset.data as any[]) : null;
        const detail: DatasetDetail = { dataset, analysis };
        datasetDetailsRef.current[datasetId] = detail;
        setDatasetDetailsCache((prev) => ({ ...prev, [datasetId]: detail }));
        setDatasetErrors((prev) => {
          if (!(datasetId in prev)) return prev;
          const { [datasetId]: _, ...rest } = prev;
          return rest;
        });
        return detail;
      } catch (error) {
        console.error(`Failed to load dataset ${datasetId}:`, error);
        setDatasetErrors((prev) => ({
          ...prev,
          [datasetId]: error instanceof Error ? error.message : "Unknown error"
        }));
        throw error;
      }
    },
    []
  );

  const resolveDatasetColumns = useCallback(
    async (datasetId: number) => {
      try {
        const details = await ensureDatasetDetails(datasetId);
        return details.analysis?.columns ?? [];
      } catch {
        return [];
      }
    },
    [ensureDatasetDetails]
  );

  const enrichMetric = useCallback(
    (metric: DashboardMetricCard): DashboardMetricCard => ({
      ...metric,
      datasetName: metric.datasetName ?? datasetLabelMap.get(metric.datasetId) ?? metric.datasetName,
    }),
    [datasetLabelMap]
  );

  const enrichChart = useCallback(
    (chart: DashboardChart): DashboardChart => ({
      ...chart,
      datasetName: chart.datasetName ?? datasetLabelMap.get(chart.datasetId) ?? chart.datasetName,
    }),
    [datasetLabelMap]
  );

  const loadDashboardIntoDraft = useCallback(
    (dashboard: DashboardConfig | DashboardDraft | null) => {
      if (!dashboard) {
        setDashboardDraft(null);
        setBuilderSelectionId(null);
        return;
      }

      if ("userId" in dashboard) {
        const normalized = normalizeDashboard(dashboard);
        if (!normalized) {
          setDashboardDraft(null);
          setBuilderSelectionId(null);
          return;
        }
        setDashboardDraft(normalized);
        setBuilderSelectionId(normalized.id);
      } else {
        setDashboardDraft(dashboard);
        setBuilderSelectionId(dashboard.id);
      }

      setDraftDirty(false);
      setEditingMetric(undefined);
      setEditingChart(undefined);
      setSaveError(null);
    },
    [normalizeDashboard]
  );

  const builderDatasetIds = useMemo(() => {
    const ids = new Set<number>();
    dashboardDraft?.metrics.forEach((metric) => {
      if (metric.datasetId) ids.add(metric.datasetId);
    });
    dashboardDraft?.charts.forEach((chart) => {
      if (chart.datasetId) ids.add(chart.datasetId);
    });
    return Array.from(ids);
  }, [dashboardDraft]);

  useEffect(() => {
    builderDatasetIds.forEach((datasetId) => {
      if (!datasetId) return;
      ensureDatasetDetails(datasetId).catch(() => {
        // error handled in ensureDatasetDetails
      });
    });
  }, [builderDatasetIds, ensureDatasetDetails]);

  useEffect(() => {
    if (!dashboardsList.length) {
      initializedRef.current = false;
      setBuilderSelectionId(null);
      setDashboardDraft(null);
      return;
    }

    if (!initializedRef.current) {
      const first = dashboardsList[0];
      loadDashboardIntoDraft(first);
      initializedRef.current = true;
    }
  }, [dashboardsList, loadDashboardIntoDraft]);

  useEffect(() => {
    if (!dashboardDraft || !dashboardDraft.id || !draftDirty) return;

    const timeoutId = window.setTimeout(async () => {
      setSavingDraft(true);
      setSaveError(null);
      try {
        const payload = {
          id: dashboardDraft.id,
          name: dashboardDraft.name,
          metrics: dashboardDraft.metrics,
          charts: dashboardDraft.charts,
        };

        const saved = await api.dashboards.saveConfig(payload);

        setDashboardDraft((prev) =>
          prev && prev.id === saved.id
            ? {
                ...prev,
                id: saved.id,
                name: saved.name,
                metrics: saved.metrics as DashboardMetricCard[],
                charts: saved.charts as DashboardChart[],
              }
            : prev
        );
        setDraftDirty(false);
        setLastSavedAt(Date.now());

        queryClient.setQueryData<DashboardConfig[] | undefined>(["dashboards"], (prev) => {
          if (!prev) return prev;
          return prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item));
        });
      } catch (error) {
        console.error("Failed to save dashboard config:", error);
        setSaveError("We couldn't save your latest changes. They'll retry shortly.");
      } finally {
        setSavingDraft(false);
      }
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [dashboardDraft, draftDirty, queryClient]);

  const handleBuilderSelectionChange = useCallback(
    (value: string) => {
      const dashboardId = Number(value);
      if (Number.isNaN(dashboardId)) return;

      const target = dashboardsList.find((dashboard) => dashboard.id === dashboardId);
      if (target) {
        loadDashboardIntoDraft(target);
      }
    },
    [dashboardsList, loadDashboardIntoDraft]
  );

  const handleCreateDashboard = useCallback(async () => {
    setIsCreatingDashboard(true);
    try {
      const name = generateDashboardName(dashboardsList);
      const saved = await api.dashboards.saveConfig({
        name,
        metrics: [],
        charts: [],
      });

      queryClient.setQueryData<DashboardConfig[] | undefined>(["dashboards"], (prev) => {
        if (!prev) return [saved];
        return [...prev, saved];
      });

      loadDashboardIntoDraft(saved);
      initializedRef.current = true;
    } catch (error) {
      console.error("Failed to create dashboard:", error);
      setSaveError("Creating a new dashboard failed. Please try again.");
    } finally {
      setIsCreatingDashboard(false);
    }
  }, [dashboardsList, loadDashboardIntoDraft, queryClient]);

  const handleDashboardNameChange = useCallback((value: string) => {
    setDashboardDraft((prev) => {
      if (!prev || prev.name === value) return prev;
      setDraftDirty(true);
      return { ...prev, name: value };
    });
  }, []);

  const handleAddMetric = useCallback((metric: DashboardMetricCard) => {
    setDashboardDraft((prev) => {
      if (!prev) return prev;
      setDraftDirty(true);
      return { ...prev, metrics: [...prev.metrics, enrichMetric(metric)] };
    });
    setShowAddMetric(false);
  }, [enrichMetric]);

  const handleUpdateMetric = useCallback((metric: DashboardMetricCard) => {
    setDashboardDraft((prev) => {
      if (!prev) return prev;
      const nextMetrics = prev.metrics.map((item) =>
        item.id === metric.id ? enrichMetric(metric) : item
      );
      if (nextMetrics === prev.metrics) return prev;
      setDraftDirty(true);
      return { ...prev, metrics: nextMetrics };
    });
    setEditingMetric(undefined);
  }, [enrichMetric]);

  const handleDeleteMetric = useCallback((metricId: string) => {
    setDashboardDraft((prev) => {
      if (!prev) return prev;
      const nextMetrics = prev.metrics.filter((metric) => metric.id !== metricId);
      if (nextMetrics.length === prev.metrics.length) return prev;
      setDraftDirty(true);
      return { ...prev, metrics: nextMetrics };
    });
  }, []);

  const handleAddChart = useCallback((chart: DashboardChart) => {
    setDashboardDraft((prev) => {
      if (!prev) return prev;
      setDraftDirty(true);
      return { ...prev, charts: [...prev.charts, enrichChart(chart)] };
    });
    setShowAddChart(false);
  }, [enrichChart]);

  const handleUpdateChart = useCallback((chart: DashboardChart) => {
    setDashboardDraft((prev) => {
      if (!prev) return prev;
      const nextCharts = prev.charts.map((item) =>
        item.id === chart.id ? enrichChart(chart) : item
      );
      if (nextCharts === prev.charts) return prev;
      setDraftDirty(true);
      return { ...prev, charts: nextCharts };
    });
    setEditingChart(undefined);
  }, [enrichChart]);

  const handleDeleteChart = useCallback((chartId: string) => {
    setDashboardDraft((prev) => {
      if (!prev) return prev;
      const nextCharts = prev.charts.filter((chart) => chart.id !== chartId);
      if (nextCharts.length === prev.charts.length) return prev;
      setDraftDirty(true);
      return { ...prev, charts: nextCharts };
    });
  }, []);

  const savingStatus = useMemo(() => {
    if (savingDraft) {
      return (
        <span className="flex items-center gap-2 text-xs text-text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving changes…
        </span>
      );
    }
    if (saveError) {
      return (
        <span className="text-xs text-danger">
          {saveError}
        </span>
      );
    }
    if (lastSavedAt) {
      return (
        <span className="text-xs text-text-subtle">
          Saved {new Date(lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      );
    }
    return null;
  }, [lastSavedAt, saveError, savingDraft]);

  if (loadingDatasets || loadingDashboards) {
    return (
      <PageShell padding="lg">
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl bg-surface-elevated/60 p-10 shadow-sm ring-1 ring-border/60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  if (!datasets || datasets.length === 0) {
    return (
      <PageShell padding="lg">
        <Card className="flex flex-col items-center gap-4 rounded-2xl border-border/60 bg-surface-elevated p-10 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-text-subtle" />
          <h3 className="text-xl font-semibold text-text-primary">
            No datasets found
          </h3>
          <p className="max-w-md text-sm text-text-muted">
            Upload a CSV file to start building dashboards. Once uploaded, you can mix and match metrics and charts across datasets.
          </p>
          <Button onClick={() => (window.location.href = "/data/upload")}>
            Upload dataset
          </Button>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell padding="lg">

      <PageSection
        surface="card"
        title="Dashboard Selection"
        description="Create new dashboards or switch to one you want to refine."
        contentClassName="gap-4"
        actions={
          <Button onClick={handleCreateDashboard} disabled={isCreatingDashboard}>
            <Plus className="mr-2 h-4 w-4" />
            {isCreatingDashboard ? "Creating…" : "Create new dashboard"}
          </Button>
        }
      >
        {dashboardsList.length === 0 ? (
          <p className="text-sm text-text-muted">
            Click &ldquo;Create new dashboard&rdquo; to start building your first view.
          </p>
        ) : (
          <Select
            value={builderSelectionId != null ? String(builderSelectionId) : undefined}
            onValueChange={handleBuilderSelectionChange}
          >
            <SelectTrigger className="w-full md:w-[320px]">
              <SelectValue placeholder="Select a dashboard to edit" />
            </SelectTrigger>
            <SelectContent>
              {dashboardsList.map((dashboard) => (
                <SelectItem key={dashboard.id} value={dashboard.id.toString()}>
                  {dashboard.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </PageSection>

      <PageSection
        surface="card"
        title={dashboardDraft ? `Editing ${dashboardDraft.name}` : "Select a dashboard to edit"}
        description="Attach cards and charts to different datasets, organize them, and we'll autosave every change."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setShowAddMetric(true)} className="gap-2" disabled={!dashboardDraft}>
              <Plus className="h-4 w-4" />
              Add metric card
            </Button>
            <Button onClick={() => setShowAddChart(true)} variant="outline" className="gap-2" disabled={!dashboardDraft}>
              <Plus className="h-4 w-4" />
              Add chart
            </Button>
          </div>
        }
        contentClassName="gap-6"
      >
        {dashboardDraft ? (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-muted" htmlFor="dashboard-name">
                Dashboard name
              </label>
              <Input
                id="dashboard-name"
                value={dashboardDraft.name}
                onChange={(event) => handleDashboardNameChange(event.target.value)}
                className="max-w-lg"
              />
              {savingStatus}
            </div>

            {dashboardDraft.metrics.length > 0 ? (
              <div className="grid auto-rows-fr gap-5 justify-start [grid-template-columns:repeat(auto-fit,minmax(220px,max-content))]">
                {dashboardDraft.metrics.map((metric) => {
                  const detail = datasetDetailsCache[metric.datasetId];
                  const error = datasetErrors[metric.datasetId];
                  const datasetLabel = metric.datasetName ?? datasetLabelMap.get(metric.datasetId);

                  return (
                    <div key={metric.id} className="flex flex-col gap-2">
                      <Badge variant="outline" className="self-start text-[10px] font-semibold uppercase tracking-wide">
                        {datasetLabel ?? `Dataset ${metric.datasetId}`}
                      </Badge>
                      {error ? (
                        <div className="flex h-[108px] w-full max-width-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-surface-muted/40 p-4 text-center text-xs text-danger">
                          <span className="font-medium">Dataset unavailable</span>
                          <span className="text-[10px] text-text-muted">{error}</span>
                        </div>
                      ) : detail ? (
                        <DynamicMetricCard
                          metric={metric}
                          data={(detail.dataset.data ?? []) as any[]}
                          onEdit={() => setEditingMetric(metric)}
                          onDelete={() => handleDeleteMetric(metric.id)}
                        />
                      ) : (
                        <div className="flex h-[108px] w-full max-w-[220px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface-muted/40">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {dashboardDraft.charts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {dashboardDraft.charts.map((chart) => {
                  const detail = datasetDetailsCache[chart.datasetId];
                  const error = datasetErrors[chart.datasetId];
                  const datasetLabel = chart.datasetName ?? datasetLabelMap.get(chart.datasetId);

                  const colSpan =
                    chart.size === "large"
                      ? "lg:col-span-12"
                      : chart.size === "small"
                        ? "lg:col-span-4"
                        : "lg:col-span-6";

                  return (
                    <div key={chart.id} className={cn("col-span-1 flex flex-col gap-3", colSpan)}>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                          {datasetLabel ?? `Dataset ${chart.datasetId}`}
                        </Badge>
                      </div>
                      {error ? (
                        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-surface-muted/40 p-6 text-center text-xs text-danger">
                          <span className="font-semibold">Dataset unavailable</span>
                          <span className="text-[10px] text-text-muted">{error}</span>
                        </div>
                      ) : detail ? (
                        <DynamicChart
                          chart={chart}
                          data={(detail.dataset.data ?? []) as any[]}
                          datasetAnalysis={detail.analysis ?? undefined}
                          onUpdate={handleUpdateChart}
                          onEdit={() => setEditingChart(chart)}
                          onDelete={() => handleDeleteChart(chart.id)}
                        />
                      ) : (
                        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-muted/40">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {dashboardDraft.metrics.length === 0 && dashboardDraft.charts.length === 0 ? (
              <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border/60 bg-surface-muted/60 px-10 py-12 text-center">
                <BarChart3 className="h-16 w-16 text-text-subtle" />
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-text-primary">
                    Start building your dashboard
                  </h3>
                  <p className="max-w-xl text-sm text-text-muted">
                    Add metric cards and charts to visualize how your data is evolving. You can mix datasets freely—each card or chart can focus on a different source.
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
          </>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-surface-muted/40 text-center text-sm text-text-muted">
            Select a dashboard from above or create a new one to start editing.
          </div>
        )}
      </PageSection>

      <AddMetricCardDialog
        open={showAddMetric || !!editingMetric}
        onOpenChange={(open) => {
          setShowAddMetric(open);
          if (!open) {
            setEditingMetric(undefined);
          }
        }}
        onSave={editingMetric ? handleUpdateMetric : handleAddMetric}
        datasets={datasetOptions}
        resolveDatasetColumns={resolveDatasetColumns}
        existingMetric={editingMetric}
      />

      <AddChartDialog
        open={showAddChart || !!editingChart}
        onOpenChange={(open) => {
          setShowAddChart(open);
          if (!open) {
            setEditingChart(undefined);
          }
        }}
        onSave={editingChart ? handleUpdateChart : handleAddChart}
        datasets={datasetOptions}
        resolveDatasetColumns={resolveDatasetColumns}
        existingChart={editingChart}
      />
    </PageShell>
  );
}

