import { useEffect, useState, useMemo, useRef, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AnalyticsLayout } from "@/components/AnalyticsLayout";
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";
import { TrendingUp, BarChart3, Brain, Download, Plus, X, AlertCircle, RefreshCw, Edit2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  AreaChart,
  Area
} from "recharts";
import { api } from "@/lib/api";
import type { Dataset } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { analyzeDataset, summarizeDatasetForInsights, buildAlignedNumericVectors, calculatePearsonCorrelation } from "@/lib/dataAnalyzer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Design tokens for accessible chart colors
const CHART_COLORS = {
  primary: "hsl(var(--chart-primary))",
  success: "hsl(var(--chart-success))",
  warning: "hsl(var(--chart-warning))",
  info: "hsl(var(--chart-info))",
  accent1: "hsl(var(--chart-accent-1))",
  accent2: "hsl(var(--chart-accent-2))",
};

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.info,
  CHART_COLORS.accent1,
  CHART_COLORS.accent2,
];

const DEFAULT_CHART_HEIGHT = 320;

type ChartFormatters = {
  integer: Intl.NumberFormat;
  decimal: Intl.NumberFormat;
  compact: Intl.NumberFormat;
  percent: Intl.NumberFormat;
};

const buildChartFormatters = (locale?: string): ChartFormatters => {
  const resolvedLocale =
    locale || (typeof navigator !== "undefined" ? navigator.language : "en-US");

  return {
    integer: new Intl.NumberFormat(resolvedLocale, { maximumFractionDigits: 0 }),
    decimal: new Intl.NumberFormat(resolvedLocale, { maximumFractionDigits: 2 }),
    compact: new Intl.NumberFormat(resolvedLocale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }),
    percent: new Intl.NumberFormat(resolvedLocale, {
      style: "percent",
      maximumFractionDigits: 1,
    }),
  };
};

const formatChartValue = (
  rawValue: number,
  aggregation: ChartConfig["aggregation"],
  formatters: ChartFormatters,
  { forAxis = false }: { forAxis?: boolean } = {}
): string => {
  if (!Number.isFinite(rawValue)) return "—";

  const value = Number(rawValue);
  const absoluteValue = Math.abs(value);
  const shouldCompact = forAxis ? absoluteValue >= 1000 : absoluteValue >= 10000;

  if (aggregation === "avg" || aggregation === "average") {
    return shouldCompact ? formatters.compact.format(value) : formatters.decimal.format(value);
  }

  if (aggregation === "sum" || aggregation === "max" || aggregation === "min") {
    if (shouldCompact) {
      return formatters.compact.format(value);
    }
    return formatters.decimal.format(value);
  }

  if (aggregation === "count" || !aggregation) {
    return shouldCompact ? formatters.compact.format(value) : formatters.integer.format(value);
  }

  return shouldCompact ? formatters.compact.format(value) : formatters.decimal.format(value);
};

const hasMeaningfulChartData = (
  data: ChartValuePoint[] | ScatterPoint[],
  chartType: ChartType
): boolean => {
  if (!data || data.length === 0) return false;

  if (chartType === "scatter") {
    return (data as ScatterPoint[]).some(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.y)
    );
  }

  if (chartType === "pie") {
    return (data as ChartValuePoint[]).some((point) => Number.isFinite(point.value) && point.value > 0);
  }

  if (chartType === "line" || chartType === "area") {
    if (data.length < 2) return false;
    return (data as ChartValuePoint[]).some((point) => Number.isFinite(point.value));
  }

  return (data as ChartValuePoint[]).some((point) => Number.isFinite(point.value));
};

const AGGREGATION_LABELS: Record<string, string> = {
  avg: "Average",
  average: "Average",
  sum: "Sum",
  max: "Maximum",
  min: "Minimum",
  count: "Count"
};

const humanizeLabel = (value?: string) => {
  if (!value) return "";
  return value
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const describeChartConfig = (chart: ChartConfig): string => {
  const segments: string[] = [];
  segments.push(`${humanizeLabel(chart.type)} chart`);

  if (chart.yColumn) {
    const aggregationLabel =
      chart.aggregation && chart.aggregation !== "count"
        ? `${AGGREGATION_LABELS[chart.aggregation] ?? humanizeLabel(chart.aggregation)} of ${humanizeLabel(chart.yColumn)}`
        : humanizeLabel(chart.yColumn);
    segments.push(aggregationLabel);
  } else if (chart.aggregation === "count") {
    segments.push("Record counts");
  }

  if (chart.xColumn) {
    segments.push(`Grouped by ${humanizeLabel(chart.xColumn)}`);
  }

  return segments.join(" · ");
};

// Hook to detect current theme
function useIsDark() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

type ChartType = "bar" | "line" | "pie" | "scatter" | "area";

interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  description?: string;
  xColumn?: string;
  yColumn?: string;
  aggregation?: string;
}

type DatasetRow = Record<string, unknown>;
type ChartValuePoint = { name: string | number; value: number };
type ScatterPoint = { x: number; y: number };

