import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export type NearbyDevice = {
  id: string;
  name: string;
  deviceType: "Mobile" | "Computer" | "Tablet" | "Unknown";
};

export type IncomingConnectionRequest = {
  requestId: string;
  from: NearbyDevice;
};

export function usePairing(username: string) {
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPaired, setIsPaired] = useState(false);
  const [pairedRoomId, setPairedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nearbyDevices, setNearbyDevices] = useState<NearbyDevice[]>([]);
  const [incomingRequest, setIncomingRequest] = useState<IncomingConnectionRequest | null>(null);
  const [outgoingRequest, setOutgoingRequest] = useState<{ requestId: string; targetName: string } | null>(null);
  const [discoverable, setDiscoverableState] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const discoverableRef = useRef(true);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    const deviceType = /iPad|Tablet/i.test(navigator.userAgent)
      ? "Tablet"
      : /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent)
        ? "Mobile"
        : /Windows|Macintosh|Linux/i.test(navigator.userAgent)
          ? "Computer"
          : "Unknown";

    const registerDevice = () => {
      socket.emit("register-device", {
        name: username,
        deviceType,
        discoverable: discoverableRef.current,
      });
    };

    socket.on("connect", registerDevice);
    socket.on("nearby-devices", ({ devices }: { devices: NearbyDevice[] }) => {
      setNearbyDevices(devices);
    });

    socket.on("code-generated", ({ code }: { code: string }) => {
      setPairingCode(code);
    });

    socket.on("paired", ({ roomId }: { roomId: string }) => {
      setIsPaired(true);
      setPairedRoomId(roomId);
      setPairingCode(null);
      setError(null);
      setIncomingRequest(null);
      setOutgoingRequest(null);
    });

    socket.on("pair-message", (message: any) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("connection-request", (request: IncomingConnectionRequest) => {
      setIncomingRequest(request);
    });

    socket.on("connection-request-sent", (request: { requestId: string; targetName: string }) => {
      setOutgoingRequest(request);
      setError(null);
    });

    socket.on("connection-request-accepted", () => {
      setOutgoingRequest(null);
    });

    socket.on("connection-request-denied", () => {
      setOutgoingRequest(null);
      setError("The other device declined the connection.");
    });

    socket.on("connection-request-expired", () => {
      setOutgoingRequest(null);
      setError("The connection request expired.");
    });

    socket.on("connection-request-error", ({ message }: { message: string }) => {
      setOutgoingRequest(null);
      setError(message);
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

  const requestConnection = useCallback((targetId: string) => {
    if (socketRef.current && !isPaired) {
      socketRef.current.emit("request-connection", { targetId });
    }
  }, [isPaired]);

  const respondToConnectionRequest = useCallback((requestId: string, accepted: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit("respond-connection-request", { requestId, accepted });
      setIncomingRequest(null);
    }
  }, []);

  const setDiscoverable = useCallback((value: boolean) => {
    discoverableRef.current = value;
    setDiscoverableState(value);
    socketRef.current?.emit("set-device-discoverable", { discoverable: value });
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
    nearbyDevices,
    incomingRequest,
    outgoingRequest,
    discoverable,
    generateCode,
    joinPairing,
    requestConnection,
    respondToConnectionRequest,
    setDiscoverable,
    sendPairMessage,
  };
}
