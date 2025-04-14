import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { uploadFileToS3 } from '@/lib/s3';
import { Button } from "@/components/ui/button";

export default function TestUpload() {
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Add log helper function
  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, message]);
  };
  
  const runTest = async () => {
    try {
      setLoading(true);
      setError(null);
      setLogs([]);
      
      // Step 1: Try to fetch the image
      addLog('Fetching image from /assets/Profile.jpg...');
      let response;
      try {
        response = await fetch('/assets/Profile.jpg');
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        addLog('Image fetched successfully');
      } catch (fetchError) {
        addLog(`Image fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        throw new Error('Failed to fetch the test image. Check file path and permissions.');
      }
      
      // Step 2: Create the File object
      const blob = await response.blob();
      const file = new File([blob], 'Profile.jpg', { type: 'image/jpeg' });
      addLog(`Created file object: size=${formatBytes(file.size)}, type=${file.type}`);
      
      // Step 3: Create test metadata with the required "UploadedBy" field
      const metadata = {
        name: "Sample Profile Image",
        metadata: [
          { key: "UploadedBy", value: "Yousuf M" }
        ],
        accessLevel: "private"
      };
      addLog('Prepared metadata with UploadedBy = "Yousuf M"');
      
      // Step 4: Set up progress callback
      const progressCallback = (progress: { percentage: number; status: string }) => {
        addLog(`Upload progress: ${progress.percentage}%, Status: ${progress.status}`);
      };
      
      // Step 5: Execute upload
      addLog('Starting upload to S3...');
      const result = await uploadFileToS3(file, metadata, progressCallback);
      
      // Step 6: Handle the result
      if (result.success) {
        addLog('Upload successful!');
        toast({
          title: "Test Upload Success",
          description: "The sample file was uploaded successfully with metadata: UploadedBy = 'Yousuf M'",
          variant: "default",
        });
      } else {
        addLog(`Upload failed: ${result.message}`);
        setError(result.message);
        toast({
          title: "Test Upload Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      addLog(`Test error: ${errorMessage}`);
      setError(errorMessage);
      toast({
        title: "Test Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to format bytes
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  return (
    <div className="p-4 bg-blue-50 rounded-md my-4">
      <h2 className="text-lg font-semibold mb-2">Test File Upload</h2>
      <p>Upload sample image with metadata: UploadedBy = "Yousuf M"</p>
      
      <div className="flex justify-start mt-3">
        <Button 
          onClick={runTest} 
          disabled={loading}
          className="mr-2"
        >
          {loading ? 'Uploading...' : 'Start Test Upload'}
        </Button>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800">
          <h3 className="text-sm font-medium">Error:</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {logs.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Upload Logs:</h3>
          <div className="bg-black text-green-400 p-3 rounded overflow-auto max-h-40 text-xs font-mono">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">
                &gt; {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}