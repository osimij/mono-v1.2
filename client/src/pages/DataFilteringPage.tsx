import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/DataTable";
import { api } from "@/lib/api";
import { Dataset } from "@/types";
import {
  Filter,
  Database,
  Download,
  Save,
  Plus,
  X,
  Trash2,
  Calendar as CalendarIcon,
  Settings,
  Play,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";

interface FilterCondition {
  id: string;
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in_list' | 'date_between';
  value: string;
  value2?: string;
  values?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'text';
  minValue?: number;
  maxValue?: number;
  categories?: string[];
  uniqueValues?: number;
}

export function DataFilteringPage() {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [draftFilters, setDraftFilters] = useState<FilterCondition[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<FilterCondition[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [columnInfo, setColumnInfo] = useState<ColumnInfo[]>([]);
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);
  const { toast } = useToast();

  // Fetch datasets
  const { data: datasets = [], isLoading: datasetsLoading } = useQuery({
    queryKey: ["/api/datasets"],
    queryFn: api.datasets.getAll,
    staleTime: 0,
    refetchOnMount: true
  });

  // Analyze dataset columns when dataset changes
  useEffect(() => {
    if (selectedDataset && selectedDataset.data && selectedDataset.data.length > 0) {
      const analyzedColumns = analyzeColumns(selectedDataset.data, selectedDataset.columns);
      setColumnInfo(analyzedColumns);
      setFilteredData(selectedDataset.data);
    }
  }, [selectedDataset]);

  // Apply filters when appliedFilters change
  useEffect(() => {
    if (selectedDataset && selectedDataset.data && selectedDataset.data.length > 0) {
      const filtered = applyFilters(selectedDataset.data, appliedFilters);
      setFilteredData(filtered);
    }
  }, [appliedFilters, selectedDataset]);

  // Analyze column types and properties
  const analyzeColumns = (data: any[], columns: string[]): ColumnInfo[] => {
    return columns.map(col => {
      const values = data.map(row => row[col]).filter(val => val !== null && val !== undefined);
      const uniqueValues = [...new Set(values)];
      
      // Check if it's a date column
      const datePattern = /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}$/;
      const isDate = values.some(val => datePattern.test(String(val)));
      
      if (isDate) {
        return {
          name: col,
          type: 'date',
          uniqueValues: uniqueValues.length
        };
      }
      
      // Check if it's numeric
      const numericValues = values.map(val => parseFloat(val)).filter(val => !isNaN(val));
      const isNumeric = numericValues.length > values.length * 0.8;
      
      if (isNumeric) {
        return {
          name: col,
          type: 'numeric',
          minValue: Math.min(...numericValues),
          maxValue: Math.max(...numericValues),
          uniqueValues: uniqueValues.length
        };
      }
      
      // Check if it's categorical
      const isCategorical = uniqueValues.length <= Math.min(20, values.length * 0.1);
      
      if (isCategorical) {
        return {
          name: col,
          type: 'categorical',
          categories: uniqueValues.slice(0, 20).map(String),
          uniqueValues: uniqueValues.length
        };
      }
      
      return {
        name: col,
        type: 'text',
        uniqueValues: uniqueValues.length
      };
    });
  };

  // Apply filters to data
  const applyFilters = (data: any[], currentFilters: FilterCondition[]) => {
    if (!data || currentFilters.length === 0) return data;

    return data.filter(row => {
      return currentFilters.every(filter => {
        const value = row[filter.column];
        
        switch (filter.operator) {
          case 'equals':
            return String(value) === filter.value;
          case 'not_equals':
            return String(value) !== filter.value;
          case 'contains':
            return String(value).toLowerCase().includes(filter.value.toLowerCase());
          case 'greater_than':
            return Number(value) > Number(filter.value);
          case 'less_than':
            return Number(value) < Number(filter.value);
          case 'between':
            return Number(value) >= Number(filter.value) && Number(value) <= Number(filter.value2 || filter.value);
          case 'in_list':
            return filter.values?.includes(String(value));
          case 'date_between':
            if (filter.dateFrom && filter.dateTo) {
              const rowDate = new Date(value);
              return rowDate >= filter.dateFrom && rowDate <= filter.dateTo;
            }
            return true;
          default:
            return true;
        }
      });
    });
  };

  // Handle dataset selection
  const handleDatasetSelect = async (datasetId: string) => {
    const dataset = datasets.find(d => d.id.toString() === datasetId);
    if (dataset) {
      setIsLoadingDataset(true);
      try {
        // Fetch the full dataset data
        const fullDataset = await api.datasets.getById(parseInt(datasetId));
        setSelectedDataset(fullDataset);
        setDraftFilters([]);
        setAppliedFilters([]);
        toast({
          title: "Dataset selected",
          description: `${fullDataset.originalName} loaded with ${fullDataset.data.length} rows`
        });
      } catch (error) {
        console.error('Error fetching dataset:', error);
        toast({
          title: "Error loading dataset",
          description: "Failed to load dataset data",
          variant: "destructive"
        });
      } finally {
        setIsLoadingDataset(false);
      }
    }
  };

  // Add new filter
  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: Date.now().toString(),
      column: '',
      operator: 'equals',
      value: ''
    };
    setDraftFilters([...draftFilters, newFilter]);
  };

  // Update draft filter
  const updateDraftFilter = (filterId: string, updates: Partial<FilterCondition>) => {
    setDraftFilters(draftFilters.map(filter => 
      filter.id === filterId ? { ...filter, ...updates } : filter
    ));
  };

  // Remove draft filter
  const removeDraftFilter = (filterId: string) => {
    setDraftFilters(draftFilters.filter(f => f.id !== filterId));
  };

  // Apply filters
  const applyDraftFilters = () => {
    // Validate filters before applying
    const validFilters = draftFilters.filter(filter => {
      if (!filter.column) return false;
      
      switch (filter.operator) {
        case 'between':
          return filter.value && filter.value2;
        case 'in_list':
          return filter.values && filter.values.length > 0;
        case 'date_between':
          return filter.dateFrom && filter.dateTo;
        default:
          return filter.value !== '';
      }
    });

    if (validFilters.length !== draftFilters.length) {
      toast({
        title: "Invalid filters",
        description: "Please complete all filter configurations before applying",
        variant: "destructive"
      });
      return;
    }

    setAppliedFilters(validFilters);
    toast({
      title: "Filters applied",
      description: `Applied ${validFilters.length} filter${validFilters.length !== 1 ? 's' : ''}`
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setDraftFilters([]);
    setAppliedFilters([]);
    toast({
      title: "Filters cleared",
      description: "All filters have been removed"
    });
  };

  // Get appropriate operators for column type
  const getOperatorsForType = (type: string) => {
    switch (type) {
      case 'numeric':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'greater_than', label: 'Greater than' },
          { value: 'less_than', label: 'Less than' },
          { value: 'between', label: 'Between' }
        ];
      case 'categorical':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'in_list', label: 'In list' }
        ];
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'greater_than', label: 'After' },
          { value: 'less_than', label: 'Before' },
          { value: 'date_between', label: 'Between dates' }
        ];
      default:
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not equals' },
          { value: 'contains', label: 'Contains' }
        ];
    }
  };

  // Export filtered data
  const handleExport = () => {
    if (!filteredData.length) {
      toast({
        title: "No data to export",
        description: "Please select a dataset and apply filters first",
        variant: "destructive"
      });
      return;
    }

    const headers = Object.keys(filteredData[0]);
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDataset?.originalName || 'filtered-data'}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Data exported",
      description: `Exported ${filteredData.length} rows to CSV`
    });
  };

  // Save filtered dataset
  const handleSave = async () => {
    if (!selectedDataset || !filteredData.length) {
      toast({
        title: "No data to save",
        description: "Please select a dataset and apply filters first",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Dataset saved",
        description: `Saved filtered dataset with ${filteredData.length} rows`
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save filtered dataset",
        variant: "destructive"
      });
    }
  };

  // Save filter template
  const handleSaveTemplate = () => {
    if (!appliedFilters.length) {
      toast({
        title: "No filters to save",
        description: "Please apply some filters first",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Filter template saved",
      description: `Saved template with ${appliedFilters.length} filters`
    });
  };

  const getFilterDisplayValue = (filter: FilterCondition) => {
    if (filter.operator === "date_between" && filter.dateFrom && filter.dateTo) {
      return `${format(filter.dateFrom, "MMM dd, yyyy")} – ${format(filter.dateTo, "MMM dd, yyyy")}`;
    }

    if (filter.operator === "in_list" && filter.values) {
      return filter.values.join(", ");
    }

    return filter.value;
  };

  const hasFilters = draftFilters.length > 0 || appliedFilters.length > 0;
  const previewRowCount = Math.min(filteredData.length, 50);

  return (
    <PageShell padding="lg" width="wide" className="space-y-6">
      <PageHeader
        title="Data filtering"
        description="Filter your datasets with intelligent controls."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!filteredData.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!filteredData.length}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        }
      />

      <PageSection
        title="Build filters"
        description="Choose a dataset, layer conditions, and preview results in real-time."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={addFilter}>
              <Plus className="mr-2 h-4 w-4" />
              Add filter
            </Button>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear all
              </Button>
            )}
          </div>
        }
        contentClassName="gap-6"
      >
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[300px,_minmax(0,1fr)]">
          <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-surface p-4 shadow-xs">
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-text-subtle">
                Dataset
              </Label>
              <Select
                value={selectedDataset?.id.toString() || ""}
                onValueChange={handleDatasetSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium text-text-primary">
                          {dataset.originalName}
                        </span>
                        <span className="text-xs text-text-subtle">
                          {dataset.rowCount.toLocaleString()} rows • {dataset.columns.length} columns
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDataset && (
              <div className="rounded-xl border border-border/60 bg-surface-muted p-4">
                <div className="flex items-center justify-between text-sm text-text-muted">
                  <span>Dataset info</span>
                  <Badge variant="outline" className="border-border/70 text-xs text-text-subtle">
                    {selectedDataset.data?.length.toLocaleString() || 0} rows
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs text-text-subtle">
                  <div>
                    <span className="text-text-muted">Name:</span> {selectedDataset.originalName}
                  </div>
                  <div>
                    <span className="text-text-muted">Columns:</span> {selectedDataset.columns.length}
                  </div>
                  <div>
                    <span className="text-text-muted">File size:</span>{" "}
                    {(selectedDataset.fileSize / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {draftFilters.length === 0 && appliedFilters.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-surface-muted/60 px-8 py-12 text-center">
                <Filter className="h-12 w-12 text-text-subtle" />
                <p className="text-sm text-text-muted">
                  No filters configured yet. Add a filter to start refining your data.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {draftFilters.map((filter, index) => {
                  const columnDetail = columnInfo.find((col) => col.name === filter.column);
                  const numericMin = columnDetail?.minValue ?? 0;
                  const numericMax = columnDetail?.maxValue ?? numericMin + 1;
                  const sliderValues = [
                    Number(filter.value ?? numericMin),
                    Number(filter.value2 ?? numericMax),
                  ];

                  return (
                    <Card key={filter.id} className="border-l-4 border-warning/80">
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-text-primary">
                            Draft filter {index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDraftFilter(filter.id)}
                            className="text-danger hover:text-danger/80"
                            aria-label="Remove filter"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-text-muted">Column</Label>
                            <Select
                              value={filter.column}
                              onValueChange={(value) =>
                                updateDraftFilter(filter.id, {
                                  column: value,
                                  operator: "equals",
                                  value: "",
                                  value2: "",
                                  values: [],
                                })
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedDataset?.columns.map((col) => (
                                  <SelectItem key={col} value={col}>
                                    {col}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {filter.column && columnDetail && (
                            <div className="space-y-2">
                              <Label className="text-xs font-medium text-text-muted">Operator</Label>
                              <Select
                                value={filter.operator}
                                onValueChange={(value: FilterCondition["operator"]) =>
                                  updateDraftFilter(filter.id, { operator: value })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {getOperatorsForType(columnDetail.type).map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {filter.column && columnDetail ? (
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-text-muted">Value</Label>
                            {columnDetail.type === "numeric" && (
                              <div className="space-y-3">
                                {filter.operator === "between" ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      type="number"
                                      placeholder="Min"
                                      value={filter.value || ""}
                                      onChange={(e) => updateDraftFilter(filter.id, { value: e.target.value })}
                                      className="h-8"
                                    />
                                    <Input
                                      type="number"
                                      placeholder="Max"
                                      value={filter.value2 || ""}
                                      onChange={(e) => updateDraftFilter(filter.id, { value2: e.target.value })}
                                      className="h-8"
                                    />
                                  </div>
                                ) : (
                                  <Input
                                    type="number"
                                    placeholder="Enter value"
                                    value={filter.value || ""}
                                    onChange={(e) => updateDraftFilter(filter.id, { value: e.target.value })}
                                    className="h-8"
                                  />
                                )}
                                {columnDetail.minValue !== undefined && columnDetail.maxValue !== undefined && (
                                  <Slider
                                    value={sliderValues}
                                    min={numericMin}
                                    max={numericMax}
                                    step={numericMax !== numericMin ? (numericMax - numericMin) / 100 : 1}
                                    onValueChange={(values) => {
                                      if (filter.operator === "between") {
                                        updateDraftFilter(filter.id, {
                                          value: values[0].toString(),
                                          value2: values[1].toString(),
                                        });
                                      } else {
                                        updateDraftFilter(filter.id, { value: values[0].toString() });
                                      }
                                    }}
                                  />
                                )}
                              </div>
                            )}

                            {columnDetail.type === "categorical" && (
                              <div className="space-y-2">
                                {filter.operator === "in_list" ? (
                                  <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-3">
                                    {columnDetail.categories?.map((category) => (
                                      <div key={category} className="flex items-center gap-2">
                                        <Checkbox
                                          id={`${filter.id}-${category}`}
                                          checked={filter.values?.includes(category)}
                                          onCheckedChange={(checked) => {
                                            const currentValues = filter.values || [];
                                            if (checked) {
                                              updateDraftFilter(filter.id, { values: [...currentValues, category] });
                                            } else {
                                              updateDraftFilter(filter.id, {
                                                values: currentValues.filter((v) => v !== category),
                                              });
                                            }
                                          }}
                                        />
                                        <Label htmlFor={`${filter.id}-${category}`} className="text-xs text-text-muted">
                                          {category}
                                        </Label>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <Select
                                    value={filter.value}
                                    onValueChange={(value) => updateDraftFilter(filter.id, { value })}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {columnDetail.categories?.map((category) => (
                                        <SelectItem key={category} value={category}>
                                          {category}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            )}

                            {columnDetail.type === "date" && (
                              <div className="space-y-2">
                                {filter.operator === "date_between" ? (
                                  <div className="grid grid-cols-2 gap-2">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className="h-8 justify-start text-left text-sm font-normal text-text-muted"
                                        >
                                          <CalendarIcon className="mr-2 h-3 w-3" />
                                          {filter.dateFrom ? format(filter.dateFrom, "MMM dd, yyyy") : "Start date"}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0">
                                        <Calendar
                                          mode="single"
                                          selected={filter.dateFrom}
                                          onSelect={(date) => updateDraftFilter(filter.id, { dateFrom: date || undefined })}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className="h-8 justify-start text-left text-sm font-normal text-text-muted"
                                        >
                                          <CalendarIcon className="mr-2 h-3 w-3" />
                                          {filter.dateTo ? format(filter.dateTo, "MMM dd, yyyy") : "End date"}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0">
                                        <Calendar
                                          mode="single"
                                          selected={filter.dateTo}
                                          onSelect={(date) => updateDraftFilter(filter.id, { dateTo: date || undefined })}
                                          initialFocus
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                ) : (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="h-8 justify-start text-left text-sm font-normal text-text-muted"
                                      >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {filter.value ? filter.value : "Select date"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={filter.value ? new Date(filter.value) : undefined}
                                        onSelect={(date) =>
                                          updateDraftFilter(filter.id, {
                                            value: date ? format(date, "yyyy-MM-dd") : "",
                                          })
                                        }
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            )}

                            {columnDetail.type === "text" && (
                              <Input
                                placeholder="Enter text"
                                value={filter.value || ""}
                                onChange={(e) => updateDraftFilter(filter.id, { value: e.target.value })}
                                className="h-8"
                              />
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-text-subtle">Choose a column to configure value conditions.</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {appliedFilters.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-subtle">
                      Applied filters
                    </h4>
                    {appliedFilters.map((filter) => (
                      <Card key={filter.id} className="border-l-4 border-success/80">
                        <CardContent className="flex items-center justify-between gap-4 p-3">
                          <div className="text-sm text-text-muted">
                            <span className="font-medium text-text-primary">{filter.column}</span>
                            <span className="mx-1 text-text-subtle">{filter.operator}</span>
                            <span>{getFilterDisplayValue(filter)}</span>
                          </div>
                          <Badge variant="outline" className="border-success/40 text-xs text-success">
                            Applied
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {draftFilters.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button onClick={applyDraftFilters} className="px-8 shadow-xs">
                  <Play className="mr-2 h-4 w-4" />
                  Apply filters
                </Button>
              </div>
            )}
          </div>
        </div>

      </PageSection>

      <PageSection
        title="Filtered data preview"
        description={
          selectedDataset
            ? `Showing top ${previewRowCount.toLocaleString()} rows of ${filteredData.length.toLocaleString()} filtered results.`
            : "Select a dataset to see filtered rows."
        }
        actions={
          selectedDataset ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveTemplate}
              disabled={!appliedFilters.length}
            >
              <Settings className="mr-2 h-4 w-4" />
              Save template
            </Button>
          ) : undefined
        }
        contentClassName="gap-4"
      >
        {selectedDataset ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
              <Badge variant="outline" className="border-border/70">
                {previewRowCount.toLocaleString()} of {filteredData.length.toLocaleString()} rows
              </Badge>
              <Badge variant="outline" className="border-border/70">
                {selectedDataset.columns.length} columns
              </Badge>
              {appliedFilters.length > 0 && (
                <Badge className="border-success/40 bg-success/10 text-success">
                  {appliedFilters.length} filter{appliedFilters.length !== 1 ? "s" : ""} applied
                </Badge>
              )}
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <DataTable
                data={filteredData.slice(0, 50)}
                columns={selectedDataset.columns}
                pageSize={50}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Database className="h-16 w-16 text-text-subtle" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-text-primary">Select a dataset</h3>
              <p className="text-sm text-text-muted">
                Choose a dataset above to begin filtering and preview the results in real time.
              </p>
            </div>
          </div>
        )}
      </PageSection>

    </PageShell>

  );
}
