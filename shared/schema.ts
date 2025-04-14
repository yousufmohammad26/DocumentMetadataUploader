import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileKey: text("file_key").notNull(), // S3 object key
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  documentDate: text("document_date"),
  tags: text("tags").array(),
  accessLevel: text("access_level").notNull().default("private"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Schema for form validation
export const documentMetadataSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  documentDate: z.string().optional(),
  tags: z.string().optional().transform(val => 
    val ? val.split(',').map(tag => tag.trim()).filter(Boolean) : []
  ),
  accessLevel: z.enum(["public", "private"]).default("private"),
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

// Schema for the presigned URL request
export const presignedUrlRequestSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number().max(10 * 1024 * 1024, "File size must be less than 10MB"),
});
