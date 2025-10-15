import { CSSProperties, ReactNode, useCallback, useId, useMemo, useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  CalendarClock,
  Check,
  ChevronDown,
  Edit2,
  Filter,
  FunctionSquare,
  Layers,
  LineChart as LineChartIcon,
  MoreVertical,
  PieChart as PieChartIcon,
  ScatterChart as ScatterChartIcon,
  Plus,
  Trash2,
  X
} from "lucide-react";
import type {
  DashboardChart,
  DashboardFilterRule,
  DashboardTimeRange,
  TemporalBucketInterval
} from "@shared/schema";
import { prepareChartData, prepareMultiColumnChartData, type DatasetAnalysis } from "@/lib/dataAnalyzer";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// Neon gradients inspired by Apple design
const NEON_GRADIENTS = {
  blueRise: { start: "#4AD1FF", end: "#248BFF", solid: "#4AD1FF" },
  purplePlume: { start: "#B064FF", end: "#6C2FFF", solid: "#9E77FF" },
  tealMint: { start: "#27E0B3", end: "#79FFDA", solid: "#2ED3A0" },
  magentaBar: { start: "#FF4FA2", end: "#FF7AC1", solid: "#FF6B9A" },
  amberHeat: { start: "#FFC24D", end: "#FF8A00", solid: "#FFB545" },
  indigoLoop: { start: "#5A66FF", end: "#9E77FF", solid: "#5CC8FF" },
  emeraldGlow: { start: "#52FF8F", end: "#27E0B3", solid: "#2ED3A0" },
  crimsonPulse: { start: "#FF6B9A", end: "#FF4FA2", solid: "#FF6B9A" }
} as const;

const CHART_COLORS = [
  "#4AD1FF", // blueRise
  "#2ED3A0", // tealMint
  "#9E77FF", // purplePlume
  "#FF6B9A", // magentaBar
  "#FFB545", // amberHeat
  "#5CC8FF", // indigoLoop
  "#52FF8F", // emeraldGlow
  "#FF4FA2"  // crimsonPulse
] as const;

const GRADIENT_KEYS = Object.keys(NEON_GRADIENTS) as (keyof typeof NEON_GRADIENTS)[];

const MAX_RAW_POINTS = 400;

type ColumnType = 'number' | 'string' | 'date' | 'boolean';

function downsampleData<T>(rows: T[], maxPoints = MAX_RAW_POINTS): T[] {
  if (rows.length <= maxPoints) {
    return rows;
  }

  const step = Math.ceil(rows.length / maxPoints);
  const downsampled: T[] = [];
  for (let index = 0; index < rows.length; index += step) {
    downsampled.push(rows[index]);
  }

  const lastItem = rows[rows.length - 1];
  if (downsampled[downsampled.length - 1] !== lastItem) {
    downsampled.push(lastItem);
  }

  return downsampled;
}

// Hook to get theme-aware chart colors
function useChartTheme() {
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

  return {
    gridStroke: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
    cursorFill: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
    labelFill: isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.85)",
    tooltipStyle: {
      backgroundColor: isDark ? "#1A1A1A" : "#FFFFFF",
      border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.12)",
      borderRadius: 12,
      color: isDark ? "#ffffff" : "#1A1A1A",
      fontSize: 12,
      padding: "10px 14px",
      boxShadow: isDark ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "0 4px 12px rgba(0, 0, 0, 0.1)"
    } as CSSProperties,
    tooltipLabelStyle: {
      color: isDark ? "#ffffff" : "#1A1A1A",
      fontWeight: 600
    } as CSSProperties,
    tooltipItemStyle: {
      color: isDark ? "#E6E6E6" : "#4D4D4D"
    } as CSSProperties,
  };
}

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

type ScatterAxisMeta = {
  xLabelMap: Map<number, string>;
  isTemporalAxis: boolean;
} | null;

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

interface NormalizedAxisValue {
  numericValue: number;
  label?: string;
  isTemporal: boolean;
}

const formatTemporalLabel = (timestamp: number, fallback?: string): string => {
  if (!Number.isFinite(timestamp)) {
    return fallback ?? "";
  }
  try {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    console.warn("Failed to format temporal label", error);
    return fallback ?? String(timestamp);
  }
};

const normalizeScatterAxisValue = (value: unknown): NormalizedAxisValue => {
  if (value == null || value === "") {
    return { numericValue: Number.NaN, isTemporal: false };
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return {
      numericValue: timestamp,
      label: formatTemporalLabel(timestamp),
      isTemporal: true
    };
  }

  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return { numericValue: value, label: String(value), isTemporal: false };
    }
    return { numericValue: Number.NaN, isTemporal: false };
  }

  const stringValue = String(value);
  const numeric = Number(stringValue);
  if (Number.isFinite(numeric)) {
    return { numericValue: numeric, label: stringValue, isTemporal: false };
  }

  const parsedDate = Date.parse(stringValue);
  if (!Number.isNaN(parsedDate)) {
    return {
      numericValue: parsedDate,
      label: formatTemporalLabel(parsedDate, stringValue),
      isTemporal: true
    };
  }

  return { numericValue: Number.NaN, isTemporal: false };
};

const MS_IN_HOUR = 60 * 60 * 1000;
const MS_IN_DAY = 24 * MS_IN_HOUR;
const MS_IN_WEEK = 7 * MS_IN_DAY;
const MS_IN_MONTH_APPROX = 30 * MS_IN_DAY;
const MS_IN_QUARTER_APPROX = 90 * MS_IN_DAY;
const MS_IN_YEAR_APPROX = 365 * MS_IN_DAY;

const TIME_PRESET_LABEL: Record<NonNullable<DashboardTimeRange["preset"]>, string> = {
  auto: "Auto",
  "7d": "Last 7 days",
  "14d": "Last 2 weeks",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "6m": "Last 6 months",
  "1y": "Last 12 months",
  ytd: "Year to date",
  all: "All time"
};

