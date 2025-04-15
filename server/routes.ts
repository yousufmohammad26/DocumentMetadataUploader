import type { Express, Request, Response, NextFunction } from "express";
import type { FileRequest } from "multer";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { S3Client, GetObjectCommand, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { insertDocumentSchema, documentMetadataSchema, presignedUrlRequestSchema } from "@shared/schema";
import * as multer from "multer";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure AWS S3
  const s3 = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });

  const bucketName = process.env.AWS_S3_BUCKET_NAME || "document-metadata-bucket";

  // Use multer for file uploads with memory storage
  // @ts-ignore
  const upload = multer.default({
    // @ts-ignore
    storage: multer.default.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req: any, file: any, cb: any) => {
      // Allowed file types
      const allowedMimeTypes = [
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
      
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, DOCX, XLSX, PPTX, TXT, JPG, and PNG files are allowed.'));
      }
    }
  });

  // Generate presigned URL for direct upload to S3
  app.post('/api/documents/presigned-url', async (req: Request, res: Response) => {
    try {
      const validatedData = presignedUrlRequestSchema.parse(req.body);
      const { fileName, fileType, fileSize } = validatedData;
      
      // Create a unique file key
      const fileKey = `${Date.now()}-${fileName}`;
      
      // Basic metadata that will be available on presigned URL creation
      // Full metadata will be passed from the client during actual upload
      const metadata = {
        'original-filename': fileName,
        'content-type': fileType
      };
      
      // Create the presigned URL with initial metadata
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: fileType,
        Metadata: metadata
      });
      
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 10000 });
      
      res.json({
        presignedUrl,
        fileKey,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Failed to generate presigned URL' });
    }
  });

  // Save document metadata
  app.post('/api/documents', async (req: Request, res: Response) => {
    try {
      const documentData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Failed to create document' });
    }
  });

  // Get all documents
  app.get('/api/documents', async (req: Request, res: Response) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve documents' });
    }
  });
  
  // Synchronize documents from S3 bucket
  app.get('/api/documents/sync-from-s3', async (req: Request, res: Response) => {
    try {
      // Get all existing documents in our storage to check what's already synced
      const existingDocs = await storage.getAllDocuments();
      const existingFileKeys = new Set(existingDocs.map(doc => doc.fileKey));
      
      // List all objects in the S3 bucket
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName
      });
      
      const s3Objects = await s3.send(listCommand);
      
      if (!s3Objects.Contents || s3Objects.Contents.length === 0) {
        return res.json({ 
          success: true, 
          message: 'No objects found in S3 bucket',
          syncedCount: 0
        });
      }
      
      const newDocuments = [];
      
      // Process each S3 object
      for (const object of s3Objects.Contents) {
        if (!object.Key) continue;
        
        // Skip if we already have this file in our storage
        if (existingFileKeys.has(object.Key)) continue;
        
        try {
          // Get metadata for the object
          const headCommand = new HeadObjectCommand({
            Bucket: bucketName,
            Key: object.Key
          });
          
          const objectDetails = await s3.send(headCommand);
          
          // Extract file information
          const fileName = objectDetails.Metadata?.['original-filename'] || object.Key.split('-').slice(1).join('-');
          const contentType = objectDetails.Metadata?.['content-type'] || objectDetails.ContentType || 'application/octet-stream';
          const docName = objectDetails.Metadata?.['document-name'] || fileName;
          const accessLevel = objectDetails.Metadata?.['access-level'] || 'private';
          const fileSize = object.Size || 0;
          
          // Extract custom metadata
          const metadata: Record<string, string> = {};
          

          
          // Process each metadata entry
          Object.entries(objectDetails.Metadata || {}).forEach(([key, value]) => {
            if (value) {
              // AWS S3 might be lowercasing the keys, so normalize here
              let metaKey = key;
              
              // If the prefix exists, remove it
              if (metaKey.startsWith('x-amz-meta-')) {
                metaKey = metaKey.replace('x-amz-meta-', '');
              }
              
              metadata[metaKey] = value;
            }
          });
          
          // Store document in our application's storage
          const document = await storage.createDocument({
            name: docName,
            fileName: fileName,
            fileKey: object.Key,
            fileSize: fileSize,
            fileType: contentType,
            metadata: metadata,
            accessLevel: accessLevel
          });
          
          newDocuments.push(document);
        } catch (error) {
          console.error(`Error syncing object ${object.Key}:`, error);
          // Continue with next object if one fails
        }
      }
      
      res.json({ 
        success: true, 
        message: `Synced ${newDocuments.length} new documents from S3`,
        syncedCount: newDocuments.length,
        documents: newDocuments
      });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to sync documents from S3'
      });
    }
  });

  // Get a specific document
  app.get('/api/documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve document' });
    }
  });

  // Generate a presigned URL for viewing/downloading a document
  app.get('/api/documents/:id/download', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: document.fileKey,
      });
      
      const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
      
      res.json({ presignedUrl });
    } catch (error) {
      res.status(500).json({ message: 'Failed to generate download URL' });
    }
  });

  // Update document metadata
  app.patch('/api/documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const updateData = documentMetadataSchema.parse(req.body);
      
      // For S3 objects, we need to update the metadata in S3 as well
      try {
        // Get the existing object metadata
        const headObjectCommand = new HeadObjectCommand({
          Bucket: bucketName,
          Key: document.fileKey,
        });
        
        const objectMeta = await s3.send(headObjectCommand);
        
        // Prepare metadata for S3 (must use x-amz-meta- prefix)
        const s3Metadata: Record<string, string> = {
          'document-name': updateData.name,
          'access-level': updateData.accessLevel
        };
        
        // Add custom metadata with x-amz-meta- prefix for consistency with upload
        for (const [key, value] of Object.entries(updateData.metadata || {})) {
          const sanitizedKey = key.toLowerCase().replace(/\s+/g, '-');
          s3Metadata[`x-amz-meta-${sanitizedKey}`] = String(value);
        }
        
        // Copy the object to itself with new metadata
        // This is the way to update metadata in S3 (we need to create a new version)
        const copySource = `${bucketName}/${encodeURIComponent(document.fileKey)}`;
        const copyObjectCommand = new CopyObjectCommand({
          Bucket: bucketName,
          Key: document.fileKey,
          CopySource: copySource,
          Metadata: s3Metadata,
          MetadataDirective: 'REPLACE',
        });
        
        await s3.send(copyObjectCommand);
      } catch (s3Error) {
        console.error('Error updating S3 metadata:', s3Error);
        // We'll continue even if S3 update fails, but log the error
      }
      
      // Update document in storage
      const updatedDocument = await storage.updateDocument(id, updateData);
      
      res.json(updatedDocument);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error('Error updating document metadata:', error);
      res.status(500).json({ message: 'Failed to update document metadata' });
    }
  });

  // Delete a document
  app.delete('/api/documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Delete from S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: document.fileKey,
      });
      
      await s3.send(deleteCommand);
      
      // Delete from storage
      await storage.deleteDocument(id);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete document' });
    }
  });

  // Server-side upload endpoint to bypass CORS issues
  app.post('/api/documents/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: 'No file uploaded' 
        });
      }

      // Get metadata from request body
      const docName = req.body.name || 'Untitled Document';
      let metadataArr = [];
      
      try {
        // Parse metadata from the request body if available
        if (req.body.metadata) {
          metadataArr = JSON.parse(req.body.metadata);
        }
      } catch (e) {
        console.error('Error parsing metadata:', e);
      }

      const accessLevel = req.body.accessLevel || 'private';
      
      // Create a unique file key
      const fileName = req.file.originalname;
      const fileKey = `${Date.now()}-${fileName}`;
      
      // Prepare S3 metadata
      const s3Metadata: Record<string, string> = {
        'original-filename': fileName,
        'content-type': req.file.mimetype,
        'document-name': docName,
        'access-level': accessLevel
      };
      
      // Add custom metadata with x-amz-meta- prefix
      if (Array.isArray(metadataArr)) {
        metadataArr.forEach((item: { key: string; value: string }) => {
          if (item.key && item.value) {
            const sanitizedKey = item.key.toLowerCase().replace(/\s+/g, '-');
            s3Metadata[`x-amz-meta-${sanitizedKey}`] = item.value;
          }
        });
      }
      
      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        Metadata: s3Metadata
      });
      
      await s3.send(command);
      
      // Convert metadata array to object for storage
      const metadataObject: Record<string, string> = {};
      if (Array.isArray(metadataArr)) {
        metadataArr.forEach((item: { key: string; value: string }) => {
          if (item.key && item.value) {
            // Store with the same prefix (or lack thereof) as we'll retrieve it
            // This ensures consistency between upload and retrieval
            const sanitizedKey = item.key.toLowerCase().replace(/\s+/g, '-');
            metadataObject[sanitizedKey] = item.value;
          }
        });
      }
      

      
      // Store document metadata in storage
      const document = await storage.createDocument({
        name: docName,
        fileName: fileName,
        fileKey: fileKey,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        metadata: metadataObject,
        accessLevel: accessLevel
      });
      
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload document'
      });
    }
  });

  // Get AWS account information
  app.get('/api/aws-account', async (req: Request, res: Response) => {
    try {
      // Extract part of the access key to simulate showing account info
      // Typically AWS account IDs are 12 digits, and we can extract a few digits to display safely
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "";
      const accountIdentifier = accessKeyId.length > 6 ? accessKeyId.substring(0, 4) + '...' + accessKeyId.substring(accessKeyId.length - 4) : "Not available";
      
      res.json({
        accountIdentifier,
        region: process.env.AWS_REGION || "us-east-1",
        active: true
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve AWS account information' });
    }
  });
  
  // Get S3 bucket statistics
  app.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const documents = await storage.getAllDocuments();
      
      const totalUploads = documents.length;
      
      // Calculate today's uploads
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayUploads = documents.filter(doc => 
        doc.uploadedAt && new Date(doc.uploadedAt) >= today
      ).length;
      
      // Calculate total storage used
      const storageUsed = documents.reduce((total, doc) => total + doc.fileSize, 0);
      
      res.json({
        totalUploads,
        todayUploads,
        storageUsed,
        bucketName
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve stats' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
