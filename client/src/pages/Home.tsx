import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import Profile from "/assets/Profile.jpg";
import Architecture from "/assets/Architecture.png";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DocumentMetadata, documentMetadataSchema } from "@shared/schema";
import { FileUpload } from "@/components/ui/file-upload";
import {
  uploadFileToS3,
  formatFileSize,
  formatDate,
  UploadProgress,
  getMetadataTagColors,
} from "@/lib/s3";
import { getDocumentColorScheme } from "@/lib/documentColors";

import { EditMetadataModal } from "@/components/EditMetadataModal";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  FileText,
  Search,
  Download,
  Edit,
  Upload,
  FileCode,
  Tag,
  Cloud,
  Plus,
  ClipboardList,
  RefreshCw,
  RotateCw,
  Eye,
  X,
} from "lucide-react";
import JsonView from "@uiw/react-json-view";

export default function Home() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Use the FileUploadRef type for our ref
  const fileUploadRef = React.useRef<any>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Edit metadata states
  const [editMetadataOpen, setEditMetadataOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentData | null>(
    null,
  );

  // Form for metadata
  const form = useForm<DocumentMetadata>({
    resolver: zodResolver(documentMetadataSchema),
    defaultValues: {
      name: "",
      metadata: [],
      accessLevel: "private",
    },
  });

  // Set up field array for dynamic metadata key-value pairs
  const { fields, append, remove } = useFieldArray({
    name: "metadata",
    control: form.control,
  });

  // Define document type
  interface DocumentData {
    id: number;
    fileName: string;
    fileKey: string;
    fileSize: number;
    fileType: string;
    name: string;
    metadata: Record<string, string>;
    accessLevel: string;
    uploadedAt: string;
    lastUpdated?: string; // Add optional lastUpdated field
  }

  // Query for retrieving documents
  const {
    data: documents = [] as DocumentData[],
    isLoading: isLoadingDocs,
    error: docsError,
  } = useQuery<DocumentData[]>({
    queryKey: ["/api/documents"],
  });

  // View document in new tab (fallback option)
  const handleView = async (id: number) => {
    try {
      const document = documents.find((doc) => doc.id === id);
      if (!document) {
        throw new Error("Document not found");
      }

      const response = await apiRequest("GET", `/api/documents/${id}/download`);

      if (!response.ok) {
        throw new Error(`Failed to get download URL: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.presignedUrl) {
        throw new Error("No presigned URL returned from server");
      }

      const isImage = document.fileType.startsWith("image/");
      const isPDF = document.fileType === "application/pdf";

      if (isImage) {
        // For images, open in a modal or new window with proper styling
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(`
            <html>
              <head>
                <title>Image Viewer - ${document.fileName}</title>
                <style>
                  body { margin: 0; background: #1a1a1a; height: 100vh; display: flex; align-items: center; justify-content: center; }
                  img { max-width: 95%; max-height: 95vh; object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${data.presignedUrl}" alt="${document.fileName}" />
              </body>
            </html>
          `);
        }
      } else if (isPDF) {
        // For PDFs, embed in a new window with full viewport
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(`
            <html>
              <head>
                <title>PDF Viewer - ${document.fileName}</title>
                <style>
                  body { margin: 0; height: 100vh; }
                  embed { width: 100%; height: 100%; }
                </style>
              </head>
              <body>
                <embed src="${data.presignedUrl}" type="application/pdf" />
              </body>
            </html>
          `);
        }
      } else {
        // For other files, use default browser behavior
        window.open(data.presignedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Error opening document in viewer:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to view document",
        variant: "destructive",
      });
    }
  };

  // Download document
  const handleDownload = async (id: number) => {
    try {
      const response = await apiRequest("GET", `/api/documents/${id}/download`);

      if (!response.ok) {
        throw new Error(`Failed to get download URL: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.presignedUrl) {
        throw new Error("No presigned URL returned from server");
      }

      // Create a temporary anchor element and trigger download
      const link = document.createElement("a");
      link.href = data.presignedUrl;
      link.setAttribute("download", ""); // This will prompt download rather than open
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to download document",
        variant: "destructive",
      });
    }
  };

  // Handle file upload
  const handleUpload = async (data: DocumentMetadata) => {
    if (!selectedFile) {
      // Alert user to select a file but don't set form submission state
      toast({
        title: "Action Required",
        description: "Please select a file to upload",
        variant: "default",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress({ percentage: 0, status: "Starting upload..." });

    try {
      // Start the upload to S3
      const result = await uploadFileToS3(
        selectedFile,
        data,
        setUploadProgress,
      );

      if (result.success) {
        // Show success toast BEFORE any form reset operations
        // This ensures the toast is displayed and not affected by form operations
        toast({
          title: "SUCCESS!",
          description: "Document successfully uploaded and saved!",
          variant: "default",
        });

        // Reset form state after toast is displayed
        try {
          // Reset form state completely
          form.reset();
          form.clearErrors();
          setSelectedFile(null);
          setUploadProgress(null);

          // Use the custom clearFile method we defined in the FileUpload component
          if (fileUploadRef.current && fileUploadRef.current.clearFile) {
            fileUploadRef.current.clearFile();
          }
        } catch (resetError) {
          console.error("Error during form reset:", resetError);
        }

        // Refresh all data including documents list to show the new document
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleUpload function:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Synchronize documents from S3 bucket
  const syncFromS3 = async (silent: boolean = false) => {
    if (isSyncing) return;

    setIsSyncing(true);
    try {
      // Get the sync from S3 result
      const response = await apiRequest("GET", "/api/documents/sync-from-s3");
      const result = await response.json();

      if (result.success) {
        // Simply invalidate the documents query to refresh the list
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });

        // Show success toast only if not in silent mode
        if (!silent) {
          toast({
            title: "Synchronization Complete",
            description: result.message,
            variant: "default",
          });
        }
      } else {
        // Always show error even in silent mode
        toast({
          title: "Sync Error",
          description: result.message || "Failed to sync documents from S3",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error during S3 sync:", error);
      // Always show error even in silent mode
      toast({
        title: "Sync Error",
        description: "Failed to sync documents from S3",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Add a new empty metadata field
  const addMetadataField = () => {
    append({ key: "", value: "" });
  };

  // Handle edit metadata
  const handleEditMetadata = (document: DocumentData) => {
    setEditingDocument(document);
    setEditMetadataOpen(true);
  };

  // Handle metadata update completion
  const handleMetadataUpdateComplete = () => {
    // Update both documents
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });

    // Show toast for confirmation
    toast({
      title: "Metadata Updated",
      description: "Document metadata has been updated",
      variant: "default",
    });
  };

  // Use documents as-is without any sorting
  const sortedDocuments = Array.isArray(documents) ? [...documents] : [];

  // Filter documents based on search term - only search in metadata
  const filteredDocuments =
    searchTerm && Array.isArray(sortedDocuments)
      ? sortedDocuments.filter(
          (doc: DocumentData) =>
            // Only search within metadata keys and values
            doc.metadata &&
            Object.entries(doc.metadata).some(
              ([key, value]) =>
                key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(value).toLowerCase().includes(searchTerm.toLowerCase()),
            ),
        )
      : sortedDocuments;

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const [query, setQuery] = useState("SELECT user_metadata FROM yousuf_demo_s3table_metadata");
  const [queryResults, setQueryResults] = useState<any[]>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const handleQuery = async () => {
    console.log("Running Athena query:", query);
    setIsQuerying(true);
    try {
      const response = await apiRequest("POST", "/api/query-athena", {
        query,
      });
      const data = await response.json();
      console.log("Athena query results:", data.results);
      setQueryResults(data.results);
    } catch (error) {
      console.error("Error running Athena query:", error);
      toast({
        title: "Error",
        description: "Failed to run Athena query",
        variant: "destructive",
      });
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img src="/logo.svg" alt="Logo" className="h-10 w-10 mr-3" />
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  DocumentIQ
                </h1>
                <p className="text-xs text-gray-600">
                  Documents + Metadata = Effortless Control
                </p>
                <p className="text-xs italic mt-0.5 bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">
                  Powered by AWS S3 Tables
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                <Cloud className="h-3 w-3 mr-1 text-green-600" />
                <span>
                  Connected to AWS S3 Bucket:{" "}
                  {process.env.AWS_S3_BUCKET_NAME || "document-metadata-bucket"}
                </span>
              </div>

              {/* User Profile with Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="cursor-pointer flex items-center bg-white p-1.5 rounded-full shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <Avatar className="h-8 w-8 border border-gray-100">
                      <AvatarImage src={Profile} alt="User Profile" />
                      <AvatarFallback>YM</AvatarFallback>
                    </Avatar>
                    <div className="ml-2 mr-2 text-sm hidden sm:block">
                      <p className="font-medium text-gray-700">
                        Yousuf Mohammad
                      </p>
                      <p className="text-xs text-gray-500">Document Manager</p>
                    </div>
                  </div>
                </DropdownMenuTrigger>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            {/* Main Content - Upload Form */}
            <div className="mt-5 md:mt-0 md:col-span-2">
              {/* Upload New Document Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUpload)}>
                  <div className="shadow-sm sm:rounded-md sm:overflow-hidden border border-gray-200">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center">
                        <div className="bg-blue-500 rounded-full p-1.5 mr-3">
                          <Upload className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          Upload New Document
                        </h3>
                      </div>
                    </div>
                    <div className="px-6 py-6 bg-white space-y-6">
                      {/* File Upload */}
                      <FileUpload
                        ref={fileUploadRef}
                        id="file-upload"
                        label="Document File"
                        onFileChange={(file) => {
                          setSelectedFile(file);

                          // If a file is selected, update the topology field with Year/MMM/ format
                          if (file) {
                            const now = new Date();
                            const year = now.getFullYear();
                            // Get three-letter month name (e.g., Jan, Feb, Mar, etc.)
                            const monthNames = [
                              "Jan",
                              "Feb",
                              "Mar",
                              "Apr",
                              "May",
                              "Jun",
                              "Jul",
                              "Aug",
                              "Sep",
                              "Oct",
                              "Nov",
                              "Dec",
                            ];
                            const monthName = monthNames[now.getMonth()];
                            // Create the topology path with Year/MMM/ format
                            const topologyPath = `${year}/${monthName}/`;

                            // Set the topology field value to the path
                            form.setValue("name", topologyPath);
                          }
                        }}
                        error={undefined} // Removed conditional error message completely
                      />

                      {/* Upload Progress */}
                      {uploadProgress && (
                        <div>
                          <FormLabel>Upload Progress</FormLabel>
                          <div className="mt-1">
                            <div className="relative pt-1">
                              <div className="flex mb-2 items-center justify-between">
                                <div>
                                  <span className="text-xs font-semibold inline-block py-1 px-2 rounded-full text-primary-dark bg-blue-200">
                                    {uploadProgress.percentage}%
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-semibold inline-block text-primary-dark">
                                    {uploadProgress.status}
                                  </span>
                                </div>
                              </div>
                              <Progress
                                value={uploadProgress.percentage}
                                className="h-2"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Document Metadata */}
                      <div>
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-md border border-emerald-100 mb-5">
                          <h3 className="text-sm font-semibold text-green-800 flex items-center">
                            <Tag className="h-4 w-4 mr-2 text-emerald-600" />
                            Document Metadata
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                              Searchable
                            </span>
                          </h3>
                          <p className="text-xs text-green-700 mt-1">
                            Add custom metadata to make your document more
                            searchable and organized
                          </p>
                        </div>

                        <div className="grid grid-cols-6 gap-6">
                          <div className="col-span-6">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Topology</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter topology"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {/* Metadata Key-Value Pairs */}
                          <div className="col-span-6">
                            <div className="flex items-center justify-between mb-2">
                              <FormLabel>Metadata</FormLabel>
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={addMetadataField}
                                className="flex items-center bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-sm"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Metadata
                              </Button>
                            </div>

                            {fields.length === 0 && (
                              <div className="text-sm text-gray-500 py-2 text-center border border-dashed rounded-md">
                                No metadata added. Click "Add Metadata" to add
                                key-value pairs.
                              </div>
                            )}

                            {fields.map((field, index) => {
                              // Get the current key value from the form
                              const currentKey = form.watch(
                                `metadata.${index}.key`,
                              );
                              // Get tag colors based on the key (if it exists)
                              const { bg, text } = currentKey
                                ? getMetadataTagColors(currentKey)
                                : { bg: "", text: "" };

                              return (
                                <motion.div
                                  key={field.id}
                                  className="flex items-start space-x-2 mb-2 rounded-md"
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <div className="flex-1">
                                    <FormField
                                      control={form.control}
                                      name={`metadata.${index}.key`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <div className="relative">
                                              <Input
                                                placeholder="Key"
                                                {...field}
                                                className={`${currentKey ? `border-l-4 ${bg.replace("bg-", "border-").replace("-50", "-300")}` : ""}`}
                                              />
                                              {currentKey && (
                                                <div
                                                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${bg.replace("-50", "-300")}`}
                                                ></div>
                                              )}
                                            </div>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <FormField
                                      control={form.control}
                                      name={`metadata.${index}.value`}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormControl>
                                            <Input
                                              placeholder="Value"
                                              {...field}
                                              className={
                                                currentKey
                                                  ? `border-l-4 ${bg.replace("bg-", "border-").replace("-50", "-200")}`
                                                  : ""
                                              }
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => remove(index)}
                                    className="mt-2"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </motion.div>
                              );
                            })}
                          </div>

                          <div className="col-span-6">
                            <FormField
                              control={form.control}
                              name="accessLevel"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Access Level</FormLabel>
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                      className="flex flex-col space-y-1"
                                    >
                                      <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                          <RadioGroupItem value="public" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                          Public - Anyone with the link can
                                          access
                                        </FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                          <RadioGroupItem value="private" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                          Private - Only authenticated users can
                                          access
                                        </FormLabel>
                                      </FormItem>
                                    </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-100 border-t border-gray-200 sm:px-6 flex justify-between items-center">
                      {form.formState.errors.root && (
                        <span className="text-sm text-error">
                          {form.formState.errors.root.message}
                        </span>
                      )}
                      {!form.formState.errors.root && (
                        <span className="text-sm text-gray-500">
                          Add metadata to make your document more searchable
                        </span>
                      )}
                      <Button
                        type="submit"
                        disabled={isUploading}
                        className="bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
                        size="lg"
                      >
                        {isUploading ? (
                          <>
                            <RotateCw className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload to S3
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </div>

            {/* Sidebar */}
            <div className="md:col-span-1 ml-auto order-last">
              <div className="px-4 sm:px-0 space-y-6">
                {/* Architecture Diagram */}
                <div className="bg-white shadow-md rounded-lg overflow-hidden border border-blue-100 hover:shadow-lg transition-shadow duration-300">
                  <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <div className="flex items-center">
                      <div className="bg-blue-500 rounded-full p-1 mr-2">
                        <FileCode className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Architecture
                      </h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <img
                      src={Architecture}
                      alt="Architecture Diagram"
                      className="w-full rounded-md border border-gray-200"
                    />
                  </div>
                </div>

                {/* Athena Query */}
                <div className="bg-white shadow-md rounded-lg overflow-hidden border border-blue-100 hover:shadow-lg transition-shadow duration-300 mb-6">
                  <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <div className="flex items-center">
                      <div className="bg-blue-500 rounded-full p-1 mr-2">
                        <Search className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Athena Query
                      </h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4">
                      <textarea
                        className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                        placeholder="Enter your Athena SQL query..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <Button
                        onClick={handleQuery}
                        disabled={isQuerying}
                        className="w-full"
                      >
                        {isQuerying ? (
                          <>
                            <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                            Running Query...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Run Query
                          </>
                        )}
                      </Button>

                      {queryResults  && (
                        <div className="mt-4">
                          <h4 className="text-sm font-semibold mb-2">Query Results:</h4>
                          <div className="border rounded-md p-4 bg-gray-50 max-h-[500px] overflow-auto">
                            <JsonView 
                              value={queryResults}
                              displayDataTypes={false}
                              displayObjectSize={false}
                              enableClipboard={false}
                              style={{
                                background: 'transparent',
                                padding: '0.5rem'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logs */}
                <div className="bg-white shadow-md rounded-lg overflow-hidden border border-emerald-100 hover:shadow-lg transition-shadow duration-300">
                  <div className="px-5 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-emerald-100">
                    <div className="flex items-center">
                      <div className="bg-emerald-500 rounded-full p-1 mr-2">
                        <ClipboardList className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Logs
                      </h3>
                    </div>
                  </div>
                  <div className="px-5 py-4 max-h-[400px] overflow-y-auto text-xs font-mono">
                    <div className="space-y-2">
                      {Array.isArray(documents) && documents.length > 0 ? (
                        documents.map((doc, index) => (
                          <div
                            key={index}
                            className="p-2.5 rounded-md border-l-3 border-green-400 bg-green-50 shadow-sm"
                          >
                            <span className="text-gray-500 font-medium">
                              [{formatDate(doc.uploadedAt, true)}]
                            </span>{" "}
                            <span className="text-green-600 font-semibold">
                              Success:
                            </span>{" "}
                            Uploaded{" "}
                            <span className="font-bold text-gray-700">
                              {doc.name}
                            </span>{" "}
                            <span className="text-gray-500">
                              ({formatFileSize(doc.fileSize)})
                            </span>
                            <div className="mt-1 pl-4 text-xs text-gray-500 break-all">
                              <span className="text-gray-700 font-medium">
                                File:
                              </span>{" "}
                              {doc.fileName}
                              <br />
                              <span className="text-gray-700 font-medium">
                                Type:
                              </span>{" "}
                              {doc.fileType}
                              <br />
                              <span className="text-gray-700 font-medium">
                                Key:
                              </span>
                              <span className="inline-block mt-1 mb-1 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-sm text-blue-600 w-full break-all">
                                {doc.fileKey}
                              </span>
                              <br />
                              <span className="text-gray-700 font-medium">
                                Access:
                              </span>{" "}
                              {doc.accessLevel}
                              <br />
                              {doc.metadata &&
                                Object.keys(doc.metadata).length > 0 && (
                                  <div className="mt-1">
                                    <span className="text-gray-700 font-medium">
                                      Metadata:
                                    </span>
                                    <ul className="pl-4 mt-0.5">
                                      {Object.entries(doc.metadata).map(
                                        ([key, value], idx) => (
                                          <li key={idx}>
                                            <span className="text-gray-600">
                                              {key}:
                                            </span>{" "}
                                            {value}
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2.5 rounded-md border-l-3 border-blue-400 bg-blue-50 shadow-sm">
                          <span className="text-gray-500 font-medium">
                            [{new Date().toLocaleString()}]
                          </span>{" "}
                          <span className="text-blue-600 font-semibold">
                            Info:
                          </span>{" "}
                          No activity logs available.
                          <span className="block mt-1 text-gray-600">
                            System initialized and ready for uploads.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="mt-12">
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    Uploaded Documents
                  </h2>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  A list of all the documents you've uploaded to your S3 bucket
                  with their metadata.
                </p>
              </div>
              <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex items-center space-x-3">
                <motion.div
                  className="relative rounded-md shadow-sm"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1); // Reset to first page when searching
                    }}
                    className="pr-10"
                  />
                  <motion.div
                    className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
                    animate={{
                      scale: searchTerm ? 1.2 : 1,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Search
                      className={`h-5 w-5 ${searchTerm ? "text-primary" : "text-gray-400"}`}
                    />
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={() => syncFromS3()}
                    disabled={isSyncing}
                    className="flex items-center"
                  >
                    {isSyncing ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync from S3
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </div>

            <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
              {isLoadingDocs ? (
                <motion.div
                  className="p-6 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex flex-col items-center justify-center">
                    <svg
                      className="animate-spin h-8 w-8 text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="text-gray-500 mt-2">Loading documents...</p>
                  </div>
                </motion.div>
              ) : documents.length === 0 ? (
                <motion.div
                  className="p-10 text-center border-2 border-dashed border-gray-300 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900">
                    No documents yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start by uploading a document or syncing from your S3
                    bucket.
                  </p>
                  <div className="mt-6">
                    <Button
                      type="button"
                      onClick={() => syncFromS3()}
                      disabled={isSyncing}
                      className="flex items-center mx-auto"
                    >
                      {isSyncing ? (
                        <>
                          <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync from S3
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                          File Name
                        </TableHead>
                        <TableHead className="bg-muted/50">Metadata</TableHead>
                        <TableHead className="bg-muted/50">Size</TableHead>
                        <TableHead className="px-6 py-4 text-left text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                          Access Level
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {paginatedDocuments.map((doc: DocumentData) => {
                          const colorScheme = getDocumentColorScheme(
                            doc.metadata,
                            doc.fileType,
                          );

                          return (
                            <motion.tr
                              key={doc.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.3 }}
                              style={{
                                backgroundColor: "white",
                                borderLeft: `4px solid ${colorScheme.accentColor}`,
                              }}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td
                                className="px-6 py-4"
                                style={{ minWidth: "350px" }}
                              >
                                <div className="flex items-center">
                                  <div
                                    className={`flex-shrink-0 h-10 w-10 rounded-md bg-${colorScheme.lightBg} flex items-center justify-center`}
                                  >
                                    <FileText
                                      className={`h-5 w-5 text-${colorScheme.accentColor}`}
                                    />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-lg font-bold text-gray-900">
                                      {doc.fileName}
                                    </div>
                                    <div className="text-xs font-mono mt-1 break-all px-2 py-1 bg-gray-50 border border-gray-200 rounded-sm">
                                      <span className="font-medium text-gray-700">
                                        Key:
                                      </span>{" "}
                                      <span className="text-blue-600">
                                        {doc.fileKey}
                                      </span>
                                    </div>
                                    <div className="flex mt-2 space-x-2">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="flex items-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0 h-6"
                                              onClick={() => handleView(doc.id)}
                                            >
                                              <Eye className="h-3 w-3 mr-1" />
                                              <span className="text-xs">
                                                View
                                              </span>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Preview document</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>

                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="flex items-center text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-0 h-6"
                                              onClick={() =>
                                                handleDownload(doc.id)
                                              }
                                            >
                                              <Download className="h-3 w-3 mr-1" />
                                              <span className="text-xs">
                                                Download
                                              </span>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Download document</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col space-y-2">
                                  <div className="flex flex-wrap gap-1.5 max-w-xs">
                                    {doc.metadata &&
                                      Object.entries(doc.metadata).map(
                                        ([key, value], idx) => {
                                          const { bg, text, hoverBg } =
                                            getMetadataTagColors(key);
                                          return (
                                            <div
                                              key={idx}
                                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${bg} ${text} hover:${hoverBg} transition-colors cursor-default`}
                                              title={`${key}: ${value}`}
                                            >
                                              <span className="font-medium mr-1">
                                                {key}:
                                              </span>
                                              <span className="truncate max-w-[100px]">
                                                {value}
                                              </span>
                                            </div>
                                          );
                                        },
                                      )}
                                    {(!doc.metadata ||
                                      Object.keys(doc.metadata).length ===
                                        0) && (
                                      <span className="text-xs text-gray-400 italic">
                                        No metadata
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex items-center text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2 py-0 h-6"
                                            onClick={() =>
                                              handleEditMetadata(doc)
                                            }
                                          >
                                            <Edit className="h-3 w-3 mr-1" />
                                            <span className="text-xs">
                                              Edit
                                            </span>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Edit document metadata</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatFileSize(doc.fileSize)}
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    doc.accessLevel === "public"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {doc.accessLevel}
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {/* Add pagination state */}
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </main>

      {/* Edit Metadata Modal */}
      {editingDocument && (
        <EditMetadataModal
          isOpen={editMetadataOpen}
          onClose={() => setEditMetadataOpen(false)}
          documentId={editingDocument.id}
          documentName={editingDocument.name}
          documentMetadata={editingDocument.metadata || {}}
          accessLevel={editingDocument.accessLevel}
          onUpdate={handleMetadataUpdateComplete}
        />
      )}
    </div>
  );
}