type TemporalBucketMeta = {
  labels: Map<string | number, string>;
  interval: TemporalBucketInterval;
  formatter: (value: string | number) => string;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
};

const parsePossibleDate = (value: unknown): number | null => {
  if (value == null) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const stringValue = String(value);
  if (!stringValue || stringValue.toLowerCase() === "nan") return null;
  const parsed = Date.parse(stringValue);
  return Number.isNaN(parsed) ? null : parsed;
};

const resolveTimePresetBounds = (
  preset: NonNullable<DashboardTimeRange["preset"]>,
  anchor: number
): { start?: number; end?: number } => {
  switch (preset) {
    case "7d":
      return { start: anchor - MS_IN_DAY * 7, end: anchor };
    case "14d":
      return { start: anchor - MS_IN_DAY * 14, end: anchor };
    case "30d":
      return { start: anchor - MS_IN_DAY * 30, end: anchor };
    case "90d":
      return { start: anchor - MS_IN_DAY * 90, end: anchor };
    case "6m":
      return { start: anchor - MS_IN_MONTH_APPROX * 6, end: anchor };
    case "1y":
      return { start: anchor - MS_IN_YEAR_APPROX, end: anchor };
    case "ytd": {
      const anchorDate = new Date(anchor);
      const yearStart = new Date(anchorDate.getFullYear(), 0, 1).getTime();
      return { start: yearStart, end: anchor };
    }
    case "auto":
    case "all":
    default:
      return { start: undefined, end: undefined };
  }
};

const resolveTimeRangeBounds = (
  rows: Record<string, unknown>[],
  axisKey: string,
  timeRange: DashboardTimeRange | undefined
): { start?: number; end?: number; preset?: DashboardTimeRange["preset"]; rollingDays?: number } => {
  if (!timeRange) return {};

  const timestamps: number[] = [];
  rows.forEach((row) => {
    const parsed = parsePossibleDate((row as Record<string, unknown>)[axisKey]);
    if (parsed != null) timestamps.push(parsed);
  });

  if (timestamps.length === 0) {
    const parsedStart = timeRange.start != null ? Date.parse(timeRange.start) : undefined;
    const parsedEnd = timeRange.end != null ? Date.parse(timeRange.end) : undefined;
    return {
      start: parsedStart !== undefined && Number.isFinite(parsedStart) ? parsedStart : undefined,
      end: parsedEnd !== undefined && Number.isFinite(parsedEnd) ? parsedEnd : undefined,
      preset: timeRange.preset,
      rollingDays: timeRange.rollingDays
    };
  }

  const anchor = Math.max(...timestamps);
  const boundsFromPreset =
    timeRange.preset && timeRange.preset !== "auto"
      ? resolveTimePresetBounds(timeRange.preset, anchor)
      : {};

  if (boundsFromPreset.start == null && boundsFromPreset.end == null && timeRange.rollingDays) {
    const range = MS_IN_DAY * timeRange.rollingDays;
    return {
      start: anchor - range,
      end: anchor,
      preset: timeRange.preset,
      rollingDays: timeRange.rollingDays
    };
  }

  const startExplicit = timeRange.start ? Date.parse(timeRange.start) : undefined;
  const endExplicit = timeRange.end ? Date.parse(timeRange.end) : undefined;

  const start = Number.isFinite(startExplicit) ? startExplicit : boundsFromPreset.start;
  const end = Number.isFinite(endExplicit) ? endExplicit : boundsFromPreset.end ?? (timeRange.preset ? anchor : undefined);

  return {
    start,
    end,
    preset: timeRange.preset,
    rollingDays: timeRange.rollingDays
  };
};

const filterRowsByTimeBounds = (
  rows: Record<string, unknown>[],
  axisKey: string,
  bounds: { start?: number; end?: number }
) => {
  if (bounds.start == null && bounds.end == null) return rows;
  return rows.filter((row) => {
    const value = (row as Record<string, unknown>)[axisKey];
    const timestamp = parsePossibleDate(value);
    if (timestamp == null) return false;
    if (bounds.start != null && timestamp < bounds.start) return false;
    if (bounds.end != null && timestamp > bounds.end) return false;
    return true;
  });
};

const resolveAutoBucketInterval = (spanMs: number, totalPoints: number): TemporalBucketInterval => {
  if (!Number.isFinite(spanMs) || spanMs <= 0) {
    return "day";
  }

  const targetBuckets = Math.max(12, Math.min(60, Math.floor(totalPoints / 4)));
  const approxBucketSize = spanMs / Math.max(1, targetBuckets);

  if (approxBucketSize <= MS_IN_HOUR) {
    return "hour";
  }
  if (approxBucketSize <= MS_IN_DAY) {
    return "day";
  }
  if (approxBucketSize <= MS_IN_WEEK) {
    return "week";
  }
  if (approxBucketSize <= MS_IN_MONTH_APPROX) {
    return "month";
  }
  if (approxBucketSize <= MS_IN_QUARTER_APPROX) {
    return "quarter";
  }
  return "year";
};

const floorTimestampToInterval = (timestamp: number, interval: TemporalBucketInterval): number => {
  const date = new Date(timestamp);
  switch (interval) {
    case "hour":
      date.setMinutes(0, 0, 0);
      return date.getTime();
    case "day":
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    case "week": {
      const day = date.getDay();
      const diff = (day + 6) % 7; // Monday as start of week
      date.setDate(date.getDate() - diff);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    }
    case "month":
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    case "quarter": {
      const month = date.getMonth();
      const quarterStartMonth = Math.floor(month / 3) * 3;
      date.setMonth(quarterStartMonth, 1);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    }
    case "year":
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    case "none":
    case "auto":
    default:
      return timestamp;
  }
};

