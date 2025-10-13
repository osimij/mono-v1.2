import { CSSProperties, ReactNode, useCallback, useId, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart as ReBarChart,
  Bar,
  LineChart as ReLineChart,
  Line,
  AreaChart as ReAreaChart,
  Area,
  PieChart as RePieChart,
  Pie,
  ScatterChart as ReScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import {
  AreaChart as AreaChartIcon,
  BarChart3,
  BarChartHorizontal,
  Check,
  ChevronDown,
  Edit2,
  Filter,
  FunctionSquare,
  LineChart as LineChartIcon,
  ListTree,
  PieChart as PieChartIcon,
  ScatterChart as ScatterChartIcon,
  Plus,
  Trash2
} from "lucide-react";
import type { DashboardChart } from "@shared/schema";
import { prepareChartData, prepareMultiColumnChartData, type DatasetAnalysis } from "@/lib/dataAnalyzer";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

const CHART_COLORS = [
  "hsl(211, 100%, 50%)", // primary blue
  "hsl(142, 76%, 36%)", // emerald
  "hsl(262, 83%, 58%)", // purple
  "hsl(339, 82%, 57%)", // pink
  "hsl(188, 94%, 43%)", // cyan
  "hsl(25, 95%, 53%)", // orange
  "hsl(199, 89%, 48%)", // sky
  "hsl(0, 84%, 60%)" // red
] as const;

const GRID_STROKE = "rgba(148, 163, 184, 0.35)";
const CURSOR_FILL = "rgba(148, 163, 184, 0.12)";
const LABEL_FILL = "#e6e9ea";

const TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.97)",
  border: "1px solid rgba(226, 232, 240, 0.7)",
  borderRadius: 12,
  boxShadow: "0 18px 32px -16px rgba(15, 23, 42, 0.45)",
  color: "rgb(15, 23, 42)",
  fontSize: 12,
  padding: "8px 12px"
};

const CHART_TYPE_META: Record<
  DashboardChart["chartType"],
  { label: string; icon: ReactNode }
> = {
  line: { label: "Line", icon: <LineChartIcon className="h-4 w-4" /> },
  bar: { label: "Bar", icon: <BarChart3 className="h-4 w-4" /> },
  horizontal_bar: { label: "Horizontal", icon: <BarChartHorizontal className="h-4 w-4" /> },
  area: { label: "Area", icon: <AreaChartIcon className="h-4 w-4" /> },
  pie: { label: "Pie", icon: <PieChartIcon className="h-4 w-4" /> },
  scatter: { label: "Scatter", icon: <ScatterChartIcon className="h-4 w-4" /> }
};

const AGGREGATION_LABEL: Record<
  NonNullable<DashboardChart["aggregation"]>,
  string
> = {
  sum: "Sum",
  average: "Average",
  count: "Count",
  max: "Maximum",
  min: "Minimum"
};

interface SeriesMeta {
  key: string;
  color: string;
  gradientId: string;
  yAxisId: "left" | "right";
}

interface ChartSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

const METRIC_NONE_VALUE = "__none__";

