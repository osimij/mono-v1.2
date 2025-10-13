import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataPreprocessor } from "@/components/DataPreprocessor";
import { Database, Search as SearchIcon, Eye, Table as TableIcon } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";
import type { Dataset } from "@/types";

const CLEANING_STEPS = [
  { id: 1, label: "Select dataset" },
  { id: 2, label: "Configure options" },
  { id: 3, label: "Get clean data" }
] as const;

const LIGHT_MODE_TASKS = [
  {
    title: "Remove empty rows and columns",
    tooltip: "Drop rows or columns that are completely empty."
  },
  {
    title: "Handle missing values",
    tooltip: "Fill or drop nulls using sensible defaults."
  },
  {
    title: "Remove duplicates",
    tooltip: "Drop exact duplicate rows."
  },
  {
    title: "Basic data validation",
    tooltip: "Ensure consistent data types and value ranges."
  }
] as const;

const PRO_MODE_TASKS = [
  {
    title: "Smart categorical encoding",
    tooltip: "Automatically encode categorical features for ML readiness."
  },
  {
    title: "Outlier detection and removal",
    tooltip: "Identify and optionally remove extreme values."
  },
  {
    title: "Feature scaling and normalization",
    tooltip: "Standardize numeric features for improved modeling."
  },
  {
    title: "Advanced text processing",
    tooltip: "Tokenize, clean, and vectorize text columns."
  },
  {
    title: "Data type conversion",
    tooltip: "Coerce columns to expected types."
  }
] as const;

