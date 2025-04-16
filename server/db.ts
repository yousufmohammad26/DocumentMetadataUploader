
import { User, Document } from "../shared/schema";

class MemoryDB {
  private users: Map<number, User>;
  private documents: Map<number, Document>;
  private nextUserId: number;
  private nextDocId: number;

  constructor() {
    this.users = new Map();
    this.documents = new Map();
    this.nextUserId = 1;
    this.nextDocId = 1;
  }

  // User methods
  async createUser(username: string, password: string): Promise<User> {
    const user: User = {
      id: this.nextUserId++,
      username,
      password
    };
    this.users.set(user.id, user);
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  // Document methods
  async createDocument(doc: Omit<Document, "id" | "uploadedAt" | "lastUpdated">): Promise<Document> {
    const document: Document = {
      ...doc,
      id: this.nextDocId++,
      uploadedAt: new Date(),
      lastUpdated: new Date()
    };
    this.documents.set(document.id, document);
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async updateDocument(id: number, data: Partial<Document>): Promise<Document | undefined> {
    const doc = this.documents.get(id);
    if (!doc) return undefined;

    const updated: Document = {
      ...doc,
      ...data,
      lastUpdated: new Date()
    };
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }
}

export const db = new MemoryDB();
