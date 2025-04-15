import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Maximize, 
  Minimize,
  RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  documentUrl: string;
  documentName: string;
  documentType: string;
  onDownload?: () => void;
}

export function DocumentPreview({
  isOpen,
  onClose,
  documentUrl,
  documentName,
  documentType,
  onDownload
}: DocumentPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Handle zoom
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  // Handle page navigation
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => console.error(`Error attempting to enable fullscreen: ${err.message}`));
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => console.error(`Error attempting to exit fullscreen: ${err.message}`));
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setZoomLevel(100);
      setCurrentPage(1);
    }
  }, [isOpen]);

  // Determine if the document is a PDF
  const isPdf = documentType === 'application/pdf';
  
  // Determine if the document is an image
  const isImage = documentType.startsWith('image/');

  // Handle document load event
  const handleDocumentLoad = () => {
    setLoading(false);
    
    // For PDFs, we could potentially get the total pages
    // This would require a PDF.js implementation to be more accurate
    // For now, we'll just set it to 1 for non-PDFs and handle PDFs differently
    if (!isPdf) {
      setTotalPages(1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            ref={containerRef}
            className="relative w-11/12 h-5/6 bg-white rounded-lg overflow-hidden flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-medium truncate">{documentName}</h3>
              <div className="flex items-center space-x-2">
                {onDownload && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onDownload}
                    title="Download document"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClose}
                  title="Close preview"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Document preview area */}
            <div className="flex-1 overflow-auto relative">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="flex flex-col items-center">
                    <RotateCw className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-sm text-gray-600">Loading document...</p>
                  </div>
                </div>
              )}
              
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{ 
                  transform: `scale(${zoomLevel / 100})`,
                  transition: 'transform 0.2s ease-in-out'
                }}
              >
                {isPdf ? (
                  // PDF Viewer (using iframe with PDF.js or browser's built-in PDF viewer)
                  <iframe
                    ref={iframeRef}
                    src={`${documentUrl}#page=${currentPage}`}
                    className="w-full h-full border-0"
                    onLoad={handleDocumentLoad}
                    title={documentName}
                  />
                ) : isImage ? (
                  // Image Viewer
                  <img
                    src={documentUrl}
                    alt={documentName}
                    className="max-w-full max-h-full object-contain"
                    onLoad={handleDocumentLoad}
                  />
                ) : (
                  // Fallback for other document types
                  <iframe
                    src={documentUrl}
                    className="w-full h-full border-0"
                    onLoad={handleDocumentLoad}
                    title={documentName}
                  />
                )}
              </div>
            </div>
            
            {/* Controls */}
            <div className="p-3 border-t bg-gray-50 flex justify-between items-center">
              {/* Page navigation (only for PDFs) */}
              {isPdf && (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={prevPage}
                    disabled={currentPage <= 1}
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={nextPage}
                    disabled={currentPage >= totalPages}
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Zoom controls */}
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={zoomOut}
                  disabled={zoomLevel <= 50}
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm min-w-[60px] text-center">
                  {zoomLevel}%
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={zoomIn}
                  disabled={zoomLevel >= 200}
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}