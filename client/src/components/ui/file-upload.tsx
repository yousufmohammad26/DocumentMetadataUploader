import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, formatFileSize } from "@/lib/s3";
import { AlertCircle, FileText, X, Upload } from "lucide-react";
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
            "mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg shadow-sm transition-all duration-300",
            {
              "border-primary bg-primary/10 shadow-md scale-[1.01]": dragActive,
              "border-destructive bg-destructive/5": error,
              "border-gray-300 hover:border-primary hover:bg-primary/5 focus-within:border-primary hover:shadow": !dragActive && !error,
            }
          )}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          {!selectedFile ? (
            <div className="space-y-4 text-center w-full">
              <div>
                <Upload className="h-8 w-8 text-gray-400 mx-auto" />
              </div>
              <div className="flex flex-col items-center text-sm text-gray-600">
                <label
                  htmlFor={props.id || "file-upload"}
                  className="relative cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-200 focus-within:outline-none mb-2"
                >
                  <span className="flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Browse files
                  </span>
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
                <p className="text-sm">or drag and drop files here</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                {["PDF", "DOCX", "XLSX", "PPTX", "TXT", "JPG", "PNG"].map((type) => (
                  <span key={type} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    {type}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Maximum file size: 10MB
              </p>
            </div>
          ) : (
            <div className="flex items-center w-full bg-gray-50 p-3 rounded-lg">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 flex items-center justify-center rounded-md bg-gray-100 text-gray-500 border border-gray-200">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 flex items-center">
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium mr-2">
                    {selectedFile.type.split('/')[1]?.toUpperCase() || 'FILE'}
                  </span>
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-gray-500 bg-white p-2 rounded-full"
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
