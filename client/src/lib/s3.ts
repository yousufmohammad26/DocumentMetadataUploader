import { apiRequest } from "./queryClient";

export const ALLOWED_FILE_TYPES = [
  'application/pdf', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'image/jpeg',
  'image/png'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const FILE_TYPE_NAMES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'text/plain': 'Text',
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image'
};

export interface UploadProgress {
  percentage: number;
  status: string;
}

export interface UploadResult {
  success: boolean;
  message: string;
  document?: any;
}

export async function uploadFileToS3(
  file: File, 
  metadata: any, 
  onProgress: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Step 1: Get presigned URL
    onProgress({ percentage: 10, status: 'Getting upload URL...' });
    
    const presignedUrlResponse = await apiRequest('POST', '/api/documents/presigned-url', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
    
    const { presignedUrl, fileKey } = await presignedUrlResponse.json();
    
    // Step 2: Upload file directly to S3 with presigned URL
    onProgress({ percentage: 20, status: 'Uploading to S3...' });
    
    const xhr = new XMLHttpRequest();
    
    await new Promise<void>((resolve, reject) => {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          // Calculate progress between 20% and 80%
          const percentage = 20 + (event.loaded / event.total) * 60;
          onProgress({ 
            percentage: Math.round(percentage), 
            status: 'Uploading to S3...' 
          });
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed due to network error'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });
      
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
    
    // Step 3: Save metadata
    onProgress({ percentage: 85, status: 'Saving metadata...' });
    
    // Convert metadata array to object
    const metadataObject = {};
    if (metadata.metadata && Array.isArray(metadata.metadata)) {
      metadata.metadata.forEach((item: { key: string; value: string }) => {
        if (item.key && item.value) {
          metadataObject[item.key] = item.value;
        }
      });
    }
    
    const documentData = {
      name: metadata.name,
      fileName: file.name,
      fileKey,
      fileSize: file.size,
      fileType: file.type,
      metadata: metadataObject,
      accessLevel: metadata.accessLevel || 'private',
    };
    
    const saveMetadataResponse = await apiRequest('POST', '/api/documents', documentData);
    const document = await saveMetadataResponse.json();
    
    onProgress({ percentage: 100, status: 'Complete' });
    
    return {
      success: true,
      message: 'Document successfully uploaded!',
      document
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function getCategoryColor(category: string): string {
  const categoryColors: Record<string, string> = {
    financial: 'bg-green-100 text-green-800',
    legal: 'bg-purple-100 text-purple-800',
    hr: 'bg-purple-100 text-purple-800',
    marketing: 'bg-yellow-100 text-yellow-800',
    technical: 'bg-blue-100 text-blue-800',
    other: 'bg-gray-100 text-gray-800'
  };
  
  return categoryColors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
}
