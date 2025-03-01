"use client";

import * as React from "react";
import { io, Socket } from "socket.io-client";
import { ServerToClientEvents, ClientToServerEvents } from "@/types/socket";

/**
 * Direct socket connection tester component
 */
export function ChatDebug() {
  const [log, setLog] = React.useState<string[]>([]);
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const socketRef = React.useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const addLog = (message: string) => {
    setLog((prev) => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const connectSocket = React.useCallback(() => {
    try {
      addLog("Attempting direct socket connection to http://localhost:4100");
      
      // Create a simple socket connection
      const socket = io("http://localhost:4100", {
        transports: ["websocket", "polling"],
        reconnection: true,
        forceNew: true,
        auth: {
          userId: "test-user-1",
          username: "Test User",
          timestamp: Date.now(),
        },
      });
      
      addLog(`Socket created with ID: ${socket.id || "undefined"}`);
      
      socket.on("connect", () => {
        addLog(`Socket connected successfully! ID: ${socket.id}`);
        setConnected(true);
        setError(null);
      });
      
      socket.on("connect_error", (err) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        addLog(`Socket connection error: ${errorMessage}`);
        setError(errorMessage);
        setConnected(false);
      });
      
      socket.on("disconnect", (reason) => {
        addLog(`Socket disconnected: ${reason}`);
        setConnected(false);
      });
      
      socketRef.current = socket;
      
      return () => {
        addLog("Cleaning up socket");
        socket.disconnect();
        socketRef.current = null;
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error initializing socket: ${errorMessage}`);
      setError(errorMessage);
      return () => {};
    }
  }, []);

  // Connect on mount
  React.useEffect(() => {
    const cleanup = connectSocket();
    return cleanup;
  }, [connectSocket]);

  // Manual reconnect handler
  const handleReconnect = () => {
    if (socketRef.current) {
      addLog("Disconnecting existing socket");
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    connectSocket();
  };

  // Send test message
  const handleSendTest = () => {
    if (!socketRef.current || !socketRef.current.connected) {
      addLog("Cannot send test - socket not connected");
      return;
    }
    
    try {
      addLog("Sending test message");
      socketRef.current.emit("ping", { timestamp: Date.now() });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      addLog(`Error sending test: ${errorMessage}`);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-background">
      <h2 className="text-xl font-bold mb-2">Socket Direct Debug</h2>
      
      <div className="flex items-center gap-2 mb-4">
        <div 
          className={`w-3 h-3 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} 
        />
        <span>{connected ? "Connected" : "Disconnected"}</span>
        {error && <span className="text-red-500">Error: {error}</span>}
      </div>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleReconnect}
          className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Reconnect
        </button>
        <button
          onClick={handleSendTest}
          className="px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
          disabled={!connected}
        >
          Send Test Ping
        </button>
      </div>
      
      <div className="h-40 overflow-y-auto p-2 border bg-muted font-mono text-xs">
        {log.map((message, index) => (
          <div key={index} className="whitespace-pre-wrap">{message}</div>
        ))}
      </div>
    </div>
  );
}
