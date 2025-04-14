import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DocumentMetadata, documentMetadataSchema, MetadataKeyValue } from "@shared/schema";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadFileToS3, formatFileSize, formatDate, UploadProgress } from "@/lib/s3";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  FileText,
  Search,
  Download,
  Edit,
  Trash2,
  Info,
  Plus,
  X,
  Eye,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Home() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);

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

  // Query for retrieving documents
  const {
    data: documents = [],
    isLoading: isLoadingDocs,
    error: docsError,
  } = useQuery({
    queryKey: ["/api/documents"],
  });

  // Query for stats
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ["/api/stats"],
  });

  // Mutation for deleting documents
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      // Invalidate documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Document successfully deleted",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  // Download document
  const handleDownload = async (id: number) => {
    try {
      const response = await apiRequest("GET", `/api/documents/${id}/download`);
      const { presignedUrl } = await response.json();
      
      // Open the URL in a new tab
      window.open(presignedUrl, "_blank");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download document",
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
        
        // Show success toast
        toast({
          title: "Success",
          description: "Document successfully uploaded!",
          variant: "default",
        });
        
        // Refresh document list and stats
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
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

  // Add a new empty metadata field
  const addMetadataField = () => {
    append({ key: "", value: "" });
  };

  // Filter documents based on search term
  const filteredDocuments = searchTerm && Array.isArray(documents)
    ? documents.filter((doc: any) =>
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
            <h1 className="text-xl font-semibold text-gray-800">DocumentMetadata</h1>
            <div>
              <span className="text-sm text-gray-600">Connected to AWS S3</span>
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
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
                            
                            {fields.map((field, index) => (
                              <div key={field.id} className="flex items-start space-x-2 mb-2">
                                <div className="flex-1">
                                  <FormField
                                    control={form.control}
                                    name={`metadata.${index}.key`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input placeholder="Key" {...field} />
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
                                          <Input placeholder="Value" {...field} />
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
                              </div>
                            ))}
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
              <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                <div className="relative rounded-md shadow-sm">
                  <Input
                    type="text"
                    placeholder="Search documents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
              {isLoadingDocs ? (
                <div className="p-6 text-center">Loading documents...</div>
              ) : docsError ? (
                <div className="p-6 text-center text-red-500">Error loading documents</div>
              ) : Array.isArray(filteredDocuments) && filteredDocuments.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {filteredDocuments.map((doc: any) => (
                    <li key={doc.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-md bg-blue-100 text-primary">
                              <FileText className="h-6 w-6" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-primary-dark">{doc.fileName}</div>
                              <div className="text-sm text-gray-500">
                                {formatFileSize(doc.fileSize)} • Uploaded on {formatDate(doc.uploadedAt)}
                              </div>
                            </div>
                          </div>
                          <div>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${doc.accessLevel === 'public' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {doc.accessLevel}
                            </span>
                          </div>
                        </div>
                        
                        {/* Display metadata key-value pairs */}
                        {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                          <div className="mt-2">
                            <h4 className="text-xs font-medium text-gray-500 mb-1">Metadata:</h4>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(doc.metadata).map(([key, value], idx) => (
                                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-800">
                                  {key}: {String(value)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 flex">
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-primary hover:text-primary-dark"
                            onClick={() => handleDownload(doc.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                          <Separator orientation="vertical" className="mx-2 h-4 self-center" />
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-primary hover:text-primary-dark"
                            onClick={() => handleDownload(doc.id)}
                          >
                            <Download className="h-4 w-4 mr-1" /> Download
                          </Button>
                          <Separator orientation="vertical" className="mx-2 h-4 self-center" />
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-primary hover:text-primary-dark"
                          >
                            <Edit className="h-4 w-4 mr-1" /> Edit Metadata
                          </Button>
                          <Separator orientation="vertical" className="mx-2 h-4 self-center" />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the document
                                  and remove the data from the server.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(doc.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div id="no-documents" className="px-4 py-6 sm:px-6 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'No documents match your search criteria.' : 'Get started by uploading your first document.'}
                  </p>
                </div>
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
              &copy; {new Date().getFullYear()} DocumentMetadata App
            </div>
            <div className="text-sm text-gray-500">
              <span>Powered by AWS S3</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}