import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dataset } from "@/types";
import { Filter, Users, Target, Plus, X, Settings, BarChart3, Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface FilterCondition {
  id: string;
  column: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in_list' | 'date_between';
  value: string;
  value2?: string; // For between operator
  values?: string[]; // For in_list operator
  dateFrom?: Date; // For date_between operator
  dateTo?: Date; // For date_between operator
}

interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'text';
  minValue?: number;
  maxValue?: number;
  categories?: string[];
  uniqueValues?: number;
}

interface SegmentationConfig {
  id: string;
  name: string;
  method: 'kmeans' | 'hierarchical' | 'rule_based';
  columns: string[];
  numClusters?: number;
  rules?: SegmentationRule[];
}

interface SegmentationRule {
  id: string;
  condition: string;
  clusterLabel: string;
}

interface SegmentationFilteringProps {
  dataset: Dataset | null;
  onFiltersChange: (filters: FilterCondition[]) => void;
  onSegmentationChange: (segments: SegmentationConfig[]) => void;
  showOnlyFiltering?: boolean;
  showOnlySegmentation?: boolean;
}

export function SegmentationFiltering({ 
  dataset, 
  onFiltersChange, 
  onSegmentationChange,
  showOnlyFiltering = false,
  showOnlySegmentation = false
}: SegmentationFilteringProps) {
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [segments, setSegments] = useState<SegmentationConfig[]>([]);
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [showSegmentationForm, setShowSegmentationForm] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<FilterCondition>>({});
  const [newSegment, setNewSegment] = useState<Partial<SegmentationConfig>>({});
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [segmentedData, setSegmentedData] = useState<any[]>([]);
  const [columnInfo, setColumnInfo] = useState<ColumnInfo[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [showColumnPopup, setShowColumnPopup] = useState(false);
  const { toast } = useToast();

  // Analyze dataset columns when dataset changes
  useEffect(() => {
    if (dataset && dataset.data) {
      const analyzedColumns = analyzeColumns(dataset.data, dataset.columns);
      setColumnInfo(analyzedColumns);
      setFilteredData(dataset.data);
      setSegmentedData(dataset.data);
    }
  }, [dataset]);

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
      const isNumeric = numericValues.length > values.length * 0.8; // 80% numeric values
      
      if (isNumeric) {
        return {
          name: col,
          type: 'numeric',
          minValue: Math.min(...numericValues),
          maxValue: Math.max(...numericValues),
          uniqueValues: uniqueValues.length
        };
      }
      
      // Check if it's categorical (limited unique values)
      const isCategorical = uniqueValues.length <= Math.min(20, values.length * 0.1);
      
      if (isCategorical) {
        return {
          name: col,
          type: 'categorical',
          categories: uniqueValues.slice(0, 20).map(String), // Limit to 20 categories
          uniqueValues: uniqueValues.length
        };
      }
      
      // Default to text
      return {
        name: col,
        type: 'text',
        uniqueValues: uniqueValues.length
      };
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

  // Apply segmentation to data
  const applySegmentation = (data: any[], currentSegments: SegmentationConfig[]) => {
    if (!data || currentSegments.length === 0) return data;

    const segmented = [...data];
    
    currentSegments.forEach(segment => {
      const columnName = `${segment.name}_cluster`;
      
      switch (segment.method) {
        case 'kmeans':
          // Simple k-means implementation
          const clusters = performKMeans(data, segment.columns, segment.numClusters || 3);
          segmented.forEach((row, index) => {
            row[columnName] = `Cluster ${clusters[index] + 1}`;
          });
          break;
          
        case 'hierarchical':
          // Simple hierarchical clustering
          const hierarchicalClusters = performHierarchicalClustering(data, segment.columns, segment.numClusters || 3);
          segmented.forEach((row, index) => {
            row[columnName] = `Group ${hierarchicalClusters[index] + 1}`;
          });
          break;
          
        case 'rule_based':
          // Rule-based segmentation
          segmented.forEach(row => {
            row[columnName] = applyRules(row, segment.rules || []);
          });
          break;
      }
    });

    return segmented;
  };

  // Simple k-means implementation
  const performKMeans = (data: any[], columns: string[], k: number): number[] => {
    // Extract numeric data
    const numericData = data.map(row => 
      columns.map(col => {
        const val = parseFloat(row[col]);
        return isNaN(val) ? 0 : val;
      })
    );

    // Initialize centroids randomly
    const centroids = Array.from({ length: k }, () => 
      columns.map(() => Math.random() * 100)
    );

    const clusters = new Array(data.length).fill(0);
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 100) {
      changed = false;
      iterations++;

      // Assign points to nearest centroid
      numericData.forEach((point, i) => {
        let minDist = Infinity;
        let bestCluster = 0;

        centroids.forEach((centroid, j) => {
          const dist = point.reduce((sum, val, k) => sum + Math.pow(val - centroid[k], 2), 0);
          if (dist < minDist) {
            minDist = dist;
            bestCluster = j;
          }
        });

        if (clusters[i] !== bestCluster) {
          clusters[i] = bestCluster;
          changed = true;
        }
      });

      // Update centroids
      for (let i = 0; i < k; i++) {
        const clusterPoints = numericData.filter((_, j) => clusters[j] === i);
        if (clusterPoints.length > 0) {
          centroids[i] = columns.map((_, colIndex) => 
            clusterPoints.reduce((sum, point) => sum + point[colIndex], 0) / clusterPoints.length
          );
        }
      }
    }

    return clusters;
  };

  // Simple hierarchical clustering
  const performHierarchicalClustering = (data: any[], columns: string[], k: number): number[] => {
    // For simplicity, use k-means as a proxy for hierarchical clustering
    return performKMeans(data, columns, k);
  };

  // Apply rule-based segmentation
  const applyRules = (row: any, rules: SegmentationRule[]): string => {
    for (const rule of rules) {
      // Simple rule evaluation - in a real implementation, you'd want a more sophisticated parser
      if (evaluateRule(row, rule.condition)) {
        return rule.clusterLabel;
      }
    }
    return 'Default';
  };

  // Simple rule evaluation
  const evaluateRule = (row: any, condition: string): boolean => {
    // Very basic rule evaluation - in production, you'd want a proper expression parser
    try {
      // Replace column names with actual values
      let evalCondition = condition;
      Object.keys(row).forEach(col => {
        const value = typeof row[col] === 'string' ? `'${row[col]}'` : row[col];
        evalCondition = evalCondition.replace(new RegExp(`\\b${col}\\b`, 'g'), value);
      });
      
      // Basic safety check - only allow simple comparisons
      if (!/^[a-zA-Z0-9\s<>=!&|()'.,]+$/.test(evalCondition)) {
        return false;
      }
      
      return eval(evalCondition);
    } catch {
      return false;
    }
  };

  // Handle column selection
  const handleColumnSelect = (columnName: string) => {
    setSelectedColumn(columnName);
    setNewFilter({ column: columnName });
    setShowColumnPopup(false);
  };

  // Add new filter
  const addFilter = () => {
    if (!newFilter.column || !newFilter.operator) {
      toast({
        title: "Incomplete filter",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const filter: FilterCondition = {
      id: Date.now().toString(),
      column: newFilter.column!,
      operator: newFilter.operator!,
      value: newFilter.value || '',
      value2: newFilter.value2,
      values: newFilter.values,
      dateFrom: newFilter.dateFrom,
      dateTo: newFilter.dateTo
    };

    const updatedFilters = [...filters, filter];
    setFilters(updatedFilters);
    setNewFilter({});
    setShowFilterForm(false);
    
    const filtered = applyFilters(dataset?.data || [], updatedFilters);
    setFilteredData(filtered);
    onFiltersChange(updatedFilters);
    
    toast({
      title: "Filter added",
      description: `Filter applied to ${filtered.length} rows`
    });
  };

  // Remove filter
  const removeFilter = (filterId: string) => {
    const updatedFilters = filters.filter(f => f.id !== filterId);
    setFilters(updatedFilters);
    
    const filtered = applyFilters(dataset?.data || [], updatedFilters);
    setFilteredData(filtered);
    onFiltersChange(updatedFilters);
  };

  // Add new segmentation
  const addSegmentation = () => {
    if (!newSegment.name || !newSegment.method || !newSegment.columns?.length) {
      toast({
        title: "Incomplete segmentation",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const segment: SegmentationConfig = {
      id: Date.now().toString(),
      name: newSegment.name!,
      method: newSegment.method!,
      columns: newSegment.columns!,
      numClusters: newSegment.numClusters,
      rules: newSegment.rules
    };

    const updatedSegments = [...segments, segment];
    setSegments(updatedSegments);
    setNewSegment({});
    setShowSegmentationForm(false);
    
    const segmented = applySegmentation(filteredData, updatedSegments);
    setSegmentedData(segmented);
    onSegmentationChange(updatedSegments);
    
    toast({
      title: "Segmentation added",
      description: `Dataset segmented using ${segment.method}`
    });
  };

  // Remove segmentation
  const removeSegmentation = (segmentId: string) => {
    const updatedSegments = segments.filter(s => s.id !== segmentId);
    setSegments(updatedSegments);
    
    const segmented = applySegmentation(filteredData, updatedSegments);
    setSegmentedData(segmented);
    onSegmentationChange(updatedSegments);
  };

  if (!dataset) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Segmentation & Filtering</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a dataset to enable filtering and segmentation
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedColumnInfo = columnInfo.find(col => col.name === selectedColumn);

  return (
    <div className="space-y-6">
      {/* Filtering Section */}
      {(!showOnlySegmentation) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Filtering</span>
              <Badge variant="outline" className="text-xs">
                {filteredData.length} rows
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active Filters */}
            {filters.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Active Filters</Label>
                {filters.map(filter => (
                  <div key={filter.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFilter(filter.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Column Selection Popup */}
            <Popover open={showColumnPopup} onOpenChange={setShowColumnPopup}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowColumnPopup(true)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Filter
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <h4 className="font-medium">Select Column to Filter</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {columnInfo.map(column => (
                      <div
                        key={column.name}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                        onClick={() => handleColumnSelect(column.name)}
                      >
                        <div>
                          <div className="font-medium text-sm">{column.name}</div>
                          <div className="text-xs text-gray-500">
                            {column.type} • {column.uniqueValues} unique values
                            {column.type === 'numeric' && column.minValue !== undefined && column.maxValue !== undefined && (
                              <span> • {column.minValue.toFixed(2)} - {column.maxValue.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Filter Configuration Form */}
            {selectedColumn && selectedColumnInfo && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filter: {selectedColumn}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedColumn(null);
                      setNewFilter({});
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {/* Operator Selection */}
                  <div>
                    <Label className="text-sm">Operator</Label>
                    <Select 
                      value={newFilter.operator} 
                      onValueChange={(value: any) => setNewFilter({...newFilter, operator: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperatorsForType(selectedColumnInfo.type).map(op => (
                          <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Value Input based on type */}
                  {newFilter.operator && (
                    <div className="space-y-3">
                      {selectedColumnInfo.type === 'numeric' && (
                        <>
                          {newFilter.operator === 'between' ? (
                            <div className="space-y-2">
                              <Label className="text-sm">Range</Label>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  type="number"
                                  placeholder="Min value"
                                  value={newFilter.value || ''}
                                  onChange={(e) => setNewFilter({...newFilter, value: e.target.value})}
                                />
                                <Input
                                  type="number"
                                  placeholder="Max value"
                                  value={newFilter.value2 || ''}
                                  onChange={(e) => setNewFilter({...newFilter, value2: e.target.value})}
                                />
                              </div>
                              {selectedColumnInfo.minValue !== undefined && selectedColumnInfo.maxValue !== undefined && (
                                <Slider
                                  value={[
                                    parseFloat(newFilter.value || selectedColumnInfo.minValue.toString()),
                                    parseFloat(newFilter.value2 || selectedColumnInfo.maxValue.toString())
                                  ]}
                                  min={selectedColumnInfo.minValue}
                                  max={selectedColumnInfo.maxValue}
                                  step={(selectedColumnInfo.maxValue - selectedColumnInfo.minValue) / 100}
                                  onValueChange={(values) => {
                                    setNewFilter({
                                      ...newFilter,
                                      value: values[0].toString(),
                                      value2: values[1].toString()
                                    });
                                  }}
                                  className="w-full"
                                />
                              )}
                            </div>
                          ) : (
                            <div>
                              <Label className="text-sm">Value</Label>
                              <Input
                                type="number"
                                placeholder="Enter value"
                                value={newFilter.value || ''}
                                onChange={(e) => setNewFilter({...newFilter, value: e.target.value})}
                              />
                              {selectedColumnInfo.minValue !== undefined && selectedColumnInfo.maxValue !== undefined && (
                                <Slider
                                  value={[parseFloat(newFilter.value || selectedColumnInfo.minValue.toString())]}
                                  min={selectedColumnInfo.minValue}
                                  max={selectedColumnInfo.maxValue}
                                  step={(selectedColumnInfo.maxValue - selectedColumnInfo.minValue) / 100}
                                  onValueChange={(values) => {
                                    setNewFilter({...newFilter, value: values[0].toString()});
                                  }}
                                  className="w-full"
                                />
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {selectedColumnInfo.type === 'categorical' && (
                        <div>
                          <Label className="text-sm">Categories</Label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {selectedColumnInfo.categories?.map(category => (
                              <div key={category} className="flex items-center space-x-2">
                                <Checkbox
                                  id={category}
                                  checked={newFilter.values?.includes(category)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = newFilter.values || [];
                                    if (checked) {
                                      setNewFilter({...newFilter, values: [...currentValues, category]});
                                    } else {
                                      setNewFilter({...newFilter, values: currentValues.filter(v => v !== category)});
                                    }
                                  }}
                                />
                                <Label htmlFor={category} className="text-sm">{category}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedColumnInfo.type === 'date' && (
                        <div>
                          <Label className="text-sm">Date Range</Label>
                          {newFilter.operator === 'date_between' ? (
                            <div className="grid grid-cols-2 gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {newFilter.dateFrom ? format(newFilter.dateFrom, 'PPP') : 'Start date'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={newFilter.dateFrom}
                                    onSelect={(date) => setNewFilter({...newFilter, dateFrom: date})}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {newFilter.dateTo ? format(newFilter.dateTo, 'PPP') : 'End date'}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={newFilter.dateTo}
                                    onSelect={(date) => setNewFilter({...newFilter, dateTo: date})}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          ) : (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="justify-start text-left font-normal w-full">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {newFilter.value ? newFilter.value : 'Select date'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={newFilter.value ? new Date(newFilter.value) : undefined}
                                  onSelect={(date) => setNewFilter({...newFilter, value: date ? format(date, 'yyyy-MM-dd') : ''})}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      )}

                      {selectedColumnInfo.type === 'text' && (
                        <div>
                          <Label className="text-sm">Text Value</Label>
                          <Input
                            placeholder="Enter text"
                            value={newFilter.value || ''}
                            onChange={(e) => setNewFilter({...newFilter, value: e.target.value})}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button size="sm" onClick={addFilter}>Add Filter</Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setSelectedColumn(null);
                        setNewFilter({});
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Segmentation Section */}
      {(!showOnlyFiltering) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Segmentation</span>
              <Badge variant="outline" className="text-xs">
                {segments.length} active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active Segmentations */}
            {segments.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Active Segmentations</Label>
                {segments.map(segment => (
                  <div key={segment.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="text-sm">
                      <span className="font-medium">{segment.name}</span>
                      <span className="mx-1">•</span>
                      <span className="text-gray-600 dark:text-gray-400">{segment.method}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSegmentation(segment.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Segmentation Form */}
            {showSegmentationForm ? (
              <div className="space-y-3 p-3 border rounded-lg">
                <div>
                  <Label className="text-sm">Name</Label>
                  <Input
                    value={newSegment.name || ''}
                    onChange={(e) => setNewSegment({...newSegment, name: e.target.value})}
                    placeholder="Enter segmentation name"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Method</Label>
                  <Select value={newSegment.method} onValueChange={(value: any) => setNewSegment({...newSegment, method: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kmeans">K-Means Clustering</SelectItem>
                      <SelectItem value="hierarchical">Hierarchical Clustering</SelectItem>
                      <SelectItem value="rule_based">Rule-Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm">Columns</Label>
                  <Select 
                    value={newSegment.columns?.[0] || ''} 
                    onValueChange={(value) => setNewSegment({...newSegment, columns: [value]})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select columns" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataset.columns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {(newSegment.method === 'kmeans' || newSegment.method === 'hierarchical') && (
                  <div>
                    <Label className="text-sm">Number of Clusters</Label>
                    <Input
                      type="number"
                      min="2"
                      max="10"
                      value={newSegment.numClusters || 3}
                      onChange={(e) => setNewSegment({...newSegment, numClusters: parseInt(e.target.value)})}
                      placeholder="3"
                    />
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button size="sm" onClick={addSegmentation}>Add Segmentation</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowSegmentationForm(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSegmentationForm(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Segmentation
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary - Only show if both sections are visible */}
      {(!showOnlyFiltering && !showOnlySegmentation) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Original rows:</span>
                <span className="font-medium">{dataset.data.length}</span>
              </div>
              <div className="flex justify-between">
                <span>After filtering:</span>
                <span className="font-medium">{filteredData.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Active filters:</span>
                <span className="font-medium">{filters.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Active segmentations:</span>
                <span className="font-medium">{segments.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
