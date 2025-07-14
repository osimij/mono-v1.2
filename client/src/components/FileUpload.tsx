import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string[];
  maxSize?: number;
  className?: string;
  isUploading?: boolean;
  pendingFile?: File | null;
  uploadProgress?: number;
  onAuthRequired?: () => void;
}

export function FileUpload({ 
  onUpload, 
  accept = ['.csv', '.xlsx', '.xls'],
  maxSize = 10 * 1024 * 1024, // 10MB
  className,
  isUploading = false,
  pendingFile = null,
  uploadProgress = 0,
  onAuthRequired
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { user } = useAuth();

  const validateFile = (file: File): string | null => {
    // File size validation
    if (file.size > maxSize) {
      return `File is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.`;
    }

    // File type validation
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!accept.includes(fileExtension)) {
      return `Invalid file type. Supported formats: ${accept.join(', ')}`;
    }

    // File name validation
    if (file.name.length > 100) {
      return 'File name is too long. Please rename your file.';
    }

    // Content validation for CSV files
    if (fileExtension === '.csv' && file.size < 100) {
      return 'File appears to be empty or corrupted.';
    }

    return null;
  };

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    setValidationError(null);
    
    // Check authentication first, before file validation
    if (!user && onAuthRequired) {
      onAuthRequired();
      return;
    }
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setValidationError(`File is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.`);
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setValidationError(`Invalid file type. Supported formats: ${accept.join(', ')}`);
      } else {
        setValidationError('File upload failed. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await onUpload(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Reset after a short delay
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 1000);
    } catch (err) {
      setUploading(false);
      setProgress(0);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    }
  }, [onUpload, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxSize,
    multiple: false,
    noClick: !user, // Disable click if not authenticated
    noDrag: false   // Still allow drag & drop which will trigger auth check
  });

  // Handle click manually to check auth first
  const handleDropzoneClick = (e: React.MouseEvent) => {
    if (!user && onAuthRequired) {
      e.preventDefault();
      e.stopPropagation();
      onAuthRequired();
    }
  };

  // Show pending file status
  const showPendingStatus = pendingFile && !user;
  const showUploadProgress = isUploading || uploading || uploadProgress > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {!user && !showPendingStatus && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <LogIn className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            Sign in required for personal file uploads. Demo data available without sign-in.
          </AlertDescription>
        </Alert>
      )}

      {showPendingStatus && (
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="space-y-2">
              <div>File "{pendingFile.name}" ready for upload</div>
              <div className="text-sm opacity-75">Will upload automatically after sign-in</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {showUploadProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading {pendingFile?.name || "file"}...</span>
            <span>{Math.round(uploadProgress || progress)}%</span>
          </div>
          <Progress value={uploadProgress || progress} className="h-2" />
        </div>
      )}
      
      <div
        {...getRootProps()}
        data-upload="dropzone"
        {...(!user && { onClick: handleDropzoneClick })}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors file-upload",
          isDragActive 
            ? "border-primary bg-primary/5" 
            : "border-gray-300 dark:border-gray-600 hover:border-primary",
          (uploading || showUploadProgress) && "pointer-events-none opacity-50",
          showPendingStatus && "border-blue-300 dark:border-blue-600"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            {showUploadProgress ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            ) : showPendingStatus ? (
              <FileText className="w-12 h-12 text-blue-500" />
            ) : (
              <Upload className="w-12 h-12" />
            )}
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {uploading ? 'Uploading...' : 'Drop your files here'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Supports CSV, Excel files up to {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Uploading...</span>
            <span className="text-gray-600 dark:text-gray-300">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
