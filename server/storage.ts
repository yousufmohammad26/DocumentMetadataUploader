import { documents, type Document, type InsertDocument, users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Document related methods
  getAllDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllDocuments(): Promise<Document[]> {
    // Return all documents without sorting
    return await db.select().from(documents);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const now = new Date();
    
    // Ensure required fields are present
    const documentWithDefaults = {
      ...insertDocument,
      uploadedAt: now,
      lastUpdated: now,
      metadata: insertDocument.metadata || {},
      accessLevel: insertDocument.accessLevel || 'private'
    };
    
    const [document] = await db
      .insert(documents)
      .values(documentWithDefaults)
      .returning();
      
    return document;
  }

  async updateDocument(id: number, updateData: Partial<InsertDocument> & { metadata?: any }): Promise<Document | undefined> {
    // Handle metadata conversion - if metadata is an array of key-value pairs, convert to object
    const processedUpdateData = { ...updateData };
    if (Array.isArray(processedUpdateData.metadata)) {
      const metadataObject: Record<string, string> = {};
      processedUpdateData.metadata.forEach((item: { key: string; value: string }) => {
        if (item.key && item.key.trim()) {
          metadataObject[item.key.trim()] = item.value || '';
        }
      });
      processedUpdateData.metadata = metadataObject;
    }

    // Update with processed data and add lastUpdated timestamp
    const updateWithTimestamp = {
      ...processedUpdateData,
      lastUpdated: new Date()
    };
    
    const [updatedDocument] = await db
      .update(documents)
      .set(updateWithTimestamp)
      .where(eq(documents.id, id))
      .returning();
      
    return updatedDocument || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db
      .delete(documents)
      .where(eq(documents.id, id))
      .returning({ id: documents.id });
      
    return result.length > 0;
  }
}

// Create and export the database storage implementation
export const storage = new DatabaseStorage();
