import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { type Message } from "@shared/schema";

export function useChat(publicId: string, username: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!publicId) return;

    // Connect using default path and proper options
    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to socket", socket.id);
      
      // Join the specific file room
      socket.emit("join", { publicId, senderName: username });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Disconnected from socket");
    });

    // Receive chat history immediately after joining
    socket.on("history", (history: Message[]) => {
      setMessages(history);
    });

    // Listen for new messages
    socket.on("message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [publicId, username]);

  const sendMessage = useCallback((content: string) => {
    if (socketRef.current && isConnected) {
      console.log(`Sending message to room ${publicId}: ${content}`);
      socketRef.current.emit("message", {
        publicId, // Explicitly include the room ID
        content,
        senderName: username,
      });
    }
  }, [isConnected, username, publicId]);

  return { messages, sendMessage, isConnected };
}
