import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { Server as SocketIOServer } from "socket.io";
import { insertFileSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // === Socket.io Setup ===
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Allow all origins for simplicity in this demo
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);

    socket.on("join", async ({ publicId, senderName }) => {
      // Validate room exists
      const file = await storage.getFileByPublicId(publicId);
      if (file) {
        socket.join(publicId);
        console.log(`${senderName} joined room ${publicId}`);
        
        // Send history
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
        // Broadcast to room
        io.to(publicId).emit("message", message);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  // === API Routes ===

  app.post(api.files.create.path, async (req, res) => {
    try {
      // Clean input: remove id/publicId/createdAt if present
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
        console.error("Create file error:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.get(api.files.getByPublicId.path, async (req, res) => {
    const publicId = req.params.publicId;
    const file = await storage.getFileByPublicId(publicId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    res.json(file);
  });

  app.get(api.messages.list.path, async (req, res) => {
    const fileId = Number(req.params.fileId);
    const messages = await storage.getMessages(fileId);
    res.json(messages);
  });

  return httpServer;
}
