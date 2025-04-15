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
      value: String(value)
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

  // Handle form submission
  const handleSubmit = async (data: DocumentMetadata) => {
    setIsSubmitting(true);
    
    try {
      // Prepare update payload - keep metadata as array for server
      // The server will handle the conversion to object format
      const updatePayload = {
        name: data.name,
        metadata: data.metadata.filter(item => item.key.trim() !== ""), // Remove empty keys
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
          <DialogTitle>Edit Topology Metadata</DialogTitle>
          <DialogDescription>
            Update the metadata for "{documentName}". Changes will be saved to the topology properties.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-2">
            {/* Topology */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topology</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-start">
                    <div className="grid grid-cols-2 gap-3 flex-grow">
                      <FormField
                        control={form.control}
                        name={`metadata.${index}.key`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Key" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`metadata.${index}.value`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Value" />
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
                ))}
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