const formatBucketLabel = (timestamp: number, interval: TemporalBucketInterval): string => {
  if (!Number.isFinite(timestamp)) return "";
  const date = new Date(timestamp);
  switch (interval) {
    case "hour":
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric"
      }).format(date);
    case "day":
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric"
      }).format(date);
    case "week": {
      const end = new Date(timestamp + MS_IN_WEEK - 1);
      const startLabel = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric"
      }).format(date);
      const endLabel = new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric"
      }).format(end);
      return `${startLabel} – ${endLabel}`;
    }
    case "month":
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        year: "numeric"
      }).format(date);
    case "quarter": {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    }
    case "year":
      return String(date.getFullYear());
    case "none":
    case "auto":
    default:
      return formatTemporalLabel(timestamp);
  }
};

const bucketTemporalRows = (
  rows: Record<string, unknown>[],
  axisKey: string,
  requestedInterval: TemporalBucketInterval | undefined,
  axisType: ColumnType
): { rows: Record<string, unknown>[]; bucketMeta: TemporalBucketMeta | null; resolvedInterval: TemporalBucketInterval } => {
  if (axisType !== "date") {
    return { rows, bucketMeta: null, resolvedInterval: "none" };
  }

  if (!requestedInterval || requestedInterval === "none") {
    const labels = new Map<string | number, string>();
    rows.forEach((row) => {
      const parsed = parsePossibleDate((row as Record<string, unknown>)[axisKey]);
      if (parsed != null) {
        const key = Number.isFinite(parsed) ? parsed : String(row[axisKey]);
        labels.set(key, formatTemporalLabel(parsed));
      }
    });

    return {
      rows: rows.map((row) => {
        const parsed = parsePossibleDate((row as Record<string, unknown>)[axisKey]);
        if (parsed == null) return row;
        return {
          ...row,
          [axisKey]: parsed
        };
      }),
      bucketMeta: {
        labels,
        interval: "none",
        formatter: (value) => {
          if (typeof value === "number") {
            return formatTemporalLabel(value);
          }
          const numeric = Number(value);
          if (Number.isFinite(numeric)) {
            return formatTemporalLabel(numeric);
          }
          return String(value ?? "");
        }
      },
      resolvedInterval: "none"
    };
  }

  const timestamps: number[] = [];
  rows.forEach((row) => {
    const parsed = parsePossibleDate((row as Record<string, unknown>)[axisKey]);
    if (parsed != null) timestamps.push(parsed);
  });

  if (timestamps.length === 0) {
    return { rows, bucketMeta: null, resolvedInterval: requestedInterval };
  }

  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const spanMs = maxTs - minTs;

  const resolvedInterval = requestedInterval === "auto"
    ? resolveAutoBucketInterval(spanMs, timestamps.length)
    : requestedInterval;

  const labels = new Map<string | number, string>();

  const processedRows = rows
    .map((row) => {
      const parsed = parsePossibleDate((row as Record<string, unknown>)[axisKey]);
      if (parsed == null) return null;
      const bucketTimestamp = floorTimestampToInterval(parsed, resolvedInterval);
      const label = formatBucketLabel(bucketTimestamp, resolvedInterval);
      const key = bucketTimestamp;
      labels.set(key, label);
      return {
        ...row,
        [axisKey]: bucketTimestamp
      };
    })
    .filter((row): row is Record<string, unknown> => row !== null);

  return {
    rows: processedRows,
    bucketMeta: {
      labels,
      interval: resolvedInterval,
      formatter: (value) => {
        const numeric = typeof value === "number" ? value : Number(value);
        if (Number.isFinite(numeric) && labels.has(numeric)) {
          return labels.get(numeric) ?? String(value ?? "");
        }
        return String(value ?? "");
      }
    },
    resolvedInterval
  };
};

const BOOLEAN_TRUE_VALUES = new Set(["true", "1", "yes", "y", "on"]);
const BOOLEAN_FALSE_VALUES = new Set(["false", "0", "no", "n", "off"]);

type FilterOperatorOption = {
  value: DashboardFilterRule["operator"];
  label: string;
  requiresValue?: boolean;
  requiresRange?: boolean;
};

const STRING_FILTER_OPERATORS: FilterOperatorOption[] = [
  { value: "equals", label: "Equals", requiresValue: true },
  { value: "not_equals", label: "Does not equal", requiresValue: true },
  { value: "contains", label: "Contains", requiresValue: true },
  { value: "not_contains", label: "Does not contain", requiresValue: true },
  { value: "starts_with", label: "Starts with", requiresValue: true },
  { value: "ends_with", label: "Ends with", requiresValue: true },
  { value: "in", label: "Matches any (comma separated)", requiresValue: true },
  { value: "is_null", label: "Is empty" },
  { value: "is_not_null", label: "Is not empty" }
];

const NUMBER_FILTER_OPERATORS: FilterOperatorOption[] = [
  { value: "equals", label: "Equals", requiresValue: true },
  { value: "not_equals", label: "Does not equal", requiresValue: true },
  { value: "greater_than", label: "Greater than", requiresValue: true },
  { value: "greater_than_or_equal", label: "Greater than or equal", requiresValue: true },
  { value: "less_than", label: "Less than", requiresValue: true },
  { value: "less_than_or_equal", label: "Less than or equal", requiresValue: true },
  { value: "between", label: "Between", requiresRange: true },
  { value: "in", label: "Matches any (comma separated)", requiresValue: true },
  { value: "is_null", label: "Is empty" },
  { value: "is_not_null", label: "Is not empty" }
];

const DATE_FILTER_OPERATORS: FilterOperatorOption[] = [
  { value: "equals", label: "Equals", requiresValue: true },
  { value: "not_equals", label: "Does not equal", requiresValue: true },
  { value: "greater_than", label: "After", requiresValue: true },
  { value: "greater_than_or_equal", label: "On or after", requiresValue: true },
  { value: "less_than", label: "Before", requiresValue: true },
  { value: "less_than_or_equal", label: "On or before", requiresValue: true },
  { value: "between", label: "Between", requiresRange: true },
  { value: "is_null", label: "Is empty" },
  { value: "is_not_null", label: "Is not empty" }
];

