import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { Server as SocketIOServer } from "socket.io";
import { insertFileSchema, files } from "@shared/schema";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { addHours } from "date-fns";
import { eq } from "drizzle-orm";
import { db } from "./db";

const upload = multer({ storage: multer.memoryStorage() });

// === Pairing System (In-Memory) ===
const pairingCodes = new Map<string, { socketId: string; expires: number }>();

function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    console.log("New client connected", socket.id);

    // --- Pairing Logic ---
    socket.on("generate-code", () => {
      const code = generatePairingCode();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
      
      // Join a room specifically for this code immediately
      const pendingRoom = `pending-${code}`;
      socket.join(pendingRoom);
      
      pairingCodes.set(code, { socketId: socket.id, expires });
      
      // Auto-cleanup after expiration
      setTimeout(() => {
        pairingCodes.delete(code);
      }, 10 * 60 * 1000);

      socket.emit("code-generated", { code, expires });
      console.log(`Generated pairing code ${code} for socket ${socket.id}`);
    });

    socket.on("join-pairing", ({ code }) => {
      const entry = pairingCodes.get(code);
      
      if (!entry) {
        return socket.emit("pairing-error", { message: "Invalid or expired code" });
      }

      if (entry.expires < Date.now()) {
        pairingCodes.delete(code);
        return socket.emit("pairing-error", { message: "Code has expired" });
      }

      // Check if the creator is still in the pending room
      const pendingRoom = `pending-${code}`;
      const clients = io.sockets.adapter.rooms.get(pendingRoom);
      
      if (!clients || clients.size === 0) {
        pairingCodes.delete(code);
        return socket.emit("pairing-error", { message: "Partner disconnected or refreshed" });
      }

      // Create a unique room for this pair
      const roomId = `pair-${code}`;
      
      // Move everyone from pending room to the pair room
      for (const clientId of clients) {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (clientSocket) {
          clientSocket.leave(pendingRoom);
          clientSocket.join(roomId);
        }
      }
      
      // Current socket joins the pair room
      socket.join(roomId);

      // Notify both parties
      io.to(roomId).emit("paired", { roomId });
      pairingCodes.delete(code); // Code used
      console.log(`Paired devices in room ${roomId}`);
    });

    socket.on("pair-message", ({ roomId, content, senderName }) => {
      io.to(roomId).emit("pair-message", { content, senderName, timestamp: new Date() });
    });
    // --- End Pairing Logic ---

    socket.on("join", async ({ publicId, senderName }) => {
      console.log(`Join request for room: ${publicId} from ${senderName}`);
      const file = await storage.getFileByPublicId(publicId);
      if (file) {
        socket.join(publicId);
        console.log(`Socket ${socket.id} joined room ${publicId}`);
        
        const history = await storage.getMessages(file.id);
        socket.emit("history", history);
      } else {
        console.log(`Room ${publicId} not found for join`);
        socket.emit("error", { message: "Room not found" });
      }
    });

    socket.on("message", async ({ publicId, content, senderName }) => {
      console.log(`Message in room ${publicId} from ${senderName}: ${content}`);
      const file = await storage.getFileByPublicId(publicId);
      if (file) {
        const message = await storage.createMessage({
          fileId: file.id,
          senderName,
          content
        });
        console.log(`Broadcasting message to room ${publicId}`);
        io.to(publicId).emit("message", message);
      } else {
        console.log(`Room ${publicId} not found for message`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Client disconnected", socket.id, reason);
    });
  });

  // === API Routes ===

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log(`Storing upload: ${req.file.originalname} (${req.file.size} bytes)`);
      
      const expiresAt = addHours(new Date(), 2);
      const file = await storage.createFile({
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        fileIoLink: "pending", 
        fileIoKey: "local-key",
        expiresAt,
      });

      const [updatedFile] = await db.update(files)
        .set({ fileIoLink: `/api/download/${file.publicId}` })
        .where(eq(files.id, file.id))
        .returning();
      
      (storage as any).fileBuffers = (storage as any).fileBuffers || new Map();
      (storage as any).fileBuffers.set(updatedFile.publicId, req.file.buffer);

      res.status(201).json(updatedFile);
    } catch (err: any) {
      console.error("Upload error:", err.message);
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  });

  app.get("/api/download/:publicId", async (req, res) => {
    const file = await storage.getFileByPublicId(req.params.publicId);
    if (!file) return res.status(404).send("Not found");
    
    const buffer = (storage as any).fileBuffers?.get(req.params.publicId);
    if (!buffer) return res.status(404).send("File expired or not found");

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.send(buffer);
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
