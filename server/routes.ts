import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { AWS } from "@aws-sdk/client-s3";
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { insertDocumentSchema, documentMetadataSchema, presignedUrlRequestSchema } from "@shared/schema";
import multer from "multer";
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

  // Use in-memory storage for multer
  const memoryStorage = multer.memoryStorage();
  const upload = multer({
    storage: memoryStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
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
      const updatedDocument = await storage.updateDocument(id, updateData);
      
      res.json(updatedDocument);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: 'Failed to update document' });
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
