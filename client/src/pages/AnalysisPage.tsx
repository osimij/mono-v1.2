import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AnalyticsLayout } from "@/components/AnalyticsLayout";
import { Dataset } from "@shared/schema";
import { 
  TrendingUp, 
  BarChart3, 
  Brain,
  Download,
  Plus,
  X
} from "lucide-react";
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area';

interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  xColumn?: string;
  yColumn?: string;
  aggregation?: string;
}

export function AnalysisPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedDataset, setSelectedDataset] = useState<string>("none");
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const [newChart, setNewChart] = useState<Partial<ChartConfig>>({
    type: 'bar',
    title: '',
    aggregation: 'count'
  });

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ["/api/datasets"],
  });

  const selectedDatasetData = useMemo(() => {
    if (!datasets || selectedDataset === "none") return null;
    const datasetArray = datasets as any[];
    return datasetArray.find((d: any) => d.id.toString() === selectedDataset) || null;
  }, [datasets, selectedDataset]);

  const getNumericalColumns = () => {
    if (!selectedDatasetData?.data?.length) return [];
    const firstRow = selectedDatasetData.data[0];
    return selectedDatasetData.columns.filter((col: string) => 
      typeof firstRow[col] === 'number' && !isNaN(firstRow[col])
    );
  };

  const getCategoricalColumns = () => {
    if (!selectedDatasetData?.data?.length) return [];
    const firstRow = selectedDatasetData.data[0];
    return selectedDatasetData.columns.filter((col: string) => 
      typeof firstRow[col] === 'string' || typeof firstRow[col] === 'boolean'
    );
  };

  const getAvailableColumns = (chartType: ChartType, axis: 'x' | 'y') => {
    const numerical = getNumericalColumns();
    const categorical = getCategoricalColumns();
    
    switch (chartType) {
      case 'bar':
        return axis === 'x' ? categorical : numerical;
      case 'line':
      case 'area':
        return axis === 'x' ? [...categorical, ...numerical] : numerical;
      case 'pie':
        return axis === 'x' ? categorical : numerical;
      case 'scatter':
        return numerical;
      default:
        return [];
    }
  };

  const processChartData = (chart: ChartConfig) => {
    if (!selectedDatasetData?.data) return [];
    
    const data = selectedDatasetData.data;
    
    if (chart.type === 'pie') {
      const counts: Record<string, number> = {};
      data.forEach((row: any) => {
        const value = String(row[chart.xColumn!]);
        counts[value] = (counts[value] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Sort by value descending
    }
    
    if (chart.type === 'scatter') {
      return data.slice(0, 200).map((row: any) => ({
        x: Number(row[chart.xColumn!]),
        y: Number(row[chart.yColumn!])
      }));
    }
    
    if (chart.xColumn && getCategoricalColumns().includes(chart.xColumn)) {
      const grouped: Record<string, any> = {};
      data.forEach((row: any) => {
        const key = String(row[chart.xColumn!]);
        if (!grouped[key]) {
          grouped[key] = { name: key, values: [] };
        }
        if (chart.yColumn) {
          grouped[key].values.push(Number(row[chart.yColumn]));
        }
      });
      
      const processedData = Object.values(grouped).map((group: any) => {
        const result: any = { name: group.name };
        if (chart.yColumn && group.values.length > 0) {
          switch (chart.aggregation) {
            case 'sum':
              result.value = group.values.reduce((a: number, b: number) => a + b, 0);
              break;
            case 'avg':
              result.value = group.values.reduce((a: number, b: number) => a + b, 0) / group.values.length;
              break;
            case 'max':
              result.value = Math.max(...group.values);
              break;
            case 'min':
              result.value = Math.min(...group.values);
              break;
            default:
              result.value = group.values.length;
          }
        } else {
          result.value = group.values.length;
        }
        return result;
      });
      
      // Sort by value descending for better visualization
      return processedData.sort((a, b) => b.value - a.value);
    }
    
    // For numerical x-axis, sort by the x-axis value
    if (chart.xColumn && getNumericalColumns().includes(chart.xColumn)) {
      let processedData = data.slice(0, 50).map((row: any) => ({
        name: Number(row[chart.xColumn!]),
        value: chart.yColumn ? Number(row[chart.yColumn]) : 1
      }));
      
      // Filter outliers for better visualization - especially important for age data
      if (chart.yColumn && chart.yColumn.toLowerCase().includes('age')) {
        processedData = processedData.filter(d => d.value >= 0 && d.value <= 120); // Reasonable age range
      } else if (chart.yColumn) {
        // General outlier filtering using IQR method
        const values = processedData.map(d => d.value).filter(v => !isNaN(v));
        if (values.length > 5) {
          const sorted = [...values].sort((a, b) => a - b);
          const q1 = sorted[Math.floor(sorted.length * 0.25)];
          const q3 = sorted[Math.floor(sorted.length * 0.75)];
          const iqr = q3 - q1;
          const lowerBound = q1 - 2 * iqr;
          const upperBound = q3 + 2 * iqr;
          
          processedData = processedData.filter(d => 
            d.value >= lowerBound && d.value <= upperBound
          );
        }
      }
      
      // Sort by name (x-axis value) ascending for numerical data
      return processedData.sort((a, b) => a.name - b.name);
    }
    
    let finalData = data.slice(0, 50).map((row: any, index: number) => ({
      name: chart.xColumn ? String(row[chart.xColumn]) : `Row ${index + 1}`,
      value: chart.yColumn ? Number(row[chart.yColumn]) : 1
    }));
    
    // Apply outlier filtering for y-axis values
    if (chart.yColumn && chart.yColumn.toLowerCase().includes('age')) {
      finalData = finalData.filter(d => d.value >= 0 && d.value <= 120); // Reasonable age range
    } else if (chart.yColumn) {
      const values = finalData.map(d => d.value).filter(v => !isNaN(v));
      if (values.length > 5) {
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 2 * iqr;
        const upperBound = q3 + 2 * iqr;
        
        finalData = finalData.filter(d => 
          d.value >= lowerBound && d.value <= upperBound
        );
      }
    }
    
    return finalData;
  };

  const renderChart = (chart: ChartConfig) => {
    const chartData = processChartData(chart);
    
    // Get proper axis labels
    const getYAxisLabel = () => {
      if (chart.yColumn) {
        const aggregationText = chart.aggregation && chart.aggregation !== 'count' 
          ? `${chart.aggregation.charAt(0).toUpperCase() + chart.aggregation.slice(1)} of ` 
          : '';
        return `${aggregationText}${chart.yColumn}`;
      }
      return 'Count';
    };
    
    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                label={{ value: chart.xColumn || 'Category', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                labelFormatter={(value) => `${chart.xColumn || 'Category'}: ${value}`}
                formatter={(value) => [value, getYAxisLabel()]}
              />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                label={{ value: chart.xColumn || 'X-Axis', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                labelFormatter={(value) => `${chart.xColumn || 'X-Axis'}: ${value}`}
                formatter={(value) => [value, getYAxisLabel()]}
              />
              <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                label={{ value: chart.xColumn || 'X-Axis', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                labelFormatter={(value) => `${chart.xColumn || 'X-Axis'}: ${value}`}
                formatter={(value) => [value, getYAxisLabel()]}
              />
              <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie 
                dataKey="value" 
                data={chartData} 
                cx="50%" 
                cy="50%" 
                outerRadius={80} 
                fill="#8884d8"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, `${chart.xColumn || 'Category'}: ${name}`]} />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
      
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={chartData}>
              <CartesianGrid />
              <XAxis 
                dataKey="x" 
                type="number" 
                name={chart.xColumn}
                label={{ value: chart.xColumn || 'X-Axis', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                dataKey="y" 
                type="number" 
                name={chart.yColumn}
                label={{ value: chart.yColumn || 'Y-Axis', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value, name) => [value, name === 'x' ? chart.xColumn : chart.yColumn]}
              />
              <Scatter fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  const addChart = () => {
    if (!newChart.title || !newChart.type || !newChart.xColumn) {
      toast({
        title: "Error",
        description: "Please fill in chart title and select columns",
        variant: "destructive"
      });
      return;
    }
    
    const chart: ChartConfig = {
      id: Date.now().toString(),
      type: newChart.type!,
      title: newChart.title!,
      xColumn: newChart.xColumn,
      yColumn: newChart.yColumn,
      aggregation: newChart.aggregation || 'count'
    };
    
    setCharts([...charts, chart]);
    setNewChart({ type: 'bar', title: '', aggregation: 'count' });
    
    toast({
      title: "Success",
      description: "Chart created successfully",
    });
  };

  const removeChart = (chartId: string) => {
    setCharts(charts.filter(c => c.id !== chartId));
  };

  const getSmartInsights = () => {
    if (!selectedDatasetData?.data?.length) return [];
    
    const insights = [];
    const data = selectedDatasetData.data;
    const columns = selectedDatasetData.columns;
    const dataLength = data.length;
    
    // 1. Filter out completely empty columns (unused columns)
    const activeColumns = columns.filter(col => {
      const values = data.map(row => row[col]);
      const nonEmptyValues = values.filter(val => val != null && val !== '' && val !== undefined);
      return nonEmptyValues.length > 0; // Column has at least some data
    });
    
    // 2. Data Quality Insights (only for active columns)
    if (activeColumns.length > 0) {
      const missingCount = data.reduce((count, row) => {
        return count + activeColumns.filter(col => row[col] == null || row[col] === '').length;
      }, 0);
      const missingPercentage = ((missingCount / (dataLength * activeColumns.length)) * 100).toFixed(1);
      
      insights.push(`Dataset Overview: ${activeColumns.length} active columns out of ${columns.length} total`);
      
      if (parseFloat(missingPercentage) > 10) {
        insights.push(`Data Quality Alert: ${missingPercentage}% missing values in active columns - consider data cleaning`);
      } else if (parseFloat(missingPercentage) < 2) {
        insights.push(`Data Quality: Excellent - ${missingPercentage}% missing values in active data`);
      } else {
        insights.push(`Data Quality: Good - ${missingPercentage}% missing values in active columns`);
      }
    }
    
    // 3. Numerical Column Analysis (only active columns)
    const numericalColumns = activeColumns.filter(col => {
      const values = data.map(row => row[col]).filter(val => val != null && val !== '');
      return values.length > 0 && values.every(val => !isNaN(Number(val)));
    });
    
    numericalColumns.forEach(col => {
      const values = data.map(row => Number(row[col])).filter(val => !isNaN(val));
      if (values.length === 0) return;
      
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0 
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      
      const skewness = Math.abs(mean - median) / mean;
      
      if (skewness > 0.3) {
        insights.push(`${col}: Highly skewed distribution (mean: ${mean.toFixed(1)}, median: ${median.toFixed(1)})`);
      }
      
      // Detect outliers
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const outliers = values.filter(val => val < q1 - 1.5 * iqr || val > q3 + 1.5 * iqr);
      
      if (outliers.length > values.length * 0.1) {
        insights.push(`${col}: ${outliers.length} potential outliers detected (${((outliers.length/values.length)*100).toFixed(1)}%)`);
      }
    });
    
    // 4. Categorical Column Analysis (only active columns)
    const categoricalColumns = activeColumns.filter(col => {
      const values = data.map(row => row[col]).filter(val => val != null && val !== '');
      const uniqueValues = new Set(values);
      return uniqueValues.size < values.length * 0.5 && uniqueValues.size > 1;
    });
    
    categoricalColumns.forEach(col => {
      const values = data.map(row => row[col]).filter(val => val != null && val !== '');
      const valueCounts = values.reduce((counts, val) => {
        counts[val] = (counts[val] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      
      const sortedCounts = Object.entries(valueCounts).sort(([,a], [,b]) => b - a);
      const topValue = sortedCounts[0];
      const topPercentage = ((topValue[1] / values.length) * 100).toFixed(1);
      
      if (sortedCounts.length <= 5 && parseFloat(topPercentage) > 40) {
        insights.push(`${col}: Dominated by "${topValue[0]}" (${topPercentage}% of records)`);
      } else if (sortedCounts.length > 20) {
        insights.push(`${col}: High diversity - ${sortedCounts.length} unique values found`);
      }
    });
    
    // 4. Correlation Insights (for numerical columns)
    if (numericalColumns.length >= 2) {
      const correlations = [];
      for (let i = 0; i < numericalColumns.length; i++) {
        for (let j = i + 1; j < numericalColumns.length; j++) {
          const col1 = numericalColumns[i];
          const col2 = numericalColumns[j];
          
          const values1 = data.map(row => Number(row[col1])).filter(val => !isNaN(val));
          const values2 = data.map(row => Number(row[col2])).filter(val => !isNaN(val));
          
          if (values1.length === values2.length && values1.length > 10) {
            const correlation = calculateCorrelation(values1, values2);
            if (Math.abs(correlation) > 0.7) {
              correlations.push({
                col1, col2, correlation: correlation.toFixed(3),
                strength: Math.abs(correlation) > 0.9 ? 'Very Strong' : 'Strong'
              });
            }
          }
        }
      }
      
      correlations.forEach(corr => {
        const direction = parseFloat(corr.correlation) > 0 ? 'positive' : 'negative';
        insights.push(`${corr.strength} ${direction} correlation between ${corr.col1} and ${corr.col2} (${corr.correlation})`);
      });
    }
    
    // 5. Dataset Size Insights
    if (dataLength < 100) {
      insights.push(`Small dataset: ${dataLength} records - consider collecting more data for robust analysis`);
    } else if (dataLength > 100000) {
      insights.push(`Large dataset: ${dataLength.toLocaleString()} records - excellent for machine learning models`);
    }
    
    return insights.slice(0, 6); // Limit to 6 most important insights
  };
  
  const calculateCorrelation = (x: number[], y: number[]) => {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  if (isLoading) {
    return (
      <AnalyticsLayout>
        <div className="container mx-auto p-6">
          <p className="text-gray-600 dark:text-gray-300">Loading datasets...</p>
        </div>
      </AnalyticsLayout>
    );
  }

  return (
    <AnalyticsLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Analysis</h2>
          <Button 
            variant="outline"
            onClick={() => setLocation('/assistant')}
          >
            <Brain className="w-4 h-4 mr-2" />
            Ask Mono-AI
          </Button>
        </div>
        {/* Dataset Selection */}
        <Card className="bg-white dark:bg-gray-950">
          <CardHeader>
            <CardTitle>Dataset Selection</CardTitle>
          </CardHeader>
          <CardContent>
              <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a dataset..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a dataset...</SelectItem>
                  {(datasets as any[]).map((dataset: any) => (
                    <SelectItem key={dataset.id} value={dataset.id.toString()}>
                      {dataset.originalName || dataset.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedDatasetData && (
          <>
            {/* Smart Insights Toggle - Prominent but compact */}
            <div className="mb-6 flex justify-center">
              <Button 
                onClick={() => setShowInsights(!showInsights)} 
                variant={showInsights ? "default" : "outline"}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Brain className="w-4 h-4 mr-2" />
                {showInsights ? "Hide" : "Show"} Smart Insights
              </Button>
            </div>

            {/* Smart Insights - Fixed Position */}
            {showInsights && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="w-5 h-5 mr-2" />
                    Smart Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getSmartInsights().map((insight, index) => (
                      <div key={index} className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
                        <p className="text-blue-800 dark:text-blue-200">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chart Creation - Always Visible */}
            <Card className="mb-8 chart-controls" data-chart="config">
              <CardHeader>
                <CardTitle>Create Visualization</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 chart-config">
                  <div>
                    <label className="block text-sm font-medium mb-2">Chart Type</label>
                    <Select value={newChart.type} onValueChange={(value: ChartType) => {
                      setNewChart({...newChart, type: value, xColumn: undefined, yColumn: undefined});
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">Bar Chart</SelectItem>
                        <SelectItem value="line">Line Chart</SelectItem>
                        <SelectItem value="area">Area Chart</SelectItem>
                        <SelectItem value="pie">Pie Chart</SelectItem>
                        <SelectItem value="scatter">Scatter Plot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Chart Title</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
                      value={newChart.title || ''}
                      onChange={(e) => setNewChart({...newChart, title: e.target.value})}
                      placeholder="Enter chart title"
                    />
                  </div>
                  
                  {newChart.type && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {newChart.type === 'pie' ? 'Category' : 'X-Axis'}
                      </label>
                      <Select 
                        value={newChart.xColumn || ''} 
                        onValueChange={(value) => setNewChart({...newChart, xColumn: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableColumns(newChart.type, 'x').map((col: string) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {newChart.type && newChart.type !== 'pie' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Y-Axis</label>
                      <Select 
                        value={newChart.yColumn || ''} 
                        onValueChange={(value) => setNewChart({...newChart, yColumn: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableColumns(newChart.type, 'y').map((col: string) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {newChart.type && newChart.xColumn && getCategoricalColumns().includes(newChart.xColumn) && newChart.yColumn && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Aggregation</label>
                    <Select 
                      value={newChart.aggregation || 'count'} 
                      onValueChange={(value) => setNewChart({...newChart, aggregation: value})}
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
                    <Plus className="w-4 h-4 mr-2" />
                    Create Chart
                  </Button>
                </div>
              </CardContent>
            </Card>



            {/* Charts Display */}
            {charts.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {charts.map(chart => (
                  <Card key={chart.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{chart.title}</CardTitle>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeChart(chart.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {renderChart(chart)}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button onClick={() => setLocation('/modeling')} className="bg-primary hover:bg-primary/90">
                <TrendingUp className="w-4 h-4 mr-2" />
                Build ML Model
              </Button>
              <Button onClick={() => setLocation('/assistant')} variant="outline">
                <Brain className="w-4 h-4 mr-2" />
                Ask Questions
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Analysis
              </Button>
            </div>
          </>
        )}

        {selectedDataset === "none" && (
          <Card className="bg-white dark:bg-gray-950">
            <CardContent className="p-8">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Dataset</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Choose a dataset to start creating custom visualizations and discover insights.
                </p>
                <Button onClick={() => setLocation('/data')} variant="outline">
                  Manage Data
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AnalyticsLayout>
  );
}