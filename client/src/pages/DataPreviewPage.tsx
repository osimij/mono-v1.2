import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Eye,
  Table as TableIcon,
  Database,
  FileSpreadsheet,
  AlertCircle,
  Search,
  Pin,
  PinOff,
  Trash2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { PageSection, PageShell } from "@/components/layout/Page";
import { api } from "@/lib/api";
import type { Dataset } from "@/types";

export function DataPreviewPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);
  const [loadingDatasetId, setLoadingDatasetId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("uploadedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [previewRowCount, setPreviewRowCount] = useState<number>(5);

  const [pinnedIds, setPinnedIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("pinnedDatasets");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

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

  useEffect(() => {
    setPreviewRowCount(5);
  }, [selectedDataset?.id]);

  const handleDatasetSelect = async (dataset: Dataset) => {
    try {
      if (isLoadingDataset && loadingDatasetId === dataset.id) return;
      setIsLoadingDataset(true);
      setLoadingDatasetId(dataset.id);
      setError(null);
      setSelectedDataset(dataset);
      const details = (await api.datasets.getById(dataset.id)) as Dataset;
      setSelectedDataset(details);
    } catch (err) {
      console.error("Error fetching dataset details:", err);
      setError("Failed to load dataset details.");
    } finally {
      setIsLoadingDataset(false);
      setLoadingDatasetId(null);
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "csv":
        return <FileText className="h-5 w-5 text-primary" />;
      case "xlsx":
      case "xls":
        return <FileSpreadsheet className="h-5 w-5 text-success" />;
      case "json":
        return <Database className="h-5 w-5 text-accent" />;
      default:
        return <FileText className="h-5 w-5 text-text-subtle" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getType = (dataset: Dataset): string => {
    const extension = dataset.filename.split(".").pop()?.toLowerCase();
    if (dataset.userId === "1" || dataset.filename === "sample_ecommerce_data.csv") return "demo";
    if (extension === "csv") return "csv";
    if (extension === "xlsx" || extension === "xls") return "xlsx";
    if (extension === "json") return "json";
    return "other";
  };

  const isWithinDays = (uploadedAt: string | null, days: number) => {
    if (!uploadedAt) return false;
    const then = new Date(uploadedAt).getTime();
    const now = Date.now();
    return (now - then) / (1000 * 60 * 60 * 24) <= days;
  };

  const getSizeBucket = (rows?: number) => {
    if (!rows && rows !== 0) return "small";
    if (rows < 10_000) return "small";
    if (rows < 100_000) return "medium";
    return "large";
  };

  const filteredDatasets = useMemo(() => {
    let list = [...datasets];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((dataset) =>
        dataset.originalName.toLowerCase().includes(q) || dataset.filename.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== "all") {
      list = list.filter((dataset) => getType(dataset) === typeFilter);
    }

    if (sizeFilter !== "all") {
      list = list.filter((dataset) => getSizeBucket(dataset.rowCount) === sizeFilter);
    }

    if (dateFilter !== "all") {
      const days = parseInt(dateFilter, 10);
      list = list.filter((dataset) => isWithinDays(dataset.uploadedAt, days));
    }

    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "name":
          return a.originalName.localeCompare(b.originalName) * dir;
        case "rows":
          return ((a.rowCount || 0) - (b.rowCount || 0)) * dir;
        case "cols":
          return ((a.columns?.length || 0) - (b.columns?.length || 0)) * dir;
        case "size":
          return (a.fileSize - b.fileSize) * dir;
        default:
          const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
          const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
          return (aTime - bTime) * dir;
      }
    });

    return list;
  }, [datasets, searchTerm, typeFilter, sizeFilter, dateFilter, sortBy, sortDir]);

  const nullStats = useMemo(() => {
    if (!selectedDataset?.data || !selectedDataset?.columns) return null;
    const columns = selectedDataset.columns;
    const data = selectedDataset.data as Record<string, any>[];
    let totalNulls = 0;
    let rowsWithNulls = 0;
    const colHasNull: boolean[] = new Array(columns.length).fill(false);

    data.forEach((row) => {
      let rowHasNull = false;
      columns.forEach((column, index) => {
        const value = row[column];
        if (value === null || value === undefined) {
          totalNulls += 1;
          rowHasNull = true;
          colHasNull[index] = true;
        }
      });
      if (rowHasNull) rowsWithNulls += 1;
    });

    return {
      totalNulls,
      rowsWithNulls,
      colsWithNulls: colHasNull.filter(Boolean).length
    };
  }, [selectedDataset?.id, selectedDataset?.data, selectedDataset?.columns]);

  const togglePin = (id: number) => {
    setPinnedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((pinnedId) => pinnedId !== id) : [id, ...prev];
      localStorage.setItem("pinnedDatasets", JSON.stringify(next));
      return next;
    });
  };


  if (error) {
    return (
      <PageShell padding="lg" width="full">
        <PageSection>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <AlertCircle className="h-16 w-16 text-danger" />
              <div>
                <h3 className="text-lg font-medium text-text-primary">Error loading datasets</h3>
                <p className="mt-2 text-sm text-text-muted">{error}</p>
              </div>
              <Button onClick={() => window.location.reload()}>Try again</Button>
            </CardContent>
          </Card>
        </PageSection>
      </PageShell>
    );
  }

  return (
    <PageShell padding="lg" width="full">
      <PageSection surface="transparent" contentClassName="space-y-6">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                <Input
                  placeholder="Search datasets..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 w-[140px] rounded-full text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger className="h-9 w-[160px] rounded-full text-sm">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sizes</SelectItem>
                    <SelectItem value="small">Small (&lt; 10k rows)</SelectItem>
                    <SelectItem value="medium">Medium (10k–100k)</SelectItem>
                    <SelectItem value="large">Large (&gt; 100k)</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-9 w-[160px] rounded-full text-sm">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any time</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-9 w-[140px] rounded-full text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uploadedAt">Newest</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="rows">Row count</SelectItem>
                    <SelectItem value="cols">Columns</SelectItem>
                    <SelectItem value="size">File size</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortDir} onValueChange={(value: "asc" | "desc") => setSortDir(value)}>
                  <SelectTrigger className="h-9 w-[120px] rounded-full text-sm">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid h-[70vh] grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="flex flex-col overflow-hidden lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Datasets</CardTitle>
              <CardDescription>Pin, filter, and select datasets to preview</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
              {isLoading ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-text-muted">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  <span>Loading datasets…</span>
                </div>
              ) : filteredDatasets.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
                  <FileText className="h-10 w-10 text-text-subtle" />
                  <p className="text-sm font-medium text-text-primary">No datasets match your filters</p>
                  <p className="text-xs text-text-muted">Try adjusting your search or filters to see more results.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-surface">
                      <tr className="border-b border-border/60">
                        <th className="p-2.5 text-left text-xs font-medium text-text-muted">Name</th>
                        <th className="w-24 p-2.5 text-left text-xs font-medium text-text-muted">Rows</th>
                        <th className="w-24 p-2.5 text-left text-xs font-medium text-text-muted">Columns</th>
                        <th className="w-28 p-2.5 text-left text-xs font-medium text-text-muted">Size</th>
                        <th className="w-36 p-2.5 text-left text-xs font-medium text-text-muted">Updated</th>
                        <th className="w-24 p-2.5 text-left text-xs font-medium text-text-muted">Pin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDatasets.map((dataset) => {
                        const isSelected = selectedDataset?.id === dataset.id;
                        const isPinned = pinnedIds.includes(dataset.id);
                        return (
                          <tr
                            key={dataset.id}
                            className={`border-b border-border/40 transition-colors ${
                              isSelected ? "bg-primary/10" : "hover:bg-surface-muted"
                            }`}
                            onClick={() => handleDatasetSelect(dataset)}
                            role="button"
                          >
                            <td className="p-2.5">
                              <div className="flex items-center gap-2">
                                <span className="shrink-0">{getFileIcon(dataset.filename)}</span>
                                <span className="truncate">
                                  <span className="block truncate text-sm font-medium text-text-primary">
                                    {dataset.originalName}
                                  </span>
                                  <span className="block truncate text-xs text-text-subtle">{dataset.filename}</span>
                                </span>
                              </div>
                            </td>
                            <td className="p-2.5 text-sm text-text-soft">
                              {dataset.rowCount ? dataset.rowCount.toLocaleString() : "—"}
                            </td>
                            <td className="p-2.5 text-sm text-text-soft">
                              {dataset.columns ? dataset.columns.length : "—"}
                            </td>
                            <td className="p-2.5 text-sm text-text-soft">{formatFileSize(dataset.fileSize)}</td>
                            <td className="p-2.5 text-sm text-text-soft">{formatDate(dataset.uploadedAt)}</td>
                            <td className="p-2.5">
                              <Button
                                variant={isPinned ? "default" : "outline"}
                                size="sm"
                                className="h-7 rounded-full text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  togglePin(dataset.id);
                                }}
                              >
                                {isPinned ? (
                                  <>
                                    <Pin className="mr-1 h-3 w-3" />
                                    Pinned
                                  </>
                                ) : (
                                  <>
                                    <PinOff className="mr-1 h-3 w-3" />
                                    Pin
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col overflow-hidden lg:col-span-8">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium text-text-primary">
                <Eye className="h-4 w-4 text-primary" />
                <span>{selectedDataset ? `Preview: ${selectedDataset.originalName}` : "Preview"}</span>
              </CardTitle>
              {selectedDataset ? (
                <CardDescription className="text-sm text-text-muted">
                  {selectedDataset.rowCount ? `${selectedDataset.rowCount.toLocaleString()} rows` : "…"}
                  {selectedDataset.columns && ` · ${selectedDataset.columns.length.toLocaleString()} columns`}
                  {` · ${formatFileSize(selectedDataset.fileSize)}`}
                  {nullStats && (
                    <>
                      {" · "}
                      {nullStats.rowsWithNulls.toLocaleString()} rows with nulls ·{" "}
                      {nullStats.colsWithNulls.toLocaleString()} columns with nulls ·{" "}
                      {nullStats.totalNulls.toLocaleString()} null cells
                    </>
                  )}
                </CardDescription>
              ) : (
                <CardDescription>Select a dataset from the list to see a preview.</CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
              {!selectedDataset ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                  <Eye className="h-10 w-10 text-text-subtle" />
                  <p className="text-sm font-medium text-text-primary">No dataset selected</p>
                  <p className="text-xs text-text-muted">Choose a dataset on the left to review its contents.</p>
                </div>
              ) : isLoadingDataset ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-text-muted">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  <span>Loading dataset details…</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-text-muted">
                      Updated {formatDate(selectedDataset.uploadedAt)}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedDataset.data && selectedDataset.data.length > previewRowCount ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full text-xs"
                          onClick={() => setPreviewRowCount((count) => count + 10)}
                        >
                          Add more rows
                        </Button>
                      ) : null}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="h-8 rounded-full text-xs">
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete dataset?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove “{selectedDataset.originalName}” and its metadata. This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  await api.datasets.delete(selectedDataset.id);
                                  setDatasets((prev) => prev.filter((dataset) => dataset.id !== selectedDataset.id));
                                  setSelectedDataset(null);
                                } catch (err) {
                                  console.error("Failed to delete dataset", err);
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full text-xs"
                        onClick={() => (window.location.href = "/data/cleaning")}
                      >
                        Clean
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full text-xs"
                        onClick={() => (window.location.href = "/dashboards")}
                      >
                        Validate
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 rounded-full text-xs"
                        onClick={() => (window.location.href = "/segmentation")}
                      >
                        Explore
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto rounded-xl border border-border/60">
                    {selectedDataset.data && selectedDataset.data.length > 0 ? (
                      <table className="w-full min-w-max text-xs">
                        <thead className="bg-surface-muted">
                          <tr className="border-b border-border/60">
                            {selectedDataset.columns?.map((column) => (
                              <th
                                key={column}
                                className="border-r border-border/40 p-2 text-left font-medium text-text-soft last:border-r-0"
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-surface">
                          {selectedDataset.data.slice(0, previewRowCount).map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-border/30 hover:bg-surface-muted/60">
                              {selectedDataset.columns?.map((column) => {
                                const value = row[column];
                                return (
                                  <td
                                    key={column}
                                    className="border-r border-border/20 p-2 text-text-soft last:border-r-0"
                                  >
                                    {value !== null && value !== undefined ? (
                                      String(value)
                                    ) : (
                                      <span className="text-text-subtle">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
                        <TableIcon className="h-10 w-10 text-text-subtle" />
                        <p className="text-sm font-medium text-text-primary">No preview data available</p>
                        <p className="text-xs text-text-muted">This dataset does not include sample rows.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </PageSection>
    </PageShell>
  );
}
