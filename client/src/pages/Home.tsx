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

import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";

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
  PieChart,
  Tag,
  Cloud,
} from "lucide-react";



export default function Home() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Use the FileUploadRef type for our ref
  const fileUploadRef = React.useRef<any>(null);
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
    console.log('handleUpload called with data:', data);
    
    if (!selectedFile) {
      console.log('No file selected');
      // Alert user to select a file but don't set form submission state
      toast({
        title: "Action Required",
        description: "Please select a file to upload",
        variant: "default",
      });
      return;
    }
    
    console.log('Selected file:', selectedFile.name, selectedFile.type, selectedFile.size);
    
    setIsUploading(true);
    setUploadProgress({ percentage: 0, status: "Starting upload..." });

    try {
      console.log('Starting file upload to S3...');
      const result = await uploadFileToS3(selectedFile, data, setUploadProgress);
      console.log('Upload complete with result:', result);

      if (result.success) {
        console.log('Upload success! Resetting form state...');
        
        try {
          // Reset form state completely, including isSubmitted flag
          form.reset();
          form.clearErrors();
          setSelectedFile(null);
          setUploadProgress(null);
          
          // Use the custom clearFile method we defined in the FileUpload component
          if (fileUploadRef.current && fileUploadRef.current.clearFile) {
            console.log('Clearing file input via ref...');
            fileUploadRef.current.clearFile();
          } else {
            console.log('Warning: fileUploadRef.current or clearFile method not available');
          }
          
          // Reset form submission state by creating a new instance
          const formState = form.formState;
          Object.defineProperty(formState, 'isSubmitted', {
            value: false,
            writable: true
          });
          console.log('Form state reset complete. Showing success toast...');
          
          // Show success toast
          toast({
            title: "Success",
            description: "Document successfully uploaded!",
            variant: "default",
          });
          
          // Refresh document list, stats and AWS account info
          console.log('Refreshing queries...');
          queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
          queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
          queryClient.invalidateQueries({ queryKey: ["/api/aws-account"] });
        } catch (resetError) {
          console.error('Error during form reset:', resetError);
        }
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in handleUpload function:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during upload",
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
  

  
  // Handle refresh for all document-related data
  const refreshData = () => {
    // Refresh all related data
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/aws-account"] });
    
    // Show toast for confirmation
    toast({
      title: "Refreshed",
      description: "Document list and stats have been refreshed",
      variant: "default",
    });
  };
  
  // Handle metadata update completion
  const handleMetadataUpdateComplete = () => {
    // Refresh all data after update
    refreshData();
  };

  // Sort documents by upload date (oldest first)
  const sortedDocuments = Array.isArray(documents) 
    ? [...documents].sort((a, b) => {
        // Convert dates to timestamps for comparison
        const dateA = new Date(a.uploadedAt).getTime();
        const dateB = new Date(b.uploadedAt).getTime();
        // Sort in ascending order (oldest first)
        return dateA - dateB;
      })
    : [];
  
  // Filter documents based on search term
  const filteredDocuments = searchTerm && Array.isArray(sortedDocuments)
    ? sortedDocuments.filter((doc: DocumentData) =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.metadata && Object.entries(doc.metadata).some(([key, value]) => 
          key.toLowerCase().includes(searchTerm.toLowerCase()) || 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        ))
      )
    : sortedDocuments;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <img src="/logo.svg" alt="Logo" className="h-10 w-10 mr-3" />
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Document Metadata Uploader</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-start px-2.5 py-1.5 rounded-md text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                <div className="flex items-center">
                  <Cloud className="h-3 w-3 mr-1 text-green-600" />
                  <span>Connected to S3 Bucket</span>
                </div>
                {stats.bucketName && (
                  <div className="text-xs text-green-700 mt-0.5">{stats.bucketName}</div>
                )}
              </div>
              
              {/* User Profile with Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="cursor-pointer flex items-center bg-white p-1.5 rounded-full shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                    <Avatar className="h-8 w-8 border border-gray-100">
                      <AvatarImage src="/Profile.jpg" alt="User Profile" />
                      <AvatarFallback>YM</AvatarFallback>
                    </Avatar>
                    <div className="ml-2 mr-2 text-sm hidden sm:block">
                      <p className="font-medium text-gray-700">Yousuf Mohammad</p>
                      <p className="text-xs text-gray-500">Administrator</p>
                    </div>
                  </div>
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
                        <h3 className="text-lg font-semibold text-gray-800">Upload New Document</h3>
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
                          
                          // If a file is selected, update the topology field with the file key format
                          if (file) {
                            const fileName = file.name;
                            // Generate a pseudo file key format (the actual UUID will be generated server-side)
                            // We'll use timestamp + filename to simulate the format
                            const timestamp = Date.now().toString(36);
                            const fileKey = `${timestamp}-${fileName}`;
                            // Set the topology field value to the file key
                            form.setValue("name", fileKey);
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
                              <Progress value={uploadProgress.percentage} className="h-2" />
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
                            <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Searchable</span>
                          </h3>
                          <p className="text-xs text-green-700 mt-1">Add custom metadata to make your document more searchable and organized</p>
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
                                    <Input placeholder="Enter topology" {...field} />
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
                <div className="bg-white shadow-md rounded-lg overflow-hidden border border-indigo-100 hover:shadow-lg transition-shadow duration-300">
                  <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-indigo-100">
                    <div className="flex items-center">
                      <div className="bg-indigo-500 rounded-full p-1 mr-2">
                        <PieChart className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">Architecture</h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <ArchitectureDiagram />
                  </div>
                </div>

                {/* Logs */}
                <div className="bg-white shadow-md rounded-lg overflow-hidden border border-emerald-100 hover:shadow-lg transition-shadow duration-300">
                  <div className="px-5 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-emerald-100">
                    <div className="flex items-center">
                      <div className="bg-emerald-500 rounded-full p-1 mr-2">
                        <ClipboardList className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">Logs</h3>
                    </div>
                  </div>
                  <div className="px-5 py-4 max-h-[400px] overflow-y-auto text-xs font-mono">
                    <div className="space-y-2">
                      {Array.isArray(documents) && documents.length > 0 ? (
                        documents.map((doc, index) => (
                          <div key={index} className="p-2.5 rounded-md border-l-3 border-green-400 bg-green-50 shadow-sm">
                            <span className="text-gray-500 font-medium">[{formatDate(doc.uploadedAt, true)}]</span>{' '}
                            <span className="text-green-600 font-semibold">Success:</span> Uploaded{' '}
                            <span className="font-bold text-gray-700">{doc.name}</span>{' '}
                            <span className="text-gray-500">({formatFileSize(doc.fileSize)})</span>
                            
                            <div className="mt-1 pl-4 text-xs text-gray-500 break-all">
                              <span className="text-gray-700 font-medium">File:</span> {doc.fileName}<br/>
                              <span className="text-gray-700 font-medium">Type:</span> {doc.fileType}<br/>
                              <span className="text-gray-700 font-medium">Key:</span> {doc.fileKey}<br/>
                              <span className="text-gray-700 font-medium">Access:</span> {doc.accessLevel}<br/>
                              {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                                <div className="mt-1">
                                  <span className="text-gray-700 font-medium">Metadata:</span>
                                  <ul className="pl-4 mt-0.5">
                                    {Object.entries(doc.metadata).map(([key, value], idx) => (
                                      <li key={idx}><span className="text-gray-600">{key}:</span> {value}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-2.5 rounded-md border-l-3 border-blue-400 bg-blue-50 shadow-sm">
                          <span className="text-gray-500 font-medium">[{new Date().toLocaleString()}]</span>{' '}
                          <span className="text-blue-600 font-semibold">Info:</span> No activity logs available.
                          <span className="block mt-1 text-gray-600">System initialized and ready for uploads.</span>
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
                  <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Uploaded Documents</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshData}
                    className="flex items-center text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    <span>Refresh</span>
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-600">
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
                  <h3 className="text-sm font-medium text-gray-900">No documents yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start by uploading a document or syncing from your S3 bucket.
                  </p>
                  <div className="mt-6">
                    <Button
                      type="button"
                      onClick={syncFromS3}
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
                    <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                          Topology
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                          Metadata
                        </th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                          Size
                        </th>

                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                          Access Level
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <AnimatePresence>
                        {filteredDocuments.map((doc: DocumentData) => {
                          // Get color scheme based on document type and metadata
                          const colorScheme = getDocumentColorScheme(doc.metadata, doc.fileType);
                          
                          return (
                            <motion.tr 
                              key={doc.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.3 }}
                              style={{ 
                                backgroundColor: 'white',
                                borderLeft: `4px solid ${colorScheme.accentColor}`
                              }}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`flex-shrink-0 h-10 w-10 rounded-md bg-${colorScheme.lightBg} flex items-center justify-center`}>
                                    <FileText className={`h-5 w-5 text-${colorScheme.accentColor}`} />
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                                    <div className="text-xs text-gray-500">{doc.fileName}</div>
                                    <div className="text-xs text-gray-400 font-mono mt-1 break-all overflow-hidden text-ellipsis" style={{maxWidth: "280px"}}>
                                      <span className="font-medium">Key:</span> {doc.fileKey}
                                    </div>
                                    <div className="flex mt-2 space-x-2">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              className="flex items-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0 h-6"
                                              onClick={() => handleViewInPreview(doc.id)}
                                            >
                                              <Eye className="h-3 w-3 mr-1" />
                                              <span className="text-xs">View</span>
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
                                              onClick={() => handleDownload(doc.id)}
                                            >
                                              <Download className="h-3 w-3 mr-1" />
                                              <span className="text-xs">Download</span>
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
                                    {doc.metadata && Object.entries(doc.metadata).map(([key, value], idx) => {
                                      const { bg, text, hoverBg } = getMetadataTagColors(key);
                                      return (
                                        <div 
                                          key={idx} 
                                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${bg} ${text} hover:${hoverBg} transition-colors cursor-default`}
                                          title={`${key}: ${value}`}
                                        >
                                          <span className="font-medium mr-1">{key}:</span>
                                          <span className="truncate max-w-[100px]">{value}</span>
                                        </div>
                                      );
                                    })}
                                    {(!doc.metadata || Object.keys(doc.metadata).length === 0) && (
                                      <span className="text-xs text-gray-400 italic">No metadata</span>
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
                                            onClick={() => handleEditMetadata(doc)}
                                          >
                                            <Edit className="h-3 w-3 mr-1" />
                                            <span className="text-xs">Edit</span>
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
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  doc.accessLevel === 'public' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {doc.accessLevel}
                                </span>
                              </td>

                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-indigo-100 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0 flex items-center">
              <img src="/logo.svg" alt="Logo" className="h-8 w-8 mr-2 hidden md:block" />
              <div>
                <h3 className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Document Metadata Manager</h3>
                <p className="text-sm text-gray-600 mt-1">© Powered by AWS S3 Tables and Yousuf Mohammad</p>
              </div>
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