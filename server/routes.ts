import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { Server as SocketIOServer } from "socket.io";
import { insertFileSchema } from "@shared/schema";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";
import { addHours } from "date-fns";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === Socket.io Setup ===
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    socket.on("join", async ({ publicId, senderName }) => {
      const file = await storage.getFileByPublicId(publicId);
      if (file) {
        socket.join(publicId);
        const history = await storage.getMessages(file.id);
        socket.emit("history", history);
      } else {
        socket.emit("error", { message: "Room not found" });
      }
    });

    socket.on("message", async ({ publicId, content, senderName }) => {
      const file = await storage.getFileByPublicId(publicId);
      if (file) {
        const message = await storage.createMessage({
          fileId: file.id,
          senderName,
          content
        });
        io.to(publicId).emit("message", message);
      }
    });
  });

  // === API Routes ===

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const form = new FormData();
      form.append("file", req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      const response = await fetch("https://file.io/?expires=2h", {
        method: "POST",
        body: form,
        headers: form.getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to upload to file.io");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "File.io upload failed");
      }

      const expiresAt = addHours(new Date(), 2);
      const file = await storage.createFile({
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        fileIoLink: data.link,
        fileIoKey: data.key,
        expiresAt,
      });

      res.status(201).json(file);
    } catch (err: any) {
      console.error("Upload proxy error:", err);
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  });

  app.post(api.files.create.path, async (req, res) => {
    try {
      const cleanBody = { ...req.body };
      delete cleanBody.id;
      delete cleanBody.publicId;
      delete cleanBody.createdAt;
      
      const input = insertFileSchema.parse(cleanBody);
      const file = await storage.createFile(input);
      res.status(201).json(file);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.get(api.files.getByPublicId.path, async (req, res) => {
    const file = await storage.getFileByPublicId(req.params.publicId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.json(file);
  });

  app.get(api.messages.list.path, async (req, res) => {
    const messages = await storage.getMessages(Number(req.params.fileId));
    res.json(messages);
  });

  return httpServer;
}