function humanizeColumnName(name: string) {
  return name
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function DynamicChart({
  chart,
  data,
  datasetAnalysis,
  onUpdate,
  onEdit,
  onDelete
}: DynamicChartProps) {
  const yAxisColumns = Array.isArray(chart.yAxis) ? chart.yAxis : [chart.yAxis];
  const isSingleColumn = yAxisColumns.length === 1;

  const filteredData = useMemo(() => {
    if (
      !chart.filterColumn ||
      chart.filterValue === undefined ||
      chart.filterValue === null ||
      chart.filterValue === ""
    ) {
      return data;
    }

    return data.filter(row => {
      const value = row[chart.filterColumn!];
      if (value === null || value === undefined) return false;
      return String(value) === String(chart.filterValue);
    });
  }, [data, chart.filterColumn, chart.filterValue]);

  const chartHeight =
    chart.size === "large" ? 360 :
    chart.size === "small" ? 220 : 300;

  const chartData = isSingleColumn
    ? prepareChartData(filteredData, chart.xAxis, yAxisColumns[0], chart.aggregation, chart.groupBy)
    : prepareMultiColumnChartData(filteredData, chart.xAxis, yAxisColumns, chart.aggregation);

  const generatedId = useId();
  const chartUid = useMemo(() => {
    const base = chart.id || generatedId;
    return `chart-${base}`.replace(/[^a-zA-Z0-9-_]/g, "-");
  }, [chart.id, generatedId]);

  const useDualAxes = chart.chartType === "bar" && yAxisColumns.length === 2;

  const metricOptions = useMemo<ChartSelectOption[]>(() => {
    const columns = new Set<string>();
    if (datasetAnalysis?.numericColumns?.length) {
      datasetAnalysis.numericColumns.forEach(col => columns.add(col));
    }
    yAxisColumns.forEach(col => columns.add(col));
    return Array.from(columns)
      .map(col => ({
        value: col,
        label: humanizeColumnName(col)
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [datasetAnalysis?.numericColumns, yAxisColumns]);

  const seriesMeta = useMemo<SeriesMeta[]>(() => {
    return yAxisColumns.map((column, index) => ({
      key: column,
      color: CHART_COLORS[index % CHART_COLORS.length],
      gradientId: `${chartUid}-gradient-${index}`,
      yAxisId: useDualAxes && index === 1 ? "right" : "left"
    }));
  }, [yAxisColumns, chartUid, useDualAxes]);

  const chartContainerClasses = cn(
    "relative flex h-full max-h-[300px] w-full select-none justify-center",
    "aspect-video min-h-[0] text-xs",
    "[&_.recharts-surface]:outline-none [&_.recharts-layer]:outline-none",
    "[&_.recharts-cartesian-grid_line]:stroke-[rgba(148,163,184,0.35)]",
    "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-[rgba(148,163,184,0.35)]",
    "[&_.recharts-radial-bar-background-sector]:fill-[rgba(226,232,240,0.35)]",
    "[&_.recharts-tooltip-cursor]:fill-[rgba(148,163,184,0.12)]",
    "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[rgba(148,163,184,0.12)]",
    "[&_.recharts-bar-rectangle]:transition-opacity [&_.recharts-bar-rectangle:hover]:opacity-90",
    "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
    "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
    "[&_.recharts-legend-wrapper]:hidden"
  );

  const chartTypeDisplay = CHART_TYPE_META[chart.chartType];
  const aggregationDisplay = chart.aggregation
    ? AGGREGATION_LABEL[chart.aggregation]
    : "Raw values";

  const hasFilter = Boolean(chart.filterColumn && chart.filterValue);

  const aggregationOptions = useMemo<ChartSelectOption[]>(() => [
    { value: "none", label: "Raw values", description: "Use raw data without aggregation" },
    ...Object.entries(AGGREGATION_LABEL).map(([value, label]) => ({
      value,
      label,
      description: `Aggregate using ${label.toLowerCase()}`
    }))
  ], []);

  const chartTypeOptions = useMemo<ChartSelectOption[]>(() =>
    Object.entries(CHART_TYPE_META).map(([value, meta]) => ({
      value,
      label: meta.label
    }))
  , []);

  const groupByOptions = useMemo<ChartSelectOption[]>(() => {
    if (!datasetAnalysis?.columns?.length) {
      return [{ value: "none", label: "No grouping" }];
    }

    const candidates = datasetAnalysis.columns
      .filter(col => col.name !== chart.xAxis && col.uniqueCount <= 50)
      .map(col => ({
        value: col.name,
        label: humanizeColumnName(col.name),
        description: `Group by ${col.uniqueCount.toLocaleString()} unique values`
      }));

    return [
      { value: "none", label: "No grouping" },
      ...candidates
    ];
  }, [datasetAnalysis?.columns, chart.xAxis]);

  const aggregationValue = chart.aggregation ?? "none";
  const chartTypeValue = chart.chartType;
  const groupByValue = chart.groupBy ?? "none";

  const emitChartUpdate = useCallback((updates: Partial<DashboardChart>) => {
    const nextChart = { ...chart, ...updates } as DashboardChart;

    if (Array.isArray(nextChart.yAxis)) {
      if (nextChart.yAxis.length === 1) {
        nextChart.yAxis = nextChart.yAxis[0];
      } else if (nextChart.yAxis.length === 0) {
        nextChart.yAxis = yAxisColumns.length === 1 ? yAxisColumns[0] : yAxisColumns;
      }
    }

    onUpdate(nextChart);
  }, [chart, onUpdate, yAxisColumns]);

  const handleSeriesOptionSelect = useCallback((index: number, option: ChartSelectOption) => {
    if (option.value === METRIC_NONE_VALUE) {
      if (yAxisColumns.length <= 1) return;
      const nextColumns = yAxisColumns.filter((_, idx) => idx !== index);
      if (nextColumns.length === 0) return;
      emitChartUpdate({ yAxis: nextColumns.length === 1 ? nextColumns[0] : nextColumns });
      return;
    }

    const nextColumns = [...yAxisColumns];
    nextColumns[index] = option.value;
    emitChartUpdate({ yAxis: nextColumns.length === 1 ? nextColumns[0] : nextColumns });
  }, [emitChartUpdate, yAxisColumns]);

  const canAddSeries = useMemo(() => {
    if (chart.chartType === "pie") return false;
    return metricOptions.some(option => !yAxisColumns.includes(option.value));
  }, [chart.chartType, metricOptions, yAxisColumns]);

  const yAxisReadable = useMemo(() => {
    if (yAxisColumns.length === 0) return "selected metrics";
    return yAxisColumns
      .map(column => humanizeColumnName(column))
      .join(yAxisColumns.length > 1 ? " and " : "");
  }, [yAxisColumns]);

  const xAxisReadable = useMemo(() => humanizeColumnName(chart.xAxis), [chart.xAxis]);

  const groupByReadable = useMemo(
    () => (chart.groupBy ? humanizeColumnName(chart.groupBy) : undefined),
    [chart.groupBy]
  );

  const chartTitleId = `${chartUid}-title`;
  const chartDescriptionId = `${chartUid}-description`;
  const chartGeneratedDescriptionId = `${chartUid}-description-generated`;

  const generatedDescription = useMemo(() => {
    const detailSegments: string[] = [];
    const aggregationPrefix = chart.aggregation
      ? `${AGGREGATION_LABEL[chart.aggregation].toLowerCase()} of `
      : "";

    detailSegments.push(`${aggregationPrefix}${yAxisReadable} by ${xAxisReadable}`);

    if (groupByReadable) {
      detailSegments.push(`with ${groupByReadable} breakdown`);
    }

    if (hasFilter && chart.filterColumn) {
      detailSegments.push(
        `filtered to ${humanizeColumnName(chart.filterColumn)} equals ${String(chart.filterValue)}`
      );
    }

    if (chartData.length > 0) {
      detailSegments.push(
        `based on ${chartData.length.toLocaleString()} ${
          chartData.length === 1 ? "data point" : "data points"
        }`
      );
    }

    const chartLabel = chartTypeDisplay?.label ?? "Chart";
    return `${chartLabel} showing ${detailSegments.join(", ")}.`;
  }, [
    chart.aggregation,
    chart.filterColumn,
    chart.filterValue,
    chartData.length,
    chartTypeDisplay?.label,
    groupByReadable,
    hasFilter,
    xAxisReadable,
    yAxisReadable
  ]);

  const hasManualDescription = Boolean(chart.description && chart.description.trim().length > 0);
  const describedBy = hasManualDescription
    ? `${chartDescriptionId} ${chartGeneratedDescriptionId}`.trim()
    : chartDescriptionId;

  const handleAddSeries = useCallback(() => {
    const nextOption = metricOptions.find(option => !yAxisColumns.includes(option.value));
    if (!nextOption) return;
    const nextColumns = [...yAxisColumns, nextOption.value];
    emitChartUpdate({ yAxis: nextColumns });
  }, [emitChartUpdate, metricOptions, yAxisColumns]);

  const handleAggregationChange = useCallback((value: string) => {
    emitChartUpdate({
      aggregation: value === "none"
        ? undefined
        : value as DashboardChart["aggregation"]
    });
  }, [emitChartUpdate]);

  const handleChartTypeChange = useCallback((value: string) => {
    const nextType = value as DashboardChart["chartType"];
    if (nextType === "pie" && yAxisColumns.length > 1) {
      emitChartUpdate({ chartType: nextType, yAxis: yAxisColumns[0] });
    } else {
      emitChartUpdate({ chartType: nextType });
    }
  }, [emitChartUpdate, yAxisColumns]);

  const handleGroupByChange = useCallback((value: string) => {
    emitChartUpdate({
      groupBy: value === "none" ? undefined : value
    });
  }, [emitChartUpdate]);

  const handleFilterClear = useCallback(() => {
    emitChartUpdate({
      filterColumn: undefined,
      filterValue: undefined
    });
  }, [emitChartUpdate]);

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 16, right: 24, left: 24, bottom: 24 }
    };

    switch (chart.chartType) {
      case "line":
        return (
          <ReLineChart {...commonProps}>
            <CartesianGrid strokeDasharray="0" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey={chart.xAxis}
              tick={{ fill: LABEL_FILL, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <YAxis
              tick={{ fill: seriesMeta[0]?.color ?? LABEL_FILL, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <Tooltip cursor={{ stroke: GRID_STROKE }} contentStyle={TOOLTIP_STYLE} />
            {seriesMeta.map(series => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            ))}
          </ReLineChart>
        );

      case "area":
        return (
          <ReAreaChart {...commonProps}>
            <defs>
              {seriesMeta.map(series => (
                <linearGradient key={series.gradientId} id={series.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={series.color} stopOpacity={0.75} />
                  <stop offset="95%" stopColor={series.color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="0" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey={chart.xAxis}
              tick={{ fill: LABEL_FILL, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <YAxis
              tick={{ fill: seriesMeta[0]?.color ?? LABEL_FILL, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <Tooltip cursor={{ fill: CURSOR_FILL }} contentStyle={TOOLTIP_STYLE} />
            {seriesMeta.map(series => (
              <Area
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={3}
                fill={`url(#${series.gradientId})`}
                fillOpacity={0.85}
              />
            ))}
          </ReAreaChart>
        );

      case "pie":
        return (
          <RePieChart>
            <Pie
              data={chartData}
              dataKey={yAxisColumns[0]}
              nameKey={chart.xAxis}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              label={({ name }) => name}
              strokeWidth={0}
              paddingAngle={4}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </RePieChart>
        );

      case "scatter":
        return (
          <ReScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="0" stroke={GRID_STROKE} />
            <XAxis
              dataKey={chart.xAxis}
              type="number"
              tick={{ fill: LABEL_FILL, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <YAxis
              type="number"
              tick={{ fill: seriesMeta[0]?.color ?? LABEL_FILL, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <Tooltip cursor={{ stroke: GRID_STROKE }} contentStyle={TOOLTIP_STYLE} />
            {seriesMeta.map(series => (
              <Scatter
                key={series.key}
                name={series.key}
                data={chartData}
                fill={series.color}
                line={{ stroke: series.color }}
              />
            ))}
          </ReScatterChart>
        );

      case "horizontal_bar":
        return (
          <ReBarChart {...commonProps} layout="vertical" barGap={12} barCategoryGap={24}>
            <defs>
              {seriesMeta.map(series => (
                <linearGradient key={series.gradientId} id={series.gradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor={series.color} stopOpacity={0.85} />
                  <stop offset="95%" stopColor={series.color} stopOpacity={0.15} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="0" stroke={GRID_STROKE} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: LABEL_FILL, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <YAxis
              dataKey={chart.xAxis}
              type="category"
              tick={{ fill: LABEL_FILL, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip cursor={{ fill: CURSOR_FILL }} contentStyle={TOOLTIP_STYLE} />
            {seriesMeta.map(series => (
              <Bar
                key={series.key}
                dataKey={series.key}
                fill={`url(#${series.gradientId})`}
                stroke={series.color}
                strokeWidth={1}
                radius={[0, 8, 8, 0]}
              />
            ))}
          </ReBarChart>
        );

      case "bar":
      default:
        return (
          <ReBarChart {...commonProps} barGap={12} barCategoryGap={18}>
            <defs>
              {seriesMeta.map(series => (
                <linearGradient key={series.gradientId} id={series.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={series.color} stopOpacity={0.85} />
                  <stop offset="95%" stopColor={series.color} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="0" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey={chart.xAxis}
              tick={{ fill: LABEL_FILL, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: seriesMeta[0]?.color ?? LABEL_FILL, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            {useDualAxes ? (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: seriesMeta[1]?.color ?? LABEL_FILL, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickMargin={12}
              />
            ) : null}
            <Tooltip cursor={{ fill: CURSOR_FILL }} contentStyle={TOOLTIP_STYLE} />
            {seriesMeta.map(series => (
              <Bar
                key={series.key}
                yAxisId={series.yAxisId}
                dataKey={series.key}
                fill={`url(#${series.gradientId})`}
                stroke={series.color}
                strokeWidth={1}
                radius={[8, 8, 8, 8]}
                maxBarSize={48}
              />
            ))}
          </ReBarChart>
        );
    }
  };

  return (
    <Card
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white/95 text-slate-900 shadow-[0_12px_40px_-24px_rgba(15,23,42,0.45)] transition-colors",
        "dark:bg-[#171717] dark:text-slate-100 dark:shadow-[0_12px_40px_-20px_rgba(8,15,30,0.8)]"
      )}
      role="group"
      aria-labelledby={chartTitleId}
      aria-describedby={describedBy}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border pb-3">
        <div className="space-y-1">
          <CardTitle id={chartTitleId} className="text-base font-semibold leading-tight">
            {chart.title}
          </CardTitle>
          {hasManualDescription ? (
            <>
              <CardDescription id={chartDescriptionId} className="text-xs leading-relaxed">
                {chart.description}
              </CardDescription>
              <p id={chartGeneratedDescriptionId} className="sr-only">
                {generatedDescription}
              </p>
            </>
          ) : (
            <CardDescription id={chartDescriptionId} className="text-xs leading-relaxed">
              {generatedDescription}
            </CardDescription>
          )}
        </div>
        <div className="flex shrink-0 gap-1 text-slate-500">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:text-slate-900 dark:hover:text-slate-100"
            onClick={onEdit}
            aria-label="Edit chart"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-500 hover:text-red-400"
            onClick={onDelete}
            aria-label="Delete chart"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-slate-50/70 px-4 py-3 dark:bg-[#171717]">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {seriesMeta.map((series, index) => {
            const optionsForSeries: ChartSelectOption[] = [
              {
                value: METRIC_NONE_VALUE,
                label: "None",
                disabled: yAxisColumns.length <= 1
              },
              ...metricOptions.map(option => ({
                ...option,
                disabled:
                  yAxisColumns.includes(option.value) &&
                  yAxisColumns[index] !== option.value
              }))
            ];

            return (
              <ChartControlSelect
                key={`${series.key}-${index}`}
                value={series.key}
                fallbackLabel={humanizeColumnName(series.key)}
                options={optionsForSeries}
                accentColor={series.color}
                onOptionSelect={option => handleSeriesOptionSelect(index, option)}
              />
            );
          })}

          {canAddSeries ? (
            <button
              type="button"
              onClick={handleAddSeries}
              className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-border bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-border/80 hover:text-slate-800 dark:bg-[#171717] dark:text-slate-300 dark:hover:text-slate-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Add metric
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
          <ChartControlSelect
            value={aggregationValue}
            fallbackLabel={aggregationDisplay}
            options={aggregationOptions}
            icon={<FunctionSquare className="h-4 w-4" />}
            onValueChange={handleAggregationChange}
            align="end"
          />
          <ChartControlSelect
            value={groupByValue}
            fallbackLabel={chart.groupBy ? `Grouped by ${humanizeColumnName(chart.groupBy)}` : "No grouping"}
            options={groupByOptions}
            icon={<ListTree className="h-4 w-4" />}
            onValueChange={handleGroupByChange}
            align="end"
          />
          <ChartControlSelect
            value={chartTypeValue}
            fallbackLabel={chartTypeDisplay.label}
            options={chartTypeOptions}
            icon={chartTypeDisplay.icon}
            onValueChange={handleChartTypeChange}
            align="end"
          />
          <ChartFilterControl
            label={
              hasFilter
                ? `${humanizeColumnName(chart.filterColumn!)} = ${chart.filterValue}`
                : "Add filter"
            }
            icon={<Filter className="h-4 w-4" />}
            hasFilter={hasFilter}
            onEdit={onEdit}
            onClear={handleFilterClear}
          />
        </div>
      </div>

      <CardContent className="px-0 pb-4 pt-4">
        <div data-chart={chartUid} className={chartContainerClasses} style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface DynamicChartProps {
  chart: DashboardChart;
  data: any[];
  datasetAnalysis?: DatasetAnalysis | null;
  onUpdate: (chart: DashboardChart) => void;
  onEdit: () => void;
  onDelete: () => void;
}

interface ChartControlSelectProps {
  value: string;
  fallbackLabel: string;
  options: ChartSelectOption[];
  icon?: ReactNode;
  accentColor?: string;
  onValueChange?: (value: string) => void;
  onOptionSelect?: (option: ChartSelectOption) => void;
  align?: "start" | "end" | "center";
}

function ChartControlSelect({
  value,
  fallbackLabel,
  options,
  icon,
  accentColor,
  onValueChange,
  onOptionSelect,
  align = "start"
}: ChartControlSelectProps) {
  const selectedOption = options.find(option => option.value === value);
  const displayLabel = selectedOption?.label ?? fallbackLabel;

  const handleSelect = useCallback((option: ChartSelectOption) => {
    if (option.disabled) return;
    if (onOptionSelect) {
      onOptionSelect(option);
    } else if (onValueChange) {
      onValueChange(option.value);
    }
  }, [onOptionSelect, onValueChange]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex h-10 min-w-[160px] items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-border/80 hover:text-slate-900 dark:bg-[#171717] dark:text-slate-200 dark:hover:text-slate-100"
          )}
        >
          {accentColor ? (
            <span
              className="absolute inset-y-0 left-0 w-1.5 rounded-l-lg"
              style={{ backgroundColor: accentColor }}
            />
          ) : null}
          <span className={cn("flex flex-1 items-center gap-2 truncate", accentColor ? "pl-2" : "")}>
            {icon}
            <span className="truncate">{displayLabel}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 space-y-1 p-1" align={align}>
        {options.map(option => (
          <DropdownMenuItem
            key={option.value}
            disabled={option.disabled}
            onSelect={event => {
              event.preventDefault();
              handleSelect(option);
            }}
            className={cn(
              "flex flex-col items-start gap-1 rounded-md px-2 py-2 text-sm",
              option.value === value ? "bg-slate-100 dark:bg-slate-800" : ""
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="truncate">{option.label}</span>
              {option.value === value ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
            </div>
            {option.description ? (
              <span className="w-full truncate text-xs text-slate-500 dark:text-slate-400">
                {option.description}
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ChartFilterControlProps {
  label: string;
  icon?: ReactNode;
  hasFilter: boolean;
  onEdit: () => void;
  onClear: () => void;
}

function ChartFilterControl({ label, icon, hasFilter, onEdit, onClear }: ChartFilterControlProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-10 min-w-[150px] items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-border/80 hover:text-slate-900 dark:bg-[#171717] dark:text-slate-200 dark:hover:text-slate-100"
        >
          <span className="flex flex-1 items-center gap-2 truncate">
            {icon}
            <span className="truncate">{label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 p-1">
        <DropdownMenuItem
          disabled
          className="cursor-default text-xs text-slate-500 dark:text-slate-400"
        >
          {hasFilter ? label : "No filter applied"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={event => {
            event.preventDefault();
            onEdit();
          }}
          className="text-sm font-medium"
        >
          Edit filter…
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hasFilter}
          onSelect={event => {
            event.preventDefault();
            onClear();
          }}
          className="text-sm"
        >
          Clear filter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
