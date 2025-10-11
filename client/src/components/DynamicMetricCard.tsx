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
      className="group relative flex h-[97px] w-full max-w-[190px] flex-col cursor-pointer select-none rounded-xl border border-gray-200 bg-white pb-2 pe-1 ps-4 pt-4 transition-colors [@media(hover:hover)]:hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:[@media(hover:hover)]:hover:bg-gray-900"
    >
      <div className="mb-2 flex h-4 items-center justify-between gap-1 text-left text-xs font-medium text-gray-900 sm:text-sm md:text-base dark:text-white">
        <span className="truncate">{metric.title}</span>
        <div className="text-base text-gray-500 transition group-hover:hidden dark:text-gray-400">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-nowrap items-baseline gap-2 text-gray-900 dark:text-white">
        <div className="text-3xl font-bold tracking-tight">
          {formattedValue}
        </div>
        {formattedComparisonColumnValue ? (
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
            / {formattedComparisonColumnValue}
          </span>
        ) : null}
      </div>

      {metric.showChange && metric.comparisonValue !== undefined && (
        <div
          className={`mt-1 flex flex-nowrap items-center gap-0.5 text-sm font-medium ${
            metric.comparisonValue >= 0
              ? "text-green-600 dark:text-green-500"
              : "text-red-600 dark:text-red-500"
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

