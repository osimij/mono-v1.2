import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataPreprocessor } from "@/components/DataPreprocessor";
import { Database, Sparkles, Brain, Search as SearchIcon, FileText, Eye, Table, BarChart3, Calendar, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Link } from "wouter";

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

export function DataCleaningPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreprocessor, setShowPreprocessor] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1); // 1 Select, 2 Configure, 3 Get Clean Data
  const [mode, setMode] = useState<'light' | 'pro'>('light');
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);
  const [previewRowCount, setPreviewRowCount] = useState<number>(5);
  const [cleanedNewCount, setCleanedNewCount] = useState<number>(0);

  // Fetch datasets for selection
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
      setIsLoadingDataset(true);
      setSelectedDataset(dataset);
      const details = await api.datasets.getById(dataset.id);
      setSelectedDataset(details);
      setCurrentStep(2);
    } catch (err) {
      console.error('Error fetching dataset details:', err);
      setError('Failed to load dataset details.');
    } finally {
      setIsLoadingDataset(false);
    }
  };

  const handlePreprocessingComplete = (data: any, options: any) => {
    // Handle the completed preprocessing
    console.log('Preprocessing completed:', { data, options });
    // You can redirect to another page or show success message
    setShowPreprocessor(false);
    setCurrentStep(3);
    setCleanedNewCount((c) => c + 1);
  };

  const handleBackToSelection = () => {
    setShowPreprocessor(false);
    setSelectedDataset(null);
  };

  if (showPreprocessor && selectedDataset) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Database className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Cleaning</h1>
            <p className="text-gray-600 dark:text-gray-300">Clean and prepare your data for analysis</p>
          </div>
        </div>

        <DataPreprocessor
          onComplete={handlePreprocessingComplete}
          onBack={handleBackToSelection}
          datasets={datasets}
          initialDataset={selectedDataset}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Database className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Data Cleaning</h1>
          <p className="text-gray-600 dark:text-gray-300">Clean and prepare your data for analysis</p>
        </div>
      </div>

      {/* Interactive Stepper */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {[1,2,3].map((step) => (
              <button
                key={step}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded transition-colors ${currentStep === step ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                onClick={() => setCurrentStep(step)}
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full border border-current text-sm font-semibold">{step}</span>
                <span className="text-sm font-medium">
                  {step === 1 ? 'Select Dataset' : step === 2 ? 'Configure Options' : 'Get Clean Data'}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mode Selection Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span>Mode</span>
          </CardTitle>
          <CardDescription>Select a mode and configure its options</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'light' | 'pro')}>
            <TabsList>
              <TabsTrigger value="light">Light Mode</TabsTrigger>
              <TabsTrigger value="pro">Pro Mode</TabsTrigger>
            </TabsList>
            <TabsContent value="light" className="pt-3">
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">• Remove empty rows and columns
                  <TooltipProvider><Tooltip><TooltipTrigger className="text-xs">ⓘ</TooltipTrigger><TooltipContent>Drop fully empty rows/columns.</TooltipContent></Tooltip></TooltipProvider>
                </li>
                <li className="flex items-center gap-2">• Handle missing values
                  <TooltipProvider><Tooltip><TooltipTrigger className="text-xs">ⓘ</TooltipTrigger><TooltipContent>Fill or drop nulls using sensible defaults.</TooltipContent></Tooltip></TooltipProvider>
                </li>
                <li className="flex items-center gap-2">• Remove duplicates
                  <TooltipProvider><Tooltip><TooltipTrigger className="text-xs">ⓘ</TooltipTrigger><TooltipContent>Drop exact duplicate rows.</TooltipContent></Tooltip></TooltipProvider>
                </li>
                <li className="flex items-center gap-2">• Basic data validation
                  <TooltipProvider><Tooltip><TooltipTrigger className="text-xs">ⓘ</TooltipTrigger><TooltipContent>Ensure consistent types and ranges.</TooltipContent></Tooltip></TooltipProvider>
                </li>
              </ul>
            </TabsContent>
            <TabsContent value="pro" className="pt-3">
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">• Smart categorical encoding
                  <TooltipProvider><Tooltip><TooltipTrigger className="text-xs">ⓘ</TooltipTrigger><TooltipContent>Automatically encodes categorical columns for ML readiness.</TooltipContent></Tooltip></TooltipProvider>
                </li>
                <li className="flex items-center gap-2">• Outlier detection and removal
                  <TooltipProvider><Tooltip><TooltipTrigger className="text-xs">ⓘ</TooltipTrigger><TooltipContent>Identify and remove extreme values.</TooltipContent></Tooltip></TooltipProvider>
                </li>
                <li className="flex items-center gap-2">• Feature scaling and normalization
                  <TooltipProvider><Tooltip><TooltipTrigger className="text-xs">ⓘ</TooltipTrigger><TooltipContent>Standardize numeric features.</TooltipContent></Tooltip></TooltipProvider>
                </li>
                <li className="flex items-center gap-2">• Advanced text processing
                  <TooltipProvider><Tooltip><TooltipTrigger className="text-xs">ⓘ</TooltipTrigger><TooltipContent>Tokenize, clean, and vectorize text.</TooltipContent></Tooltip></TooltipProvider>
                </li>
                <li className="flex items-center gap-2">• Data type conversion
                  <TooltipProvider><Tooltip><TooltipTrigger className="text-xs">ⓘ</TooltipTrigger><TooltipContent>Coerce columns to expected types.</TooltipContent></Tooltip></TooltipProvider>
                </li>
              </ul>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dataset Selection with Right Preview */}
      <Tabs defaultValue="datasets">
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            <TabsTrigger value="datasets">Datasets</TabsTrigger>
            <TabsTrigger value="cleaned">Cleaned Datasets {cleanedNewCount > 0 && (<Badge className="ml-2" variant="secondary">NEW</Badge>)}</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="datasets">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[65vh]">
            <Card className="lg:col-span-5 h-full flex flex-col min-h-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Select Dataset to Clean</CardTitle>
                <CardDescription>Choose a dataset and configure options</CardDescription>
              </CardHeader>
              <CardContent className="p-3 pt-0 h-full flex flex-col min-h-0">
                <div className="relative mb-3">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input className="pl-9" placeholder="Search datasets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading datasets...</span>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                  </div>
                ) : datasets.length === 0 ? (
                  <div className="text-center py-8">
                    <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Datasets Found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Upload a dataset first to start data cleaning.</p>
                    <div className="space-x-3">
                      <Button onClick={() => window.location.href = '/data/upload'}>Upload Dataset</Button>
                      <Button variant="outline" onClick={() => window.location.href = '/data/preview'}>View Datasets</Button>
                    </div>
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
                          <th className="w-40 p-2.5 text-left">Last updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datasets
                          .filter(d => !searchTerm || d.originalName.toLowerCase().includes(searchTerm.toLowerCase()) || d.filename.toLowerCase().includes(searchTerm.toLowerCase()))
                          .map((d) => (
                          <tr key={d.id} className={`border-b ${selectedDataset?.id === d.id ? 'bg-primary/5' : ''} hover:bg-muted cursor-pointer`} onClick={() => handleDatasetSelect(d)}>
                            <td className="p-2.5 align-middle border-r border-gray-100 dark:border-gray-800">
                              <div className="w-full text-left">
                                <span className="block text-sm font-medium truncate">{d.originalName}</span>
                                <span className="block text-xs text-gray-500 truncate">{d.filename}</span>
                              </div>
                            </td>
                            <td className="p-2.5 align-middle border-r border-gray-100 dark:border-gray-800">{d.rowCount ? d.rowCount.toLocaleString() : '-'}</td>
                            <td className="p-2.5 align-middle border-r border-gray-100 dark:border-gray-800">{d.columns ? d.columns.length : '-'}</td>
                            <td className="p-2.5 align-middle border-r border-gray-100 dark:border-gray-800">{(d.fileSize / 1024).toFixed(1)} KB</td>
                            <td className="p-2.5 align-middle">{new Date(d.uploadedAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-7 h-full flex flex-col min-h-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-green-600" />
                  <span>{selectedDataset ? `Preview: ${selectedDataset.originalName}` : 'Preview'}</span>
                </CardTitle>
                {selectedDataset && (
                  <CardDescription>
                    {selectedDataset.rowCount ? `${selectedDataset.rowCount.toLocaleString()} rows` : '...'}{selectedDataset.columns && ` × ${selectedDataset.columns.length} columns`}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="h-full p-3 flex flex-col min-h-0">
                {!selectedDataset ? (
                  <div className="text-center py-10 h-full">
                    <Eye className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Select a dataset to preview.</p>
                  </div>
                ) : isLoadingDataset ? (
                  <div className="flex items-center justify-center py-8 h-full">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading dataset details...</span>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-auto min-h-0">
                    {selectedDataset.data && selectedDataset.data.length > 0 ? (
                      <div className="border rounded min-w-max">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              {selectedDataset.columns?.map((c, i) => (
                                <th key={i} className="text-left p-2 font-medium border-r border-gray-200 dark:border-gray-800 last:border-r-0">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDataset.data.slice(0, previewRowCount).map((row, idx) => (
                              <tr key={idx} className="border-t">
                                {selectedDataset.columns?.map((c, i) => (
                                  <td key={i} className="p-2 border-r border-gray-100 dark:border-gray-800 last:border-r-0">{row[c] !== null && row[c] !== undefined ? String(row[c]) : '-'}</td>
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
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sticky CTA */}
          <div className="sticky bottom-2 mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/data/preview'}>Preview datasets</Button>
            <Button className="bg-orange-600 hover:bg-orange-700" disabled={!selectedDataset} onClick={() => setShowPreprocessor(true)}>Start Cleaning</Button>
          </div>
        </TabsContent>

        <TabsContent value="cleaned">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cleaned Datasets</CardTitle>
              <CardDescription>Recently cleaned datasets will appear here</CardDescription>
            </CardHeader>
            <CardContent>
              {cleanedNewCount === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">No cleaned datasets yet.</div>
              ) : (
                <div className="text-sm">{cleanedNewCount} cleaned dataset(s) available. Refresh to view updates.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
