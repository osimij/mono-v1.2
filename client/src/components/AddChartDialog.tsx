import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart3, LineChart, PieChart, ScatterChart, AreaChart, X, Loader2 } from "lucide-react";
import type { DashboardChart } from "@shared/schema";
import type { ColumnInfo } from "@/lib/dataAnalyzer";
import { getRecommendedChartType } from "@/lib/dataAnalyzer";

interface AddChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (chart: DashboardChart) => void;
  datasets: Array<{ id: number; label: string }>;
  resolveDatasetColumns: (datasetId: number) => Promise<ColumnInfo[]>;
  existingChart?: DashboardChart;
}

const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart', icon: BarChart3, description: 'Compare values across categories' },
  { value: 'line', label: 'Line Chart', icon: LineChart, description: 'Show trends over time' },
  { value: 'area', label: 'Area Chart', icon: AreaChart, description: 'Show cumulative values' },
  { value: 'pie', label: 'Pie Chart', icon: PieChart, description: 'Show proportions of a whole' },
  { value: 'scatter', label: 'Scatter Plot', icon: ScatterChart, description: 'Show relationship between two variables' },
  { value: 'horizontal_bar', label: 'Horizontal Bar', icon: BarChart3, description: 'Compare values horizontally' }
];

const AGGREGATION_OPTIONS = [
  { value: 'none', label: 'None', description: 'Use raw data' },
  { value: 'sum', label: 'Sum', description: 'Add values together' },
  { value: 'average', label: 'Average', description: 'Calculate mean' },
  { value: 'count', label: 'Count', description: 'Count occurrences' },
  { value: 'max', label: 'Maximum', description: 'Highest value' },
  { value: 'min', label: 'Minimum', description: 'Lowest value' }
];

const SIZE_OPTIONS = [
  { value: 'medium', label: 'Standard (1/2 width)', description: 'Balanced default layout' },
  { value: 'large', label: 'Wide (full width)', description: 'Ideal for spotlight charts' }
];

