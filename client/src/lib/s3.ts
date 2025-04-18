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
    // Debug logging
    console.log('uploadFileToS3 called with file:', file.name, file.type, file.size);
    console.log('metadata being sent:', JSON.stringify(metadata));
    
    // Use the server-side upload endpoint to bypass CORS restrictions
    onProgress({ percentage: 10, status: 'Preparing upload...' });
    
    // Create a FormData object to send the file and metadata
    const formData = new FormData();
    formData.append('file', file);
    
    // Log what we're sending - now using "topology" as the form field name to match server-side logic
    console.log('Uploading file with metadata:', metadata);
    
    // Change the field from "name" to "topology" to match the server-side expectation
    formData.append('topology', metadata.name || '');
    formData.append('accessLevel', metadata.accessLevel || 'private');
    
    // Add metadata as JSON string
    if (metadata.metadata && Array.isArray(metadata.metadata)) {
      console.log('Adding metadata array:', JSON.stringify(metadata.metadata));
      formData.append('metadata', JSON.stringify(metadata.metadata));
    }
    
    // Use XMLHttpRequest for upload progress tracking
    const xhr = new XMLHttpRequest();
    
    console.log('Setting up XHR request and response handling...');
    try {
      await new Promise<void>((resolve, reject) => {
        console.log('Inside promise executor...');
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            // Calculate progress between 20% and 90%
            const percentage = 10 + (event.loaded / event.total) * 80;
            onProgress({ 
              percentage: Math.round(percentage), 
              status: 'Uploading to server...' 
            });
          }
        });
        
        xhr.addEventListener('load', () => {
          console.log('XHR load event fired');
          console.log('XHR response status:', xhr.status);
          console.log('XHR response headers:', xhr.getAllResponseHeaders());
          console.log('XHR response text:', xhr.responseText);
          
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Server response parsed successfully:', response);
              
              if (response.success) {
                console.log('Upload success flag received, resolving promise');
                resolve();
              } else {
                console.error('Server returned success:false flag with message:', response.message);
                reject(new Error(response.message || 'Upload failed'));
              }
            } catch (e) {
              console.error('Failed to parse server response as JSON:', e);
              console.error('Raw response text:', xhr.responseText);
              reject(new Error('Invalid server response - could not parse JSON'));
            }
          } else {
            console.error('HTTP error status:', xhr.status, xhr.statusText);
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              console.error('Error response details:', errorResponse);
              reject(new Error(errorResponse.message || `Upload failed with status ${xhr.status}`));
            } catch (e) {
              console.error('Error response not JSON parseable:', e);
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });
        
        xhr.addEventListener('error', (e) => {
          console.error('XHR network error event:', e);
          reject(new Error('Upload failed due to network error'));
        });
        
        xhr.addEventListener('abort', () => {
          console.warn('XHR abort event received');
          reject(new Error('Upload aborted'));
        });
        
        // Actually send the request
        console.log('Opening XHR connection...');
        xhr.open('POST', '/api/documents/upload');
        console.log('Sending form data...');
        xhr.send(formData);
        console.log('XHR request sent');
      });
      
      console.log('Promise resolved successfully');
      onProgress({ percentage: 100, status: 'Complete' });
      
      // Successfully completed
      console.log('Returning success result');
      return {
        success: true,
        message: 'Document successfully uploaded!'
      };
    } catch (xhrError) {
      console.error('Promise rejection caught:', xhrError);
      throw xhrError; // Re-throw to be caught by the outer try/catch
    }
  } catch (error) {
    console.error('Upload function error:', error);
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

export function formatDate(dateString: string | Date, includeTime: boolean = false): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (includeTime) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
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

export function getDocumentThumbnail(fileType: string): { 
  icon: string, 
  color: string,
  extension: string,
  bgColor: string,
  iconColor: string
} {
  // Default
  let result = { 
    icon: "file-text", 
    color: "blue",
    extension: "DOC",
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600"
  };
  
  // PDF
  if (fileType.includes('pdf')) {
    return { 
      icon: "file-text", 
      color: "red",
      extension: "PDF",
      bgColor: "bg-red-50",
      iconColor: "text-red-600"
    };
  }
  
  // Images
  if (fileType.includes('image')) {
    let extension = "IMG";
    if (fileType.includes('png')) extension = "PNG";
    if (fileType.includes('jpg') || fileType.includes('jpeg')) extension = "JPG";
    if (fileType.includes('gif')) extension = "GIF";
    if (fileType.includes('svg')) extension = "SVG";
    
    return { 
      icon: "image", 
      color: "emerald",
      extension: extension,
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600"
    };
  }
  
  // Word documents
  if (fileType.includes('word') || fileType.includes('doc')) {
    return { 
      icon: "file-text", 
      color: "blue",
      extension: "DOC",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600"
    };
  }
  
  // Excel
  if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('xls')) {
    return { 
      icon: "table", 
      color: "green",
      extension: "XLS",
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    };
  }
  
  // PowerPoint
  if (fileType.includes('powerpoint') || fileType.includes('presentation') || fileType.includes('ppt')) {
    return { 
      icon: "presentation", 
      color: "orange",
      extension: "PPT",
      bgColor: "bg-orange-50",
      iconColor: "text-orange-600"
    };
  }
  
  // Text
  if (fileType.includes('text') || fileType.includes('txt')) {
    return { 
      icon: "file-text", 
      color: "gray",
      extension: "TXT",
      bgColor: "bg-gray-50",
      iconColor: "text-gray-600"
    };
  }
  
  // ZIP/Archives
  if (fileType.includes('zip') || fileType.includes('archive') || fileType.includes('compressed')) {
    return { 
      icon: "archive", 
      color: "purple",
      extension: "ZIP",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
    };
  }
  
  return result;
}

