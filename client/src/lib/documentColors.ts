// Color scheme for document cards based on metadata content
export interface DocumentColorScheme {
  headerBg: string;
  borderColor: string;
  accentColor: string;
}

export function getDocumentColorScheme(metadata: Record<string, string> | undefined | null): DocumentColorScheme {
  // Default color scheme if no metadata exists
  const defaultScheme: DocumentColorScheme = {
    headerBg: "bg-gray-50",
    borderColor: "border-gray-200",
    accentColor: "text-gray-700"
  };
  
  if (!metadata || Object.keys(metadata).length === 0) {
    return defaultScheme;
  }
  
  // Priority metadata keys that influence document color
  const priorityKeys = [
    { key: 'category', scheme: { headerBg: "bg-yellow-50", borderColor: "border-yellow-200", accentColor: "text-yellow-700" } },
    { key: 'department', scheme: { headerBg: "bg-indigo-50", borderColor: "border-indigo-200", accentColor: "text-indigo-700" } },
    { key: 'status', scheme: { headerBg: "bg-red-50", borderColor: "border-red-200", accentColor: "text-red-700" } },
    { key: 'priority', scheme: { headerBg: "bg-orange-50", borderColor: "border-orange-200", accentColor: "text-orange-700" } },
    { key: 'type', scheme: { headerBg: "bg-blue-50", borderColor: "border-blue-200", accentColor: "text-blue-700" } },
    { key: 'project', scheme: { headerBg: "bg-emerald-50", borderColor: "border-emerald-200", accentColor: "text-emerald-700" } },
    { key: 'author', scheme: { headerBg: "bg-purple-50", borderColor: "border-purple-200", accentColor: "text-purple-700" } },
    { key: 'client', scheme: { headerBg: "bg-sky-50", borderColor: "border-sky-200", accentColor: "text-sky-700" } },
  ];
  
  // Values that strongly influence color regardless of key
  const priorityValues: Record<string, DocumentColorScheme> = {
    'urgent': { headerBg: "bg-red-50", borderColor: "border-red-200", accentColor: "text-red-700" },
    'high': { headerBg: "bg-orange-50", borderColor: "border-orange-200", accentColor: "text-orange-700" },
    'medium': { headerBg: "bg-yellow-50", borderColor: "border-yellow-200", accentColor: "text-yellow-700" },
    'low': { headerBg: "bg-green-50", borderColor: "border-green-200", accentColor: "text-green-700" },
    'completed': { headerBg: "bg-green-50", borderColor: "border-green-200", accentColor: "text-green-700" },
    'in progress': { headerBg: "bg-blue-50", borderColor: "border-blue-200", accentColor: "text-blue-700" },
    'pending': { headerBg: "bg-yellow-50", borderColor: "border-yellow-200", accentColor: "text-yellow-700" },
    'approved': { headerBg: "bg-green-50", borderColor: "border-green-200", accentColor: "text-green-700" },
    'rejected': { headerBg: "bg-red-50", borderColor: "border-red-200", accentColor: "text-red-700" },
    'draft': { headerBg: "bg-gray-50", borderColor: "border-gray-200", accentColor: "text-gray-700" },
    'final': { headerBg: "bg-purple-50", borderColor: "border-purple-200", accentColor: "text-purple-700" },
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
  
  // If no priority keys or values were found, use a color based on the document's metadata size
  const metadataSize = Object.keys(metadata).length;
  
  if (metadataSize >= 5) {
    // Lots of metadata - use a vibrant color
    return { headerBg: "bg-violet-50", borderColor: "border-violet-200", accentColor: "text-violet-700" };
  } else if (metadataSize >= 3) {
    // Medium amount of metadata
    return { headerBg: "bg-cyan-50", borderColor: "border-cyan-200", accentColor: "text-cyan-700" };
  } else {
    // Small amount of metadata
    return { headerBg: "bg-teal-50", borderColor: "border-teal-200", accentColor: "text-teal-700" };
  }
}