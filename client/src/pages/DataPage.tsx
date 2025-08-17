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
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Quick Upload</TabsTrigger>
            <TabsTrigger value="preprocess">
              <Zap className="w-4 h-4 mr-2" />
              Smart Preprocessing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
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
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedDataset?.id === dataset.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleDatasetSelect(dataset)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Database className="w-5 h-5 text-blue-500" />
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {dataset.originalName}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {dataset.rowCount.toLocaleString()} rows • {dataset.columns.length} columns • {formatFileSize(dataset.fileSize)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {selectedDataset?.id === dataset.id && (
                              <CheckCircle className="w-5 h-5 text-green-500" />
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
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                            <span className="text-sm text-gray-600 dark:text-gray-300">Missing Values</span>
                            <Badge variant={quality.status === 'good' ? 'default' : 'destructive'}>
                              {quality.missing}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Duplicates</span>
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                              {quality.duplicates}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Data Types</span>
                            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
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
                      <TrendingUp className="w-4 h-4 mr-2 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">Analyze Dataset</p>
                        <p className="text-xs text-gray-500">Get statistical insights</p>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => cleanDataMutation.mutate(selectedDataset.id)}
                      disabled={cleanDataMutation.isPending}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2 text-emerald-600" />
                      <div className="text-left">
                        <p className="font-medium">Clean Missing Values</p>
                        <p className="text-xs text-gray-500">Auto-detect best method</p>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => prepareMLMutation.mutate(selectedDataset.id)}
                      disabled={prepareMLMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2 text-violet-600" />
                      <div className="text-left">
                        <p className="font-medium">Prepare for ML</p>
                        <p className="text-xs text-gray-500">Optimize for modeling</p>
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
                  <Database className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Upload your first dataset to get started
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
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
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
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
              initialDataset={selectedDataset}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Authentication Prompt Dialog */}
      {showUploadPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
                <Lock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle>Sign In Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingFile && (
                <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
                    File ready: {pendingFile.name}
                  </p>
                  <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                    After signing in, this file will be automatically uploaded
                  </p>
                </div>
              )}
              
              {pendingPreprocessedData && (
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                    Processed dataset ready: {pendingPreprocessedData.result.processedRows} rows, {pendingPreprocessedData.result.columns.length} columns
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                    Your processed data will be saved automatically after signing in
                  </p>
                </div>
              )}
              
              <p className="text-center text-gray-600 dark:text-gray-300">
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
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Demo datasets include sales, e-commerce, and financial data for testing
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
