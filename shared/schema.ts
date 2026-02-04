import { pgTable, text, serial, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").defaultRandom().notNull().unique(), // The ID used in the URL
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // Size in bytes
  fileIoLink: text("file_io_link").notNull(), // The download link from file.io
  fileIoKey: text("file_io_key").notNull(), // The key from file.io
  expiresAt: timestamp("expires_at").notNull(), // 2 hours from upload
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => files.id).notNull(), // Chat belongs to a file/room
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === RELATIONS ===

export const filesRelations = relations(files, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  file: one(files, {
    fields: [messages.fileId],
    references: [files.id],
  }),
}));

// === SCHEMAS ===

export const insertFileSchema = createInsertSchema(files).omit({ 
  id: true, 
  publicId: true, 
  createdAt: true 
});

export const insertMessageSchema = createInsertSchema(messages).omit({ 
  id: true, 
  createdAt: true 
});

// === EXPLICIT TYPES ===

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type CreateFileRequest = InsertFile;
export type CreateMessageRequest = InsertMessage;

export type FileResponse = File;
export type MessageResponse = Message;
