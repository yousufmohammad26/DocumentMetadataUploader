import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { documentMetadataSchema, DocumentMetadata } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { X, Plus } from 'lucide-react';

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
    form.reset({
      name: documentName,
      metadata: documentMetadata ? metadataToArray(documentMetadata) : [],
      accessLevel: (accessLevel === 'public' || accessLevel === 'private') 
        ? accessLevel as 'public' | 'private'
        : 'private',
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
        name: documentName, // Keep original topology/name value
        metadata: filteredMetadata,
        accessLevel: data.accessLevel
      };

      // Call API to update document metadata
      const response = await apiRequest('PATCH', `/api/documents/${documentId}`, updatePayload);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update metadata');
      }

      toast({
        title: 'Success',
        description: 'Document metadata updated successfully',
        variant: 'default',
      });

      // Close the modal and trigger refresh
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating metadata:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update metadata',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Document Metadata</DialogTitle>
          <DialogDescription>
            Update the metadata for "{documentName}". Changes will be saved to the document properties.
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

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {fields.length === 0 && (
                  <div className="text-sm text-gray-500 italic text-center py-4">
                    No metadata fields. Click "Add Field" to create one.
                  </div>
                )}

                {fields.map((field, index) => {
                  // Check if this is a system field (original-filename, topology, year, month)
                  const isSystemField = field.key === 'original-filename' || field.key === 'topology' || field.key === 'year' || field.key === 'month';
                  
                  return (
                    <div key={field.id} className="flex gap-3 items-start">
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
                                  disabled={isSystemField}
                                  className={isSystemField ? "bg-gray-100 cursor-not-allowed" : ""}
                                  onChange={(e) => {
                                    // First, update the field value
                                    fieldProps.onChange(e);
                                    // Then validate if it's a reserved field name
                                    if (!isSystemField) {
                                      validateMetadataKey(e.target.value, index);
                                    }
                                  }}
                                />
                              </FormControl>
                              {isSystemField && (
                                <p className="text-xs text-blue-500 mt-1">
                                  System field (readonly)
                                </p>
                              )}
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
                                  disabled={isSystemField}
                                  className={isSystemField ? "bg-gray-100 cursor-not-allowed" : ""}
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
                        disabled={isSystemField}
                      >
                        <X className="h-4 w-4" opacity={isSystemField ? 0.5 : 1} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}