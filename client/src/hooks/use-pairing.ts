import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export function usePairing(username: string) {
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPaired, setIsPaired] = useState(false);
  const [pairedRoomId, setPairedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on("code-generated", ({ code }: { code: string }) => {
      setPairingCode(code);
    });

    socket.on("paired", ({ roomId }: { roomId: string }) => {
      setIsPaired(true);
      setPairedRoomId(roomId);
      setPairingCode(null);
      setError(null);
    });

    socket.on("pair-message", (message: any) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("pairing-error", ({ message }: { message: string }) => {
      setError(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const generateCode = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("generate-code");
    }
  }, []);

  const joinPairing = useCallback((code: string) => {
    if (socketRef.current) {
      socketRef.current.emit("join-pairing", { code });
    }
  }, []);

  const sendPairMessage = useCallback((content: string) => {
    if (socketRef.current && pairedRoomId) {
      socketRef.current.emit("pair-message", {
        roomId: pairedRoomId,
        content,
        senderName: username,
      });
    }
  }, [pairedRoomId, username]);

  return {
    pairingCode,
    isPaired,
    messages,
    error,
    generateCode,
    joinPairing,
    sendPairMessage,
  };
}