export function AddChartDialog({ 
  open, 
  onOpenChange, 
  onSave, 
  datasets,
  resolveDatasetColumns,
  existingChart 
}: AddChartDialogProps) {
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(existingChart?.datasetId ?? (datasets[0]?.id ?? null));
  const [availableColumns, setAvailableColumns] = useState<ColumnInfo[]>([]);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [columnsError, setColumnsError] = useState<string | null>(null);
  const [title, setTitle] = useState(existingChart?.title || "");
  const [description, setDescription] = useState(existingChart?.description || "");
  const [chartType, setChartType] = useState<string>(existingChart?.chartType || "bar");
  const [xAxis, setXAxis] = useState(existingChart?.xAxis || "");
  const [yAxisColumns, setYAxisColumns] = useState<string[]>(
    existingChart?.yAxis 
      ? (Array.isArray(existingChart.yAxis) ? existingChart.yAxis : [existingChart.yAxis])
      : []
  );
  const [aggregation, setAggregation] = useState<string>(existingChart?.aggregation || "none");
  const [size, setSize] = useState<string>(existingChart?.size || "medium");
  const [filterColumn, setFilterColumn] = useState<string | null>(existingChart?.filterColumn ?? null);
  const [filterValue, setFilterValue] = useState(existingChart?.filterValue || "");

  const selectedDatasetLabel = useMemo(() => {
    if (selectedDatasetId == null) return undefined;
    return datasets.find((ds) => ds.id === selectedDatasetId)?.label;
  }, [datasets, selectedDatasetId]);

  const resetForm = () => {
    if (!existingChart) {
      setSelectedDatasetId(datasets[0]?.id ?? null);
      setTitle("");
      setDescription("");
      setChartType("bar");
      setXAxis("");
      setYAxisColumns([]);
      setAggregation("none");
      setSize("medium");
      setFilterColumn(null);
      setFilterValue("");
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    if (existingChart) {
      setSelectedDatasetId(existingChart.datasetId);
      setTitle(existingChart.title);
      setDescription(existingChart.description || "");
      setChartType(existingChart.chartType);
      setXAxis(existingChart.xAxis || "");
      setYAxisColumns(
        existingChart.yAxis
          ? (Array.isArray(existingChart.yAxis) ? existingChart.yAxis : [existingChart.yAxis])
          : []
      );
      setAggregation(existingChart.aggregation || "none");
      setSize(existingChart.size || "medium");
      setFilterColumn(existingChart.filterColumn ?? null);
      setFilterValue(existingChart.filterValue || "");
    } else {
      resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingChart?.id]);

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

        if (columns.length > 0) {
          setXAxis((prev) => (prev && columns.some((col) => col.name === prev) ? prev : columns[0].name));
          setYAxisColumns((prev) => {
            const valid = prev.filter((col) => columns.some((c) => c.name === col));
            if (valid.length > 0) {
              return valid;
            }
            return columns[0] ? [columns[0].name] : [];
          });
          if (filterColumn && !columns.some((c) => c.name === filterColumn)) {
            setFilterColumn(null);
            setFilterValue("");
          }
        } else {
          setXAxis("");
          setYAxisColumns([]);
          setFilterColumn(null);
          setFilterValue("");
        }
      })
      .catch(() => {
        if (!isActive) return;
        setAvailableColumns([]);
        setColumnsError("Unable to load dataset columns. Please try again.");
        setXAxis("");
        setYAxisColumns([]);
        setFilterColumn(null);
        setFilterValue("");
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

  useEffect(() => {
    if (xAxis && yAxisColumns.length > 0 && !existingChart) {
      const xCol = availableColumns.find(c => c.name === xAxis);
      const yCol = availableColumns.find(c => c.name === yAxisColumns[0]);
      
      if (xCol && yCol) {
        const recommended = getRecommendedChartType(xCol.type, yCol.type);
        setChartType(recommended);
      }
    }
  }, [xAxis, yAxisColumns, availableColumns, existingChart]);

  const handleSave = () => {
    if (!title || !xAxis || yAxisColumns.length === 0 || selectedDatasetId == null) return;

    const chart: DashboardChart = {
      id: existingChart?.id || `chart_${Date.now()}`,
      datasetId: selectedDatasetId,
      datasetName: selectedDatasetLabel,
      title,
      description,
      chartType: chartType as any,
      xAxis,
      yAxis: yAxisColumns.length === 1 ? yAxisColumns[0] : yAxisColumns,
      aggregation: aggregation !== 'none' ? (aggregation as any) : undefined,
      size: size as any
    };

    if (filterColumn && filterValue) {
      chart.filterColumn = filterColumn;
      chart.filterValue = filterValue;
    } else {
      chart.filterColumn = undefined;
      chart.filterValue = undefined;
    }

    onSave(chart);
    resetForm();
    onOpenChange(false);
  };

  const toggleYAxisColumn = (columnName: string) => {
    setYAxisColumns((prev) => {
      if (prev.includes(columnName)) {
        return prev.filter((col) => col !== columnName);
      }
      return [...prev, columnName];
    });
  };

  useEffect(() => {
    if (!filterColumn) {
      setFilterValue("");
    }
  }, [filterColumn]);

  const numericColumns = useMemo(
    () => availableColumns.filter(c => c.type === 'number'),
    [availableColumns]
  );

  const availableYAxisColumns = useMemo(
    () => (chartType === 'pie' ? availableColumns : numericColumns),
    [chartType, availableColumns, numericColumns]
  );

  const canSave = Boolean(
    title &&
    selectedDatasetId != null &&
    xAxis &&
    yAxisColumns.length > 0 &&
    availableColumns.length > 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingChart ? 'Edit Chart' : 'Add Chart'}
          </DialogTitle>
          <DialogDescription>
            Create a visualization to explore relationships in your data
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
            <Label htmlFor="title">Chart Title</Label>
            <Input
              id="title"
              placeholder="e.g., Sales by Region"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Brief description of what this chart shows"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Chart Type Selection */}
          <div className="space-y-2">
            <Label>Chart Type</Label>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {CHART_TYPES.map(type => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setChartType(type.value)}
                    type="button"
                    className={`p-4 rounded-lg border-2 transition-colors text-left ${
                      chartType === type.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border/80'
                    }`}
                  >
                    <IconComponent className="w-6 h-6 mb-2" />
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* X-Axis */}
          <div className="space-y-2">
            <Label htmlFor="xAxis">X-Axis (Horizontal)</Label>
            <div className="space-y-2">
              <Select value={xAxis} onValueChange={setXAxis} disabled={columnsLoading || availableColumns.length === 0}>
                <SelectTrigger id="xAxis">
                  <SelectValue placeholder={columnsLoading ? "Loading columns..." : "Select column for X-axis"} />
                </SelectTrigger>
                <SelectContent>
                  {columnsLoading ? (
                    <div className="flex items-center gap-2 p-2 text-sm text-text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading columns...
                    </div>
                  ) : availableColumns.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">
                      No columns available
                    </div>
                  ) : (
                    availableColumns.map(col => (
                      <SelectItem key={col.name} value={col.name}>
                        <div className="flex flex-col">
                          <span className="font-medium">{col.name}</span>
                          <span className="text-xs text-gray-500 capitalize">{col.type}</span>
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

          {/* Y-Axis - Multiple Selection */}
          <div className="space-y-2">
            <Label>Y-Axis Columns (Vertical) - Select one or more</Label>
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
              {columnsLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading columns...
                </div>
              ) : availableYAxisColumns.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  No suitable columns available
                </div>
              ) : (
                availableYAxisColumns.map(col => (
                  <div key={col.name} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                    <Checkbox
                      id={`yaxis-${col.name}`}
                      checked={yAxisColumns.includes(col.name)}
                      onCheckedChange={() => toggleYAxisColumn(col.name)}
                    />
                    <label
                      htmlFor={`yaxis-${col.name}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      <span className="font-medium">{col.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({col.type})</span>
                    </label>
                  </div>
                ))
              )}
            </div>
            
            {/* Selected columns display */}
            {yAxisColumns.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {yAxisColumns.map(colName => (
                  <div
                    key={colName}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    {colName}
                    <button
                      onClick={() => toggleYAxisColumn(colName)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                      type="button"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aggregation */}
          <div className="space-y-2">
            <Label htmlFor="aggregation">Aggregation</Label>
            <Select value={aggregation} onValueChange={setAggregation}>
              <SelectTrigger id="aggregation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGGREGATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Choose how to combine multiple data points for the same X-axis value
            </p>
          </div>

          {/* Layout size */}
          <div className="space-y-2">
            <Label htmlFor="chart-size">Chart Size</Label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger id="chart-size">
                <SelectValue placeholder="Pick a size" />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filters */}
          <div className="space-y-2">
            <Label>Filter Data (Optional)</Label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Select
                  value={filterColumn ?? "__none"}
                  onValueChange={(value) => setFilterColumn(value === "__none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">No filter</SelectItem>
                    {availableColumns.map(col => (
                      <SelectItem key={col.name} value={col.name}>
                        <div>
                          <span className="font-medium">{col.name}</span>
                          <span className="text-xs text-gray-500 ml-2">({col.type})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Match value (e.g., Region = Europe)"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  disabled={!filterColumn}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Filter pins the chart to rows where the selected column matches the value you enter.
            </p>
          </div>

          {/* Preview Info */}
          {xAxis && yAxisColumns.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Preview:</strong> {selectedDatasetLabel ? `${selectedDatasetLabel} → ` : null}
                This will create a {chartType} chart showing{' '}
                {yAxisColumns.length === 1 ? (
                  <>
                    <strong>{yAxisColumns[0]}</strong> {aggregation !== 'none' && `(${aggregation})`}
                  </>
                ) : (
                  <>
                    <strong>{yAxisColumns.length} metrics</strong> ({yAxisColumns.join(', ')})
                    {aggregation !== 'none' && ` (${aggregation})`}
                  </>
                )}{' '}
                by <strong>{xAxis}</strong>
                {filterColumn && filterValue && (
                  <> filtered where <strong>{filterColumn}</strong> = <strong>{filterValue}</strong></>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {existingChart ? 'Update' : 'Add'} Chart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
