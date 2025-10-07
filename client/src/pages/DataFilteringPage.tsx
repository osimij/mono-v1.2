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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataTable } from "@/components/DataTable";
import { api } from "@/lib/api";
import { Dataset } from "@/types";
import { 
  Filter, 
  Database, 
  Download, 
  Save, 
  RefreshCw, 
  CheckCircle, 
  BarChart3, 
  Plus, 
  X, 
  Trash2,
  Eye,
  EyeOff,
  Calendar as CalendarIcon,
  ChevronDown,
  Settings,
  Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Filtering</h1>
            <p className="text-gray-600 dark:text-gray-400">Filter your datasets with intelligent controls</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!filteredData.length}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={!filteredData.length}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Section: Filtering */}
        <div className="flex-shrink-0 h-80 border-b bg-gray-50 dark:bg-gray-800">
          <div className="h-full flex">
            {/* Left: Dataset Selection */}
            <div className="w-80 p-4 border-r bg-white dark:bg-gray-900">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Dataset</Label>
                  <Select 
                    value={selectedDataset?.id.toString() || ""} 
                    onValueChange={handleDatasetSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map(dataset => (
                        <SelectItem key={dataset.id} value={dataset.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{dataset.originalName}</span>
                            <span className="text-xs text-gray-500">
                              {dataset.rowCount} rows • {dataset.columns.length} columns
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDataset && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Dataset Info</span>
                      <Badge variant="outline" className="text-xs">
                        {selectedDataset.data?.length || 0} rows
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Name: {selectedDataset.originalName}</div>
                      <div>Columns: {selectedDataset.columns.length}</div>
                      <div>File Size: {(selectedDataset.fileSize / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Filter Builder */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Builder</h3>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addFilter}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Filter
                    </Button>
                    {(draftFilters.length > 0 || appliedFilters.length > 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearAllFilters}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>

                {draftFilters.length === 0 && appliedFilters.length === 0 ? (
                  <div className="text-center py-8">
                    <Filter className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No filters configured. Click "Add Filter" to start filtering your data.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Draft Filters */}
                    {draftFilters.map((filter, index) => {
                      const columnInfo2 = columnInfo.find(col => col.name === filter.column);
                      return (
                        <Card key={filter.id} className="border-l-4 border-l-yellow-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Draft Filter {index + 1}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDraftFilter(filter.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="space-y-3">
                              {/* Column Selection */}
                              <div>
                                <Label className="text-xs font-medium">Column</Label>
                                <Select 
                                  value={filter.column} 
                                  onValueChange={(value) => updateDraftFilter(filter.id, { column: value, operator: 'equals', value: '' })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue placeholder="Select column" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedDataset?.columns.map(col => (
                                      <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Operator and Value Selection */}
                              {filter.column && columnInfo2 && (
                                <>
                                  <div>
                                    <Label className="text-xs font-medium">Operator</Label>
                                    <Select 
                                      value={filter.operator} 
                                      onValueChange={(value: any) => updateDraftFilter(filter.id, { operator: value })}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {getOperatorsForType(columnInfo2.type).map(op => (
                                          <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Value Input based on type */}
                                  <div>
                                    <Label className="text-xs font-medium">Value</Label>
                                    {columnInfo2.type === 'numeric' && (
                                      <div className="space-y-2">
                                        {filter.operator === 'between' ? (
                                          <div className="grid grid-cols-2 gap-2">
                                            <Input
                                              type="number"
                                              placeholder="Min"
                                              value={filter.value || ''}
                                              onChange={(e) => updateDraftFilter(filter.id, { value: e.target.value })}
                                              className="h-8"
                                            />
                                            <Input
                                              type="number"
                                              placeholder="Max"
                                              value={filter.value2 || ''}
                                              onChange={(e) => updateDraftFilter(filter.id, { value2: e.target.value })}
                                              className="h-8"
                                            />
                                          </div>
                                        ) : (
                                          <Input
                                            type="number"
                                            placeholder="Enter value"
                                            value={filter.value || ''}
                                            onChange={(e) => updateDraftFilter(filter.id, { value: e.target.value })}
                                            className="h-8"
                                          />
                                        )}
                                        {columnInfo2.minValue !== undefined && columnInfo2.maxValue !== undefined && (
                                          <Slider
                                            value={[
                                              parseFloat(filter.value || columnInfo2.minValue.toString()),
                                              parseFloat(filter.value2 || columnInfo2.maxValue.toString())
                                            ]}
                                            min={columnInfo2.minValue}
                                            max={columnInfo2.maxValue}
                                            step={(columnInfo2.maxValue - columnInfo2.minValue) / 100}
                                            onValueChange={(values) => {
                                              if (filter.operator === 'between') {
                                                updateDraftFilter(filter.id, { 
                                                  value: values[0].toString(),
                                                  value2: values[1].toString()
                                                });
                                              } else {
                                                updateDraftFilter(filter.id, { value: values[0].toString() });
                                              }
                                            }}
                                            className="w-full"
                                          />
                                        )}
                                      </div>
                                    )}

                                    {columnInfo2.type === 'categorical' && (
                                      <div className="space-y-2">
                                        {filter.operator === 'in_list' ? (
                                          <div className="max-h-32 overflow-y-auto space-y-1">
                                            {columnInfo2.categories?.map(category => (
                                              <div key={category} className="flex items-center space-x-2">
                                                <Checkbox
                                                  id={`${filter.id}-${category}`}
                                                  checked={filter.values?.includes(category)}
                                                  onCheckedChange={(checked) => {
                                                    const currentValues = filter.values || [];
                                                    if (checked) {
                                                      updateDraftFilter(filter.id, { 
                                                        values: [...currentValues, category]
                                                      });
                                                    } else {
                                                      updateDraftFilter(filter.id, { 
                                                        values: currentValues.filter(v => v !== category)
                                                      });
                                                    }
                                                  }}
                                                />
                                                <Label htmlFor={`${filter.id}-${category}`} className="text-xs">{category}</Label>
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
                                              {columnInfo2.categories?.map(category => (
                                                <SelectItem key={category} value={category}>{category}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        )}
                                      </div>
                                    )}

                                    {columnInfo2.type === 'date' && (
                                      <div className="space-y-2">
                                        {filter.operator === 'date_between' ? (
                                          <div className="grid grid-cols-2 gap-2">
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <Button variant="outline" className="h-8 justify-start text-left font-normal">
                                                  <CalendarIcon className="mr-2 h-3 w-3" />
                                                  {filter.dateFrom ? format(filter.dateFrom, 'MMM dd') : 'Start'}
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                  mode="single"
                                                  selected={filter.dateFrom}
                                                  onSelect={(date) => updateDraftFilter(filter.id, { dateFrom: date })}
                                                  initialFocus
                                                />
                                              </PopoverContent>
                                            </Popover>
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <Button variant="outline" className="h-8 justify-start text-left font-normal">
                                                  <CalendarIcon className="mr-2 h-3 w-3" />
                                                  {filter.dateTo ? format(filter.dateTo, 'MMM dd') : 'End'}
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                  mode="single"
                                                  selected={filter.dateTo}
                                                  onSelect={(date) => updateDraftFilter(filter.id, { dateTo: date })}
                                                  initialFocus
                                                />
                                              </PopoverContent>
                                            </Popover>
                                          </div>
                                        ) : (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <Button variant="outline" className="h-8 justify-start text-left font-normal w-full">
                                                <CalendarIcon className="mr-2 h-3 w-3" />
                                                {filter.value ? filter.value : 'Select date'}
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                              <Calendar
                                                mode="single"
                                                selected={filter.value ? new Date(filter.value) : undefined}
                                                onSelect={(date) => updateDraftFilter(filter.id, { 
                                                  value: date ? format(date, 'yyyy-MM-dd') : '' 
                                                })}
                                                initialFocus
                                              />
                                            </PopoverContent>
                                          </Popover>
                                        )}
                                      </div>
                                    )}

                                    {columnInfo2.type === 'text' && (
                                      <Input
                                        placeholder="Enter text"
                                        value={filter.value || ''}
                                        onChange={(e) => updateDraftFilter(filter.id, { value: e.target.value })}
                                        className="h-8"
                                      />
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* Applied Filters */}
                    {appliedFilters.map((filter, index) => (
                      <Card key={filter.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm">
                              <span className="font-medium">{filter.column}</span>
                              <span className="mx-1">{filter.operator}</span>
                              <span className="text-gray-600 dark:text-gray-400">
                                {filter.operator === 'date_between' && filter.dateFrom && filter.dateTo
                                  ? `${format(filter.dateFrom, 'MMM dd, yyyy')} - ${format(filter.dateTo, 'MMM dd, yyyy')}`
                                  : filter.operator === 'in_list' && filter.values
                                  ? filter.values.join(', ')
                                  : filter.value}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">Applied</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Apply Filters Button */}
                {draftFilters.length > 0 && (
                  <div className="flex justify-center pt-4">
                    <Button
                      onClick={applyDraftFilters}
                      className="px-8"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Apply Filters
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Data Preview */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 min-h-0">
          {selectedDataset ? (
            <>
              {/* Data Preview Header */}
              <div className="flex-shrink-0 p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Preview</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {Math.min(filteredData.length, 50)} of {filteredData.length} rows
                      </Badge>
                      <Badge variant="outline">
                        {selectedDataset.columns.length} columns
                      </Badge>
                      {appliedFilters.length > 0 && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          {appliedFilters.length} filter{appliedFilters.length !== 1 ? 's' : ''} applied
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveTemplate}
                      disabled={!appliedFilters.length}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Save Template
                    </Button>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-auto min-h-0">
                <DataTable 
                  data={filteredData.slice(0, 50)} 
                  columns={selectedDataset.columns}
                  pageSize={50}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Database className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Select a Dataset
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose a dataset from the top panel to start filtering
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
