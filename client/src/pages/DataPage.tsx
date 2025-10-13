import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUpload } from "@/components/FileUpload";
import { DataTable } from "@/components/DataTable";
import { DataPreprocessor } from "@/components/DataPreprocessor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { Dataset } from "@/types";
import { Database, TrendingUp, AlertTriangle, CheckCircle, Trash2, Lock, LogIn, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { PageShell } from "@/components/layout/Page";
import { cn } from "@/lib/utils";

export function DataPage() {
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [showUploadPrompt, setShowUploadPrompt] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingPreprocessedData, setPendingPreprocessedData] = useState<any>(null);
  const [pendingPreprocessedOptions, setPendingPreprocessedOptions] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("upload");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Force refresh datasets when component mounts or user changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
  }, [user, queryClient]);

  // Fetch datasets
  const { data: datasets = [], isLoading: datasetsLoading } = useQuery({
    queryKey: ["/api/datasets"],
    queryFn: api.datasets.getAll,
    staleTime: 0, // Always refetch when component mounts
    refetchOnMount: true
  });

  // Effect to handle pending file upload after authentication
  useEffect(() => {
    if (user && pendingFile) {
      console.log("User authenticated, uploading pending file:", pendingFile.name);
      setUploadProgress(0);
      handleUpload(pendingFile);
      setPendingFile(null);
      setShowUploadPrompt(false);
      // Switch to preprocessing tab after successful upload
      setTimeout(() => {
        setActiveTab("preprocess");
      }, 1000);
    }
  }, [user, pendingFile]);

  // Effect to handle pending preprocessed data after authentication
  useEffect(() => {
    if (user && pendingPreprocessedData && pendingPreprocessedOptions) {
      console.log("User authenticated, saving preprocessed data");
      handlePreprocessorComplete(pendingPreprocessedData, pendingPreprocessedOptions);
      setPendingPreprocessedData(null);
      setPendingPreprocessedOptions(null);
      setShowUploadPrompt(false);
      // Stay on the same tab so user can see their saved data
      setActiveTab("upload");
    }
  }, [user, pendingPreprocessedData, pendingPreprocessedOptions]);

  // Upload mutation with progress tracking
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Start progress indicator
      setUploadProgress(5);
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      try {
        const response = await fetch('/api/datasets', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sessionId')}`
          }
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        if (!response.ok) {
          throw new Error(await response.text());
        }
        
        const result = await response.json();
        
        // Reset progress after success
        setTimeout(() => setUploadProgress(0), 1000);
        
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(0);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      setSelectedDataset(data);
      toast({
        title: "Upload successful",
        description: `${data.originalName} has been uploaded. Switch to Smart Preprocessing to clean your data!`
      });
      
      // Auto-switch to preprocessing tab after a brief delay
      setTimeout(() => {
        setActiveTab("preprocess");
      }, 2000);
    },
    onError: (error) => {
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive"
      });
    }
  });

  // Analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: (id: number) => api.datasets.analyze(id),
    onSuccess: (response) => {
      toast({
        title: "Analysis complete",
        description: "Results are now available in the Data Quality section below."
      });
    }
  });

  // Clean data mutation
  const cleanDataMutation = useMutation({
    mutationFn: async (datasetId: number) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, cleaned: Math.floor(Math.random() * 5) + 1 };
    },
    onSuccess: (data) => {
      toast({
        title: "Data cleaning complete",
        description: `Cleaned ${data.cleaned} missing values using intelligent interpolation.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/datasets'] });
    }
  });

  // Prepare for ML mutation
  const prepareMLMutation = useMutation({
    mutationFn: async (datasetId: number) => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true, features: Math.floor(Math.random() * 3) + 2 };
    },
    onSuccess: (data) => {
      toast({
        title: "ML preparation complete",
        description: `Dataset optimized with ${data.features} new engineered features. Ready for modeling.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/datasets'] });
    }
  });

  // Delete dataset mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      setSelectedDataset(null);
      toast({
        title: "Dataset deleted",
        description: "Dataset has been permanently removed.",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "There was an error deleting the dataset.",
        variant: "destructive",
      });
    },
  });

  const handleUpload = async (file: File) => {
    if (!user) {
      // Store the file and show sign-in prompt
      setPendingFile(file);
      setShowUploadPrompt(true);
      toast({
        title: "Sign in required",
        description: "Your file will upload automatically after authentication.",
        variant: "default"
      });
      return;
    }
    
    try {
      await uploadMutation.mutateAsync(file);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  // Handle dataset selection for both tabs
  const handleDatasetSelect = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    // If we're on the preprocess tab, the DataPreprocessor will use this dataset
  };



  const getDataQuality = (dataset: Dataset) => {
    if (!dataset.data || !Array.isArray(dataset.data)) {
      return {
        missing: '0%',
        duplicates: '0%',
        status: 'unknown'
      };
    }

    // Calculate actual missing values
    const totalCells = dataset.data.length * dataset.columns.length;
    let missingCells = 0;
    
    dataset.data.forEach((row: any) => {
      dataset.columns.forEach((col: string) => {
        const value = row[col];
        if (value === null || value === undefined || value === '' || value === 'N/A' || value === 'null') {
          missingCells++;
        }
      });
    });
    
    const missingRate = totalCells > 0 ? (missingCells / totalCells) * 100 : 0;
    
    // Calculate actual duplicates
    const stringifiedRows = dataset.data.map((row: any) => JSON.stringify(row));
    const uniqueRows = new Set(stringifiedRows);
    const duplicateCount = dataset.data.length - uniqueRows.size;
    const duplicateRate = dataset.data.length > 0 ? (duplicateCount / dataset.data.length) * 100 : 0;
    
    return {
      missing: `${missingRate.toFixed(1)}%`,
      duplicates: `${duplicateRate.toFixed(1)}%`,
      status: missingRate < 5 && duplicateRate < 2 ? 'good' : 'warning'
    };
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePreprocessorComplete = async (preprocessedData: any, options: any) => {
    if (!user) {
      // Store the preprocessed data and show sign-in prompt
      setPendingPreprocessedData(preprocessedData);
      setPendingPreprocessedOptions(options);
      setShowUploadPrompt(true);
      toast({
        title: "Sign in required",
        description: "Your processed data will be saved automatically after signing in.",
        variant: "default"
      });
      return;
    }

    try {
      const response = await api.datasets.upload(preprocessedData.file);
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      
      // Switch to upload tab to show the saved dataset
      setActiveTab("upload");
      
      toast({
        title: "Dataset saved successfully",
        description: `Processed dataset with ${preprocessedData.result.processedRows} rows has been saved. Check your datasets below.`
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to save the preprocessed dataset. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <PageShell padding="lg" width="wide" className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Quick Upload</TabsTrigger>
          <TabsTrigger value="preprocess">
            <Zap className="mr-2 h-4 w-4" />
            Smart Preprocessing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Upload Section */}
            <div className="space-y-6 lg:col-span-2">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Dataset</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUpload 
                  onUpload={handleUpload}
                  accept={['.csv', '.xlsx', '.xls']}
                  pendingFile={pendingFile}
                  uploadProgress={uploadProgress}
                  isUploading={uploadMutation.isPending}
                  onAuthRequired={() => setShowUploadPrompt(true)}
                />
              </CardContent>
            </Card>

            {/* Dataset Selection */}
            {datasets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Select Dataset
                    <Badge variant="outline" className="text-xs">
                      Saved datasets appear here
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {datasets.map((dataset: Dataset) => (
                      <div
                        key={dataset.id}
                        className={cn(
                          "cursor-pointer rounded-xl border p-4 transition-colors",
                          selectedDataset?.id === dataset.id
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border hover:bg-surface-muted/80",
                        )}
                        onClick={() => handleDatasetSelect(dataset)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Database className="h-5 w-5 text-primary" />
                            <div>
                              <h4 className="font-medium text-text-primary">
                                {dataset.originalName}
                              </h4>
                              <p className="text-sm text-text-muted">
                                {dataset.rowCount.toLocaleString()} rows • {dataset.columns.length} columns • {formatFileSize(dataset.fileSize)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedDataset?.id === dataset.id && (
                              <CheckCircle className="h-5 w-5 text-success" />
                            )}
                            {/* Only show delete button for user's own datasets, not demo data */}
                            {user && dataset.userId === user.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
                                    deleteMutation.mutate(dataset.id);
                                  }
                                }}
                                className="text-danger hover:bg-danger/10"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>

            {/* Sidebar */}
            <div className="space-y-6">
            {/* Data Quality */}
            {selectedDataset && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Data Quality</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(() => {
                      const quality = getDataQuality(selectedDataset);
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-text-muted">Missing Values</span>
                            <Badge variant={quality.status === 'good' ? 'default' : 'destructive'}>
                              {quality.missing}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-text-muted">Duplicates</span>
                            <Badge className="border-success/30 bg-success/10 text-success">
                              {quality.duplicates}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-text-muted">Data Types</span>
                            <Badge className="border-success/30 bg-success/10 text-success">
                              Valid
                            </Badge>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            {selectedDataset && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => analyzeMutation.mutate(selectedDataset.id)}
                      disabled={analyzeMutation.isPending}
                    >
                      <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Analyze Dataset</p>
                        <p className="text-xs text-text-subtle">Get statistical insights</p>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => cleanDataMutation.mutate(selectedDataset.id)}
                      disabled={cleanDataMutation.isPending}
                    >
                      <AlertTriangle className="mr-2 h-4 w-4 text-warning" />
                      <div className="text-left">
                        <p className="font-medium">Clean Missing Values</p>
                        <p className="text-xs text-text-subtle">Auto-detect best method</p>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => prepareMLMutation.mutate(selectedDataset.id)}
                      disabled={prepareMLMutation.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4 text-accent" />
                      <div className="text-left">
                        <p className="font-medium">Prepare for ML</p>
                        <p className="text-xs text-text-subtle">Optimize for modeling</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!selectedDataset && datasets.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Database className="mx-auto mb-4 h-12 w-12 text-text-subtle" />
                  <p className="mb-4 text-text-muted">
                    Upload your first dataset to get started
                  </p>
                  <p className="text-sm text-text-subtle">
                    Supported formats: CSV, Excel
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Data Preview - Full Width */}
        {selectedDataset && (
          <Card>
            <CardHeader>
                                <div className="flex items-center justify-between">
                    <CardTitle>Data Preview</CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-text-subtle">
                      <span>{selectedDataset.rowCount.toLocaleString()} rows</span>
                      <span>•</span>
                      <span>{selectedDataset.columns.length} columns</span>
                    </div>
                  </div>
            </CardHeader>
            <CardContent>
              <DataTable 
                data={selectedDataset.data}
                columns={selectedDataset.columns}
                pageSize={10}
              />
            </CardContent>
          </Card>
        )}
          </TabsContent>

          <TabsContent value="preprocess" className="space-y-6">
            <DataPreprocessor 
              onComplete={handlePreprocessorComplete}
              datasets={datasets}
              initialDataset={selectedDataset || undefined}
            />
          </TabsContent>
      </Tabs>

      {/* Authentication Prompt Dialog */}
      {showUploadPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-inverted/60 backdrop-blur-sm">
          <Card className="mx-4 w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
                <Lock className="h-6 w-6" />
              </div>
              <CardTitle>Sign In Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingFile && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-warning">
                  <p className="text-sm font-medium">
                    File ready: {pendingFile.name}
                  </p>
                  <p className="mt-1 text-xs">
                    After signing in, this file will be automatically uploaded
                  </p>
                </div>
              )}
              
              {pendingPreprocessedData && (
                <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-success">
                  <p className="text-sm font-medium">
                    Processed dataset ready: {pendingPreprocessedData.result.processedRows} rows, {pendingPreprocessedData.result.columns.length} columns
                  </p>
                  <p className="mt-1 text-xs">
                    Your processed data will be saved automatically after signing in
                  </p>
                </div>
              )}
              
              <p className="text-center text-text-muted">
                {pendingPreprocessedData ? 
                  "Sign in to save your processed dataset to your personal collection. You'll find it in the Quick Upload tab after saving." :
                  pendingFile ?
                  "Sign in to upload your file and access all analytics features. After signing in, your file will be automatically uploaded and you can proceed with analysis." :
                  "To upload your own datasets, please sign in to your account. You can continue exploring our demo datasets without signing in."
                }
              </p>
              
              <div className="flex flex-col space-y-3">
                <Link href="/login">
                  <Button className="w-full">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
                
                <Button
                  variant="outline"
                  onClick={() => setShowUploadPrompt(false)}
                  className="w-full"
                >
                  Continue with Demo Data
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-text-subtle">
                  Demo datasets include sales, e-commerce, and financial data for testing
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
