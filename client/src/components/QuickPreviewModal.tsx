import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FileText,
  FileCode,
  Image as ImageIcon,
  File,
  Calendar,
  Tag,
  Download,
  Eye,
  Info,
  Clock,
} from "lucide-react";
import { formatFileSize, formatDate } from "@/lib/s3";
import { getDocumentColorScheme } from "@/lib/documentColors";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface QuickPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: number;
    name: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    metadata: Record<string, string>;
    accessLevel: string;
    uploadedAt: string;
  } | null;
  onView: () => void;
  onDownload: () => void;
  onEdit: () => void;
}

const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  
  if (type.includes('image')) {
    return <ImageIcon className="h-10 w-10 text-blue-500" />;
  } else if (type.includes('pdf')) {
    return <FileText className="h-10 w-10 text-red-500" />;
  } else if (type.includes('word') || type.includes('doc')) {
    return <FileText className="h-10 w-10 text-blue-600" />;
  } else if (type.includes('excel') || type.includes('sheet') || type.includes('csv')) {
    return <FileText className="h-10 w-10 text-green-600" />;
  } else if (type.includes('code') || type.includes('json') || type.includes('xml') || type.includes('html')) {
    return <FileCode className="h-10 w-10 text-purple-600" />;
  } else {
    return <File className="h-10 w-10 text-gray-500" />;
  }
};

export function QuickPreviewModal({
  isOpen,
  onClose,
  document,
  onView,
  onDownload,
  onEdit
}: QuickPreviewModalProps) {
  if (!document) return null;
  
  const colorScheme = getDocumentColorScheme(document.metadata, document.fileType);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <div className={`mr-2 p-2 rounded-md bg-${colorScheme.lightBg}`}>
              {getFileIcon(document.fileType)}
            </div>
            <span className="text-lg truncate">{document.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-3">
          {/* File Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center text-gray-700">
              <Info className="h-4 w-4 mr-2" />
              File Information
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm pl-6">
              <div className="text-gray-500">File Name:</div>
              <div className="font-medium truncate">{document.fileName}</div>
              
              <div className="text-gray-500">File Type:</div>
              <div className="font-medium">{document.fileType}</div>
              
              <div className="text-gray-500">Size:</div>
              <div className="font-medium">{formatFileSize(document.fileSize)}</div>
              
              <div className="text-gray-500">Access Level:</div>
              <div>
                <Badge variant={document.accessLevel === 'public' ? 'default' : 'secondary'}>
                  {document.accessLevel}
                </Badge>
              </div>
              
              <div className="text-gray-500">Uploaded:</div>
              <div className="font-medium flex items-center">
                <Clock className="h-3 w-3 mr-1 text-gray-400" />
                {formatDate(document.uploadedAt, true)}
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Metadata Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center text-gray-700">
              <Tag className="h-4 w-4 mr-2" />
              Metadata
            </h3>
            
            {Object.keys(document.metadata).length > 0 ? (
              <div className="grid grid-cols-2 gap-2 text-sm pl-6">
                {Object.entries(document.metadata).map(([key, value], idx) => (
                  <React.Fragment key={idx}>
                    <div className="text-gray-500">{key}:</div>
                    <div className="font-medium truncate">{value}</div>
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic pl-6">
                No metadata available
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onView}
              className="flex items-center"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              View
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDownload}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download
            </Button>
          </div>
          <Button 
            onClick={onEdit}
            className="flex items-center"
          >
            Edit Metadata
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}