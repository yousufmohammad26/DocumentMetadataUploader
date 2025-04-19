import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { documentMetadataSchema, DocumentMetadata } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { X, Plus, Tag, Lock, FileText, FolderTree, Calendar, CalendarDays, RotateCw, Check, Eye } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface EditMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  documentName: string;
  documentMetadata: Record<string, string>;
  accessLevel: string;
  onUpdate: () => void;
}

export function EditMetadataModal({
  isOpen,
  onClose,
  documentId,
  documentName,
  documentMetadata,
  accessLevel,
  onUpdate
}: EditMetadataModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convert record to array of key-value pairs
  const metadataToArray = (metadata: Record<string, string>) => {
    return Object.entries(metadata).map(([key, value]) => ({
      key,
      value: String(value),
      isSystemField: key === 'original-filename' || key === 'topology'
    }));
  };

  // Form for metadata
  const form = useForm<DocumentMetadata>({
    resolver: zodResolver(documentMetadataSchema),
    defaultValues: {
      name: documentName,
      metadata: documentMetadata ? metadataToArray(documentMetadata) : [],
      accessLevel: (accessLevel === 'public' || accessLevel === 'private') 
        ? accessLevel as 'public' | 'private'
        : 'private',
    },
  });

  // Update form values when props change
  useEffect(() => {
    const defaultValues = {
      name: documentName,
      metadata: documentMetadata ? metadataToArray(documentMetadata) : [],
      accessLevel: (accessLevel === 'public' || accessLevel === 'private') 
        ? accessLevel as 'public' | 'private'
        : 'private',
    };

    form.reset(defaultValues, {
      keepDefaultValues: true,
      keepIsSubmitted: false,
    });
  }, [documentName, documentMetadata, accessLevel, form]);

  // Set up field array for dynamic metadata key-value pairs
  const { fields, append, remove } = useFieldArray({
    name: "metadata",
    control: form.control,
  });

  // Add a new empty metadata field
  const addMetadataField = () => {
    append({ key: "", value: "" });
  };

  // Validate that metadata keys don't use reserved names
  const validateMetadataKey = (key: string, index: number) => {
    const reservedKeys = ['original-filename', 'topology', 'year', 'month'];
    const lowercaseKey = key.toLowerCase().trim();

    if (reservedKeys.includes(lowercaseKey)) {
      form.setError(`metadata.${index}.key`, { 
        type: 'manual', 
        message: 'This is a reserved system field name and cannot be used' 
      });
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async (data: DocumentMetadata) => {
    if (isSubmitting || !documentId) return; // Prevent double submission and handle missing documentId
    setIsSubmitting(true);

    try {
      // Check if any metadata keys use reserved names
      const reservedKeys = ['original-filename', 'topology', 'year', 'month'];
      let hasReservedKeys = false;

      // Validate each non-system metadata field
      data.metadata.forEach((item, index) => {
        // Skip validation for existing system fields
        if (item.key === 'original-filename' || item.key === 'topology' || item.key === 'year' || item.key === 'month') {
          return;
        }

        // Check if user is trying to add a reserved key
        const lowercaseKey = item.key.toLowerCase().trim();
        if (reservedKeys.includes(lowercaseKey)) {
          form.setError(`metadata.${index}.key`, { 
            type: 'manual', 
            message: 'This is a reserved system field name and cannot be used' 
          });
          hasReservedKeys = true;
        }
      });

      // If reserved keys were found, stop the submission
      if (hasReservedKeys) {
        toast({
          title: "Validation Error",
          description: "Please remove or rename the reserved metadata keys",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Get and identify all fields including system fields
      const filteredMetadata = data.metadata.filter(item => {
        // Keep all system fields and valid user fields (those with non-empty keys)
        return (
          item.key === 'original-filename' || 
          item.key === 'topology' || 
          item.key === 'year' ||
          item.key === 'month' ||
          (item.key.trim() !== "")
        );
      });

      // Prepare update payload - keep metadata as array for server
      // Since we removed the topology field from the UI, we'll use the existing document name
      const updatePayload = {
        name: data.name, //Use the updated name from the form
        metadata: filteredMetadata,
        accessLevel: data.accessLevel
      };

      // Call API to update document metadata
      const response = await apiRequest('PUT', `/api/documents/${documentId}/metadata`, updatePayload);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update metadata');
      }

      toast({
        title: 'Changes Saved',
        description: 'Document metadata has been successfully updated',
        variant: 'default',
        duration: 3000,
      });

      // Close the modal and trigger refresh
      await queryClient.invalidateQueries(['documents']);
      onUpdate();
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error updating metadata:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error 
          ? `Failed to save changes: ${error.message}`
          : 'Failed to update document metadata. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby="edit-metadata-description" aria-labelledby="edit-metadata-title" className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle id="edit-metadata-title">Edit Document Metadata</DialogTitle>
          <DialogDescription id="edit-metadata-description">
            Make changes to document metadata and access level.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-2">

            {/* Access Level */}
            <FormField
              control={form.control}
              name="accessLevel"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Access Level</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="public" id="public" />
                        <FormLabel htmlFor="public" className="font-normal cursor-pointer">
                          Public - Accessible to anyone with the link
                        </FormLabel>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="private" id="private" />
                        <FormLabel htmlFor="private" className="font-normal cursor-pointer">
                          Private - Only accessible with proper authentication
                        </FormLabel>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Metadata Key-Value Pairs */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FormLabel className="text-base">Metadata</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMetadataField}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Field
                </Button>
              </div>

              <div className="space-y-6 pr-2">
                {/* Fields Section */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-blue-700 flex items-center border-b pb-1 border-blue-100">
                    <Lock className="h-3.5 w-3.5 mr-1.5" />
                    Fields
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mt-3">
                    {fields.filter(field => 
                      field.key === 'original-filename' || 
                      field.key === 'topology' || 
                      field.key === 'year' || 
                      field.key === 'month'
                    ).map((field, i) => {
                      // Get label and color based on key
                      let bgColor;
                      let textColor;
                      let Icon;

                      switch(field.key) {
                        case 'original-filename':
                          bgColor = 'bg-blue-100';
                          textColor = 'text-blue-800';
                          Icon = FileText;
                          break;
                        case 'topology':
                          bgColor = 'bg-purple-100';
                          textColor = 'text-purple-800';
                          Icon = FolderTree;
                          break;
                        case 'year':
                          bgColor = 'bg-green-100';
                          textColor = 'text-green-800';
                          Icon = Calendar;
                          break;
                        case 'month':
                          bgColor = 'bg-amber-100';
                          textColor = 'text-amber-800';
                          Icon = CalendarDays;
                          break;
                        default:
                          bgColor = 'bg-gray-100';
                          textColor = 'text-gray-800';
                          Icon = Tag;
                      }

                      return (
                        <div key={field.id} className="flex flex-col p-2 rounded-md border border-blue-50">
                          <div className={`px-2.5 py-1 rounded-md font-medium text-xs ${bgColor} ${textColor} mb-1.5 inline-flex items-center self-start`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {field.key}
                          </div>
                          <div className="text-sm text-gray-700 font-medium break-all">{field.value}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* User Defined Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-1 border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 flex items-center">
                      <Tag className="h-3.5 w-3.5 mr-1.5" />
                      User Defined
                    </h3>
                  </div>

                  {fields.filter(field => 
                    field.key !== 'original-filename' && 
                    field.key !== 'topology' && 
                    field.key !== 'year' && 
                    field.key !== 'month'
                  ).length === 0 ? (
                    <div className="text-sm text-gray-500 italic text-center py-4 border border-dashed rounded-md">
                      No custom fields added. Click "Add Field" to create one.
                    </div>
                  ) : (
                    fields.filter(field => 
                      field.key !== 'original-filename' && 
                      field.key !== 'topology' && 
                      field.key !== 'year' && 
                      field.key !== 'month'
                    ).map((field) => {
                      // Find the actual index in the fields array
                      const index = fields.findIndex(f => f.id === field.id);

                      return (
                        <div key={field.id} className="flex gap-3 items-start border border-gray-100 p-2 rounded-md hover:bg-gray-50 transition-colors">
                          <div className="grid grid-cols-2 gap-3 flex-grow">
                            <FormField
                              control={form.control}
                              name={`metadata.${index}.key`}
                              render={({ field: fieldProps }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      {...fieldProps} 
                                      placeholder="Key" 
                                      onChange={(e) => {
                                        // First, update the field value
                                        fieldProps.onChange(e);
                                        // Then validate if it's a reserved field name
                                        validateMetadataKey(e.target.value, index);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`metadata.${index}.value`}
                              render={({ field: fieldProps }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input 
                                      {...fieldProps} 
                                      placeholder="Value" 
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
                            size="icon"
                            onClick={() => remove(index)}
                            className="h-10 w-10 rounded-full"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className={`bg-primary hover:bg-primary/90 text-white ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}