const BOOLEAN_FILTER_OPERATORS: FilterOperatorOption[] = [
  { value: "equals", label: "Is", requiresValue: true },
  { value: "not_equals", label: "Is not", requiresValue: true },
  { value: "is_null", label: "Is empty" },
  { value: "is_not_null", label: "Is not empty" }
];

const FILTER_OPERATORS_BY_TYPE: Record<ColumnType, FilterOperatorOption[]> = {
  string: STRING_FILTER_OPERATORS,
  number: NUMBER_FILTER_OPERATORS,
  date: DATE_FILTER_OPERATORS,
  boolean: BOOLEAN_FILTER_OPERATORS
};

const BUCKET_LABELS: Record<TemporalBucketInterval, string> = {
  none: "Raw timestamps",
  auto: "Automatic",
  hour: "Hourly",
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  quarter: "Quarterly",
  year: "Yearly"
};

const generateRuleId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `filter-${Math.random().toString(36).slice(2, 10)}`;
};

const getDefaultOperatorForType = (type: ColumnType): DashboardFilterRule["operator"] => {
  if (type === "number" || type === "date") {
    return "between";
  }
  if (type === "boolean") {
    return "equals";
  }
  return "equals";
};

const findOperatorOption = (type: ColumnType, operator: DashboardFilterRule["operator"]): FilterOperatorOption | undefined => {
  return FILTER_OPERATORS_BY_TYPE[type].find(option => option.value === operator);
};

const coerceValueForType = (value: unknown, type: ColumnType): unknown => {
  if (value == null) return null;
  switch (type) {
    case "number": {
      const numeric = toNumber(value);
      return numeric;
    }
    case "boolean": {
      if (typeof value === "boolean") return value;
      const stringValue = String(value).toLowerCase();
      if (BOOLEAN_TRUE_VALUES.has(stringValue)) return true;
      if (BOOLEAN_FALSE_VALUES.has(stringValue)) return false;
      return null;
    }
    case "date": {
      const timestamp = parsePossibleDate(value);
      return timestamp;
    }
    case "string":
    default:
      return String(value);
  }
};

const evaluateFilterRule = (
  row: Record<string, unknown>,
  rule: DashboardFilterRule,
  columnTypeLookup: Map<string, ColumnType>
): boolean => {
  const type = columnTypeLookup.get(rule.column) ?? "string";
  const rawValue = (row as Record<string, unknown>)[rule.column];
  const coercedRowValue = coerceValueForType(rawValue, type);

  if (rule.operator === "is_null") {
    return coercedRowValue == null || coercedRowValue === "";
  }
  if (rule.operator === "is_not_null") {
    return coercedRowValue != null && coercedRowValue !== "";
  }

  if (rule.operator === "between") {
    if (type === "date" || type === "number") {
      const numericValue = typeof coercedRowValue === "number" ? coercedRowValue : toNumber(coercedRowValue);
      if (numericValue == null || !Number.isFinite(numericValue)) return false;
      const start = rule.value == null ? Number.NEGATIVE_INFINITY : Number(coerceValueForType(rule.value, type));
      const end = rule.valueTo == null ? Number.POSITIVE_INFINITY : Number(coerceValueForType(rule.valueTo, type));
      return numericValue >= start && numericValue <= end;
    }
    return false;
  }

  if (rule.operator === "in") {
    const raw = rule.value;
    if (raw == null) return false;
    const values = Array.isArray(raw)
      ? raw.map((item) => String(item))
      : String(raw)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
    if (values.length === 0) return false;
    const candidate = String(coercedRowValue ?? "");
    return values.some((value) => value === candidate);
  }

  if (coercedRowValue == null || coercedRowValue === "") {
    return false;
  }

  const comparisonValue = rule.value;
  if (comparisonValue == null) return false;

  if (type === "number" || type === "date") {
    const numericRowValue = typeof coercedRowValue === "number" ? coercedRowValue : toNumber(coercedRowValue);
    if (numericRowValue == null) {
      return false;
    }
    const numericComparison = Number(coerceValueForType(comparisonValue, type));
    if (!Number.isFinite(numericRowValue) || !Number.isFinite(numericComparison)) {
      return false;
    }
    switch (rule.operator) {
      case "equals":
        return numericRowValue === numericComparison;
      case "not_equals":
        return numericRowValue !== numericComparison;
      case "greater_than":
        return numericRowValue > numericComparison;
      case "greater_than_or_equal":
        return numericRowValue >= numericComparison;
      case "less_than":
        return numericRowValue < numericComparison;
      case "less_than_or_equal":
        return numericRowValue <= numericComparison;
      default:
        return false;
    }
  }

  if (type === "boolean") {
    const booleanRow = Boolean(coercedRowValue);
    const booleanComparison = Boolean(coerceValueForType(comparisonValue, type));
    switch (rule.operator) {
      case "equals":
        return booleanRow === booleanComparison;
      case "not_equals":
        return booleanRow !== booleanComparison;
      default:
        return false;
    }
  }

  const rowString = String(coercedRowValue);
  const comparisonString = String(comparisonValue);
  const lhs = rule.caseSensitive ? rowString : rowString.toLowerCase();
  const rhs = rule.caseSensitive ? comparisonString : comparisonString.toLowerCase();

  switch (rule.operator) {
    case "equals":
      return lhs === rhs;
    case "not_equals":
      return lhs !== rhs;
    case "contains":
      return lhs.includes(rhs);
    case "not_contains":
      return !lhs.includes(rhs);
    case "starts_with":
      return lhs.startsWith(rhs);
    case "ends_with":
      return lhs.endsWith(rhs);
    default:
      return false;
  }
};

const applyFilterRules = (
  rows: Record<string, unknown>[],
  filters: DashboardFilterRule[] | undefined,
  columnTypeLookup: Map<string, ColumnType>
) => {
  if (!filters || filters.length === 0) return rows;
  return rows.filter((row) => filters.every((filter) => evaluateFilterRule(row, filter, columnTypeLookup)));
};

