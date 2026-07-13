import { db } from "./db";
import {
  files,
  messages,
  activityLogs,
  type InsertFile,
  type InsertMessage,
  type InsertActivityLog,
  type File,
  type Message,
  type ActivityLog
} from "@shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  createFile(file: InsertFile): Promise<File>;
  getFileByPublicId(publicId: string): Promise<File | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessages(fileId: number): Promise<Message[]>;
  logActivity(log: InsertActivityLog): Promise<ActivityLog>;
  getAllActivityLogs(filters?: { from?: Date; to?: Date; actionType?: string }): Promise<ActivityLog[]>;
  flagLog(id: number, flagReason: string): Promise<void>;
  unflagLog(id: number): Promise<void>;
  deleteLogsBefore(date: Date): Promise<void>;
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
      .orderBy(messages.createdAt);
  }

  async logActivity(log: InsertActivityLog): Promise<ActivityLog> {
    const [entry] = await db.insert(activityLogs).values(log).returning();
    return entry;
  }

  async getAllActivityLogs(filters?: { from?: Date; to?: Date; actionType?: string }): Promise<ActivityLog[]> {
    const conditions = [];
    if (filters?.from) conditions.push(gte(activityLogs.createdAt, filters.from));
    if (filters?.to) conditions.push(lte(activityLogs.createdAt, filters.to));
    if (filters?.actionType) conditions.push(eq(activityLogs.actionType, filters.actionType));

    const query = db.select().from(activityLogs);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(activityLogs.createdAt));
    }
    return await query.orderBy(desc(activityLogs.createdAt));
  }

  async flagLog(id: number, flagReason: string): Promise<void> {
    await db.update(activityLogs).set({ isFlagged: true, flagReason }).where(eq(activityLogs.id, id));
  }

  async unflagLog(id: number): Promise<void> {
    await db.update(activityLogs).set({ isFlagged: false, flagReason: null }).where(eq(activityLogs.id, id));
  }

  async deleteLogsBefore(date: Date): Promise<void> {
    await db.delete(activityLogs).where(lte(activityLogs.createdAt, date));
  }
}

export const storage = new DatabaseStorage();
