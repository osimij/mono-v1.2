import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, TrendingUp, Users, BarChart3, Activity, Target, Loader2 } from "lucide-react";
import type { DashboardMetricCard } from "@shared/schema";
import type { ColumnInfo } from "@/lib/dataAnalyzer";

interface AddMetricCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (metric: DashboardMetricCard) => void;
  datasets: Array<{ id: number; label: string }>;
  resolveDatasetColumns: (datasetId: number) => Promise<ColumnInfo[]>;
  existingMetric?: DashboardMetricCard;
}

const CALCULATION_OPTIONS = [
  { value: 'sum', label: 'Sum', description: 'Add all values' },
  { value: 'average', label: 'Average', description: 'Mean of all values' },
  { value: 'count', label: 'Count', description: 'Total number of rows' },
  { value: 'max', label: 'Maximum', description: 'Highest value' },
  { value: 'min', label: 'Minimum', description: 'Lowest value' },
  { value: 'median', label: 'Median', description: 'Middle value' },
  { value: 'distinct_count', label: 'Distinct Count', description: 'Unique values' }
];

const FORMAT_OPTIONS = [
  { value: 'number', label: 'Number (1,234.56)' },
  { value: 'currency', label: 'Currency ($1,235)' },
  { value: 'percentage', label: 'Percentage (12.34%)' }
];

const ICON_OPTIONS = [
  { value: 'dollar', label: 'Dollar Sign', icon: DollarSign },
  { value: 'users', label: 'Users', icon: Users },
  { value: 'chart', label: 'Chart', icon: BarChart3 },
  { value: 'activity', label: 'Activity', icon: Activity },
  { value: 'target', label: 'Target', icon: Target },
  { value: 'trending', label: 'Trending', icon: TrendingUp }
];

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', class: 'text-blue-500' },
  { value: 'green', label: 'Green', class: 'text-green-500' },
  { value: 'purple', label: 'Purple', class: 'text-purple-500' },
  { value: 'orange', label: 'Orange', class: 'text-orange-500' },
  { value: 'red', label: 'Red', class: 'text-red-500' },
  { value: 'pink', label: 'Pink', class: 'text-pink-500' }
];