export function getMetadataTagColors(key: string): { bg: string, text: string, hoverBg: string } {
  // Convert key to lowercase for consistent matching
  const lowerKey = key.toLowerCase();
  
  // Common metadata categories with assigned colors
  if (lowerKey.includes('date') || lowerKey.includes('time') || lowerKey.includes('created') || lowerKey.includes('modified')) {
    return { bg: "bg-purple-50", text: "text-purple-800", hoverBg: "#f3e8ff" }; // Purple for dates/times
  } else if (lowerKey.includes('author') || lowerKey.includes('creator') || lowerKey.includes('owner') || lowerKey.includes('user')) {
    return { bg: "bg-green-50", text: "text-green-800", hoverBg: "#dcfce7" }; // Green for author/user info
  } else if (lowerKey.includes('category') || lowerKey.includes('type') || lowerKey.includes('group')) {
    return { bg: "bg-yellow-50", text: "text-yellow-800", hoverBg: "#fef9c3" }; // Yellow for categories
  } else if (lowerKey.includes('status') || lowerKey.includes('state') || lowerKey.includes('priority')) {
    return { bg: "bg-red-50", text: "text-red-800", hoverBg: "#fee2e2" }; // Red for status/priority
  } else if (lowerKey.includes('version') || lowerKey.includes('revision')) {
    return { bg: "bg-sky-50", text: "text-sky-800", hoverBg: "#e0f2fe" }; // Sky blue for versions
  } else if (lowerKey.includes('tag') || lowerKey.includes('label')) {
    return { bg: "bg-orange-50", text: "text-orange-800", hoverBg: "#ffedd5" }; // Orange for tags/labels
  } else if (lowerKey.includes('department') || lowerKey.includes('team') || lowerKey.includes('division')) {
    return { bg: "bg-indigo-50", text: "text-indigo-800", hoverBg: "#e0e7ff" }; // Indigo for organizational units
  } else if (lowerKey.includes('location') || lowerKey.includes('place') || lowerKey.includes('geo')) {
    return { bg: "bg-emerald-50", text: "text-emerald-800", hoverBg: "#d1fae5" }; // Emerald for locations
  } else {
    // Generate a color based on the first character of the key for consistent coloring
    const colors = [
      { bg: "bg-blue-50", text: "text-blue-800", hoverBg: "#dbeafe" },
      { bg: "bg-green-50", text: "text-green-800", hoverBg: "#dcfce7" },
      { bg: "bg-yellow-50", text: "text-yellow-800", hoverBg: "#fef9c3" },
      { bg: "bg-red-50", text: "text-red-800", hoverBg: "#fee2e2" },
      { bg: "bg-purple-50", text: "text-purple-800", hoverBg: "#f3e8ff" },
      { bg: "bg-pink-50", text: "text-pink-800", hoverBg: "#fce7f3" },
      { bg: "bg-indigo-50", text: "text-indigo-800", hoverBg: "#e0e7ff" },
      { bg: "bg-cyan-50", text: "text-cyan-800", hoverBg: "#cffafe" },
    ];
    
    const index = Math.abs(key.charCodeAt(0)) % colors.length;
    return colors[index];
  }
}
