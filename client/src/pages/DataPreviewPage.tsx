import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Eye, Table, BarChart3, Database, Calendar, FileSpreadsheet, AlertCircle, Search, Pin, PinOff, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";

interface Dataset {
  id: number;
  userId: string;
  filename: string;
  originalName: string;
  fileSize: number;
  rowCount?: number;
  columns?: string[];
  uploadedAt: string;
  data?: any[];
}

export function DataPreviewPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);
  const [loadingDatasetId, setLoadingDatasetId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search, filters, sorting, collapsible state
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all"); // all | csv | xlsx | json | demo
  const [sizeFilter, setSizeFilter] = useState<string>("all"); // all | small | medium | large
  const [dateFilter, setDateFilter] = useState<string>("all"); // all | 7 | 30 | 90
  const [sortBy, setSortBy] = useState<string>("uploadedAt");
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>("desc");
  // No categories now
  const [pinnedIds, setPinnedIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("pinnedDatasets");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Fetch real datasets from API (metadata only)
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.datasets.getAll();
        setDatasets(data);
      } catch (err) {
        console.error('Error fetching datasets:', err);
        setError('Failed to load datasets. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, []);

  const handleDatasetSelect = async (dataset: Dataset) => {
    try {
      if (isLoadingDataset && loadingDatasetId === dataset.id) return;
      setIsLoadingDataset(true);
      setLoadingDatasetId(dataset.id);
      setError(null);
      // Optimistically show metadata while loading
      setSelectedDataset(dataset);
      // Always fetch the full dataset details when clicked
      const details = await api.datasets.getById(dataset.id);
      setSelectedDataset(details);
    } catch (err) {
      console.error('Error fetching dataset details:', err);
      setError('Failed to load dataset details.');
    } finally {
      setIsLoadingDataset(false);
      setLoadingDatasetId(null);
    }
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'csv':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
      case 'json':
        return <Database className="w-5 h-5 text-purple-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getType = (d: Dataset): string => {
    const ext = d.filename.split('.').pop()?.toLowerCase();
    if (d.userId === "1" || d.filename === 'sample_ecommerce_data.csv') return 'demo';
    if (ext === 'csv') return 'csv';
    if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
    if (ext === 'json') return 'json';
    return 'other';
  };

  const isWithinDays = (uploadedAt: string, days: number): boolean => {
    const then = new Date(uploadedAt).getTime();
    const now = Date.now();
    const diffDays = (now - then) / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  };

  const getSizeBucket = (rows?: number): 'small' | 'medium' | 'large' => {
    if (!rows && rows !== 0) return 'small';
    if (rows < 10000) return 'small';
    if (rows < 100000) return 'medium';
    return 'large';
  };

  const pinnedDatasets = useMemo(() => datasets.filter(d => pinnedIds.includes(d.id)), [datasets, pinnedIds]);
  const recentDatasets = useMemo(() => {
    const sorted = [...datasets].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    return sorted.slice(0, 5);
  }, [datasets]);

  const filteredDatasets = useMemo(() => {
    let list = [...datasets];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(d =>
        d.originalName.toLowerCase().includes(q) ||
        d.filename.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'all') {
      list = list.filter(d => getType(d) === typeFilter);
    }
    if (sizeFilter !== 'all') {
      list = list.filter(d => getSizeBucket(d.rowCount) === sizeFilter);
    }
    if (dateFilter !== 'all') {
      const days = parseInt(dateFilter, 10);
      list = list.filter(d => isWithinDays(d.uploadedAt, days));
    }
    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'name':
          return a.originalName.localeCompare(b.originalName) * dir;
        case 'rows':
          return ((a.rowCount || 0) - (b.rowCount || 0)) * dir;
        case 'cols':
          return ((a.columns?.length || 0) - (b.columns?.length || 0)) * dir;
        case 'size':
          return (a.fileSize - b.fileSize) * dir;
        default:
          return (new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()) * dir;
      }
    });
    return list;
  }, [datasets, searchTerm, typeFilter, sizeFilter, dateFilter, sortBy, sortDir]);

  const togglePin = (id: number) => {
    setPinnedIds(prev => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(x => x !== id) : [id, ...prev];
      localStorage.setItem("pinnedDatasets", JSON.stringify(next));
      return next;
    });
  };

  // Incremental preview rows
  const [previewRowCount, setPreviewRowCount] = useState<number>(5);
  useEffect(() => {
    // Reset when selected dataset changes
    setPreviewRowCount(5);
  }, [selectedDataset?.id]);

  // Compute null stats for selected dataset
  const nullStats = useMemo(() => {
    if (!selectedDataset?.data || !selectedDataset?.columns) return null;
    const columns = selectedDataset.columns;
    const data = selectedDataset.data as any[];
    let totalNulls = 0;
    let rowsWithNulls = 0;
    const colHasNull: boolean[] = new Array(columns.length).fill(false);
    for (let r = 0; r < data.length; r++) {
      const row = data[r] as Record<string, any>;
      let rowHasNull = false;
      for (let c = 0; c < columns.length; c++) {
        const key = columns[c];
        const value = row[key];
        if (value === null || value === undefined) {
          totalNulls++;
          rowHasNull = true;
          colHasNull[c] = true;
        }
      }
      if (rowHasNull) rowsWithNulls++;
    }
    const colsWithNulls = colHasNull.filter(Boolean).length;
    return { totalNulls, rowsWithNulls, colsWithNulls };
  }, [selectedDataset?.id, selectedDataset?.data, selectedDataset?.columns]);

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Preview</h1>
            <p className="text-gray-600 dark:text-gray-300">Select and explore your datasets</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Error Loading Datasets
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 py-4 space-y-3">
      <div className="flex items-center space-x-3 mb-2">
        <FileText className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Preview</h1>
          <p className="text-gray-600 dark:text-gray-300">Find, filter, and preview your datasets</p>
        </div>
      </div>

      {/* Top: Search + Filters - X Analytics inspired */}
      <Card className="border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search datasets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 rounded-lg" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
                <SelectTrigger className="w-[140px] rounded-full h-8 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">XLSX</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="demo">Demo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sizeFilter} onValueChange={(v) => setSizeFilter(v)}>
                <SelectTrigger className="w-[160px] rounded-full h-8 text-sm"><SelectValue placeholder="Size" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sizes</SelectItem>
                  <SelectItem value="small">Small (&lt; 10k rows)</SelectItem>
                  <SelectItem value="medium">Medium (10k–100k)</SelectItem>
                  <SelectItem value="large">Large (&gt; 100k)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v)}>
                <SelectTrigger className="w-[160px] rounded-full h-8 text-sm"><SelectValue placeholder="Date" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any time</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

      {/* Main 2-pane layout with fixed height (~70% viewport) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[70vh]">
        {/* Left Sidebar: Flat dataset list */}
        <Card className="lg:col-span-4 h-full flex flex-col min-h-0 border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-base font-medium text-gray-900 dark:text-gray-100">Datasets</CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">{isLoading ? 'Loading...' : `${filteredDatasets.length} item${filteredDatasets.length !== 1 ? 's' : ''}`}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 h-full flex flex-col min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
              </div>
            ) : filteredDatasets.length === 0 ? (
              <div className="p-6 text-center">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No datasets match your filters.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-auto min-h-0">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="p-2.5 text-left border-r border-gray-200 dark:border-gray-700">Name</th>
                      <th className="w-24 p-2.5 text-left border-r border-gray-200 dark:border-gray-700">Rows</th>
                      <th className="w-24 p-2.5 text-left border-r border-gray-200 dark:border-gray-700">Columns</th>
                      <th className="w-28 p-2.5 text-left border-r border-gray-200 dark:border-gray-700">Size</th>
                      <th className="w-40 p-2.5 text-left border-r border-gray-200 dark:border-gray-700">Last updated</th>
                      <th className="w-24 p-2.5 text-left">Pin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDatasets.map((d) => (
                      <tr key={d.id} className={`border-b ${selectedDataset?.id === d.id ? 'bg-primary/5' : ''} hover:bg-muted cursor-pointer`} onClick={() => handleDatasetSelect(d)}>
                        <td className="p-2.5 align-middle border-r border-gray-100 dark:border-gray-800">
                          <div className="w-full text-left flex items-center gap-2">
                            <span className="shrink-0">{getFileIcon(d.filename)}</span>
                            <span className="truncate">
                              <span className="block text-sm font-medium truncate">{d.originalName}</span>
                              <span className="block text-xs text-gray-500 truncate">{d.filename}</span>
                            </span>
                          </div>
                        </td>
                        <td className="p-2.5 align-middle border-r border-gray-100 dark:border-gray-800">{d.rowCount ? d.rowCount.toLocaleString() : '-'}</td>
                        <td className="p-2.5 align-middle border-r border-gray-100 dark:border-gray-800">{d.columns ? d.columns.length : '-'}</td>
                        <td className="p-2.5 align-middle border-r border-gray-100 dark:border-gray-800">{formatFileSize(d.fileSize)}</td>
                        <td className="p-2.5 align-middle border-r border-gray-100 dark:border-gray-800">{formatDate(d.uploadedAt)}</td>
                        <td className="p-2.5 align-middle">
                          <Button 
                            variant={pinnedIds.includes(d.id) ? 'default' : 'outline'} 
                            size="sm" 
                            className="rounded-full h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePin(d.id);
                            }}
                          >
                            {pinnedIds.includes(d.id) ? <Pin className="h-3 w-3 mr-1" /> : <PinOff className="h-3 w-3 mr-1" />}
                            {pinnedIds.includes(d.id) ? 'Pinned' : 'Pin'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Removed middle table (not needed) */}

        {/* Right: Preview panel */}
        <Card className="lg:col-span-8 h-full flex flex-col min-h-0 border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-base font-medium flex items-center space-x-2 text-gray-900 dark:text-gray-100">
              <Eye className="w-4 h-4 text-blue-500" />
              <span>{selectedDataset ? `Preview: ${selectedDataset.originalName}` : 'Preview'}</span>
            </CardTitle>
      {selectedDataset && (
              <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                {selectedDataset.rowCount ? `${selectedDataset.rowCount.toLocaleString()} rows` : '...'}{selectedDataset.columns && ` × ${selectedDataset.columns.length} columns`} • {formatFileSize(selectedDataset.fileSize)}
                {nullStats && (
                  <> • {nullStats.rowsWithNulls.toLocaleString()} rows with nulls • {nullStats.colsWithNulls.toLocaleString()} columns with nulls • {nullStats.totalNulls.toLocaleString()} null cells</>
                )}
              </CardDescription>
            )}
            </CardHeader>
          <CardContent className="h-full p-3 flex flex-col min-h-0">
            {!selectedDataset ? (
              <div className="text-center py-10 h-full">
                <Eye className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">Select a dataset to preview on the right.</p>
              </div>
            ) : isLoadingDataset ? (
              <div className="flex items-center justify-center py-8 h-full">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading dataset details...</span>
                </div>
              ) : (
                <>
                <div className="flex items-center justify-between pb-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Updated {formatDate(selectedDataset.uploadedAt)}</div>
                  <div className="flex gap-2">
                    {selectedDataset.data && selectedDataset.data.length > previewRowCount && (
                      <Button variant="outline" size="sm" className="rounded-full h-8 text-xs" onClick={() => setPreviewRowCount(prev => prev + 10)}>Add more rows</Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="rounded-full h-8 text-xs">
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete dataset?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove "{selectedDataset.originalName}" and its metadata. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={async () => {
                            try {
                              await api.datasets.delete(selectedDataset.id);
                              // Update UI: remove from list and clear selection
                              setDatasets(prev => prev.filter(d => d.id !== selectedDataset.id));
                              setSelectedDataset(null);
                            } catch (e) {
                              console.error('Failed to delete dataset', e);
                            }
                          }}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" size="sm" className="rounded-full h-8 text-xs" onClick={() => window.location.href = '/data/cleaning'}>Clean</Button>
                    <Button variant="outline" size="sm" className="rounded-full h-8 text-xs" onClick={() => window.location.href = '/data/analysis'}>Validate</Button>
                    <Button size="sm" className="rounded-full h-8 text-xs bg-blue-500 hover:bg-blue-600" onClick={() => window.location.href = '/segmentation'}>Explore</Button>
                  </div>
                </div>
                <div className="space-y-4 flex-1 overflow-auto min-h-0">
                  {selectedDataset.data && selectedDataset.data.length > 0 ? (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden min-w-max">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                          <tr>
                            {selectedDataset.columns?.map((c, i) => (
                              <th key={i} className="text-left p-2.5 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-800 last:border-r-0">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900">
                          {selectedDataset.data.slice(0, previewRowCount).map((row, idx) => (
                          <tr key={idx} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                              {selectedDataset.columns?.map((c, i) => (
                                <td key={i} className="p-2.5 text-gray-600 dark:text-gray-400 border-r border-gray-100 dark:border-gray-800 last:border-r-0">{row[c] !== null && row[c] !== undefined ? String(row[c]) : <span className="text-gray-400">-</span>}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                  <div className="text-center py-6">
                    <Table className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No preview data available</p>
                    </div>
                  )}
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
