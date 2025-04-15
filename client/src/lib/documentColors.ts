// Color scheme for document cards based on metadata content
export interface DocumentColorScheme {
  headerBg: string;
  borderColor: string;
  accentColor: string;
  hoverBg: string;
  lightBg: string;
}

// Different color palettes based on file types
export const fileTypeColorSchemes: Record<string, DocumentColorScheme> = {
  // Document types (PDF, DOC, TXT, etc.)
  document: {
    headerBg: "bg-blue-100",
    borderColor: "border-blue-300",
    accentColor: "text-blue-700",
    hoverBg: "hover:bg-blue-50",
    lightBg: "bg-blue-50"
  },
  
  // Image types (JPG, PNG, GIF, etc.)
  image: {
    headerBg: "bg-purple-100",
    borderColor: "border-purple-300",
    accentColor: "text-purple-700",
    hoverBg: "hover:bg-purple-50",
    lightBg: "bg-purple-50"
  },
  
  // Spreadsheet types (XLS, CSV, etc.)
  spreadsheet: {
    headerBg: "bg-green-100",
    borderColor: "border-green-300",
    accentColor: "text-green-700",
    hoverBg: "hover:bg-green-50",
    lightBg: "bg-green-50"
  },
  
  // Presentation types (PPT, etc.)
  presentation: {
    headerBg: "bg-orange-100",
    borderColor: "border-orange-300",
    accentColor: "text-orange-700",
    hoverBg: "hover:bg-orange-50",
    lightBg: "bg-orange-50"
  },
  
  // Archive types (ZIP, RAR, etc.)
  archive: {
    headerBg: "bg-amber-100",
    borderColor: "border-amber-300",
    accentColor: "text-amber-700",
    hoverBg: "hover:bg-amber-50",
    lightBg: "bg-amber-50"
  },
  
  // Audio types (MP3, WAV, etc.)
  audio: {
    headerBg: "bg-pink-100",
    borderColor: "border-pink-300",
    accentColor: "text-pink-700",
    hoverBg: "hover:bg-pink-50",
    lightBg: "bg-pink-50"
  },
  
  // Video types (MP4, MOV, etc.)
  video: {
    headerBg: "bg-red-100",
    borderColor: "border-red-300",
    accentColor: "text-red-700",
    hoverBg: "hover:bg-red-50",
    lightBg: "bg-red-50"
  },
  
  // Code types (JS, PY, etc.)
  code: {
    headerBg: "bg-emerald-100",
    borderColor: "border-emerald-300",
    accentColor: "text-emerald-700",
    hoverBg: "hover:bg-emerald-50",
    lightBg: "bg-emerald-50"
  },
  
  // Default type
  default: {
    headerBg: "bg-slate-100",
    borderColor: "border-slate-300",
    accentColor: "text-slate-700",
    hoverBg: "hover:bg-slate-50",
    lightBg: "bg-slate-50"
  }
};

// Get color scheme based on file type
export function getFileTypeColorScheme(fileType: string): DocumentColorScheme {
  // Determine file category from mime type
  if (fileType.includes('pdf') || fileType.includes('word') || fileType.includes('text') || fileType.includes('document')) {
    return fileTypeColorSchemes.document;
  } else if (fileType.includes('image')) {
    return fileTypeColorSchemes.image;
  } else if (fileType.includes('excel') || fileType.includes('spreadsheet') || fileType.includes('csv')) {
    return fileTypeColorSchemes.spreadsheet;
  } else if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
    return fileTypeColorSchemes.presentation;
  } else if (fileType.includes('zip') || fileType.includes('archive') || fileType.includes('rar') || fileType.includes('gzip')) {
    return fileTypeColorSchemes.archive;
  } else if (fileType.includes('audio')) {
    return fileTypeColorSchemes.audio;
  } else if (fileType.includes('video')) {
    return fileTypeColorSchemes.video;
  } else if (fileType.includes('code') || fileType.includes('javascript') || fileType.includes('python') || fileType.includes('html')) {
    return fileTypeColorSchemes.code;
  }
  
  return fileTypeColorSchemes.default;
}

