import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Maximize2, X } from "lucide-react";

export function ArchitectureDiagram() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center space-x-2 hover:bg-blue-50" 
        onClick={() => setIsOpen(true)}
      >
        <Maximize2 className="h-4 w-4" />
        <span>View Architecture</span>
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
                Document Metadata Manager - Architecture
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Visualization of how the application components interact
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center p-2 overflow-hidden">
            <img 
              src="/architecture.svg" 
              alt="Application Architecture" 
              className="w-full h-auto max-h-[70vh] object-contain rounded-md shadow-sm transition-transform duration-200 hover:scale-[1.02]"
            />
          </div>
          
          <div className="text-sm text-gray-500 mt-2 space-y-2">
            <p>
              <strong>React Frontend</strong>: Handles the user interface for document management and metadata editing
            </p>
            <p>
              <strong>Express Backend</strong>: Provides APIs for document operations and interfaces with AWS S3
            </p>
            <p>
              <strong>AWS S3</strong>: Stores the actual document files along with metadata as object properties
            </p>
            <p>
              <strong>In-Memory Storage</strong>: Caches document metadata for faster retrieval and searching
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}