const formatFilterSummary = (
  filters: DashboardFilterRule[] | undefined,
  legacyFilter: { column?: string; value?: unknown } | undefined,
  columnTypeLookup: Map<string, ColumnType>
): string => {
  const segments: string[] = [];

  if (legacyFilter?.column && legacyFilter.value !== undefined && legacyFilter.value !== "") {
    segments.push(
      `${humanizeColumnName(legacyFilter.column)} = ${String(legacyFilter.value)}`
    );
  }

  if (filters && filters.length > 0) {
    const rulesSummary = filters
    .map((filter) => {
      const type = columnTypeLookup.get(filter.column) ?? "string";
      const operator = FILTER_OPERATORS_BY_TYPE[type].find((option) => option.value === filter.operator)?.label ?? filter.operator;
      const valuePart = (() => {
        if (filter.operator === "is_null" || filter.operator === "is_not_null") {
          return "";
        }
        if (filter.operator === "between") {
          const start = filter.value ?? "";
          const end = filter.valueTo ?? "";
          return `${start} and ${end}`;
        }
        if (Array.isArray(filter.value)) {
          return filter.value.join(", ");
        }
        return String(filter.value ?? "");
      })();
      return `${humanizeColumnName(filter.column)} ${operator.toLowerCase()} ${valuePart}`.trim();
    })
    .join(" · ");
    segments.push(rulesSummary);
  }

  if (segments.length === 0) return "No filters";
  return segments.join(" · ");
};

