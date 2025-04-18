import { executeAthenaQuery } from './athena';
import type { Express, Request, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { S3Client, GetObjectCommand, PutObjectCommand, CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { insertDocumentSchema, documentMetadataSchema, presignedUrlRequestSchema } from "@shared/schema";
import * as multer from "multer";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Add Athena query endpoint
  app.post('/api/query-athena', async (req, res) => {
    try {
      const { query } = req.body;
      const results = await executeAthenaQuery(query);
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute Athena query' });
    }
  });

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
      const fileKey = `${uuidv4()}-${fileName}`;
      
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
          
          // If topology is not in metadata, use the filename without extension
          const fileBaseName = fileName.replace(/\.[^/.]+$/, ""); // Remove file extension
          const docName = objectDetails.Metadata?.['topology'] || fileBaseName;
          
          const accessLevel = objectDetails.Metadata?.['access-level'] || 'private';
          const fileSize = object.Size || 0;
          
          // Extract custom metadata
          const metadata: Record<string, string> = {};
          
          // Add original-filename and topology to metadata for display (will be shown as non-editable)
          if (objectDetails.Metadata?.['original-filename']) {
            metadata['original-filename'] = objectDetails.Metadata['original-filename'];
          }
          
          if (objectDetails.Metadata?.['topology']) {
            metadata['topology'] = objectDetails.Metadata['topology'];
          }
          
          // Process each metadata entry
          Object.entries(objectDetails.Metadata || {}).forEach(([key, value]) => {
            if (value) {
              // Skip system metadata (access-level and content-type) 
              // But keep original-filename and topology (they're already added above)
              if (key !== 'access-level' && key !== 'content-type' && 
                  key !== 'original-filename' && key !== 'topology') {
                metadata[key] = value;
              }
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
      
      // Convert metadata array to object if it exists
      const metadataObject: Record<string, string> = {};
      if (Array.isArray(updateData.metadata)) {
        updateData.metadata.forEach(item => {
          if (item.key && item.key.trim()) {
            metadataObject[item.key.trim()] = item.value || '';
          }
        });
      }
      
      // For S3 objects, we need to update the metadata in S3 as well
      try {
        // Get the existing object metadata
        const headObjectCommand = new HeadObjectCommand({
          Bucket: bucketName,
          Key: document.fileKey,
        });
        
        const objectMeta = await s3.send(headObjectCommand);
        
        // Prepare metadata for S3
        const s3Metadata: Record<string, string> = {
          'topology': updateData.name,
          'access-level': updateData.accessLevel
        };
        
        // Make sure we preserve original-filename field from existing metadata
        if (objectMeta.Metadata?.['original-filename']) {
          s3Metadata['original-filename'] = objectMeta.Metadata['original-filename'];
        }
        
        // Add custom metadata entries - with strict validation of restricted keys
        const reservedKeys = ['original-filename', 'topology', 'year', 'month'];
        
        for (const [key, value] of Object.entries(metadataObject)) {
          const sanitizedKey = key.toLowerCase().replace(/\s+/g, '-');
          
          // Don't allow adding any reserved keys via API (extra protection)
          // Note: The client should prevent this, but we double-check on the server
          if (!reservedKeys.includes(sanitizedKey)) {
            s3Metadata[sanitizedKey] = String(value);
          } else {
            console.warn(`Attempt to add reserved metadata key '${sanitizedKey}' was blocked by server validation`);
          }
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
      
      // Prepare data for storage update - we need the metadata as an object, not array
      const storageUpdateData = { ...updateData };
      
      // If metadata is still in array format, convert it to object for storage
      if (Array.isArray(storageUpdateData.metadata)) {
        const metaObj: Record<string, string> = {};
        storageUpdateData.metadata.forEach((item: { key: string; value: string }) => {
          if (item.key && item.key.trim()) {
            metaObj[item.key.trim()] = item.value || '';
          }
        });
        storageUpdateData.metadata = metaObj as any; // Type assertion to avoid TS errors
      }
      
      // Update document in storage
      const updatedDocument = await storage.updateDocument(id, storageUpdateData);
      
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
    console.log('==== UPLOAD REQUEST START ====');
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('Request body content-type:', req.get('Content-Type'));
    console.log('Request topology value:', req.body.topology);
    console.log('Request name value:', req.body.name);
    console.log('Request file details:', req.file ? JSON.stringify({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    }, null, 2) : 'No file');
    
    try {
      if (!req.file) {
        console.log('ERROR: No file in request');
        return res.status(400).json({ 
          success: false,
          message: 'No file uploaded' 
        });
      }
      console.log('File received successfully:', req.file.originalname);

      // Get the original filename
      const fileName = req.file.originalname;
      
      // Get topology path from request body
      const topologyPath = req.body.topology || req.body.name || '';
      console.log('Topology path:', topologyPath);
      
      // Get current date information for metadata
      const currentDate = new Date();
      const year = currentDate.getFullYear().toString(); // YYYY format
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[currentDate.getMonth()]; // MMM format
      console.log(`Adding date metadata - Year: ${year}, Month: ${month}`);
      
      // Create a unique file key with topology path, UUID, and then the original filename
      const uuid = uuidv4();
      console.log('Generated UUID:', uuid);
      
      // Compute the final file key
      const fileKey = topologyPath ? `${topologyPath}${uuid}-${fileName}` : `${uuid}-${fileName}`;
      console.log('Final S3 file key:', fileKey);
      
      // Use the topology path as the document name
      const docName = topologyPath;
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
      
      // Prepare S3 metadata
      const s3Metadata: Record<string, string> = {
        'original-filename': fileName,
        'content-type': req.file.mimetype,
        'topology': docName,
        'access-level': accessLevel,
        'year': year,
        'month': month
      };
      
      // Add custom metadata entries with validation for reserved keys
      const reservedKeys = ['original-filename', 'topology', 'content-type', 'access-level', 'year', 'month'];
      
      if (Array.isArray(metadataArr)) {
        metadataArr.forEach((item: { key: string; value: string }) => {
          if (item.key && item.value) {
            const sanitizedKey = item.key.toLowerCase().replace(/\s+/g, '-');
            
            // Don't allow adding any reserved keys via upload
            if (!reservedKeys.includes(sanitizedKey)) {
              s3Metadata[sanitizedKey] = item.value;
            } else {
              console.warn(`Attempt to add reserved metadata key '${sanitizedKey}' during upload was blocked`);
            }
          }
        });
      }
      
      // Upload to S3
      console.log('Preparing S3 upload with metadata:', JSON.stringify(s3Metadata));
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        Metadata: s3Metadata
      });
      
      console.log('Uploading to S3 bucket:', bucketName, 'with key:', fileKey);
      try {
        await s3.send(command);
        console.log('S3 upload successful');
      } catch (s3Error) {
        console.error('S3 upload error:', s3Error);
        throw s3Error;
      }
      
      // Convert metadata array to object for storage
      const metadataObject: Record<string, string> = {};
      
      // Add original-filename, topology, year, and month as non-editable metadata fields
      metadataObject['original-filename'] = fileName;
      metadataObject['topology'] = docName;
      metadataObject['year'] = year;
      metadataObject['month'] = month;
      
      // Add user-defined metadata with reserved key validation
      if (Array.isArray(metadataArr)) {
        metadataArr.forEach((item: { key: string; value: string }) => {
          if (item.key && item.value) {
            const sanitizedKey = item.key.toLowerCase().replace(/\s+/g, '-');
            
            // Don't allow adding reserved keys to the storage object
            if (!reservedKeys.includes(sanitizedKey)) {
              metadataObject[sanitizedKey] = item.value;
            }
            // Note: We don't need to log warnings here since we already logged them above
          }
        });
      }
      
      // Store document metadata in storage
      console.log('Creating document in storage with data:', JSON.stringify({
        name: docName,
        fileName: fileName,
        fileKey: fileKey,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        metadata: metadataObject,
        accessLevel: accessLevel
      }));
      
      let document;
      try {
        document = await storage.createDocument({
          name: docName,
          fileName: fileName,
          fileKey: fileKey,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          metadata: metadataObject,
          accessLevel: accessLevel
        });
        console.log('Document created successfully:', document.id);
      } catch (storageError) {
        console.error('Error creating document in storage:', storageError);
        throw storageError;
      }
      
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document
      });
    } catch (error) {
      console.error('==== UPLOAD ERROR DETAILS ====');
      console.error('Error type:', error?.constructor?.name);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
      
      // Return a more detailed error message to the client
      let errorMessage = 'Failed to upload document';
      if (error instanceof Error) {
        errorMessage = `Upload failed: ${error.message}`;
      }
      
      res.status(500).json({ 
        success: false,
        message: errorMessage
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}