export function getDocumentColorScheme(metadata: Record<string, string> | undefined | null, fileType: string = ''): DocumentColorScheme {
  // Default to file type based color scheme
  const fileTypeScheme = getFileTypeColorScheme(fileType);
  
  if (!metadata || Object.keys(metadata).length === 0) {
    return fileTypeScheme;
  }
  
  // Priority metadata keys that influence document color
  const priorityKeys = [
    { key: 'category', scheme: { headerBg: "bg-yellow-100", borderColor: "border-yellow-300", accentColor: "text-yellow-700", hoverBg: "hover:bg-yellow-50", lightBg: "bg-yellow-50" } },
    { key: 'department', scheme: { headerBg: "bg-indigo-100", borderColor: "border-indigo-300", accentColor: "text-indigo-700", hoverBg: "hover:bg-indigo-50", lightBg: "bg-indigo-50" } },
    { key: 'status', scheme: { headerBg: "bg-red-100", borderColor: "border-red-300", accentColor: "text-red-700", hoverBg: "hover:bg-red-50", lightBg: "bg-red-50" } },
    { key: 'priority', scheme: { headerBg: "bg-orange-100", borderColor: "border-orange-300", accentColor: "text-orange-700", hoverBg: "hover:bg-orange-50", lightBg: "bg-orange-50" } },
    { key: 'type', scheme: { headerBg: "bg-blue-100", borderColor: "border-blue-300", accentColor: "text-blue-700", hoverBg: "hover:bg-blue-50", lightBg: "bg-blue-50" } },
    { key: 'project', scheme: { headerBg: "bg-emerald-100", borderColor: "border-emerald-300", accentColor: "text-emerald-700", hoverBg: "hover:bg-emerald-50", lightBg: "bg-emerald-50" } },
    { key: 'author', scheme: { headerBg: "bg-purple-100", borderColor: "border-purple-300", accentColor: "text-purple-700", hoverBg: "hover:bg-purple-50", lightBg: "bg-purple-50" } },
    { key: 'client', scheme: { headerBg: "bg-sky-100", borderColor: "border-sky-300", accentColor: "text-sky-700", hoverBg: "hover:bg-sky-50", lightBg: "bg-sky-50" } },
  ];
  
  // Values that strongly influence color regardless of key
  const priorityValues: Record<string, DocumentColorScheme> = {
    'urgent': { headerBg: "bg-red-100", borderColor: "border-red-300", accentColor: "text-red-700", hoverBg: "hover:bg-red-50", lightBg: "bg-red-50" },
    'high': { headerBg: "bg-orange-100", borderColor: "border-orange-300", accentColor: "text-orange-700", hoverBg: "hover:bg-orange-50", lightBg: "bg-orange-50" },
    'medium': { headerBg: "bg-yellow-100", borderColor: "border-yellow-300", accentColor: "text-yellow-700", hoverBg: "hover:bg-yellow-50", lightBg: "bg-yellow-50" },
    'low': { headerBg: "bg-green-100", borderColor: "border-green-300", accentColor: "text-green-700", hoverBg: "hover:bg-green-50", lightBg: "bg-green-50" },
    'completed': { headerBg: "bg-green-100", borderColor: "border-green-300", accentColor: "text-green-700", hoverBg: "hover:bg-green-50", lightBg: "bg-green-50" },
    'in progress': { headerBg: "bg-blue-100", borderColor: "border-blue-300", accentColor: "text-blue-700", hoverBg: "hover:bg-blue-50", lightBg: "bg-blue-50" },
    'pending': { headerBg: "bg-yellow-100", borderColor: "border-yellow-300", accentColor: "text-yellow-700", hoverBg: "hover:bg-yellow-50", lightBg: "bg-yellow-50" },
    'approved': { headerBg: "bg-green-100", borderColor: "border-green-300", accentColor: "text-green-700", hoverBg: "hover:bg-green-50", lightBg: "bg-green-50" },
    'rejected': { headerBg: "bg-red-100", borderColor: "border-red-300", accentColor: "text-red-700", hoverBg: "hover:bg-red-50", lightBg: "bg-red-50" },
    'draft': { headerBg: "bg-slate-100", borderColor: "border-slate-300", accentColor: "text-slate-700", hoverBg: "hover:bg-slate-50", lightBg: "bg-slate-50" },
    'final': { headerBg: "bg-purple-100", borderColor: "border-purple-300", accentColor: "text-purple-700", hoverBg: "hover:bg-purple-50", lightBg: "bg-purple-50" },
  };
  
  // First check if any values match our priority values
  for (const [key, value] of Object.entries(metadata)) {
    const lowerValue = value.toLowerCase();
    if (priorityValues[lowerValue]) {
      return priorityValues[lowerValue];
    }
  }
  
  // Then check if any keys match our priority keys
  for (const { key, scheme } of priorityKeys) {
    // Check if any metadata key contains this priority key
    for (const metadataKey of Object.keys(metadata)) {
      if (metadataKey.toLowerCase().includes(key.toLowerCase())) {
        return scheme;
      }
    }
  }
  
  // If no priority keys or values were found, return the file type scheme
  return fileTypeScheme;
}