export function DynamicChart({
  chart,
  data,
  datasetAnalysis,
  onUpdate,
  onEdit,
  onDelete
}: DynamicChartProps) {
  const chartTheme = useChartTheme();
  const yAxisColumns = Array.isArray(chart.yAxis) ? chart.yAxis : [chart.yAxis];
  const isSingleColumn = yAxisColumns.length === 1;

  const [hasAggregationOverride, setHasAggregationOverride] = useState(() => chart.aggregation !== undefined);
  const previousXAxisRef = useRef(chart.xAxis);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isBucketDialogOpen, setIsBucketDialogOpen] = useState(false);

  const [filtersDraft, setFiltersDraft] = useState<DashboardFilterRule[]>(() => chart.filters ?? []);
  const [bucketDraft, setBucketDraft] = useState<TemporalBucketInterval>(() => chart.bucketInterval ?? (chart.xAxis ? "auto" : "none"));

  useEffect(() => {
    if (chart.aggregation !== undefined) {
      setHasAggregationOverride(true);
    }
  }, [chart.aggregation]);

  useEffect(() => {
    if (chart.xAxis !== previousXAxisRef.current) {
      previousXAxisRef.current = chart.xAxis;
      if (chart.aggregation === undefined) {
        setHasAggregationOverride(false);
      }
    }
  }, [chart.aggregation, chart.xAxis]);

  const columnTypeLookup = useMemo(() => {
    const map = new Map<string, ColumnType>();
    if (datasetAnalysis?.columns) {
      datasetAnalysis.columns.forEach((column) => {
        map.set(column.name, column.type as ColumnType);
      });
    }
    return map;
  }, [datasetAnalysis?.columns]);

  const xAxisType = columnTypeLookup.get(chart.xAxis) ?? 'string';
  const isCategoricalAxis = xAxisType === 'string' || xAxisType === 'boolean';
  const isTemporalAxis = xAxisType === 'date';

  const defaultAggregation = useMemo<DashboardChart["aggregation"]>(() => {
    if (chart.chartType === "scatter") {
      return undefined;
    }
    if (isCategoricalAxis) {
      return 'sum';
    }
    if (isTemporalAxis && yAxisColumns.length > 0) {
      return 'sum';
    }
    return undefined;
  }, [chart.chartType, isCategoricalAxis, isTemporalAxis, yAxisColumns.length]);

  const {
    rows: filteredData,
    bucketMeta,
    timeBounds,
    resolvedInterval
  } = useMemo(() => {
    const withLegacyFilter = (() => {
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
    })();

    const afterAdvancedFilters = applyFilterRules(
      withLegacyFilter,
      chart.filters,
      columnTypeLookup
    );

    const bounds = isTemporalAxis
      ? resolveTimeRangeBounds(afterAdvancedFilters, chart.xAxis, chart.timeRange)
      : {};
    const afterTimeFilter = isTemporalAxis
      ? filterRowsByTimeBounds(afterAdvancedFilters, chart.xAxis, bounds)
      : afterAdvancedFilters;

    const { rows: bucketedRows, bucketMeta, resolvedInterval } = bucketTemporalRows(
      afterTimeFilter,
      chart.xAxis,
      chart.bucketInterval,
      columnTypeLookup.get(chart.xAxis) ?? 'string'
    );

    return {
      rows: bucketedRows,
      bucketMeta,
      timeBounds: isTemporalAxis ? bounds : undefined,
      resolvedInterval
    };
  }, [chart.bucketInterval, chart.filterColumn, chart.filterValue, chart.filters, chart.timeRange, chart.xAxis, columnTypeLookup, data, isTemporalAxis]);

  const chartHeight =
    chart.size === "large" ? 360 :
    chart.size === "small" ? 220 : 300;

  const appliedAggregation: DashboardChart["aggregation"] | undefined = hasAggregationOverride
    ? chart.aggregation
    : (chart.aggregation ?? defaultAggregation);

  const { chartData, scatterAxisMeta } = useMemo(() => {
    const preparedRaw = isSingleColumn
      ? prepareChartData(filteredData, chart.xAxis, yAxisColumns[0], appliedAggregation)
      : prepareMultiColumnChartData(filteredData, chart.xAxis, yAxisColumns, appliedAggregation);

    const prepared = appliedAggregation ? preparedRaw : downsampleData(preparedRaw, MAX_RAW_POINTS);

    if (chart.chartType !== "scatter") {
      return { chartData: prepared, scatterAxisMeta: null };
    }

    const nextData: Record<string, unknown>[] = [];
    const xLabelMap = new Map<number, string>();
    let usesTemporalAxis = false;

    prepared.forEach((row) => {
      const rawXValue = (row as Record<string, unknown>)[chart.xAxis];
      const { numericValue, label, isTemporal } = normalizeScatterAxisValue(rawXValue);
      if (!Number.isFinite(numericValue)) {
        return;
      }

      const nextRow: Record<string, unknown> = {
        ...row,
        [chart.xAxis]: numericValue
      };

      let hasInvalidMetric = false;
      yAxisColumns.forEach((metric) => {
        const numericValue = Number((row as Record<string, unknown>)[metric]);
        if (!Number.isFinite(numericValue)) {
          hasInvalidMetric = true;
          return;
        }
        nextRow[metric] = numericValue;
      });

      if (!hasInvalidMetric) {
        let resolvedLabel = label;
        let resolvedIsTemporal = isTemporal;

        if (bucketMeta) {
          const bucketValue =
            typeof rawXValue === "number" || typeof rawXValue === "string"
              ? bucketMeta.formatter(rawXValue)
              : undefined;

          if (bucketMeta.labels?.has(numericValue)) {
            resolvedLabel = bucketMeta.labels.get(numericValue) ?? bucketValue ?? resolvedLabel;
          } else if (bucketValue) {
            resolvedLabel = bucketValue;
          }

          resolvedIsTemporal = true;
        }

        if (resolvedLabel !== undefined) {
          xLabelMap.set(numericValue, resolvedLabel);
        }
        if (resolvedIsTemporal) {
          usesTemporalAxis = true;
        }
        nextData.push(nextRow);
      }
    });

    return {
      chartData: appliedAggregation ? nextData : downsampleData(nextData, MAX_RAW_POINTS),
      scatterAxisMeta: {
        xLabelMap,
        isTemporalAxis: usesTemporalAxis
      }
    };
  }, [appliedAggregation, bucketMeta, chart.chartType, chart.xAxis, filteredData, isSingleColumn, yAxisColumns]);

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
    return yAxisColumns.map((column, index) => {
      const gradientKey = GRADIENT_KEYS[index % GRADIENT_KEYS.length];
      const gradient = NEON_GRADIENTS[gradientKey];
      return {
        key: column,
        color: gradient.solid,
        gradientId: `${chartUid}-gradient-${index}`,
        yAxisId: useDualAxes && index === 1 ? "right" : "left"
      };
    });
  }, [yAxisColumns, chartUid, useDualAxes]);

  const chartContainerClasses = cn(
    "relative flex h-full max-h-[300px] w-full select-none justify-center",
    "aspect-video min-h-[0] text-xs",
    "[&_.recharts-surface]:outline-none [&_.recharts-layer]:outline-none",
    // Subtle grid and background styling
    "[&_.recharts-cartesian-grid_line]:stroke-[rgba(255,255,255,0.08)]",
    "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-[rgba(255,255,255,0.08)]",
    "[&_.recharts-radial-bar-background-sector]:fill-[rgba(255,255,255,0.03)]",
    // Tooltip cursor
    "[&_.recharts-tooltip-cursor]:fill-[rgba(255,255,255,0.05)]",
    "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[rgba(255,255,255,0.05)]",
    // Bar interactions
    "[&_.recharts-bar-rectangle]:transition-all [&_.recharts-bar-rectangle]:duration-200",
    "[&_.recharts-bar-rectangle:hover]:opacity-90",
    // Clean strokes
    "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
    "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
    "[&_.recharts-legend-wrapper]:hidden",
    // Pie chart labels
    "[&_.recharts-pie-label-text]:fill-white/90 [&_.recharts-pie-label-text]:text-xs [&_.recharts-pie-label-text]:font-medium"
  );

  const formatXAxisValue = useCallback(
    (value: unknown): string => {
      if (value == null || value === "") return "";

      const primitive =
        typeof value === "number" || typeof value === "string" ? value : String(value);

      if (bucketMeta) {
        const formatted = bucketMeta.formatter(primitive as string | number);
        if (formatted && formatted.length > 0) {
          return formatted;
        }
      }

      if (isTemporalAxis) {
        const numeric = typeof primitive === "number" ? primitive : Number(primitive);
        if (Number.isFinite(numeric)) {
          return formatTemporalLabel(numeric, String(primitive));
        }
        const parsed = Date.parse(String(primitive));
        if (!Number.isNaN(parsed)) {
          return formatTemporalLabel(parsed, String(primitive));
        }
      }

      return String(primitive);
    },
    [bucketMeta, isTemporalAxis]
  );

  const chartTypeDisplay = CHART_TYPE_META[chart.chartType];
  const aggregationDisplay = appliedAggregation
    ? AGGREGATION_LABEL[appliedAggregation]
    : "Raw values";
  const aggregationSummaryLabel = hasAggregationOverride
    ? aggregationDisplay
    : `Auto · ${aggregationDisplay}`;

  const hasFilter = Boolean(chart.filterColumn && chart.filterValue);

  const aggregationOptions = useMemo<ChartSelectOption[]>(() => {
    return [
      {
        value: "auto",
        label: "Auto",
        description: chart.chartType === "scatter"
          ? "Plot raw values without aggregation"
          : isCategoricalAxis
            ? "Automatically group categories by sum"
            : isTemporalAxis
              ? "Automatically roll up dates with a sum"
              : "Let Mono pick a sensible aggregation"
      },
      {
        value: "none",
        label: "Raw values",
        description: filteredData.length > MAX_RAW_POINTS
          ? `Show every row (downsampled to ${MAX_RAW_POINTS} points)`
          : "Show every row"
      },
      ...Object.entries(AGGREGATION_LABEL).map(([value, label]) => ({
        value,
        label,
        description: `Aggregate using ${label.toLowerCase()}`
      }))
    ];
  }, [chart.chartType, filteredData.length, isCategoricalAxis, isTemporalAxis]);

  const chartTypeOptions = useMemo<ChartSelectOption[]>(() =>
    Object.entries(CHART_TYPE_META).map(([value, meta]) => ({
      value,
      label: meta.label
    }))
  , []);

  const aggregationValue = hasAggregationOverride
    ? (appliedAggregation ?? "none")
    : "auto";
  const chartTypeValue = chart.chartType;

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

  const chartTitleId = `${chartUid}-title`;
  const chartDescriptionId = `${chartUid}-description`;
  const chartGeneratedDescriptionId = `${chartUid}-description-generated`;

  const generatedDescription = useMemo(() => {
    const detailSegments: string[] = [];
    const aggregationPrefix = appliedAggregation
      ? `${AGGREGATION_LABEL[appliedAggregation].toLowerCase()} of `
      : "";

    detailSegments.push(`${aggregationPrefix}${yAxisReadable} by ${xAxisReadable}`);

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
    if (value === "auto") {
      setHasAggregationOverride(false);
      emitChartUpdate({ aggregation: undefined });
      return;
    }

    setHasAggregationOverride(true);
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

  const activeTimePreset = chart.timeRange?.preset ?? "auto";
  const timePresetOptions: Array<{ value: NonNullable<DashboardTimeRange["preset"]>; label: string }> = [
    { value: "auto", label: "Auto" },
    { value: "7d", label: "7D" },
    { value: "14d", label: "2W" },
    { value: "30d", label: "4W" },
    { value: "90d", label: "3M" },
    { value: "6m", label: "6M" },
    { value: "1y", label: "1Y" },
    { value: "all", label: "All" }
  ];

  const handleTimePresetChange = useCallback((preset: NonNullable<DashboardTimeRange["preset"]>) => {
    if (preset === "auto") {
      emitChartUpdate({ timeRange: undefined });
    } else {
      emitChartUpdate({ timeRange: { preset } });
    }
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
            <CartesianGrid strokeDasharray="0" stroke={chartTheme.gridStroke} vertical={false} />
            <XAxis
              dataKey={chart.xAxis}
              tick={{ fill: chartTheme.labelFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              tickFormatter={(value) => formatXAxisValue(value)}
            />
            <YAxis
              tick={{ fill: chartTheme.labelFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <Tooltip 
              cursor={{ stroke: chartTheme.gridStroke }} 
              contentStyle={chartTheme.tooltipStyle}
              labelStyle={chartTheme.tooltipLabelStyle}
              itemStyle={chartTheme.tooltipItemStyle}
              labelFormatter={(value) => formatXAxisValue(value)}
            />
            {seriesMeta.map(series => (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={2.5}
                dot={{ r: 4, fill: series.color, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0, fill: series.color }}
              />
            ))}
          </ReLineChart>
        );

      case "area":
        return (
          <ReAreaChart {...commonProps}>
            <defs>
              {seriesMeta.map((series) => (
                <linearGradient key={series.gradientId} id={series.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={series.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={series.color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="0" stroke={chartTheme.gridStroke} vertical={false} />
            <XAxis
              dataKey={chart.xAxis}
              tick={{ fill: chartTheme.labelFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              tickFormatter={(value) => formatXAxisValue(value)}
            />
            <YAxis
              tick={{ fill: chartTheme.labelFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <Tooltip 
              cursor={{ fill: chartTheme.cursorFill }} 
              contentStyle={chartTheme.tooltipStyle}
              labelStyle={chartTheme.tooltipLabelStyle}
              itemStyle={chartTheme.tooltipItemStyle}
              labelFormatter={(value) => formatXAxisValue(value)}
            />
            {seriesMeta.map(series => (
              <Area
                key={series.key}
                type="monotone"
                dataKey={series.key}
                stroke={series.color}
                strokeWidth={2.5}
                fill={`url(#${series.gradientId})`}
                fillOpacity={1}
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
              innerRadius={54}
              outerRadius={88}
              label={({ name }) => formatXAxisValue(name)}
              strokeWidth={0}
              paddingAngle={3}
            >
              {chartData.map((entry, index) => {
                const colorIndex = index % CHART_COLORS.length;
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CHART_COLORS[colorIndex]}
                  />
                );
              })}
            </Pie>
            <Tooltip 
              contentStyle={chartTheme.tooltipStyle}
              labelStyle={chartTheme.tooltipLabelStyle}
              itemStyle={chartTheme.tooltipItemStyle}
              labelFormatter={(value) => formatXAxisValue(value)}
            />
          </RePieChart>
        );

      case "scatter":
        return (
          <ReScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="0" stroke={chartTheme.gridStroke} />
            <XAxis
              dataKey={chart.xAxis}
              type="number"
              tick={{ fill: chartTheme.labelFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              tickFormatter={(value: number) => {
                if (!Number.isFinite(value)) return "";
                if (scatterAxisMeta?.xLabelMap?.has(value)) {
                  return scatterAxisMeta.xLabelMap.get(value) ?? "";
                }
                if (scatterAxisMeta?.isTemporalAxis) {
                  return formatTemporalLabel(value);
                }
                return formatXAxisValue(value);
              }}
            />
            <YAxis
              type="number"
              tick={{ fill: chartTheme.labelFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <Tooltip 
              cursor={{ stroke: chartTheme.gridStroke }} 
              contentStyle={chartTheme.tooltipStyle}
              labelStyle={chartTheme.tooltipLabelStyle}
              itemStyle={chartTheme.tooltipItemStyle}
              labelFormatter={(value) => {
                const numericValue = typeof value === "number" ? value : Number(value);
                if (!Number.isFinite(numericValue)) {
                  return formatXAxisValue(value);
                }
                if (scatterAxisMeta?.xLabelMap?.has(numericValue)) {
                  return scatterAxisMeta.xLabelMap.get(numericValue) ?? "";
                }
                if (scatterAxisMeta?.isTemporalAxis) {
                  return formatTemporalLabel(numericValue);
                }
                return formatXAxisValue(value);
              }}
            />
            {seriesMeta.map(series => (
              <Scatter
                key={series.key}
                name={series.key}
                dataKey={series.key}
                data={chartData}
                fill={series.color}
              />
            ))}
          </ReScatterChart>
        );

      case "horizontal_bar":
        return (
          <ReBarChart {...commonProps} layout="vertical" barGap={12} barCategoryGap={24}>
            <CartesianGrid strokeDasharray="0" stroke={chartTheme.gridStroke} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: chartTheme.labelFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            <YAxis
              dataKey={chart.xAxis}
              type="category"
              tick={{ fill: chartTheme.labelFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={120}
              tickFormatter={(value) => formatXAxisValue(value)}
            />
            <Tooltip 
              cursor={{ fill: chartTheme.cursorFill }} 
              contentStyle={chartTheme.tooltipStyle}
              labelStyle={chartTheme.tooltipLabelStyle}
              itemStyle={chartTheme.tooltipItemStyle}
              labelFormatter={(value) => formatXAxisValue(value)}
            />
            {seriesMeta.map(series => (
              <Bar
                key={series.key}
                dataKey={series.key}
                fill={series.color}
                strokeWidth={0}
                radius={[0, 8, 8, 0]}
              />
            ))}
          </ReBarChart>
        );

      case "bar":
      default:
        return (
          <ReBarChart {...commonProps} barGap={12} barCategoryGap={18}>
            <CartesianGrid strokeDasharray="0" stroke={chartTheme.gridStroke} vertical={false} />
            <XAxis
              dataKey={chart.xAxis}
              tick={{ fill: chartTheme.labelFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              tickFormatter={(value) => formatXAxisValue(value)}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: chartTheme.labelFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={12}
            />
            {useDualAxes ? (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: chartTheme.labelFill, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickMargin={12}
              />
            ) : null}
            <Tooltip 
              cursor={{ fill: chartTheme.cursorFill }} 
              contentStyle={chartTheme.tooltipStyle}
              labelStyle={chartTheme.tooltipLabelStyle}
              itemStyle={chartTheme.tooltipItemStyle}
              labelFormatter={(value) => formatXAxisValue(value)}
            />
            {seriesMeta.map(series => (
              <Bar
                key={series.key}
                yAxisId={series.yAxisId}
                dataKey={series.key}
                fill={series.color}
                strokeWidth={0}
                radius={[8, 8, 0, 0]}
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
        "relative flex flex-col overflow-hidden rounded-2xl transition-colors",
        "bg-surface-muted border border-border",
        "text-foreground"
      )}
      role="group"
      aria-labelledby={chartTitleId}
      aria-describedby={describedBy}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border pb-3">
        <div className="space-y-1">
          <CardTitle id={chartTitleId} className="text-base font-semibold leading-tight text-foreground">
            {chart.title}
          </CardTitle>
          {hasManualDescription ? (
            <>
              <CardDescription id={chartDescriptionId} className="text-xs leading-relaxed text-text-muted">
                {chart.description}
              </CardDescription>
              <p id={chartGeneratedDescriptionId} className="sr-only">
                {generatedDescription}
              </p>
            </>
          ) : (
            <CardDescription id={chartDescriptionId} className="text-xs leading-relaxed text-text-muted">
              {generatedDescription}
            </CardDescription>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-text-subtle">
          {isTemporalAxis ? (
            <div className="flex items-center gap-1 rounded-[12px] border border-white/10 bg-white/[0.04] p-1">
              {timePresetOptions.map((option) => {
                const isActive =
                  activeTimePreset === option.value ||
                  (!chart.timeRange && option.value === "auto");
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleTimePresetChange(option.value)}
                    className={cn(
                      "rounded-[10px] px-2.5 py-1 text-[11px] font-semibold transition",
                      isActive
                        ? "bg-foreground text-background shadow-sm"
                        : "text-text-subtle hover:text-foreground hover:bg-white/10"
                    )}
                    aria-pressed={isActive}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-surface-muted hover:text-foreground transition-colors"
                aria-label="Chart options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={onEdit}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
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
              className="flex h-10 items-center gap-2 rounded-[12px] border border-dashed border-border bg-surface-subtle px-3 text-xs font-semibold text-text-muted transition hover:border-border-strong hover:bg-surface-elevated hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add metric
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
          <ChartControlSelect
            value={aggregationValue}
            fallbackLabel={aggregationSummaryLabel}
            options={aggregationOptions}
            icon={<FunctionSquare className="h-4 w-4" />}
            onValueChange={handleAggregationChange}
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
            "relative flex h-10 items-center justify-between gap-2 rounded-[12px] transition-all overflow-hidden",
            "bg-white/[0.06] border border-white/10",
            "text-xs font-semibold text-foreground",
            "hover:bg-surface-elevated hover:border-border-strong"
          )}
        >
          {accentColor ? (
            <span
              className="absolute inset-y-0 left-0 w-[5px]"
              style={{ 
                backgroundColor: accentColor,
                borderTopLeftRadius: '126px',
                borderBottomLeftRadius: '1px'
              }}
            />
          ) : null}
          <span className={cn("flex items-center gap-2 whitespace-nowrap", accentColor ? "pl-4 pr-3" : "px-3")}>
            {icon}
            <span>{displayLabel}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-text-subtle mr-3" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 space-y-1 p-1.5 bg-surface-elevated border-border" 
        align={align}
      >
        {options.map(option => (
          <DropdownMenuItem
            key={option.value}
            disabled={option.disabled}
            onSelect={event => {
              event.preventDefault();
              handleSelect(option);
            }}
            className={cn(
              "flex flex-col items-start gap-1 rounded-md px-2.5 py-2 text-sm cursor-pointer",
              "transition-colors text-foreground",
              option.value === value 
                ? "bg-white/10" 
                : "hover:bg-white/[0.06]",
              option.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="truncate">{option.label}</span>
              {option.value === value ? <Check className="h-3.5 w-3.5 text-[#4AD1FF]" /> : null}
            </div>
            {option.description ? (
              <span className="w-full truncate text-xs text-text-muted">
                {option.description}
              </span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
