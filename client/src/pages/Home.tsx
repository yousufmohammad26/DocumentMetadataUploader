import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DocumentMetadata, documentMetadataSchema, MetadataKeyValue } from "@shared/schema";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadFileToS3, formatFileSize, formatDate, UploadProgress, getMetadataTagColors } from "@/lib/s3";
import { getDocumentColorScheme } from "@/lib/documentColors";
import { DocumentPreview } from "@/components/DocumentPreview";
import { EditMetadataModal } from "@/components/EditMetadataModal";

import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  FileText,
  Search,
  Download,
  Edit,
  Plus,
  X,
  Eye,
  RefreshCw,
  RotateCw,
  Image as ImageIcon,
  Archive,
  Table,
  Calendar,
  FileCode,
  Info,
  ClipboardList,
  Presentation,
  FileQuestion,
  Music,
  Video,
  Code,
  Filter,
  Check,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Upload,
} from "lucide-react";



export default function Home() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Document preview states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<{
    url: string;
    name: string;
    type: string;
    id: number;
  } | null>(null);
  
  // Edit metadata states
  const [editMetadataOpen, setEditMetadataOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentData | null>(null);

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
  }

  // Query for retrieving documents
  const {
    data: documents = [] as DocumentData[],
    isLoading: isLoadingDocs,
    error: docsError,
  } = useQuery<DocumentData[]>({
    queryKey: ["/api/documents"],
  });

  // Query for stats
  interface StatsData {
    totalUploads: number;
    todayUploads: number;
    storageUsed: number;
    bucketName: string;
  }
  
  const {
    data: stats = { totalUploads: 0, todayUploads: 0, storageUsed: 0, bucketName: "" } as StatsData,
    isLoading: isLoadingStats,
  } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });
  
  // Query for AWS account info
  interface AwsAccountData {
    accountIdentifier: string;
    region: string;
    active: boolean;
  }
  
  const {
    data: awsAccount = { accountIdentifier: "", region: "", active: false } as AwsAccountData,
    isLoading: isLoadingAwsAccount,
  } = useQuery<AwsAccountData>({
    queryKey: ["/api/aws-account"],
  });



  // View document in preview modal
  const handleViewInPreview = async (id: number) => {
    try {
      // Find the document details
      const document = documents.find(doc => doc.id === id);
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
      
      console.log("Opening document preview:", {
        name: document.name || document.fileName,
        type: document.fileType,
        url: data.presignedUrl.substring(0, 100) + '...' // Log partial URL for debugging
      });
      
      // Set the preview document and open the preview modal
      setPreviewDocument({
        url: data.presignedUrl,
        name: document.name || document.fileName,
        type: document.fileType,
        id: document.id
      });
      setPreviewOpen(true);
    } catch (error) {
      console.error("Error opening document preview:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to preview document",
        variant: "destructive",
      });
    }
  };
  
  // View document in new tab (fallback option)
  const handleView = async (id: number) => {
    try {
      const response = await apiRequest("GET", `/api/documents/${id}/download`);
      
      if (!response.ok) {
        throw new Error(`Failed to get download URL: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.presignedUrl) {
        throw new Error("No presigned URL returned from server");
      }
      
      // Open the URL in a new tab for viewing
      window.open(data.presignedUrl, "_blank");
    } catch (error) {
      console.error("Error opening document in new tab:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to view document",
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
      const link = document.createElement('a');
      link.href = data.presignedUrl;
      link.setAttribute('download', ''); // This will prompt download rather than open
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download document",
        variant: "destructive",
      });
    }
  };

  // Handle file upload
  const handleUpload = async (data: DocumentMetadata) => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress({ percentage: 0, status: "Starting upload..." });

    try {
      const result = await uploadFileToS3(selectedFile, data, setUploadProgress);

      if (result.success) {
        // Reset form and state
        form.reset();
        setSelectedFile(null);
        setUploadProgress(null);
        
        // Reset file input by finding and clearing it
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        
        // Show success toast
        toast({
          title: "Success",
          description: "Document successfully uploaded!",
          variant: "default",
        });
        
        // Refresh document list, stats and AWS account info
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/aws-account"] });
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Synchronize documents from S3 bucket
  const syncFromS3 = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      const response = await apiRequest("GET", "/api/documents/sync-from-s3");
      const result = await response.json();
      
      if (result.success) {
        // Refresh document list, stats and AWS account info
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/aws-account"] });
        
        // Show success toast
        toast({
          title: "Synchronization Complete",
          description: result.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Sync Error",
          description: result.message || "Failed to sync documents from S3",
          variant: "destructive",
        });
      }
    } catch (error) {
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
    // Refresh document list after update
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
  };

  // Filter documents based on search term
  const filteredDocuments = searchTerm && Array.isArray(documents)
    ? documents.filter((doc: DocumentData) =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.metadata && Object.entries(doc.metadata).some(([key, value]) => 
          key.toLowerCase().includes(searchTerm.toLowerCase()) || 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        ))
      )
    : documents;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">Document Metadata Uploader</h1>
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-sm text-gray-600">
                  Connected to AWS Account {isLoadingAwsAccount ? '...' : awsAccount.accountIdentifier}
                </span>
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {isLoadingAwsAccount ? 'Loading...' : awsAccount.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {/* User Profile with Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <motion.div 
                    className="cursor-pointer flex items-center"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Avatar className="h-8 w-8 border-2 border-primary shadow-sm">
                      <AvatarImage src="/assets/Profile.jpg" alt="User Profile" />
                      <AvatarFallback>YM</AvatarFallback>
                    </Avatar>
                    <div className="ml-2 text-sm hidden sm:block">
                      <p className="font-medium text-gray-700">Yousuf Mohammad</p>
                      <p className="text-xs text-gray-500">Administrator</p>
                    </div>
                  </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Documents</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            {/* Upload Section */}
            <div className="md:col-span-1">
              <div className="px-4 sm:px-0">
                <h2 className="text-lg font-medium text-gray-900">Upload Document</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Add files to your S3 bucket with metadata information for better organization.
                </p>
                
                <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-sm font-medium text-gray-900">Supported File Types</h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>PDF Documents (.pdf)</li>
                        <li>Word Documents (.docx, .doc)</li>
                        <li>Excel Spreadsheets (.xlsx, .xls)</li>
                        <li>PowerPoint (.pptx, .ppt)</li>
                        <li>Text Files (.txt)</li>
                        <li>Images (.jpg, .png)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-sm font-medium text-gray-900">Upload Stats</h3>
                    <div className="mt-2 max-w-xl text-sm text-gray-500">
                      {isLoadingStats ? (
                        <div className="text-center py-4">Loading stats...</div>
                      ) : (
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                          <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Total Uploads</dt>
                            <dd className="mt-1 text-sm text-gray-900">{stats?.totalUploads || 0}</dd>
                          </div>
                          <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Today</dt>
                            <dd className="mt-1 text-sm text-gray-900">{stats?.todayUploads || 0}</dd>
                          </div>
                          <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Storage Used</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {stats ? formatFileSize(stats.storageUsed) : '0 B'}
                            </dd>
                          </div>
                          <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Bucket</dt>
                            <dd className="mt-1 text-sm text-gray-900 truncate">
                              {stats?.bucketName || 'document-metadata-bucket'}
                            </dd>
                          </div>
                        </dl>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Upload Form */}
            <div className="mt-5 md:mt-0 md:col-span-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleUpload)}>
                  <div className="shadow sm:rounded-md sm:overflow-hidden">
                    <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                      {/* File Upload */}
                      <FileUpload 
                        label="Document File"
                        onFileChange={setSelectedFile}
                        error={selectedFile ? undefined : form.formState.isSubmitted ? "Please select a file" : undefined}
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
                              <Progress value={uploadProgress.percentage} className="h-2" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Document Metadata */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-4">Document Metadata</h3>
                        
                        <div className="grid grid-cols-6 gap-6">
                          <div className="col-span-6">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Document Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter document name" {...field} />
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
                                variant="outline"
                                size="sm"
                                onClick={addMetadataField}
                                className="flex items-center"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Metadata
                              </Button>
                            </div>
                            
                            {fields.length === 0 && (
                              <div className="text-sm text-gray-500 py-2 text-center border border-dashed rounded-md">
                                No metadata added. Click "Add Metadata" to add key-value pairs.
                              </div>
                            )}
                            
                            {fields.map((field, index) => {
                              // Get the current key value from the form
                              const currentKey = form.watch(`metadata.${index}.key`);
                              // Get tag colors based on the key (if it exists)
                              const { bg, text } = currentKey ? getMetadataTagColors(currentKey) : { bg: "", text: "" };
                              
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
                                                className={`${currentKey ? `border-l-4 ${bg.replace('bg-', 'border-').replace('-50', '-300')}` : ''}`}
                                              />
                                              {currentKey && (
                                                <div 
                                                  className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-2 h-2 rounded-full ${bg.replace('-50', '-300')}`}
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
                                              className={currentKey ? `border-l-4 ${bg.replace('bg-', 'border-').replace('-50', '-200')}` : ''}
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
                                          Public - Anyone with the link can access
                                        </FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                          <RadioGroupItem value="private" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                          Private - Only authenticated users can access
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

                    <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                      {form.formState.errors.root && (
                        <span className="text-sm text-error mr-4">
                          {form.formState.errors.root.message}
                        </span>
                      )}
                      <Button 
                        type="submit" 
                        disabled={isUploading}
                      >
                        {isUploading ? 'Uploading...' : 'Upload to S3'}
                      </Button>
                    </div>
                  </div>
                </form>
              </Form>
            </div>
          </div>

          {/* Documents List */}
          <div className="mt-12">
            <div className="sm:flex sm:items-center">
              <div className="sm:flex-auto">
                <h2 className="text-lg font-medium text-gray-900">Uploaded Documents</h2>
                <p className="mt-1 text-sm text-gray-500">
                  A list of all the documents you've uploaded to your S3 bucket with their metadata.
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                  <motion.div 
                    className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
                    animate={{ 
                      scale: searchTerm ? 1.2 : 1
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    <Search className={`h-5 w-5 ${searchTerm ? "text-primary" : "text-gray-400"}`} />
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
                    onClick={syncFromS3}
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
                    <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-3 text-sm text-gray-600">Loading documents...</p>
                  </div>
                </motion.div>
              ) : docsError ? (
                <motion.div 
                  className="p-6 text-center text-red-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <AlertCircle className="mx-auto h-10 w-10 mb-2" />
                  Error loading documents
                </motion.div>
              ) : Array.isArray(filteredDocuments) && filteredDocuments.length > 0 ? (
                <div className="p-4">
                  <motion.div 
                    className="w-full"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      layout: { type: "spring", bounce: 0.2, duration: 0.6 }
                    }}
                  >
                    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                      {/* Table header */}
                      <div className="bg-white border-b border-gray-200 py-3 px-4 grid grid-cols-12 gap-4 font-medium text-sm text-gray-700">
                        <div className="col-span-5">Document</div>
                        <div className="col-span-2 text-center">Type</div>
                        <div className="col-span-2 text-center">Size</div>
                        <div className="col-span-3 text-right">Actions</div>
                      </div>
                      
                      {/* Document rows */}
                      <AnimatePresence initial={false}>
                        {filteredDocuments.map((doc: DocumentData) => {
                          // Determine which icon to use based on file type
                          let IconComponent = FileText;
                          if (doc.fileType.includes('image')) IconComponent = ImageIcon;
                          if (doc.fileType.includes('sheet') || doc.fileType.includes('excel')) IconComponent = Table;
                          if (doc.fileType.includes('presentation') || doc.fileType.includes('powerpoint')) IconComponent = Presentation;
                          if (doc.fileType.includes('zip') || doc.fileType.includes('archive')) IconComponent = Archive;
                          if (doc.fileType.includes('audio')) IconComponent = Music;
                          if (doc.fileType.includes('video')) IconComponent = Video;
                          
                          // Get document color scheme based on metadata and file type
                          const colorScheme = getDocumentColorScheme(doc.metadata, doc.fileType);
                          
                          return (
                            <motion.div
                              key={doc.id}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                              transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 25
                              }}
                              className="border border-gray-200 rounded-lg mb-4 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                            >
                              {/* Main document row */}
                              <div className={`py-4 px-4 grid grid-cols-12 gap-4 items-center ${colorScheme.headerBg}`}>
                                {/* Document info column */}
                                <div className="col-span-5">
                                  <div className="flex items-center space-x-3">
                                    <div className={`flex-shrink-0 w-12 h-12 bg-white ${colorScheme.borderColor} border-2 rounded-lg flex items-center justify-center shadow-sm`}>
                                      <IconComponent className={`h-6 w-6 ${colorScheme.accentColor}`} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <h3 className="text-base font-semibold text-gray-900 truncate hover:text-clip cursor-pointer" onClick={() => handleViewInPreview(doc.id)}>
                                        {doc.name}
                                      </h3>
                                      <p className="text-xs text-gray-500 mt-1">
                                        {formatDate(doc.uploadedAt)} • {formatFileSize(doc.fileSize)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* File type column */}
                                <div className="col-span-2 text-center">
                                  <span className={`text-xs uppercase font-medium px-3 py-1.5 rounded-full ${colorScheme.headerBg} ${colorScheme.accentColor} border ${colorScheme.borderColor}`}>
                                    {doc.fileType.split('/')[1] || doc.fileType}
                                  </span>
                                </div>
                                
                                {/* Metadata count */}
                                <div className="col-span-2 text-center">
                                  {doc.metadata && Object.keys(doc.metadata).length > 0 ? (
                                    <div className="flex flex-col items-center">
                                      <span className="text-sm font-medium text-gray-700">{Object.keys(doc.metadata).length}</span>
                                      <span className="text-xs text-gray-500">metadata fields</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">No metadata</span>
                                  )}
                                </div>
                                
                                {/* Actions column */}
                                <div className="col-span-3 flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center hover:bg-white/50"
                                    onClick={() => handleViewInPreview(doc.id)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    <span>View</span>
                                  </Button>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center hover:bg-white/50"
                                    onClick={() => handleDownload(doc.id)}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    <span>Download</span>
                                  </Button>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex items-center hover:bg-white/50"
                                    onClick={() => handleEditMetadata(doc)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    <span>Edit</span>
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Metadata section - always visible */}
                              {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                  <div className="flex items-center mb-2">
                                    <ClipboardList className="h-4 w-4 text-gray-500 mr-2" />
                                    <span className="text-sm font-medium text-gray-700">Metadata</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(doc.metadata).map(([key, value], idx) => {
                                      const { bg, text } = getMetadataTagColors(key);
                                      return (
                                        <div key={idx} className="flex items-start bg-white rounded-md p-2 shadow-sm">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${bg} ${text} mr-2`}>
                                            {key}
                                          </span>
                                          <span className="text-sm text-gray-800 flex-1">
                                            {value}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      
                      {/* Empty state when filtered documents return nothing */}
                      {filteredDocuments.length === 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-12 px-4 text-center"
                        >
                          <FileQuestion className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                          <h3 className="text-sm font-medium text-gray-900 mb-1">No documents match your search</h3>
                          <p className="text-xs text-gray-500">Try adjusting your search criteria</p>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </div>
              ) : (
                <motion.div 
                  id="no-documents" 
                  className="px-4 py-6 sm:px-6 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.svg 
                    className="mx-auto h-12 w-12 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </motion.svg>
                  <motion.h3 
                    className="mt-2 text-sm font-medium text-gray-900"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    No documents
                  </motion.h3>
                  <motion.p 
                    className="mt-1 text-sm text-gray-500"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {searchTerm ? 'No documents match your search criteria.' : 'Get started by uploading your first document.'}
                  </motion.p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              <span></span>
            </div>
            <div className="text-sm text-gray-500">
              <span>Powered by AWS S3 Tables and Yousuf Mohammad</span>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreview
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          documentUrl={previewDocument.url}
          documentName={previewDocument.name}
          documentType={previewDocument.type}
          onDownload={() => handleDownload(previewDocument.id)}
        />
      )}
      
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