export function AddMetricCardDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  datasets,
  resolveDatasetColumns,
  existingMetric 
}: AddMetricCardDialogProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(existingMetric?.datasetId ?? (datasets[0]?.id ?? null));
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsError, setColumnsError] = useState<string | null>(null);
  const [title, setTitle] = useState(existingMetric?.title || "");
  const [column, setColumn] = useState(existingMetric?.column || "");
  const [calculation, setCalculation] = useState<string>(existingMetric?.calculation || "sum");
  const [format, setFormat] = useState<string>(existingMetric?.format || "number");
  const [icon, setIcon] = useState(existingMetric?.icon || "chart");
  const [color, setColor] = useState(existingMetric?.color || "blue");

  const selectedDatasetLabel = useMemo(() => {
    if (selectedDatasetId == null) return undefined;
    return datasets.find((ds) => ds.id === selectedDatasetId)?.label;
  }, [datasets, selectedDatasetId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (existingMetric) {
      setSelectedDatasetId(existingMetric.datasetId);
      setTitle(existingMetric.title);
      setColumn(existingMetric.column);
      setCalculation(existingMetric.calculation);
      setFormat(existingMetric.format || "number");
      setIcon(existingMetric.icon || "chart");
      setColor(existingMetric.color || "blue");
    } else {
      resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingMetric?.id]);

  useEffect(() => {
    if (selectedDatasetId == null) {
      setAvailableColumns([]);
      return;
    }

    let isActive = true;
    setColumnsLoading(true);
    setColumnsError(null);

    resolveDatasetColumns(selectedDatasetId)
      .then((columns) => {
        if (!isActive) return;
        setAvailableColumns(columns);
        if (columns.length > 0 && !columns.some((c) => c.name === column)) {
          setColumn(columns[0].name);
        }
      })
      .catch(() => {
        if (!isActive) return;
        setAvailableColumns([]);
        setColumnsError("Unable to load dataset columns. Please try again.");
      })
      .finally(() => {
        if (isActive) {
          setColumnsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDatasetId, resolveDatasetColumns]);

  const handleSave = () => {
    if (!title || !column || selectedDatasetId == null) return;

    const metric: DashboardMetricCard = {
      id: existingMetric?.id || `metric_${Date.now()}`,
      datasetId: selectedDatasetId,
      datasetName: selectedDatasetLabel,
      title,
      column,
      calculation: calculation as any,
      format: format as any,
      icon,
      color,
      showChange: false
    };

    onSave(metric);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    if (!existingMetric) {
      setTitle("");
      setColumn("");
      setCalculation("sum");
      setFormat("number");
      setIcon("chart");
      setColor("blue");
      setSelectedDatasetId(datasets[0]?.id ?? null);
      setColumnsError(null);
    }
  };

  const numericColumns = useMemo(
    () => availableColumns.filter((c) => c.type === 'number'),
    [availableColumns]
  );

  // Determine which columns to show based on calculation
  const filteredColumns = useMemo(() => {
    if (['count', 'distinct_count'].includes(calculation)) {
      return availableColumns;
    }
    return numericColumns;
  }, [availableColumns, calculation, numericColumns]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingMetric ? 'Edit Metric Card' : 'Add Metric Card'}
          </DialogTitle>
          <DialogDescription>
            Configure a metric card to display a calculated value from your data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Dataset */}
          <div className="space-y-2">
            <Label htmlFor="dataset">Dataset</Label>
            <Select
              value={selectedDatasetId != null ? String(selectedDatasetId) : undefined}
              onValueChange={(value) => setSelectedDatasetId(Number(value))}
            >
              <SelectTrigger id="dataset">
                <SelectValue placeholder="Select dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets.length === 0 ? (
                  <div className="p-2 text-sm text-text-muted">
                    No datasets available
                  </div>
                ) : (
                  datasets.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id.toString()}>
                      {ds.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Card Title</Label>
            <Input
              id="title"
              placeholder="e.g., Total Revenue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Calculation Type */}
          <div className="space-y-2">
            <Label htmlFor="calculation">Calculation</Label>
            <Select value={calculation} onValueChange={setCalculation}>
              <SelectTrigger id="calculation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CALCULATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-text-muted">{opt.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Column Selection */}
          <div className="space-y-2">
            <Label htmlFor="column">Column</Label>
            <div className="space-y-2">
              <Select value={column} onValueChange={setColumn} disabled={columnsLoading || filteredColumns.length === 0}>
                <SelectTrigger id="column">
                  <SelectValue placeholder={columnsLoading ? "Loading columns..." : "Select a column"} />
                </SelectTrigger>
                <SelectContent>
                  {columnsLoading ? (
                    <div className="flex items-center gap-2 p-2 text-sm text-text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading columns...
                    </div>
                  ) : filteredColumns.length === 0 ? (
                    <div className="p-2 text-sm text-text-muted">
                      No {['count', 'distinct_count'].includes(calculation) ? '' : 'numeric '}columns available
                    </div>
                  ) : (
                    filteredColumns.map(col => (
                      <SelectItem key={col.name} value={col.name}>
                        <div>
                          <span className="font-medium">{col.name}</span>
                          <span className="text-xs text-text-muted ml-2">({col.type})</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {columnsError ? (
                <p className="text-xs text-danger">{columnsError}</p>
              ) : null}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-2">
            <Label htmlFor="format">Display Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_OPTIONS.map(opt => {
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setIcon(opt.value)}
                    className={`p-3 rounded-lg border-2 transition-colors flex items-center justify-center ${
                      icon === opt.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border/80'
                    }`}
                    title={opt.label}
                  >
                    <IconComponent className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setColor(opt.value)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    color === opt.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-border/80'
                  }`}
                  title={opt.label}
                >
                  <div className={`w-6 h-6 rounded-full ${opt.class} bg-current`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title || !column}>
            {existingMetric ? 'Update' : 'Add'} Metric
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
