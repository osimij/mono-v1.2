import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AnalyticsLayout } from "@/components/AnalyticsLayout";
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";
import { TrendingUp, BarChart3, Brain, Download, Plus, X } from "lucide-react";
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

const COLORS = ["#5B8DEF", "#00C9A7", "#FFC75F", "#FF8066", "#B39CD0", "#6EE7B7"];

type ChartType = "bar" | "line" | "pie" | "scatter" | "area";

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
    type: "bar",
    title: "",
    aggregation: "count"
  });

  const { data: datasets = [], isLoading } = useQuery({
    queryKey: ["/api/datasets"]
  });

  const selectedDatasetData = useMemo(() => {
    if (!datasets || selectedDataset === "none") return null;
    const datasetArray = datasets as any[];
    return datasetArray.find((d: any) => d.id.toString() === selectedDataset) || null;
  }, [datasets, selectedDataset]);

  const getNumericalColumns = () => {
    if (!selectedDatasetData?.data?.length) return [];
    const firstRow = selectedDatasetData.data[0];
    return selectedDatasetData.columns.filter(
      (col: string) => typeof firstRow[col] === "number" && !Number.isNaN(firstRow[col])
    );
  };

  const getCategoricalColumns = () => {
    if (!selectedDatasetData?.data?.length) return [];
    const firstRow = selectedDatasetData.data[0];
    return selectedDatasetData.columns.filter((col: string) => {
      const value = firstRow[col];
      return typeof value === "string" || typeof value === "boolean";
    });
  };

  const getAvailableColumns = (chartType: ChartType, axis: "x" | "y") => {
    const numerical = getNumericalColumns();
    const categorical = getCategoricalColumns();

    switch (chartType) {
      case "bar":
        return axis === "x" ? categorical : numerical;
      case "line":
      case "area":
        return axis === "x" ? [...categorical, ...numerical] : numerical;
      case "pie":
        return axis === "x" ? categorical : numerical;
      case "scatter":
        return numerical;
      default:
        return [];
    }
  };

  const processChartData = (chart: ChartConfig) => {
    if (!selectedDatasetData?.data) return [];

    const data = selectedDatasetData.data;

    if (chart.type === "pie" && chart.xColumn) {
      const counts: Record<string, number> = {};
      data.forEach((row: any) => {
        const value = String(row[chart.xColumn!]);
        counts[value] = (counts[value] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }

    if (chart.type === "scatter" && chart.xColumn && chart.yColumn) {
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
          grouped[key] = { name: key, values: [] as number[] };
        }
        if (chart.yColumn) {
          grouped[key].values.push(Number(row[chart.yColumn]));
        }
      });

      return Object.values(grouped)
        .map((group: any) => {
          const result: any = { name: group.name };
          if (chart.yColumn && group.values.length > 0) {
            switch (chart.aggregation) {
              case "sum":
                result.value = group.values.reduce((a: number, b: number) => a + b, 0);
                break;
              case "avg":
                result.value =
                  group.values.reduce((a: number, b: number) => a + b, 0) / group.values.length;
                break;
              case "max":
                result.value = Math.max(...group.values);
                break;
              case "min":
                result.value = Math.min(...group.values);
                break;
              default:
                result.value = group.values.length;
            }
          } else {
            result.value = group.values.length;
          }
          return result;
        })
        .sort((a, b) => b.value - a.value);
    }

    if (chart.xColumn && getNumericalColumns().includes(chart.xColumn)) {
      let processedData = data.slice(0, 100).map((row: any) => ({
        name: Number(row[chart.xColumn!]),
        value: chart.yColumn ? Number(row[chart.yColumn]) : 1
      }));

      if (chart.yColumn && chart.yColumn.toLowerCase().includes("age")) {
        processedData = processedData.filter((d) => d.value >= 0 && d.value <= 120);
      } else if (chart.yColumn) {
        processedData = filterOutliers(processedData);
      }

      return processedData.sort((a, b) => a.name - b.name);
    }

    let finalData = data.slice(0, 50).map((row: any, index: number) => ({
      name: chart.xColumn ? String(row[chart.xColumn]) : `Row ${index + 1}`,
      value: chart.yColumn ? Number(row[chart.yColumn]) : 1
    }));

    if (chart.yColumn && chart.yColumn.toLowerCase().includes("age")) {
      finalData = finalData.filter((d) => d.value >= 0 && d.value <= 120);
    } else if (chart.yColumn) {
      finalData = filterOutliers(finalData);
    }

    return finalData;
  };

  const filterOutliers = (data: { value: number }[]) => {
    const values = data.map((d) => d.value).filter((v) => !Number.isNaN(v));
    if (values.length <= 5) return data;

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 2 * iqr;
    const upperBound = q3 + 2 * iqr;

    return data.filter((d) => d.value >= lowerBound && d.value <= upperBound);
  };

  const renderChart = (chart: ChartConfig) => {
    const chartData = processChartData(chart);

    const getYAxisLabel = () => {
      if (chart.yColumn) {
        const aggregationText =
          chart.aggregation && chart.aggregation !== "count"
            ? `${chart.aggregation.charAt(0).toUpperCase() + chart.aggregation.slice(1)} of `
            : "";
        return `${aggregationText}${chart.yColumn}`;
      }
      return "Count";
    };

    switch (chart.type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: getYAxisLabel(), angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Bar dataKey="value" fill="#5B8DEF" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: getYAxisLabel(), angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#5B8DEF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "area":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: getYAxisLabel(), angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#5B8DEF" fill="#5B8DEF" fillOpacity={0.5} />
            </AreaChart>
          </ResponsiveContainer>
        );
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                dataKey="value"
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        );
      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis
                dataKey="x"
                type="number"
                name={chart.xColumn}
                label={{ value: chart.xColumn || "X-Axis", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                dataKey="y"
                type="number"
                name={chart.yColumn}
                label={{ value: chart.yColumn || "Y-Axis", angle: -90, position: "insideLeft" }}
              />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter data={chartData} fill="#5B8DEF" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return <p className="text-sm text-text-muted">Unsupported chart type.</p>;
    }
  };

  const addChart = () => {
    if (!newChart.title || !newChart.type || !newChart.xColumn) {
      toast({
        title: "Missing details",
        description: "Please enter a chart title and select columns.",
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
      aggregation: newChart.aggregation || "count"
    };

    setCharts((prev) => [...prev, chart]);
    setNewChart({ type: "bar", title: "", aggregation: "count" });

    toast({
      title: "Chart created",
      description: "The new visualization has been added."
    });
  };

  const removeChart = (chartId: string) => {
    setCharts((prev) => prev.filter((chart) => chart.id !== chartId));
  };

  const getSmartInsights = () => {
    if (!selectedDatasetData?.data?.length) return [];

    const insights: string[] = [];
    const data = selectedDatasetData.data;
    const columns = selectedDatasetData.columns;
    const dataLength = data.length;

    const activeColumns = columns.filter((col) => {
      const values = data.map((row) => row[col]);
      const nonEmpty = values.filter((val) => val != null && val !== "");
      return nonEmpty.length > 0;
    });

    if (activeColumns.length > 0) {
      const missingCount = data.reduce((count, row) => {
        return (
          count +
          activeColumns.filter((col) => row[col] == null || row[col] === "").length
        );
      }, 0);
      const missingPercentage = ((missingCount / (dataLength * activeColumns.length)) * 100).toFixed(1);

      insights.push(`Dataset overview: ${activeColumns.length} active columns out of ${columns.length}.`);

      const missingValue = parseFloat(missingPercentage);
      if (missingValue > 10) {
        insights.push(`Data quality alert: ${missingPercentage}% missing values detected. Consider cleaning.`);
      } else if (missingValue < 2) {
        insights.push(`Data quality: Excellent — only ${missingPercentage}% missing values.`);
      } else {
        insights.push(`Data quality: Good — ${missingPercentage}% missing values.`);
      }
    }

    const numericalColumns = activeColumns.filter((col) => {
      const values = data.map((row) => row[col]).filter((val) => val != null && val !== "");
      return values.length > 0 && values.every((val) => !Number.isNaN(Number(val)));
    });

    numericalColumns.forEach((col) => {
      const values = data.map((row) => Number(row[col])).filter((val) => !Number.isNaN(val));
      if (values.length === 0) return;

      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      const median =
        sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

      const skewness = Math.abs(mean - median) / (mean || 1);
      if (skewness > 0.3) {
        insights.push(
          `${col}: Highly skewed distribution (mean: ${mean.toFixed(1)}, median: ${median.toFixed(1)}).`
        );
      }

      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const outliers = values.filter((val) => val < q1 - 1.5 * iqr || val > q3 + 1.5 * iqr);
      if (outliers.length > values.length * 0.1) {
        insights.push(`${col}: ${outliers.length} potential outliers identified.`);
      }
    });

    const categoricalColumns = activeColumns.filter((col) => {
      const values = data.map((row) => row[col]).filter((val) => val != null && val !== "");
      const uniqueValues = new Set(values);
      return uniqueValues.size > 1 && uniqueValues.size < values.length * 0.5;
    });

    categoricalColumns.forEach((col) => {
      const values = data.map((row) => row[col]).filter((val) => val != null && val !== "");
      const valueCounts = values.reduce((counts, val) => {
        counts[val] = (counts[val] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      const sortedCounts = Object.entries(valueCounts).sort(([, a], [, b]) => b - a);
      const topValue = sortedCounts[0];
      const topPercentage = ((topValue[1] / values.length) * 100).toFixed(1);

      if (sortedCounts.length <= 5 && parseFloat(topPercentage) > 40) {
        insights.push(`${col}: Dominated by "${topValue[0]}" (${topPercentage}% of records).`);
      } else if (sortedCounts.length > 20) {
        insights.push(`${col}: High diversity with ${sortedCounts.length} distinct values.`);
      }
    });

    if (numericalColumns.length >= 2) {
      const correlations: {
        col1: string;
        col2: string;
        correlation: string;
        strength: string;
      }[] = [];

      for (let i = 0; i < numericalColumns.length; i++) {
        for (let j = i + 1; j < numericalColumns.length; j++) {
          const col1 = numericalColumns[i];
          const col2 = numericalColumns[j];

          const values1 = data.map((row) => Number(row[col1])).filter((val) => !Number.isNaN(val));
          const values2 = data.map((row) => Number(row[col2])).filter((val) => !Number.isNaN(val));

          if (values1.length === values2.length && values1.length > 10) {
            const correlation = calculateCorrelation(values1, values2);
            if (Math.abs(correlation) > 0.7) {
              correlations.push({
                col1,
                col2,
                correlation: correlation.toFixed(3),
                strength: Math.abs(correlation) > 0.9 ? "very strong" : "strong"
              });
            }
          }
        }
      }

      correlations.forEach((corr) => {
        const direction = parseFloat(corr.correlation) > 0 ? "positive" : "negative";
        insights.push(
          `${corr.col1} and ${corr.col2}: ${corr.strength} ${direction} correlation (${corr.correlation}).`
        );
      });
    }

    return insights;
  };

  const calculateCorrelation = (x: number[], y: number[]) => {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  };

  if (isLoading) {
    return (
      <AnalyticsLayout>
        <PageShell padding="lg" width="wide">
          <LoadingState message="Loading datasets…" />
        </PageShell>
      </AnalyticsLayout>
    );
  }

  return (
    <AnalyticsLayout>
      <PageShell padding="lg" width="wide">
        <PageHeader
          eyebrow="Analysis"
          title="Custom analysis"
          description="Generate tailored visualizations and surface AI-assisted insights from your datasets."
          actions={
            <Button variant="outline" onClick={() => setLocation("/assistant")}>
              <Brain className="mr-2 h-4 w-4" />
              Ask Mono-AI
            </Button>
          }
        />

        <PageSection surface="transparent" contentClassName="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dataset selection</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a dataset…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a dataset…</SelectItem>
                  {(datasets as any[]).map((dataset: any) => (
                    <SelectItem key={dataset.id} value={dataset.id.toString()}>
                      {dataset.originalName || dataset.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedDatasetData ? (
            <>
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowInsights((prev) => !prev)}
                  variant={showInsights ? "default" : "outline"}
                  className={showInsights ? "bg-warning text-warning-foreground hover:bg-warning/90" : ""}
                >
                  <Brain className="mr-2 h-4 w-4" />
                  {showInsights ? "Hide insights" : "Show insights"}
                </Button>
              </div>

              {showInsights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-primary" />
                      Smart insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {getSmartInsights().map((insight, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary"
                      >
                        {insight}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Create visualization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <LabelText>Chart type</LabelText>
                      <Select
                        value={newChart.type}
                        onValueChange={(value: ChartType) =>
                          setNewChart({ ...newChart, type: value, xColumn: undefined, yColumn: undefined })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bar">Bar chart</SelectItem>
                          <SelectItem value="line">Line chart</SelectItem>
                          <SelectItem value="area">Area chart</SelectItem>
                          <SelectItem value="pie">Pie chart</SelectItem>
                          <SelectItem value="scatter">Scatter plot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <LabelText>Chart title</LabelText>
                      <Input
                        value={newChart.title || ""}
                        onChange={(event) =>
                          setNewChart((prev) => ({ ...prev, title: event.target.value }))
                        }
                        placeholder="e.g. Revenue by segment"
                      />
                    </div>

                    {newChart.type && (
                      <div className="space-y-2">
                        <LabelText>{newChart.type === "pie" ? "Category" : "X-axis"}</LabelText>
                        <Select
                          value={newChart.xColumn || ""}
                          onValueChange={(value) =>
                            setNewChart((prev) => ({ ...prev, xColumn: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableColumns(newChart.type, "x").map((col: string) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {newChart.type && newChart.type !== "pie" && (
                      <div className="space-y-2">
                        <LabelText>Y-axis</LabelText>
                        <Select
                          value={newChart.yColumn || ""}
                          onValueChange={(value) =>
                            setNewChart((prev) => ({ ...prev, yColumn: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableColumns(newChart.type, "y").map((col: string) => (
                              <SelectItem key={col} value={col}>
                                {col}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {newChart.type &&
                    newChart.xColumn &&
                    getCategoricalColumns().includes(newChart.xColumn) &&
                    newChart.yColumn && (
                      <div className="space-y-2">
                        <LabelText>Aggregation</LabelText>
                        <Select
                          value={newChart.aggregation || "count"}
                          onValueChange={(value) =>
                            setNewChart((prev) => ({ ...prev, aggregation: value }))
                          }
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
                      <Plus className="mr-2 h-4 w-4" />
                      Create chart
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {charts.length > 0 && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {charts.map((chart) => (
                    <Card key={chart.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{chart.title}</CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeChart(chart.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>{renderChart(chart)}</CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setLocation("/modeling")}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Build ML model
                </Button>
                <Button variant="outline" onClick={() => setLocation("/assistant")}>
                  <Brain className="mr-2 h-4 w-4" />
                  Ask questions
                </Button>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export analysis
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="Select a dataset"
              description="Choose a dataset to start exploring visualizations and insights."
              action={{ label: "Manage data", onClick: () => setLocation("/data") }}
            />
          )}
        </PageSection>
      </PageShell>
    </AnalyticsLayout>
  );
}

interface LabelTextProps {
  children: React.ReactNode;
}

function LabelText({ children }: LabelTextProps) {
  return <p className="text-sm font-medium text-text-soft">{children}</p>;
}

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-primary">
          <Icon className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
        {action ? (
          <Button variant="outline" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface LoadingStateProps {
  message: string;
}

function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-text-muted">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