export function DataCleaningPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreprocessor, setShowPreprocessor] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [mode, setMode] = useState<"light" | "pro">("light");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);
  const [previewRowCount] = useState<number>(5);
  const [cleanedNewCount, setCleanedNewCount] = useState<number>(0);

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = (await api.datasets.getAll()) as Dataset[];
        setDatasets(data);
      } catch (err) {
        console.error("Error fetching datasets:", err);
        setError("Failed to load datasets. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, []);

  const filteredDatasets = useMemo(() => {
    if (!searchTerm) return datasets;
    const term = searchTerm.toLowerCase();
    return datasets.filter((dataset) =>
      dataset.originalName.toLowerCase().includes(term) ||
      dataset.filename.toLowerCase().includes(term)
    );
  }, [datasets, searchTerm]);

  const handleDatasetSelect = async (dataset: Dataset) => {
    try {
      setIsLoadingDataset(true);
      setSelectedDataset(dataset);
      const details = (await api.datasets.getById(dataset.id)) as Dataset;
      setSelectedDataset(details);
      setCurrentStep(2);
    } catch (err) {
      console.error("Error fetching dataset details:", err);
      setError("Failed to load dataset details.");
    } finally {
      setIsLoadingDataset(false);
    }
  };

  const handlePreprocessingComplete = () => {
    setShowPreprocessor(false);
    setCurrentStep(3);
    setCleanedNewCount((count) => count + 1);
  };

  const handleBackToSelection = () => {
    setShowPreprocessor(false);
    setSelectedDataset(null);
    setCurrentStep(1);
  };

  if (showPreprocessor && selectedDataset) {
    return (
      <PageShell padding="lg" width="wide">
        <PageHeader
          eyebrow="Preparation"
          title="Data cleaning"
          description="Apply configurable cleaning pipelines and export ready-to-use datasets."
        />
        <PageSection surface="transparent">
          <DataPreprocessor
            onComplete={handlePreprocessingComplete}
            onBack={handleBackToSelection}
            datasets={datasets}
            initialDataset={selectedDataset}
          />
        </PageSection>
      </PageShell>
    );
  }

  return (
    <PageShell padding="lg" width="wide">
      <PageHeader
        eyebrow="Preparation"
        title="Data cleaning"
        description="Select a dataset, configure cleaning options, and export the polished result."
      />

      <PageSection surface="transparent" contentClassName="space-y-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {CLEANING_STEPS.map((step, index) => {
                const isActive = currentStep === step.id;
                const isLast = index === CLEANING_STEPS.length - 1;
                return (
                  <div key={step.id} className="flex flex-1 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(step.id)}
                      className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-primary/50 bg-primary/10 text-primary shadow-xs"
                          : "border-transparent text-text-muted hover:bg-surface-muted"
                      }`}
                    >
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                        isActive ? "border-primary bg-primary text-primary-foreground" : "border-border text-text-muted"
                      }`}>
                        {step.id}
                      </span>
                      <span>{step.label}</span>
                    </button>
                    {!isLast && <div className="hidden flex-1 border-t border-dashed border-border/80 md:block" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <span>Mode</span>
            </CardTitle>
            <CardDescription>Choose a preset pipeline and review the included steps.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs value={mode} onValueChange={(value) => setMode(value as "light" | "pro")}>
              <TabsList>
                <TabsTrigger value="light">Light mode</TabsTrigger>
                <TabsTrigger value="pro">Pro mode</TabsTrigger>
              </TabsList>

              <TabsContent value="light" className="pt-4">
                <FeatureList items={LIGHT_MODE_TASKS} />
              </TabsContent>

              <TabsContent value="pro" className="pt-4">
                <FeatureList items={PRO_MODE_TASKS} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <Tabs defaultValue="datasets" className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="datasets">Datasets</TabsTrigger>
                  <TabsTrigger value="cleaned">
                    Cleaned datasets
                    {cleanedNewCount > 0 ? (
                      <Badge variant="secondary" className="ml-2">
                        NEW
                      </Badge>
                    ) : null}
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="datasets" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-12">
                  <Card className="lg:col-span-5 flex min-h-[420px] flex-col">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Select dataset to clean</CardTitle>
                      <CardDescription>Pick a dataset and review its details</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
                      <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                        <Input
                          value={searchTerm}
                          onChange={(event) => setSearchTerm(event.target.value)}
                          placeholder="Search datasets..."
                          className="pl-9"
                        />
                      </div>

                      <div className="flex-1 overflow-hidden rounded-lg border border-border">
                        {isLoading ? (
                          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-text-muted">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                            <span>Loading datasets…</span>
                          </div>
                        ) : error ? (
                          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                            <span className="text-sm font-medium text-danger">{error}</span>
                            <Button size="sm" onClick={() => window.location.reload()}>
                              Try again
                            </Button>
                          </div>
                        ) : filteredDatasets.length === 0 ? (
                          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                            <Database className="h-10 w-10 text-text-subtle" />
                            <div>
                              <p className="text-sm font-medium text-text-primary">No datasets found</p>
                              <p className="text-xs text-text-muted">
                                Upload a dataset first to start cleaning.
                              </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                              <Button size="sm" onClick={() => (window.location.href = "/data/upload")}>
                                Upload dataset
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => (window.location.href = "/data/preview")}>
                                View datasets
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full overflow-auto">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-surface">
                                <tr>
                                  <th className="border-b border-border p-2 text-left font-medium text-text-muted">Name</th>
                                  <th className="w-24 border-b border-border p-2 text-left font-medium text-text-muted">Rows</th>
                                  <th className="w-24 border-b border-border p-2 text-left font-medium text-text-muted">Columns</th>
                                  <th className="w-28 border-b border-border p-2 text-left font-medium text-text-muted">Size</th>
                                  <th className="w-36 border-b border-border p-2 text-left font-medium text-text-muted">Updated</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredDatasets.map((dataset) => {
                                  const isSelected = selectedDataset?.id === dataset.id;
                                  const uploadedLabel = dataset.uploadedAt
                                    ? new Date(dataset.uploadedAt).toLocaleDateString()
                                    : "—";
                                  return (
                                    <tr
                                      key={dataset.id}
                                      onClick={() => handleDatasetSelect(dataset)}
                                      className={`cursor-pointer border-b border-border/60 transition-colors ${
                                        isSelected ? "bg-primary/10" : "hover:bg-surface-muted"
                                      }`}
                                    >
                                      <td className="p-2">
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium text-text-primary truncate">
                                            {dataset.originalName}
                                          </span>
                                          <span className="text-xs text-text-subtle truncate">{dataset.filename}</span>
                                        </div>
                                      </td>
                                      <td className="p-2 text-sm text-text-soft">
                                        {dataset.rowCount ? dataset.rowCount.toLocaleString() : "—"}
                                      </td>
                                      <td className="p-2 text-sm text-text-soft">
                                        {dataset.columns ? dataset.columns.length : "—"}
                                      </td>
                                      <td className="p-2 text-sm text-text-soft">
                                        {(dataset.fileSize / 1024).toFixed(1)} KB
                                      </td>
                                      <td className="p-2 text-sm text-text-soft">{uploadedLabel}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-7 flex min-h-[420px] flex-col">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Eye className="h-4 w-4 text-primary" />
                        <span>{selectedDataset ? `Preview: ${selectedDataset.originalName}` : "Preview"}</span>
                      </CardTitle>
                      {selectedDataset ? (
                        <CardDescription>
                          {(selectedDataset.rowCount ?? 0).toLocaleString()} rows ·{" "}
                          {(selectedDataset.columns?.length ?? 0).toLocaleString()} columns
                        </CardDescription>
                      ) : (
                        <CardDescription>Select a dataset to view a quick preview.</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col overflow-hidden">
                      {!selectedDataset ? (
                        <EmptyPreviewState />
                      ) : isLoadingDataset ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-text-muted">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                          <span>Loading dataset details…</span>
                        </div>
                      ) : selectedDataset.data && selectedDataset.data.length > 0 ? (
                        <div className="flex-1 overflow-auto rounded-lg border border-border">
                          <table className="w-full min-w-max text-xs">
                            <thead className="bg-surface-muted">
                              <tr>
                                {selectedDataset.columns?.map((column) => (
                                  <th
                                    key={column}
                                    className="border-b border-border p-2 text-left font-medium text-text-soft"
                                  >
                                    {column}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {selectedDataset.data.slice(0, previewRowCount).map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b border-border/40">
                                  {selectedDataset.columns?.map((column) => (
                                    <td key={column} className="p-2 text-xs text-text-soft">
                                      {row[column] !== null && row[column] !== undefined ? String(row[column]) : "—"}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                          <TableIcon className="h-10 w-10 text-text-subtle" />
                          <p className="text-sm font-medium text-text-primary">No preview data available</p>
                          <p className="text-xs text-text-muted">This dataset does not include sample rows.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <Button variant="outline" onClick={() => (window.location.href = "/data/preview")}>
                    Preview datasets
                  </Button>
                  <Button onClick={() => setShowPreprocessor(true)} disabled={!selectedDataset}>
                    Start cleaning
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="cleaned">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Cleaned datasets</CardTitle>
                    <CardDescription>Recently cleaned datasets will appear here</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cleanedNewCount === 0 ? (
                      <p className="text-sm text-text-soft">No cleaned datasets yet.</p>
                    ) : (
                      <p className="text-sm text-text-soft">
                        {cleanedNewCount} cleaned dataset(s) available. Refresh to view updates.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </PageSection>
    </PageShell>
  );
}

interface Feature {
  title: string;
  tooltip: string;
}

function FeatureList({ items }: { items: readonly Feature[] }) {
  return (
    <ul className="space-y-3">
      {items.map(({ title, tooltip }) => (
        <li key={title} className="flex items-start gap-2 text-sm text-text-soft">
          <span className="mt-1 text-text-subtle">•</span>
          <span className="flex-1">
            {title}
            <TooltipProvider>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <span className="ml-2 cursor-help text-xs text-text-subtle underline decoration-dotted">
                    Info
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs text-text-primary">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
        </li>
      ))}
    </ul>
  );
}

function EmptyPreviewState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <Eye className="h-10 w-10 text-text-subtle" />
      <p className="text-sm font-medium text-text-primary">No dataset selected</p>
      <p className="text-xs text-text-muted">Choose a dataset on the left to review a quick preview.</p>
    </div>
  );
}
