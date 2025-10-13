import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Database, Shield, X, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader, PageSection, PageShell } from "@/components/layout/Page";

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
      return <FileText className="h-5 w-5 text-primary" />;
    }

    if (type.includes('excel') || type.includes('spreadsheet')) {
      return <Database className="h-5 w-5 text-success" />;
    }

    if (type.includes('json')) {
      return <Shield className="h-5 w-5 text-accent" />;
    }

    return <FileText className="h-5 w-5 text-text-subtle" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-danger" />;
      default:
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />;
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
    <PageShell padding="lg" width="wide">
      <PageHeader
        eyebrow="Datasets"
        title="Upload data"
        description="Import CSV, Excel, or JSON files to start exploring your dataset."
      />

      <PageSection surface="transparent" contentClassName="space-y-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="transition-shadow hover:shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>CSV files</span>
              </CardTitle>
              <CardDescription>Upload comma-separated value files</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-muted">
                Support for standard CSV files with automatic column detection and data type inference.
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-success" />
                <span>Excel files</span>
              </CardTitle>
              <CardDescription>Upload Excel spreadsheets</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-muted">
                Support for .xlsx and .xls files with multiple sheet handling.
              </p>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" />
                <span>JSON data</span>
              </CardTitle>
              <CardDescription>Upload structured JSON files</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-muted">
                Support for JSON files with automatic flattening of nested structures.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload area</CardTitle>
            <CardDescription>Drag and drop your files here or click to browse</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${
                isDragOver ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mb-4 h-12 w-12 text-text-subtle" />
              <p className="mb-2 text-lg font-medium text-text-primary">Drop your files here</p>
              <p className="mb-4 text-sm text-text-muted">Supports CSV, Excel, and JSON files up to 100MB</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                Browse files
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

        {uploadedFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Upload progress</CardTitle>
              <CardDescription>Track your file uploads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 rounded-xl border border-border p-4"
                  >
                    {getFileIcon(file.type)}
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-text-primary">{file.name}</p>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(file.status)}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file.id)}
                            className="text-text-subtle hover:text-danger"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mb-2 flex items-center justify-between text-sm text-text-muted">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{getStatusText(file.status)}</span>
                      </div>
                      <Progress value={file.progress} />
                      {file.error && (
                        <p className="mt-2 text-sm text-danger">{file.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </PageSection>
    </PageShell>
  );
}
