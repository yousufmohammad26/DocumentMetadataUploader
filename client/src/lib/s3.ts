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
    // Use the server-side upload endpoint to bypass CORS restrictions
    onProgress({ percentage: 10, status: 'Preparing upload...' });
    
    // Create a FormData object to send the file and metadata
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', metadata.name || '');
    formData.append('accessLevel', metadata.accessLevel || 'private');
    
    // Add metadata as JSON string
    if (metadata.metadata && Array.isArray(metadata.metadata)) {
      formData.append('metadata', JSON.stringify(metadata.metadata));
    }
    
    // Use XMLHttpRequest for upload progress tracking
    const xhr = new XMLHttpRequest();
    
    await new Promise<void>((resolve, reject) => {
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
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              resolve();
            } else {
              reject(new Error(response.message || 'Upload failed'));
            }
          } catch (e) {
            reject(new Error('Invalid server response'));
          }
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
      
      xhr.open('POST', '/api/documents/upload');
      xhr.send(formData);
    });
    
    onProgress({ percentage: 100, status: 'Complete' });
    
    // Refresh document list
    return {
      success: true,
      message: 'Document successfully uploaded!'
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
