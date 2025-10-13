import type { DashboardMetricCard } from "@shared/schema";
import { ChevronRight } from "lucide-react";
import { calculateMetric, formatValue } from "@/lib/dataAnalyzer";

interface DynamicMetricCardProps {
  metric: DashboardMetricCard;
  data: any[];
  onEdit: () => void;
  onDelete: () => void;
}

export function DynamicMetricCard({ metric, data, onEdit, onDelete: _onDelete }: DynamicMetricCardProps) {
  const value = calculateMetric(data, metric.column, metric.calculation);
  const formattedValue = formatValue(value, metric.format);

  const comparisonColumnValue = metric.comparisonColumn
    ? calculateMetric(data, metric.comparisonColumn, metric.calculation)
    : undefined;
  const formattedComparisonColumnValue =
    typeof comparisonColumnValue === "number"
      ? formatValue(comparisonColumnValue, metric.format)
      : undefined;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="group relative flex h-[108px] w-full max-w-[220px] flex-col cursor-pointer select-none rounded-2xl bg-surface-elevated p-4 pe-3 shadow-xs ring-1 ring-border/60 transition-all duration-200 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div className="mb-2 flex h-4 items-center justify-between gap-1 text-left text-xs font-medium text-text-muted sm:text-sm md:text-base">
        <span className="truncate">{metric.title}</span>
        <div className="text-base text-text-subtle transition-opacity duration-200 group-hover:opacity-0">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-nowrap items-baseline gap-2 text-text-primary">
        <div className="text-3xl font-semibold tracking-tight">
          {formattedValue}
        </div>
        {formattedComparisonColumnValue ? (
          <span className="text-sm font-normal text-text-subtle">
            / {formattedComparisonColumnValue}
          </span>
        ) : null}
      </div>

      {metric.showChange && metric.comparisonValue !== undefined && (
        <div
          className={`mt-1 flex flex-nowrap items-center gap-0.5 text-sm font-medium ${
            metric.comparisonValue >= 0 ? "text-success" : "text-danger"
          }`}
        >
          <span className="shrink-0 transition-transform duration-300">
            {metric.comparisonValue >= 0 ? "↑" : "↓"}
          </span>
          <span>{Math.abs(metric.comparisonValue).toLocaleString()}%</span>
        </div>
      )}
    </button>
  );
}
