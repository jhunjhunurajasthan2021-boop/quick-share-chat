import { db } from "./db";
import {
  files,
  messages,
  type InsertFile,
  type InsertMessage,
  type File,
  type Message
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createFile(file: InsertFile): Promise<File>;
  getFileByPublicId(publicId: string): Promise<File | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(fileId: number): Promise<Message[]>;
}

export class DatabaseStorage implements IStorage {
  async createFile(insertFile: InsertFile): Promise<File> {
    const [file] = await db.insert(files).values(insertFile).returning();
    return file;
  }

  async getFileByPublicId(publicId: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.publicId, publicId));
    return file;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }

  async getMessages(fileId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.fileId, fileId))
      .orderBy(messages.createdAt); // Oldest first for chat history
  }
}

export const storage = new DatabaseStorage();
