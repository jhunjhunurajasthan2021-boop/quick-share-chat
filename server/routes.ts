import type { Express, Request, Response, NextFunction } from "express";
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
import { db, withRetry } from "./db";

const upload = multer({ storage: multer.memoryStorage() });

// === Pairing System (In-Memory) ===
const pairingCodes = new Map<string, { socketId: string; expires: number }>();

function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// === Admin Auth Middleware ===
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "privlink-admin-2024";
const adminSessions = new Set<string>();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers["x-admin-token"] as string;
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// === Helpers ===
function getDeviceInfo(req: Request): string {
  return req.headers["user-agent"] || "Unknown";
}

function getIpAddress(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return (typeof forwarded === "string" ? forwarded : forwarded[0]).split(",")[0].trim();
  return req.socket.remoteAddress || "Unknown";
}

// === Suspicious file type detection ===
const SUSPICIOUS_TYPES = [
  "application/x-executable",
  "application/x-msdownload",
  "application/x-bat",
  "application/x-sh",
  "application/vnd.android.package-archive",
  "application/x-dosexec",
];
const SUSPICIOUS_EXTENSIONS = [".exe", ".bat", ".sh", ".apk", ".cmd", ".scr", ".vbs", ".ps1"];

function isSuspiciousFile(filename: string, mimeType: string): { suspicious: boolean; reason?: string } {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  if (SUSPICIOUS_EXTENSIONS.includes(ext)) {
    return { suspicious: true, reason: `Suspicious file extension: ${ext}` };
  }
  if (SUSPICIOUS_TYPES.includes(mimeType)) {
    return { suspicious: true, reason: `Suspicious MIME type: ${mimeType}` };
  }
  return { suspicious: false };
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
      const expires = Date.now() + 10 * 60 * 1000;
      
      const pendingRoom = `pending-${code}`;
      socket.join(pendingRoom);
      
      pairingCodes.set(code, { socketId: socket.id, expires });
      
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

      const pendingRoom = `pending-${code}`;
      const clients = io.sockets.adapter.rooms.get(pendingRoom);
      
      if (!clients || clients.size === 0) {
        pairingCodes.delete(code);
        return socket.emit("pairing-error", { message: "Partner disconnected or refreshed" });
      }

      const roomId = `pair-${code}`;
      
      for (const clientId of clients) {
        const clientSocket = io.sockets.sockets.get(clientId);
        if (clientSocket) {
          clientSocket.leave(pendingRoom);
          clientSocket.join(roomId);
        }
      }
      
      socket.join(roomId);
      io.to(roomId).emit("paired", { roomId });
      pairingCodes.delete(code);
      console.log(`Paired devices in room ${roomId}`);
    });

    socket.on("pair-message", ({ roomId, content, senderName }) => {
      io.to(roomId).emit("pair-message", { content, senderName, timestamp: new Date() });
      // Log paired chat messages
      storage.logActivity({
        actionType: "chat_message",
        senderName,
        messageContent: content,
        ipAddress: "paired-session",
        deviceInfo: "WebSocket/Paired",
        isFlagged: false,
      }).catch(console.error);
    });
    // --- End Pairing Logic ---

    socket.on("join", async ({ publicId, senderName }) => {
      console.log(`Join request for room: ${publicId} from ${senderName}`);
      const file = await withRetry(() => storage.getFileByPublicId(publicId));
      if (file) {
        socket.join(publicId);
        console.log(`Socket ${socket.id} joined room ${publicId}`);
        const history = await withRetry(() => storage.getMessages(file.id));
        socket.emit("history", history);
      } else {
        console.log(`Room ${publicId} not found for join`);
        socket.emit("error", { message: "Room not found" });
      }
    });

    socket.on("message", async ({ publicId, content, senderName }) => {
      console.log(`Message in room ${publicId} from ${senderName}: ${content}`);
      const file = await withRetry(() => storage.getFileByPublicId(publicId));
      if (file) {
        const message = await withRetry(() => storage.createMessage({
          fileId: file.id,
          senderName,
          content
        }));
        console.log(`Broadcasting message to room ${publicId}`);
        io.to(publicId).emit("message", message);

        // Log chat message
        storage.logActivity({
          actionType: "chat_message",
          senderName,
          messageContent: content,
          publicId,
          fileName: file.filename,
          ipAddress: "WebSocket",
          deviceInfo: "WebSocket",
          isFlagged: false,
        }).catch(console.error);
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
      const file = await withRetry(() => storage.createFile({
        filename: req.file!.originalname,
        mimeType: req.file!.mimetype,
        size: req.file!.size,
        fileIoLink: "pending", 
        fileIoKey: "local-key",
        expiresAt,
      }));

      const [updatedFile] = await withRetry(() =>
        db.update(files)
          .set({ fileIoLink: `/api/download/${file.publicId}` })
          .where(eq(files.id, file.id))
          .returning()
      );
      
      (storage as any).fileBuffers = (storage as any).fileBuffers || new Map();
      (storage as any).fileBuffers.set(updatedFile.publicId, req.file.buffer);

      // Check for suspicious file and auto-flag
      const suspicion = isSuspiciousFile(req.file.originalname, req.file.mimetype);
      await storage.logActivity({
        actionType: "file_upload",
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        publicId: updatedFile.publicId,
        ipAddress: getIpAddress(req),
        deviceInfo: getDeviceInfo(req),
        isFlagged: suspicion.suspicious,
        flagReason: suspicion.reason,
      });

      res.status(201).json(updatedFile);
    } catch (err: any) {
      console.error("Upload error:", err.message);
      res.status(500).json({ message: err.message || "Internal Server Error" });
    }
  });

  app.get("/api/download/:publicId", async (req, res) => {
    const file = await withRetry(() => storage.getFileByPublicId(req.params.publicId));
    if (!file) return res.status(404).send("Not found");
    
    const buffer = (storage as any).fileBuffers?.get(req.params.publicId);
    if (!buffer) return res.status(404).send("File expired or not found");

    // Log download
    storage.logActivity({
      actionType: "file_download",
      fileName: file.filename,
      fileType: file.mimeType,
      fileSize: file.size,
      publicId: req.params.publicId,
      ipAddress: getIpAddress(req),
      deviceInfo: getDeviceInfo(req),
      isFlagged: false,
    }).catch(console.error);

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
    const msgs = await storage.getMessages(Number(req.params.fileId));
    res.json(msgs);
  });

  // === Admin API Routes ===

  // Admin Login
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid password" });
    }
    const token = `admin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    adminSessions.add(token);
    // Clean up old sessions after 8 hours
    setTimeout(() => adminSessions.delete(token), 8 * 60 * 60 * 1000);
    res.json({ token });
  });

  // Admin Logout
  app.post("/api/admin/logout", requireAdmin, (req, res) => {
    const token = req.headers["x-admin-token"] as string;
    adminSessions.delete(token);
    res.json({ message: "Logged out" });
  });

  // Get all activity logs
  app.get("/api/admin/logs", requireAdmin, async (req, res) => {
    try {
      const { from, to, actionType } = req.query;
      const filters: { from?: Date; to?: Date; actionType?: string } = {};
      if (from) filters.from = new Date(from as string);
      if (to) filters.to = new Date(to as string);
      if (actionType && actionType !== "all") filters.actionType = actionType as string;
      const logs = await storage.getAllActivityLogs(filters);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Flag a log entry
  app.post("/api/admin/logs/:id/flag", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      await storage.flagLog(Number(req.params.id), reason || "Manually flagged by admin");
      res.json({ message: "Flagged" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Unflag a log entry
  app.post("/api/admin/logs/:id/unflag", requireAdmin, async (req, res) => {
    try {
      await storage.unflagLog(Number(req.params.id));
      res.json({ message: "Unflagged" });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Export logs as CSV
  app.get("/api/admin/logs/export", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getAllActivityLogs();
      const header = ["id", "actionType", "senderName", "receiverName", "messageContent", "fileName", "fileType", "fileSize", "publicId", "ipAddress", "deviceInfo", "isFlagged", "flagReason", "createdAt"];
      const rows = logs.map(l => [
        l.id,
        l.actionType,
        l.senderName || "",
        l.receiverName || "",
        (l.messageContent || "").replace(/,/g, " "),
        l.fileName || "",
        l.fileType || "",
        l.fileSize || "",
        l.publicId || "",
        l.ipAddress || "",
        (l.deviceInfo || "").replace(/,/g, " "),
        l.isFlagged,
        l.flagReason || "",
        l.createdAt,
      ]);
      const csv = [header, ...rows].map(r => r.join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="privlink-logs-${Date.now()}.csv"`);
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get stats summary for admin
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const logs = await storage.getAllActivityLogs();
      const total = logs.length;
      const chats = logs.filter(l => l.actionType === "chat_message").length;
      const uploads = logs.filter(l => l.actionType === "file_upload").length;
      const downloads = logs.filter(l => l.actionType === "file_download").length;
      const flagged = logs.filter(l => l.isFlagged).length;
      res.json({ total, chats, uploads, downloads, flagged });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
