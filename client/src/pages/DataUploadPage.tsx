import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Database, Shield, X, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  file: File;
}

export function DataUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const fileId = Math.random().toString(36).substr(2, 9);
      const newFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
        progress: 0,
        file: file
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
      
      // Actually upload the file
      uploadFile(newFile);
    });
  };

  const uploadFile = async (uploadFile: UploadedFile) => {
    try {
      // Update progress to show upload starting
      setUploadedFiles(prev => prev.map(file => 
        file.id === uploadFile.id 
          ? { ...file, progress: 10 }
          : file
      ));

      // Upload to backend
      const result = await api.datasets.upload(uploadFile.file);
      
      // Mark as successful
      setUploadedFiles(prev => prev.map(file => 
        file.id === uploadFile.id 
          ? { ...file, status: 'success', progress: 100 }
          : file
      ));

      // Redirect to data preview after successful upload
      setTimeout(() => {
        window.location.href = '/data/preview';
      }, 1500);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadedFiles(prev => prev.map(file => 
        file.id === uploadFile.id 
          ? { ...file, status: 'error', error: 'Upload failed' }
          : file
      ));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('csv') || type.includes('text')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    } else if (type.includes('excel') || type.includes('spreadsheet')) {
      return <Database className="w-5 h-5 text-green-500" />;
    } else if (type.includes('json')) {
      return <Shield className="w-5 h-5 text-purple-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Upload complete! Redirecting...';
      case 'error':
        return 'Upload failed';
      default:
        return 'Uploading...';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Upload className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload Data</h1>
          <p className="text-gray-600 dark:text-gray-300">Import your datasets for analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <span>CSV Files</span>
            </CardTitle>
            <CardDescription>Upload comma-separated value files</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Support for standard CSV files with automatic column detection and data type inference.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-green-500" />
              <span>Excel Files</span>
            </CardTitle>
            <CardDescription>Upload Excel spreadsheets</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Support for .xlsx and .xls files with multiple sheet handling.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <span>JSON Data</span>
            </CardTitle>
            <CardDescription>Upload structured JSON files</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Support for JSON files with automatic flattening of nested structures.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Upload Area</CardTitle>
          <CardDescription>Drag and drop your files here or click to browse</CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 dark:border-gray-600 hover:border-primary'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Drop your files here
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Supports CSV, Excel, and JSON files up to 100MB
            </p>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.json,.txt"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
            <CardDescription>Track your file uploads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(file.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{getStatusText(file.status)}</span>
                    </div>
                    <Progress value={file.progress} className="mt-2" />
                    {file.error && (
                      <p className="text-sm text-red-600 mt-2">{file.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