export function AnalysisPage() {
  const isDark = useIsDark();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedDataset, setSelectedDataset] = useState<string>("none");
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [chartsLoadedForDataset, setChartsLoadedForDataset] = useState<number | null>(null);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<ChartConfig | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [smartInsightsPage, setSmartInsightsPage] = useState(0);
  const [persistedInsights, setPersistedInsights] = useState<string[]>([]);
  const [newChart, setNewChart] = useState<Partial<ChartConfig>>({
    type: "bar",
    title: "",
    aggregation: "count"
  });
  const chartFormatters = useMemo(() => {
    let locale: string | undefined;
    if (typeof navigator !== "undefined") {
      locale = navigator.language;
    }
    return buildChartFormatters(locale);
  }, []);

  const storageKey = (datasetId: number, userId?: string | null) =>
    `analysis-charts-${datasetId}-${userId ?? "anonymous"}`;
  const insightsStorageKey = (datasetId: number, userId?: string | null) =>
    `analysis-insights-${datasetId}-${userId ?? "anonymous"}`;

  useEffect(() => {
    if (selectedDataset === "none") {
      setCharts([]);
      setChartsLoadedForDataset(null);
      setPersistedInsights([]);
      return;
    }

    const datasetId = Number(selectedDataset);
    if (Number.isNaN(datasetId) || typeof window === "undefined") {
      return;
    }

    const userId = authUser?.id ?? null;

    const restoreFromLocal = () => {
      try {
        const chartKey = storageKey(datasetId, userId);
        const storedCharts = typeof window !== "undefined" ? localStorage.getItem(chartKey) : null;
        if (storedCharts) {
          const parsed = JSON.parse(storedCharts);
          if (Array.isArray(parsed)) {
            setCharts(parsed as ChartConfig[]);
          } else if (parsed && Array.isArray(parsed.charts)) {
            setCharts(parsed.charts as ChartConfig[]);
          } else {
            setCharts([]);
          }
        } else {
          setCharts([]);
        }
      } catch (error) {
        console.error("Failed to parse stored charts", error);
        setCharts([]);
      }

      try {
        const insightsKey = insightsStorageKey(datasetId, userId);
        const storedInsights = typeof window !== "undefined" ? localStorage.getItem(insightsKey) : null;
        if (storedInsights) {
          const parsedInsights = JSON.parse(storedInsights);
          setPersistedInsights(Array.isArray(parsedInsights) ? (parsedInsights as string[]) : []);
        } else {
          setPersistedInsights([]);
        }
      } catch (error) {
        console.error("Failed to parse stored insights", error);
        setPersistedInsights([]);
      }
    };

    if (userId) {
      api.analysis
        .getConfig(datasetId)
        .then((config) => {
          const chartsFromConfig = Array.isArray(config?.charts) ? (config.charts as ChartConfig[]) : [];
          const insightsFromConfig = Array.isArray(config?.insights) ? (config.insights as string[]) : [];

          if (chartsFromConfig.length > 0) {
            setCharts(chartsFromConfig);
          } else {
            restoreFromLocal();
          }

          if (insightsFromConfig.length > 0) {
            setPersistedInsights(insightsFromConfig);
          } else if (chartsFromConfig.length === 0) {
            // Only attempt local restore when no server data exists
            restoreFromLocal();
          } else {
            setPersistedInsights([]);
          }
        })
        .catch((error) => {
          console.warn("Failed to fetch analysis config, falling back to local", error);
          restoreFromLocal();
        })
        .finally(() => {
          setChartsLoadedForDataset(datasetId);
        });
    } else {
      restoreFromLocal();
      setChartsLoadedForDataset(datasetId);
    }
  }, [selectedDataset, authUser?.id]);

  const persistTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) {
        window.clearTimeout(persistTimeoutRef.current);
      }
    };
  }, []);

  const { data: datasets = [], isLoading: loadingDatasets, error: datasetsError, refetch: refetchDatasets } = useQuery<Dataset[]>({
    queryKey: ["datasets"],
    queryFn: () => api.datasets.getAll(),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Auto-select first dataset if none selected and datasets are available
  useEffect(() => {
    if (selectedDataset === "none" && datasets.length > 0 && !loadingDatasets) {
      setSelectedDataset(datasets[0].id.toString());
    }
  }, [datasets, loadingDatasets, selectedDataset]);

  const selectedDatasetId = selectedDataset !== "none" ? Number(selectedDataset) : null;

  const { data: selectedDatasetData, isLoading: loadingSelectedDataset, error: selectedDatasetError, refetch: refetchSelectedDataset } = useQuery<Dataset>({
    queryKey: ["dataset", selectedDatasetId],
    queryFn: () => api.datasets.getById(selectedDatasetId!, { limit: 750 }),
    enabled: selectedDatasetId !== null,
    retry: 2,
    retryDelay: 1000,
  });

  const getNumericalColumns = () => {
    if (!selectedDatasetData) return [];
    const rows = selectedDatasetData.data as DatasetRow[] | undefined;
    if (!rows || rows.length === 0) return [];
    const firstRow = rows[0];

    return selectedDatasetData.columns.filter((col) => {
      const value = firstRow[col];
      return typeof value === "number" && !Number.isNaN(value);
    });
  };

  const getCategoricalColumns = () => {
    if (!selectedDatasetData) return [];
    const rows = selectedDatasetData.data as DatasetRow[] | undefined;
    if (!rows || rows.length === 0) return [];
    const firstRow = rows[0];

    return selectedDatasetData.columns.filter((col) => {
      const value = firstRow[col];
      return typeof value === "string" || typeof value === "boolean";
    });
  };

  const getAvailableColumns = (chartType: ChartType, axis: "x" | "y") => {
    const numerical = getNumericalColumns();
    const categorical = getCategoricalColumns();

    switch (chartType) {
      case "bar":
        return axis === "x" ? categorical : numerical;
      case "line":
      case "area":
        return axis === "x" ? [...categorical, ...numerical] : numerical;
      case "pie":
        return axis === "x" ? categorical : numerical;
      case "scatter":
        return numerical;
      default:
        return [];
    }
  };

  const processChartData = (chart: ChartConfig): ChartValuePoint[] | ScatterPoint[] => {
    const data = (selectedDatasetData?.data ?? []) as DatasetRow[];
    if (data.length === 0) return [];

    if (chart.type === "pie" && chart.xColumn) {
      const counts: Record<string, number> = {};
      data.forEach((row) => {
        const rawValue = row[chart.xColumn as string];
        const key = rawValue == null || rawValue === "" ? "Unknown" : String(rawValue);
        counts[key] = (counts[key] ?? 0) + 1;
      });

      const MAX_SLICES = 10;

      let slices = Object.entries(counts)
        .map<ChartValuePoint>(([name, value]) => ({ name, value }))
        .filter((slice) => Number.isFinite(slice.value) && slice.value > 0)
        .sort((a, b) => b.value - a.value);

      if (slices.length > MAX_SLICES) {
        const visibleSlices = slices.slice(0, MAX_SLICES - 1);
        const remainder = slices.slice(MAX_SLICES - 1);
        const otherTotal = remainder.reduce((sum, slice) => sum + slice.value, 0);
        if (otherTotal > 0) {
          visibleSlices.push({ name: "Other", value: otherTotal });
        }
        slices = visibleSlices;
      }

      return slices;
    }

    if (chart.type === "scatter" && chart.xColumn && chart.yColumn) {
      return data
        .slice(0, 200)
        .map<ScatterPoint>((row) => ({
          x: Number(row[chart.xColumn as string]),
          y: Number(row[chart.yColumn as string])
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    }

    if (chart.xColumn && getCategoricalColumns().includes(chart.xColumn)) {
      const grouped: Record<string, { name: string; values: number[] }> = {};

      data.forEach((row) => {
        const keyRaw = row[chart.xColumn as string];
        const key = keyRaw == null || keyRaw === "" ? "Unknown" : String(keyRaw);

        if (!grouped[key]) {
          grouped[key] = { name: key, values: [] };
        }

        if (chart.yColumn) {
          const numericValue = Number(row[chart.yColumn as string]);
          if (Number.isFinite(numericValue)) {
            grouped[key].values.push(numericValue);
          }
        }
      });

      const MAX_GROUPS = chart.type === "bar" ? 18 : 14;

      let aggregated = Object.values(grouped)
        .map<ChartValuePoint>((group) => {
          if (chart.yColumn && group.values.length > 0) {
            switch (chart.aggregation) {
              case "sum":
                return {
                  name: group.name,
                  value: group.values.reduce((total, value) => total + value, 0)
                };
              case "avg":
                return {
                  name: group.name,
                  value:
                    group.values.reduce((total, value) => total + value, 0) / group.values.length
                };
              case "max":
                return { name: group.name, value: Math.max(...group.values) };
              case "min":
                return { name: group.name, value: Math.min(...group.values) };
              default:
                return { name: group.name, value: group.values.length };
            }
          }

          return { name: group.name, value: group.values.length };
        })
        .filter((point) => Number.isFinite(point.value) && point.value >= 0)
        .sort((a, b) => b.value - a.value);

      if (aggregated.length > MAX_GROUPS) {
        const visible = aggregated.slice(0, MAX_GROUPS - 1);
        const remainder = aggregated.slice(MAX_GROUPS - 1);
        const otherTotal = remainder.reduce((sum, item) => sum + item.value, 0);
        if (otherTotal > 0) {
          visible.push({ name: "Other", value: otherTotal });
        }
        aggregated = visible;
      }

      return aggregated;
    }

    if (chart.xColumn && getNumericalColumns().includes(chart.xColumn)) {
      let processedData = data.slice(0, 100).map<ChartValuePoint>((row) => {
        const nameValue = Number(row[chart.xColumn as string]);
        const yValue = chart.yColumn ? Number(row[chart.yColumn as string]) : 1;
        return { name: nameValue, value: yValue };
      });

      processedData = processedData.filter(
        (point) => Number.isFinite(Number(point.name)) && Number.isFinite(point.value)
      );

      if (chart.yColumn && chart.yColumn.toLowerCase().includes("age")) {
        processedData = processedData.filter((point) => point.value >= 0 && point.value <= 120);
      } else if (chart.yColumn) {
        processedData = filterOutliers(processedData);
      }

      return processedData.sort(
        (a, b) => Number(a.name) - Number(b.name)
      );
    }

    let finalData = data.slice(0, 50).map<ChartValuePoint>((row, index) => {
      const nameRaw = chart.xColumn ? row[chart.xColumn as string] : undefined;
      const name = nameRaw == null || nameRaw === "" ? `Row ${index + 1}` : String(nameRaw);
      const valueRaw = chart.yColumn ? Number(row[chart.yColumn as string]) : 1;
      const value = Number.isFinite(valueRaw) ? valueRaw : 0;
      return { name, value };
    });

    if (chart.yColumn && chart.yColumn.toLowerCase().includes("age")) {
      finalData = finalData.filter((point) => point.value >= 0 && point.value <= 120);
    } else if (chart.yColumn) {
      finalData = filterOutliers(finalData);
    }

    return finalData;
  };

  const filterOutliers = (data: ChartValuePoint[]): ChartValuePoint[] => {
    const values = data.map((d) => d.value).filter((v) => !Number.isNaN(v));
    if (values.length <= 5) return data;

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 2 * iqr;
    const upperBound = q3 + 2 * iqr;

    return data.filter((d) => d.value >= lowerBound && d.value <= upperBound);
  };

  const renderChart = (chart: ChartConfig) => {
    try {
      const chartData = processChartData(chart);
      if (!hasMeaningfulChartData(chartData, chart.type)) {
        const dimensionHint = chart.xColumn ? `“${chart.xColumn}”` : "this configuration";
        return (
          <ChartEmptyState
            message="Not enough data to render this chart yet."
            helperText={`Try choosing different columns or adjusting your filters for ${dimensionHint}.`}
          />
        );
      }

      const getYAxisLabel = () => {
        if (chart.yColumn) {
          const aggregationText =
            chart.aggregation && chart.aggregation !== "count"
              ? `${chart.aggregation.charAt(0).toUpperCase() + chart.aggregation.slice(1)} of `
              : "";
          return `${aggregationText}${chart.yColumn}`;
        }
        return "Count";
      };

      const axisColor = isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(26, 26, 26, 0.85)";
      const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(26, 26, 26, 0.08)";
      const cursorFill = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(26, 26, 26, 0.06)";
      const tooltipStyle = {
        backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
        borderRadius: "10px",
        color: isDark ? "#ffffff" : "#1A1A1A",
        padding: "10px 14px",
        boxShadow: isDark
          ? "0 6px 18px rgba(0, 0, 0, 0.45)"
          : "0 6px 18px rgba(26, 26, 26, 0.12)"
      } as CSSProperties;
      const tooltipLabelStyle = {
        color: isDark ? "#ffffff" : "#1A1A1A",
        fontWeight: 600
      } as CSSProperties;
      const tooltipItemStyle = {
        color: isDark ? "#E6E6E6" : "#4D4D4D",
        fontSize: "0.75rem"
      } as CSSProperties;
      const yAxisLabel = getYAxisLabel();
      const chartMargin = { top: 12, right: 16, bottom: 8, left: 12 };

      switch (chart.type) {
        case "bar": {
          const barData = chartData as ChartValuePoint[];
          return (
            <ResponsiveContainer width="100%" height={DEFAULT_CHART_HEIGHT}>
              <BarChart data={barData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  height={36}
                  interval="preserveEnd"
                />
                <YAxis
                  label={{ value: getYAxisLabel(), angle: -90, position: "insideLeft", fill: axisColor }}
                  tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }}
                  tickFormatter={(value: number) =>
                    formatChartValue(value, chart.aggregation, chartFormatters, { forAxis: true })
                  }
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatChartValue(value, chart.aggregation, chartFormatters),
                    yAxisLabel
                  ]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ fill: cursorFill }}
                />
                <Bar
                  dataKey="value"
                  fill={CHART_COLORS.primary}
                  radius={[10, 10, 0, 0]}
                  maxBarSize={56}
                />
              </BarChart>
            </ResponsiveContainer>
          );
        }
        case "line": {
          const lineData = chartData as ChartValuePoint[];
          return (
            <ResponsiveContainer width="100%" height={DEFAULT_CHART_HEIGHT}>
              <LineChart data={lineData} margin={chartMargin}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  height={36}
                />
                <YAxis
                  label={{ value: getYAxisLabel(), angle: -90, position: "insideLeft", fill: axisColor }}
                  tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }}
                  tickFormatter={(value: number) =>
                    formatChartValue(value, chart.aggregation, chartFormatters, { forAxis: true })
                  }
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatChartValue(value, chart.aggregation, chartFormatters),
                    yAxisLabel
                  ]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ stroke: CHART_COLORS.primary, strokeWidth: 1, strokeDasharray: "2 2" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2.5}
                  dot={{ r: 3, strokeWidth: 1.5, stroke: CHART_COLORS.primary, fill: "#fff" }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          );
        }
        case "area": {
          const areaData = chartData as ChartValuePoint[];
          const gradientId = `area-gradient-${chart.id}`;
          return (
            <ResponsiveContainer width="100%" height={DEFAULT_CHART_HEIGHT}>
              <AreaChart data={areaData} margin={chartMargin}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.65} />
                    <stop offset="90%" stopColor={CHART_COLORS.primary} stopOpacity={0.12} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  height={36}
                />
                <YAxis
                  label={{ value: getYAxisLabel(), angle: -90, position: "insideLeft", fill: axisColor }}
                  tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }}
                  tickFormatter={(value: number) =>
                    formatChartValue(value, chart.aggregation, chartFormatters, { forAxis: true })
                  }
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatChartValue(value, chart.aggregation, chartFormatters),
                    yAxisLabel
                  ]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  cursor={{ fill: cursorFill }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  isAnimationActive
                />
              </AreaChart>
            </ResponsiveContainer>
          );
        }
        case "pie": {
          const pieData = chartData as ChartValuePoint[];
          const total = pieData.reduce((sum, entry) => {
            const value = Number(entry.value);
            return Number.isFinite(value) ? sum + value : sum;
          }, 0);
          return (
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={DEFAULT_CHART_HEIGHT}>
                <RechartsPieChart>
                  <Pie
                    dataKey="value"
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={105}
                    paddingAngle={2}
                    labelLine={false}
                    label={({ name, value }) => {
                      const numericValue = Number(value);
                      const ratio = total > 0 ? numericValue / total : 0;
                      return `${name}: ${chartFormatters.percent.format(ratio)}`;
                    }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${chart.id}-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const numericValue = Number(value);
                      const ratio = total > 0 ? numericValue / total : 0;
                      const formattedValue = formatChartValue(
                        numericValue,
                        chart.aggregation,
                        chartFormatters
                      );
                      return [`${formattedValue} (${chartFormatters.percent.format(ratio)})`, name];
                    }}
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
              <PieLegend
                data={pieData}
                colors={PIE_COLORS}
                total={total}
                formatValue={(value) => formatChartValue(value, chart.aggregation, chartFormatters)}
                formatPercent={(value) => chartFormatters.percent.format(value)}
              />
            </div>
          );
        }
        case "scatter": {
          const scatterData = chartData as ScatterPoint[];
          return (
            <ResponsiveContainer width="100%" height={DEFAULT_CHART_HEIGHT}>
              <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="x"
                  type="number"
                  name={chart.xColumn}
                  label={{ value: chart.xColumn || "X-Axis", position: "insideBottom", offset: -5, fill: axisColor }}
                  tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }}
                  tickFormatter={(value: number) => chartFormatters.decimal.format(Number(value))}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  name={chart.yColumn}
                  label={{ value: chart.yColumn || "Y-Axis", angle: -90, position: "insideLeft", fill: axisColor }}
                  tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }}
                  tickFormatter={(value: number) => chartFormatters.decimal.format(Number(value))}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: axisColor }}
                  formatter={(value: number, name: string) => [
                    chartFormatters.decimal.format(Number(value)),
                    name === "x" ? chart.xColumn ?? "X" : chart.yColumn ?? "Y"
                  ]}
                  labelFormatter={() => chart.title}
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                />
                <Scatter
                  data={scatterData}
                  fill={CHART_COLORS.primary}
                  fillOpacity={0.9}
                  shape="circle"
                />
              </ScatterChart>
            </ResponsiveContainer>
          );
        }
        default:
          return <p className="text-sm text-text-muted">Unsupported chart type.</p>;
      }
    } catch (error) {
      console.error("Chart rendering failed", error);
      return (
        <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-surface-muted/40 px-6">
          <p className="text-sm text-text-muted">
            Unable to render this chart. Adjust the configuration and try again.
          </p>
        </div>
      );
    }
  };

  const handleExport = (format: "json" | "csv" = "json") => {
    if (charts.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Create at least one chart before exporting your analysis.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedDatasetData) {
      toast({
        title: "Dataset still loading",
        description: "Please wait for the dataset to finish loading before exporting.",
        variant: "destructive"
      });
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      const datasetName = selectedDatasetData.originalName || selectedDatasetData.filename || "dataset";
      const safeName = datasetName
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "");

      if (format === "json") {
        const exportPayload = {
          datasetId: selectedDatasetData.id,
          datasetName,
          generatedAt: new Date().toISOString(),
          charts,
          insights: insightsToDisplay
        };

        const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `analysis-${safeName || "export"}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // CSV Export
        const csvRows: string[] = [];
        const escapeCsv = (value: string | number | null | undefined) => {
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          if (/[",\n]/.test(stringValue)) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        };
        
        // Header
        csvRows.push("Chart Title,Chart Type,X Column,Y Column,Aggregation");
        
        // Chart data
        charts.forEach((chart) => {
          const row = [
            escapeCsv(chart.title),
            escapeCsv(chart.type),
            escapeCsv(chart.xColumn),
            escapeCsv(chart.yColumn),
            escapeCsv(chart.aggregation)
          ];
          csvRows.push(row.join(","));
        });
        
        // Add insights section
        csvRows.push("");
        csvRows.push("Insights");
        insightsToDisplay.forEach((insight) => {
          csvRows.push(escapeCsv(insight));
        });

        const blob = new Blob([csvRows.join("\n")], {
          type: "text/csv"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `analysis-${safeName || "export"}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Export ready",
        description: `Your analysis has been downloaded as ${format.toUpperCase()}.`
      });
    } catch (error) {
      console.error("Failed to export analysis", error);
      toast({
        title: "Export failed",
        description: "We couldn't export your analysis. Please try again.",
        variant: "destructive"
      });
    }
  };

  const addChart = () => {
    const validationResult = validateChartConfig(newChart, chartAnalysis);
    if (!validationResult.isValid) {
      toast({
        title: validationResult.title,
        description: validationResult.message,
        variant: "destructive"
      });
      return;
    }

    const chart: ChartConfig = {
      id: Date.now().toString(),
      type: newChart.type!,
      title: newChart.title!,
      description: newChart.description?.trim(),
      xColumn: newChart.xColumn,
      yColumn: newChart.yColumn,
      aggregation: newChart.aggregation || "count"
    };

    setCharts((prev) => [...prev, chart]);
    setNewChart({ type: "bar", title: "", aggregation: "count" });

    toast({
      title: "Chart created",
      description: "The new visualization has been added."
    });
  };

  const buildEditingDraft = (chart: ChartConfig): ChartConfig => {
    const shouldDefaultAggregation =
      !chart.aggregation &&
      chart.type !== "pie" &&
      chart.xColumn &&
      getCategoricalColumns().includes(chart.xColumn);

    return {
      ...chart,
      aggregation: shouldDefaultAggregation ? "count" : chart.aggregation
    };
  };

  const startEditingChart = (chartId: string) => {
    const target = charts.find((chart) => chart.id === chartId);
    if (!target) return;

    setEditingChartId(chartId);
    setEditingDraft(buildEditingDraft(target));
  };

  const closeEditDialog = () => {
    setEditingDraft(null);
    setEditingChartId(null);
  };

  const editingXOptions = useMemo<string[]>(() => {
    if (!editingDraft?.type) return [];
    const available = getAvailableColumns(editingDraft.type, "x");
    if (editingDraft.xColumn && !available.includes(editingDraft.xColumn)) {
      const column = editingDraft.xColumn;
      return [column, ...available];
    }
    return [...available];
  }, [editingDraft?.type, editingDraft?.xColumn, selectedDatasetData]);

  const editingYOptions = useMemo<string[]>(() => {
    if (!editingDraft?.type || editingDraft.type === "pie") return [];
    const available = getAvailableColumns(editingDraft.type, "y");
    if (editingDraft.yColumn && !available.includes(editingDraft.yColumn)) {
      const column = editingDraft.yColumn;
      return [column, ...available];
    }
    return [...available];
  }, [editingDraft?.type, editingDraft?.yColumn, selectedDatasetData]);

  useEffect(() => {
    if (!editingChartId) return;
    const current = charts.find((chart) => chart.id === editingChartId);
    if (!current) {
      setEditingChartId(null);
      setEditingDraft(null);
    }
  }, [charts, editingChartId]);

  const updateChart = (chartId: string, updates: Partial<ChartConfig>) => {
    setCharts((prev) => prev.map((chart) => (chart.id === chartId ? { ...chart, ...updates } : chart)));
  };

  const handleEditSubmit = () => {
    if (!editingDraft) return;
    const validationResult = validateChartConfig(editingDraft, chartAnalysis);
    if (!validationResult.isValid) {
      toast({
        title: validationResult.title,
        description: validationResult.message,
        variant: "destructive"
      });
      return;
    }
    updateChart(editingDraft.id, editingDraft);
    closeEditDialog();
    toast({
      title: "Chart updated",
      description: "Your changes have been saved."
    });
  };

  const removeChart = (chartId: string) => {
    setCharts((prev) => prev.filter((chart) => chart.id !== chartId));
  };

  // Memoize smart insights computation
  const chartAnalysis = useMemo(() => {
    if (!selectedDatasetData?.data || selectedDatasetData.data.length === 0) return null;
    return analyzeDataset(selectedDatasetData.data as DatasetRow[]);
  }, [selectedDatasetData]);

  const smartInsights = useMemo(() => {
    if (!selectedDatasetData?.data || selectedDatasetData.data.length === 0) {
      return [];
    }

    const rows = selectedDatasetData.data as DatasetRow[];
    const summary = summarizeDatasetForInsights({ rows, columns: selectedDatasetData.columns });
    const insights: string[] = [];

    const activeSummaries = summary.columnSummaries.filter((col) => col.nonEmptyCount > 0);
    const missingPercentage = activeSummaries.reduce((acc, col) => acc + col.missingCount, 0);
    const totalCells = activeSummaries.reduce((acc, col) => acc + col.nonEmptyCount + col.missingCount, 0);
    const missingRatio = totalCells === 0 ? 0 : (missingPercentage / totalCells) * 100;

    if (activeSummaries.length > 0) {
      insights.push(
        `Dataset overview: ${activeSummaries.length} active columns out of ${selectedDatasetData.columns.length}.`
      );

      if (missingRatio > 10) {
        insights.push(`Data quality alert: ${missingRatio.toFixed(1)}% missing values detected. Consider cleaning.`);
      } else if (missingRatio < 2) {
        insights.push(`Data quality: Excellent — only ${missingRatio.toFixed(1)}% missing values.`);
      } else {
        insights.push(`Data quality: Good — ${missingRatio.toFixed(1)}% missing values.`);
      }
    }

    activeSummaries
      .filter((col) => col.isNumeric)
      .forEach((col) => {
        const aligned = buildAlignedNumericVectors(rows, col.name, col.name);
        const values = aligned.map((pair) => pair.a);
        if (values.length === 0) return;

        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const skewness = Math.abs(mean - median) / (Math.abs(mean) || 1);
        if (skewness > 0.3) {
          insights.push(`${col.name}: Highly skewed distribution (mean: ${mean.toFixed(1)}, median: ${median.toFixed(1)}).`);
        }
      });

    activeSummaries
      .filter((col) => col.isCategorical)
      .forEach((col) => {
        const values = rows
          .map((row) => row[col.name])
          .filter((value) => value != null && value !== "")
          .map((value) => String(value));

        const counts = values.reduce<Record<string, number>>((all, value) => {
          all[value] = (all[value] ?? 0) + 1;
          return all;
        }, {});

        const sortedCounts = Object.entries(counts).sort(([, a], [, b]) => b - a);
        const [topLabel, topCount] = sortedCounts[0] ?? ["", 0];
        const topPercentage = values.length > 0 ? (topCount / values.length) * 100 : 0;

        if (sortedCounts.length <= 5 && topPercentage > 40) {
          insights.push(`${col.name}: Dominated by "${topLabel}" (${topPercentage.toFixed(1)}% of records).`);
        } else if (sortedCounts.length > 20) {
          insights.push(`${col.name}: High diversity with ${sortedCounts.length} distinct values.`);
        }
      });

    const numericalColumns = activeSummaries.filter((col) => col.isNumeric).map((col) => col.name);
    if (numericalColumns.length >= 2) {
      for (let i = 0; i < numericalColumns.length; i++) {
        for (let j = i + 1; j < numericalColumns.length; j++) {
          const colA = numericalColumns[i];
          const colB = numericalColumns[j];
          const aligned = buildAlignedNumericVectors(rows, colA, colB);
          if (aligned.length < 12) continue;

          const correlation = calculatePearsonCorrelation(aligned);
          if (Math.abs(correlation) > 0.7) {
            const direction = correlation > 0 ? "positive" : "negative";
            const strength = Math.abs(correlation) > 0.9 ? "very strong" : "strong";
            insights.push(`${colA} and ${colB}: ${strength} ${direction} correlation (${correlation.toFixed(3)}).`);
          }
        }
      }
    }

    return insights;
  }, [selectedDatasetData]);

  const insightsToDisplay = useMemo(() => {
    return smartInsights.length > 0 ? smartInsights : persistedInsights;
  }, [smartInsights, persistedInsights]);

  const insightsToPersist = useMemo(() => {
    return insightsToDisplay.slice(0, Math.min(insightsToDisplay.length, 50));
  }, [insightsToDisplay]);

  const paginatedInsights = useMemo(() => {
    const pageSize = 6;
    const start = smartInsightsPage * pageSize;
    return insightsToDisplay.slice(start, start + pageSize);
  }, [insightsToDisplay, smartInsightsPage]);

  useEffect(() => {
    if (selectedDataset === "none") return;

    const datasetId = Number(selectedDataset);
    const userId = authUser?.id ?? null;
    if (
      Number.isNaN(datasetId) ||
      typeof window === "undefined" ||
      chartsLoadedForDataset !== datasetId
    ) {
      return;
    }

    try {
      localStorage.setItem(storageKey(datasetId, userId), JSON.stringify(charts));
      localStorage.setItem(insightsStorageKey(datasetId, userId), JSON.stringify(insightsToPersist));
    } catch (error) {
      console.error("Failed to persist analysis locally", error);
    }
  }, [charts, insightsToPersist, selectedDataset, chartsLoadedForDataset, authUser?.id]);

  useEffect(() => {
    if (!selectedDatasetId || !authUser?.id) return;

    if (persistTimeoutRef.current) {
      window.clearTimeout(persistTimeoutRef.current);
    }

    const payload = {
      datasetId: selectedDatasetId,
      charts,
      insights: insightsToPersist,
    };

    persistTimeoutRef.current = window.setTimeout(() => {
      api.analysis
        .saveConfig(payload)
        .catch((error) => console.error("Failed to persist analysis config", error))
        .finally(() => {
          persistTimeoutRef.current = null;
        });
    }, 800);

    return () => {
      if (persistTimeoutRef.current) {
        window.clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
    };
  }, [charts, insightsToPersist, selectedDatasetId, authUser?.id]);

  useEffect(() => {
    setSmartInsightsPage(0);
  }, [selectedDatasetId, insightsToDisplay.length]);

  if (loadingDatasets) {
    return (
      <AnalyticsLayout>
        <PageShell padding="lg" width="wide">
          <LoadingState message="Loading datasets…" />
        </PageShell>
      </AnalyticsLayout>
    );
  }

  if (datasetsError) {
    return (
      <AnalyticsLayout>
        <PageShell padding="lg" width="wide">
          <ErrorState 
            title="Failed to load datasets"
            message="We couldn't load your datasets. Please try again."
            onRetry={refetchDatasets}
          />
        </PageShell>
      </AnalyticsLayout>
    );
  }

  if (datasets.length === 0) {
    return (
      <AnalyticsLayout>
        <PageShell padding="lg" width="wide">
          <EmptyState
            icon={BarChart3}
            title="No datasets available"
            description="Upload a dataset to start creating visualizations and insights."
            action={{ label: "Upload Dataset", onClick: () => setLocation("/data/upload") }}
          />
        </PageShell>
      </AnalyticsLayout>
    );
  }

  return (
    <AnalyticsLayout>
      <PageShell padding="lg" width="wide">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Multiple Analysis Views Available</AlertTitle>
          <AlertDescription>
            <strong>Custom Analysis</strong> lets you build charts from scratch with full control. 
            <strong> Overview Dashboard</strong> provides pre-configured visualizations and metrics. 
            Switch between tabs to explore different analysis approaches.
          </AlertDescription>
        </Alert>

        <PageHeader
          eyebrow="Analysis"
          title="Custom analysis"
          description="Generate tailored visualizations and surface AI-assisted insights from your datasets."
          actions={
            <Button variant="outline" onClick={() => setLocation("/assistant")}>
              <Brain className="mr-2 h-4 w-4" />
              Ask Mono-AI
            </Button>
          }
        />

        <PageSection surface="transparent" contentClassName="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dataset selection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <LabelText>Dataset</LabelText>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger aria-label="Select dataset">
                    <SelectValue placeholder="Choose a dataset…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select a dataset…</SelectItem>
                    {datasets.map((dataset) => (
                      <SelectItem key={dataset.id} value={dataset.id.toString()}>
                        {dataset.originalName || dataset.filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selectedDatasetId && loadingSelectedDataset ? (
            <LoadingState message="Loading dataset…" />
          ) : selectedDatasetError ? (
            <ErrorState
              title="Failed to load dataset"
              message="We couldn't load this dataset. Retry to fetch the latest copy."
              onRetry={refetchSelectedDataset}
            />
          ) : selectedDatasetData ? (
            <>
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowInsights((prev) => !prev)}
                  variant={showInsights ? "default" : "outline"}
                  aria-pressed={showInsights}
                >
                  <Brain className="mr-2 h-4 w-4" />
                  {showInsights ? "Hide insights" : "Show insights"}
                </Button>
              </div>

              {showInsights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        Smart insights
                      </span>
                      {insightsToDisplay.length > 6 && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={smartInsightsPage === 0}
                            onClick={() => setSmartInsightsPage((prev) => Math.max(prev - 1, 0))}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={(smartInsightsPage + 1) * 6 >= insightsToDisplay.length}
                            onClick={() =>
                              setSmartInsightsPage((prev) =>
                                (prev + 1) * 6 >= insightsToDisplay.length ? prev : prev + 1
                              )
                            }
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {paginatedInsights.map((insight, index) => (
                      <div
                        key={`${smartInsightsPage}-${index}`}
                        className="rounded-xl border border-border/60 bg-surface-elevated p-4 text-sm text-text-soft"
                      >
                        {insight}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Create visualization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <LabelText>Chart type</LabelText>
                      <Select
                        value={newChart.type}
                        onValueChange={(value: ChartType) =>
                          setNewChart({ ...newChart, type: value, xColumn: undefined, yColumn: undefined })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Bar chart</SelectItem>
                          <SelectItem value="line">Line chart</SelectItem>
                          <SelectItem value="area">Area chart</SelectItem>
                          <SelectItem value="pie">Pie chart</SelectItem>
                          <SelectItem value="scatter">Scatter plot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <LabelText>Chart title</LabelText>
                      <Input
                        value={newChart.title || ""}
                        onChange={(event) =>
                          setNewChart((prev) => ({ ...prev, title: event.target.value }))
                        }
                        placeholder="e.g. Revenue by segment"
                      />
                    </div>

                    {newChart.type && (
                      <div className="space-y-2">
                        <LabelText>{newChart.type === "pie" ? "Category" : "X-axis"}</LabelText>
                        <Select
                          value={newChart.xColumn || ""}
                          onValueChange={(value) =>
                            setNewChart((prev) => ({ ...prev, xColumn: value }))
                          }
                        >
                          <SelectTrigger aria-label={newChart.type === "pie" ? "Select category column" : "Select X-axis column"}>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableColumns(newChart.type, "x").map((col: string) => {
                              const isNumerical = getNumericalColumns().includes(col);
                              return (
                                <SelectItem key={col} value={col}>
                                  {col} {isNumerical ? "(numerical)" : "(categorical)"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {newChart.type && newChart.type !== "pie" && (
                      <div className="space-y-2">
                        <LabelText>Y-axis</LabelText>
                        <Select
                          value={newChart.yColumn || ""}
                          onValueChange={(value) =>
                            setNewChart((prev) => ({ ...prev, yColumn: value }))
                          }
                        >
                          <SelectTrigger aria-label="Select Y-axis column">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableColumns(newChart.type, "y").map((col: string) => {
                              const isNumerical = getNumericalColumns().includes(col);
                              return (
                                <SelectItem key={col} value={col}>
                                  {col} {isNumerical ? "(numerical)" : "(categorical)"}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {newChart.type &&
                    newChart.xColumn &&
                    getCategoricalColumns().includes(newChart.xColumn) &&
                    newChart.yColumn && (
                      <div className="space-y-2">
                        <LabelText>Aggregation</LabelText>
                        <Select
                          value={newChart.aggregation || "count"}
                          onValueChange={(value) =>
                            setNewChart((prev) => ({ ...prev, aggregation: value }))
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="count">Count</SelectItem>
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="avg">Average</SelectItem>
                            <SelectItem value="max">Maximum</SelectItem>
                            <SelectItem value="min">Minimum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                  <div className="flex gap-2">
                    <Button onClick={addChart}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create chart
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {charts.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {charts.map((chart) => {
                    const chartTitleId = `chart-${chart.id}-title`;
                    const chartDescriptionId = `chart-${chart.id}-description`;
                    const description = chart.description?.trim();
                    const resolvedDescription =
                      description && description.length > 0
                        ? description
                        : describeChartConfig(chart);
                    const aggregatorLabel = chart.aggregation
                      ? AGGREGATION_LABELS[chart.aggregation] ?? humanizeLabel(chart.aggregation)
                      : null;
                    const metaEntries = [
                      chart.xColumn
                        ? {
                            label: chart.type === "pie" ? "Category" : "X axis",
                            value: chart.xColumn
                          }
                        : null,
                      chart.type !== "pie" && chart.yColumn
                        ? {
                            label: chart.type === "scatter" ? "Y axis" : "Metric",
                            value: chart.yColumn
                          }
                        : null,
                      aggregatorLabel
                        ? {
                            label: "Aggregation",
                            value: aggregatorLabel
                          }
                        : null
                    ].filter(Boolean) as Array<{ label: string; value: string }>;

                    return (
                      <Card
                        key={chart.id}
                        aria-labelledby={chartTitleId}
                        aria-describedby={chartDescriptionId}
                        className="border-border/60 bg-surface-muted/60"
                      >
                        <CardHeader className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <CardTitle
                                id={chartTitleId}
                                className="text-base font-semibold text-text-primary"
                              >
                                {chart.title}
                              </CardTitle>
                              <CardDescription
                                id={chartDescriptionId}
                                className="text-xs leading-relaxed text-text-muted"
                              >
                                {resolvedDescription}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditingChart(chart.id)}
                                aria-label={`Edit ${chart.title}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeChart(chart.id)}
                                aria-label={`Remove ${chart.title}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {metaEntries.length > 0 ? (
                            <div className="flex flex-wrap gap-2 text-xs">
                              {metaEntries.map(({ label, value }) => (
                                <span
                                  key={`${chart.id}-${label}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 font-medium text-text-soft"
                                >
                                  <span className="text-text-muted">{label}</span>
                                  <span className="text-text-primary">{value}</span>
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {renderChart(chart)}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setLocation("/modeling")}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Build ML model
                </Button>
                <Button variant="outline" onClick={() => setLocation("/assistant")}>
                  <Brain className="mr-2 h-4 w-4" />
                  Ask questions
                </Button>
                <Button variant="outline" onClick={() => handleExport("json")} disabled={charts.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
                <Button variant="outline" onClick={() => handleExport("csv")} disabled={charts.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="Select a dataset"
              description="Choose a dataset to start exploring visualizations and insights."
              action={{ label: "Manage data", onClick: () => setLocation("/data") }}
            />
          )}
        </PageSection>
      </PageShell>
      <Dialog open={!!editingDraft} onOpenChange={(open) => { if (!open) closeEditDialog(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit chart</DialogTitle>
          </DialogHeader>
          {editingDraft && (
            <div key={editingDraft.id} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editingDraft.title}
                    onChange={(event) =>
                      setEditingDraft((prev) =>
                        prev ? { ...prev, title: event.target.value } : prev
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description (optional)</Label>
                  <Textarea
                    id="edit-description"
                    value={editingDraft.description ?? ""}
                    onChange={(event) =>
                      setEditingDraft((prev) =>
                        prev ? { ...prev, description: event.target.value } : prev
                      )
                    }
                    rows={3}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Chart type</Label>
                  <Select
                    value={editingDraft.type}
                    onValueChange={(value: ChartType) =>
                      setEditingDraft((prev) => {
                        if (!prev) return prev;
                        // Only reset columns if the type actually changed
                        if (prev.type !== value) {
                          return { ...prev, type: value, xColumn: undefined, yColumn: undefined };
                        }
                        return prev;
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar chart</SelectItem>
                      <SelectItem value="line">Line chart</SelectItem>
                      <SelectItem value="area">Area chart</SelectItem>
                      <SelectItem value="pie">Pie chart</SelectItem>
                      <SelectItem value="scatter">Scatter plot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>X-axis</Label>
                  <Select
                    value={editingDraft.xColumn || ""}
                    onValueChange={(value) =>
                      setEditingDraft((prev) => (prev ? { ...prev, xColumn: value } : prev))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {editingXOptions.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {editingDraft.type !== "pie" && (
                  <div className="space-y-2">
                    <Label>Y-axis</Label>
                    <Select
                      value={editingDraft.yColumn || ""}
                      onValueChange={(value) =>
                        setEditingDraft((prev) => (prev ? { ...prev, yColumn: value } : prev))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {editingYOptions.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {editingDraft.type &&
                editingDraft.xColumn &&
                getCategoricalColumns().includes(editingDraft.xColumn) &&
                editingDraft.yColumn && (
                  <div className="space-y-2">
                    <Label>Aggregation</Label>
                    <Select
                      value={editingDraft.aggregation || "count"}
                      onValueChange={(value) =>
                        setEditingDraft((prev) =>
                          prev ? { ...prev, aggregation: value } : prev
                        )
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Count</SelectItem>
                        <SelectItem value="sum">Sum</SelectItem>
                        <SelectItem value="avg">Average</SelectItem>
                        <SelectItem value="max">Maximum</SelectItem>
                        <SelectItem value="min">Minimum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeEditDialog}>
                  Cancel
                </Button>
                <Button onClick={handleEditSubmit}>Save changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AnalyticsLayout>
  );
}

interface LabelTextProps {
  children: React.ReactNode;
}

function LabelText({ children }: LabelTextProps) {
  return <p className="text-sm font-medium text-text-soft">{children}</p>;
}

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-primary">
          <Icon className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
        {action ? (
          <Button variant="outline" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface LoadingStateProps {
  message: string;
}

function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-text-muted">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry: () => void;
}

function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <p className="text-sm text-text-muted">{message}</p>
        </div>
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

interface ChartEmptyStateProps {
  message: string;
  helperText?: string;
}

function ChartEmptyState({ message, helperText }: ChartEmptyStateProps) {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/50 bg-surface-muted/40 px-6 text-center">
      <BarChart3 className="h-10 w-10 text-text-muted" aria-hidden />
      <p className="text-sm font-medium text-text-soft">{message}</p>
      {helperText ? <p className="text-xs text-text-muted">{helperText}</p> : null}
    </div>
  );
}

interface PieLegendProps {
  data: ChartValuePoint[];
  colors: string[];
  total: number;
  formatValue: (value: number) => string;
  formatPercent: (value: number) => string;
}

function PieLegend({ data, colors, total, formatValue, formatPercent }: PieLegendProps) {
  if (!data || data.length === 0) return null;

  const MAX_ITEMS = 8;
  const visibleItems = data.slice(0, MAX_ITEMS);
  const remaining = data.length - visibleItems.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {visibleItems.map((entry, index) => {
          const numericValue = Number(entry.value);
          const ratio = total > 0 ? numericValue / total : 0;
          return (
            <div
              key={`${String(entry.name)}-${index}`}
              className="flex items-center gap-2 rounded-md border border-border/30 bg-surface-muted/60 px-3 py-2 text-xs"
            >
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: colors[index % colors.length] }}
                aria-hidden
              />
              <span className="flex-1 truncate font-medium text-text-soft">{String(entry.name)}</span>
              <span className="font-semibold text-text-primary">{formatValue(numericValue)}</span>
              <span className="text-text-muted">{formatPercent(ratio)}</span>
            </div>
          );
        })}
      </div>
      {remaining > 0 ? (
        <p className="text-xs text-text-muted">+{remaining} more categories not shown.</p>
      ) : null}
    </div>
  );
}

function validateChartConfig(chart: Partial<ChartConfig>, analysis: ReturnType<typeof analyzeDataset> | null) {
  if (!chart.type) {
    return { isValid: false, title: "Missing chart type", message: "Select a chart type before proceeding." };
  }

  if (!chart.title || chart.title.trim().length === 0) {
    return { isValid: false, title: "Missing title", message: "Provide a short descriptive title." };
  }

  if (!chart.xColumn) {
    return { isValid: false, title: "Missing X-axis", message: "Select a column for the X-axis." };
  }

  if (chart.type !== "pie" && !chart.yColumn) {
    return { isValid: false, title: "Missing Y-axis", message: "Select a numeric column for the Y-axis." };
  }

  if (analysis) {
    const availableColumns = analysis.columns.map((column) => column.name);
    if (chart.xColumn && !availableColumns.includes(chart.xColumn)) {
      return {
        isValid: false,
        title: "Column unavailable",
        message: `"${chart.xColumn}" was removed from this dataset. Pick another column.`
      };
    }

    if (chart.yColumn && !availableColumns.includes(chart.yColumn)) {
      return {
        isValid: false,
        title: "Column unavailable",
        message: `"${chart.yColumn}" was removed from this dataset. Pick another column.`
      };
    }

    const numericColumns = analysis.numericColumns ?? [];
    if (chart.type === "bar" && chart.yColumn && !numericColumns.includes(chart.yColumn)) {
      return {
        isValid: false,
        title: "Invalid Y-axis",
        message: "Bar charts require a numeric Y-axis when using aggregations."
      };
    }

    if (chart.type === "pie" && chart.xColumn && numericColumns.includes(chart.xColumn)) {
      return {
        isValid: false,
        title: "Invalid category column",
        message: "Pie charts require a categorical column for slices."
      };
    }
  }

  if ((chart.type === "line" || chart.type === "area" || chart.type === "scatter") && chart.yColumn && chart.xColumn) {
    const numericColumns = analysis?.numericColumns ?? [];
    if (!numericColumns.includes(chart.yColumn)) {
      return {
        isValid: false,
        title: "Invalid Y-axis",
        message: `${chart.type} charts require a numeric Y-axis.`
      };
    }
    if (chart.type === "scatter" && !numericColumns.includes(chart.xColumn)) {
      return {
        isValid: false,
        title: "Invalid X-axis",
        message: "Scatter plots need numeric columns on both axes."
      };
    }
  }

  return { isValid: true };
}
