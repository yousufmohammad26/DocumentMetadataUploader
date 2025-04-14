import React, { useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { uploadFileToS3 } from '@/lib/s3';

export default function TestUpload() {
  const { toast } = useToast();
  
  useEffect(() => {
    async function runTest() {
      try {
        // Create a sample file from the provided image
        const response = await fetch('/assets/Profile.jpg');
        const blob = await response.blob();
        const file = new File([blob], 'Profile.jpg', { type: 'image/jpeg' });
        
        // Create test metadata with the required "UploadedBy" field
        const metadata = {
          name: "Sample Profile Image",
          metadata: [
            { key: "UploadedBy", value: "Yousuf M" }
          ],
          accessLevel: "private"
        };
        
        // Progress callback
        const progressCallback = (progress: { percentage: number; status: string }) => {
          console.log(`Upload progress: ${progress.percentage}%, Status: ${progress.status}`);
        };
        
        // Execute upload
        console.log('Starting test upload...');
        const result = await uploadFileToS3(file, metadata, progressCallback);
        
        // Display result
        if (result.success) {
          toast({
            title: "Test Upload Success",
            description: "The sample file was uploaded successfully with metadata: UploadedBy = 'Yousuf M'",
            variant: "default",
          });
          console.log('Upload successful!', result);
        } else {
          toast({
            title: "Test Upload Failed",
            description: result.message,
            variant: "destructive",
          });
          console.error('Upload failed:', result.message);
        }
      } catch (error) {
        console.error('Test error:', error);
        toast({
          title: "Test Error",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
      }
    }
    
    // Set a short timeout to ensure the component is mounted
    const timer = setTimeout(() => {
      runTest();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [toast]);
  
  return (
    <div className="p-4 bg-blue-50 rounded-md my-4">
      <h2 className="text-lg font-semibold mb-2">Testing File Upload</h2>
      <p>Attempting to upload sample image with metadata: UploadedBy = "Yousuf M"</p>
      <p className="text-sm text-gray-500 mt-2">Check the browser console and toast notifications for results</p>
    </div>
  );
}