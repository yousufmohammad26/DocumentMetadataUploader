import { documents, type Document, type InsertDocument, users, type User, type InsertUser } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private userCurrentId: number;
  private documentCurrentId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.userCurrentId = 1;
    this.documentCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentCurrentId++;
    const now = new Date();
    
    // Ensure required fields are present
    const document: Document = { 
      ...insertDocument, 
      id,
      uploadedAt: now,
      metadata: insertDocument.metadata || {},
      accessLevel: insertDocument.accessLevel || 'private'
    };
    
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updateData: Partial<InsertDocument> & { metadata?: any }): Promise<Document | undefined> {
    const existingDocument = this.documents.get(id);
    if (!existingDocument) {
      return undefined;
    }

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

    const updatedDocument = { ...existingDocument, ...processedUpdateData };
    this.documents.set(id, updatedDocument);
    return updatedDocument;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
}

export const storage = new MemStorage();
