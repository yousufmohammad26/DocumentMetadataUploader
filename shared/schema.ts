import { z } from "zod";

export type User = {
  id: number;
  username: string;
  password: string;
};

export type Document = {
  id: number;
  fileName: string;
  fileKey: string;
  fileSize: number;
  fileType: string;
  name: string;
  metadata: Record<string, string>;
  accessLevel: "public" | "private";
  uploadedAt: Date;
  lastUpdated: Date;
};

// Define the metadata key-value pair type
export const metadataKeyValueSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().optional().default(""),
});

export type MetadataKeyValue = z.infer<typeof metadataKeyValueSchema>;

// Schema for form validation
export const documentMetadataSchema = z.object({
  name: z.string().min(1, "Topology is required"),
  metadata: z.array(metadataKeyValueSchema).default([]),
  accessLevel: z.enum(["public", "private"]).default("private"),
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

// Schema for the presigned URL request
export const presignedUrlRequestSchema = z.object({
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number().max(10 * 1024 * 1024, "File size must be less than 10MB"),
});