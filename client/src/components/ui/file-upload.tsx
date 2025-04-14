import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, formatFileSize } from "@/lib/s3";
import { AlertCircle, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  onFileChange: (file: File | null) => void;
}

export const FileUpload = React.forwardRef<HTMLInputElement, FileUploadProps>(
  ({ className, label, helperText, error, onFileChange, ...props }, ref) => {
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [dragActive, setDragActive] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current!);
    
    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      validateAndSetFile(file);
    };
    
    // Handle drag events
    const handleDrag = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };
    
    // Handle drop event
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        validateAndSetFile(e.dataTransfer.files[0]);
      }
    };
    
    // Validate file type and size
    const validateAndSetFile = (file: File | null) => {
      if (!file) {
        setSelectedFile(null);
        onFileChange(null);
        return;
      }
      
      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        alert("Invalid file type. Please upload a supported document format.");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        alert("File size exceeds 10MB limit.");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      
      setSelectedFile(file);
      onFileChange(file);
    };
    
    // Clear selected file
    const clearSelectedFile = () => {
      setSelectedFile(null);
      onFileChange(null);
      if (inputRef.current) inputRef.current.value = "";
    };
    
    return (
      <div className={className}>
        {label && <Label className="mb-2 block">{label}</Label>}
        
        <div
          className={cn(
            "mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md",
            {
              "border-primary bg-primary/5": dragActive,
              "border-destructive": error,
              "border-gray-300 hover:border-primary focus-within:border-primary": !dragActive && !error,
            }
          )}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor={props.id || "file-upload"}
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-600 focus-within:outline-none"
                >
                  <span>Upload a file</span>
                  <input
                    id={props.id || "file-upload"}
                    name={props.name || "file-upload"}
                    type="file"
                    className="sr-only"
                    onChange={handleFileChange}
                    ref={inputRef}
                    {...props}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                PDF, DOCX, XLSX, PPTX, TXT, JPG, PNG up to 10MB
              </p>
            </div>
          ) : (
            <div className="flex items-center w-full">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 flex items-center justify-center rounded-md bg-blue-100 text-primary">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-gray-500"
                onClick={clearSelectedFile}
              >
                <span className="sr-only">Remove file</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-2 flex items-center text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span>{error}</span>
          </div>
        )}
        
        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";
