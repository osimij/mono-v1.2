import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { analyzeDataset } from "@/lib/dataAnalyzer";
import { DynamicMetricCard } from "@/components/DynamicMetricCard";
import { DynamicChart } from "@/components/DynamicChart";
import { PageSection, PageShell } from "@/components/layout/Page";
import { cn } from "@/lib/utils";
import { getDatasetLabel, type DatasetDetail, type DashboardDraft } from "@/lib/dashboardUtils";
import type { DashboardConfig, Dataset } from "@shared/schema";

export function DashboardViewerPage() {
  const datasetDetailsRef = useRef<Record<number, DatasetDetail>>({});
  const initializedRef = useRef(false);

  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);
  const [datasetDetailsCache, setDatasetDetailsCache] = useState<Record<number, DatasetDetail>>({});
  const [datasetErrors, setDatasetErrors] = useState<Record<number, string>>({});

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

      const metrics = (config.metrics ?? []).reduce<any[]>((acc, metric) => {
        const datasetId = resolveDatasetId(metric.datasetId);
        if (datasetId == null) return acc;
        acc.push({
          ...metric,
          datasetId,
          datasetName: metric.datasetName ?? attachDatasetName(datasetId),
        });
        return acc;
      }, []);

      const charts = (config.charts ?? []).reduce<any[]>((acc, chart) => {
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

  const viewerDashboard = useMemo(() => {
    if (!selectedDashboardId) return null;
    const source = dashboardsList.find((dashboard) => dashboard.id === selectedDashboardId);
    return normalizeDashboard(source);
  }, [dashboardsList, normalizeDashboard, selectedDashboardId]);

  const viewerDatasetIds = useMemo(() => {
    const ids = new Set<number>();
    viewerDashboard?.metrics.forEach((metric) => {
      if (metric.datasetId) ids.add(metric.datasetId);
    });
    viewerDashboard?.charts.forEach((chart) => {
      if (chart.datasetId) ids.add(chart.datasetId);
    });
    return Array.from(ids);
  }, [viewerDashboard]);

  useEffect(() => {
    viewerDatasetIds.forEach((datasetId) => {
      if (!datasetId) return;
      ensureDatasetDetails(datasetId).catch(() => {
        // error handled in ensureDatasetDetails
      });
    });
  }, [viewerDatasetIds, ensureDatasetDetails]);

  useEffect(() => {
    if (!dashboardsList.length) {
      initializedRef.current = false;
      setSelectedDashboardId(null);
      return;
    }

    if (!initializedRef.current) {
      const first = dashboardsList[0];
      setSelectedDashboardId(first.id);
      initializedRef.current = true;
    } else if (
      selectedDashboardId &&
      !dashboardsList.some((dashboard) => dashboard.id === selectedDashboardId)
    ) {
      setSelectedDashboardId(dashboardsList[0].id);
    }
  }, [dashboardsList, selectedDashboardId]);

  const handleViewerSelectionChange = useCallback((value: string) => {
    const dashboardId = Number(value);
    if (!Number.isNaN(dashboardId)) {
      setSelectedDashboardId(dashboardId);
    }
  }, []);

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
        title="Select Dashboard"
        description="Choose a saved dashboard to explore."
        contentClassName="gap-4"
      >
        {dashboardsList.length === 0 ? (
          <p className="text-sm text-text-muted">
            No dashboards yet. Create one from the builder to get started.
          </p>
        ) : (
          <Select
            value={selectedDashboardId != null ? String(selectedDashboardId) : undefined}
            onValueChange={handleViewerSelectionChange}
          >
            <SelectTrigger className="w-full md:w-[320px]">
              <SelectValue placeholder="Select a dashboard" />
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
        title={viewerDashboard ? viewerDashboard.name : "Select a dashboard"}
        description={
          viewerDashboard
            ? "Metric cards and visualizations update automatically as your data changes."
            : "Pick a dashboard from above to inspect its latest metrics."
        }
        contentClassName="gap-6"
      >
        {viewerDashboard ? (
          <>
            {viewerDashboard.metrics.length > 0 ? (
              <div className="grid auto-rows-fr gap-5 justify-start [grid-template-columns:repeat(auto-fit,minmax(220px,max-content))]">
                {viewerDashboard.metrics.map((metric) => {
                  const detail = datasetDetailsCache[metric.datasetId];
                  const error = datasetErrors[metric.datasetId];

                  if (error) {
                    return (
                      <div
                        key={metric.id}
                        className="flex h-[108px] w-full max-w-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-surface-muted/40 p-4 text-center text-xs text-danger"
                      >
                        <span className="font-medium">Dataset unavailable</span>
                        <span className="text-[10px] text-text-muted">{error}</span>
                      </div>
                    );
                  }

                  if (!detail) {
                    return (
                      <div
                        key={metric.id}
                        className="flex h-[108px] w-full max-w-[220px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface-muted/40"
                      >
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    );
                  }

                  const data = (detail.dataset.data ?? []) as any[];
                  const datasetLabel = metric.datasetName ?? datasetLabelMap.get(metric.datasetId);

                  return (
                    <div key={metric.id} className="flex flex-col gap-2">
                      <Badge variant="outline" className="self-start text-[10px] font-semibold uppercase tracking-wide">
                        {datasetLabel ?? `Dataset ${metric.datasetId}`}
                      </Badge>
                      <DynamicMetricCard
                        metric={metric}
                        data={data}
                        onEdit={() => {}}
                        onDelete={() => {}}
                        readOnly
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {viewerDashboard.charts.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {viewerDashboard.charts.map((chart) => {
                  const detail = datasetDetailsCache[chart.datasetId];
                  const error = datasetErrors[chart.datasetId];

                  const colSpan =
                    chart.size === "large"
                      ? "lg:col-span-12"
                      : chart.size === "small"
                        ? "lg:col-span-4"
                        : "lg:col-span-6";

                  if (error) {
                    return (
                      <div
                        key={chart.id}
                        className={cn(
                          "col-span-1 flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-surface-muted/40 p-6 text-center text-sm text-danger",
                          colSpan
                        )}
                      >
                        <span className="font-semibold">Unable to load dataset</span>
                        <span className="text-xs text-text-muted">{error}</span>
                      </div>
                    );
                  }

                  if (!detail) {
                    return (
                      <div
                        key={chart.id}
                        className={cn(
                          "col-span-1 flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-muted/40",
                          colSpan
                        )}
                      >
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    );
                  }

                  const data = (detail.dataset.data ?? []) as any[];
                  const datasetAnalysis = detail.analysis;
                  const datasetLabel = chart.datasetName ?? datasetLabelMap.get(chart.datasetId);

                  return (
                    <div key={chart.id} className={cn("col-span-1 flex flex-col gap-3", colSpan)}>
                      <Badge variant="outline" className="self-start text-[10px] font-semibold uppercase tracking-wide">
                        {datasetLabel ?? `Dataset ${chart.datasetId}`}
                      </Badge>
                      <DynamicChart
                        chart={chart}
                        data={data}
                        datasetAnalysis={datasetAnalysis ?? undefined}
                        onUpdate={() => {}}
                        onEdit={() => {}}
                        onDelete={() => {}}
                        readOnly
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            {viewerDashboard.metrics.length === 0 && viewerDashboard.charts.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border/60 bg-surface-muted/60 px-10 py-12 text-center">
                <BarChart3 className="h-12 w-12 text-text-subtle" />
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-text-primary">
                    Nothing to display yet
                  </h3>
                  <p className="max-w-xl text-sm text-text-muted">
                    Build your dashboard by adding metric cards and charts from the builder.
                  </p>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-border/60 bg-surface-muted/40 text-sm text-text-muted">
            Select a dashboard to preview its metrics and charts.
          </div>
        )}
      </PageSection>
    </PageShell>
  );
}

