"use client";

import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@/components/ui/button';

// Simple socket status indicator component
function StatusIndicator({ status }: { status: "connected" | "connecting" | "disconnected" | "failed" }) {
  const colors = {
    connected: "bg-green-500",
    connecting: "bg-yellow-500 animate-pulse",
    disconnected: "bg-red-500",
    failed: "bg-red-800"
  };
  
  return (
    <div className="flex items-center">
      <div className={`w-3 h-3 rounded-full mr-2 ${colors[status]}`}></div>
      <span className="font-semibold capitalize">{status}</span>
    </div>
  );
}

export default function SocketTestPage() {
  const [connectionStatus, setConnectionStatus] = React.useState<"connected" | "connecting" | "disconnected" | "failed">("disconnected");
  const [socketId, setSocketId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [logs, setLogs] = React.useState<Array<{level: string, message: string, timestamp: string}>>([]);
  const logsRef = React.useRef<HTMLDivElement>(null);
  const socketRef = React.useRef<Socket | null>(null);
  
  // Add log entry
  const addLog = React.useCallback((level: "info" | "error" | "success" | "warn", message: string) => {
    setLogs(prev => [...prev, {
      level,
      message,
      timestamp: new Date().toISOString().split('T')[1]?.split('.')[0] || ''
    }]);
    
    // Scroll to bottom
    setTimeout(() => {
      if (logsRef.current) {
        logsRef.current.scrollTop = logsRef.current.scrollHeight;
      }
    }, 100);
  }, []);
  
  // Connect to socket
  const connectSocket = React.useCallback(() => {
    // Clean up existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    setConnectionStatus("connecting");
    setError(null);
    addLog("info", "Attempting to connect to socket server...");
    
    try {
      // Create socket client
      const socket = io('http://localhost:4100', {
        transports: ['polling', 'websocket'], // Start with polling for reliability
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
        auth: {
          userId: 'nextjs-test-user',
          username: 'NextJS Test User',
          timestamp: Date.now()
        }
      });
      
      socketRef.current = socket;
      addLog("info", "Socket object created");
      
      // Connection established
      socket.on('connect', () => {
        setConnectionStatus("connected");
        setSocketId(socket.id || null);
        setError(null);
        addLog("success", `Connected successfully with ID: ${socket.id}`);
      });
      
      // Connection error
      socket.on('connect_error', (err) => {
        setConnectionStatus("failed");
        setError(err.message || "Unknown connection error");
        addLog("error", `Connection error: ${err.message}`);
        console.error('Socket connection error:', err);
      });
      
      // Disconnection
      socket.on('disconnect', (reason) => {
        setConnectionStatus("disconnected");
        setSocketId(null);
        addLog("warn", `Disconnected: ${reason}`);
      });
      
      // Reconnection attempts
      socket.io.on('reconnect_attempt', (attempt) => {
        setConnectionStatus("connecting");
        addLog("info", `Reconnection attempt ${attempt}`);
      });
      
      // Successful reconnection
      socket.io.on('reconnect', (attempt) => {
        setConnectionStatus("connected");
        setSocketId(socket.id || null);
        setError(null);
        addLog("success", `Reconnected after ${attempt} attempts`);
      });
      
      // Failed reconnection
      socket.io.on('reconnect_failed', () => {
        setConnectionStatus("failed");
        setError("Failed to reconnect after maximum attempts");
        addLog("error", "Failed to reconnect after all attempts");
      });
      
      // Log all events
      socket.onAny((event, ...args) => {
        addLog("info", `Event received: ${event}`);
        console.log(`Socket event: ${event}`, args);
      });
      
    } catch (err) {
      setConnectionStatus("failed");
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg);
      addLog("error", `Error initializing socket: ${errMsg}`);
      console.error('Socket initialization error:', err);
    }
  }, [addLog]);
  
  // Disconnect socket
  const disconnectSocket = React.useCallback(() => {
    if (socketRef.current) {
      addLog("info", "Manually disconnecting socket");
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnectionStatus("disconnected");
      setSocketId(null);
    } else {
      addLog("warn", "No active socket connection to disconnect");
    }
  }, [addLog]);
  
  // Send test message
  const sendTestMessage = React.useCallback(() => {
    if (!socketRef.current || !socketRef.current.connected) {
      addLog("error", "Cannot send message: Socket not connected");
      return;
    }
    
    const testMessage = {
      id: `test-${Date.now()}`,
      content: 'This is a test message from Next.js',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'sending',
      userId: 'nextjs-test-user',
      username: 'NextJS Test'
    };
    
    addLog("info", `Sending test message: ${testMessage.content}`);
    
    socketRef.current.emit('message:sent', testMessage, (response: any) => {
      addLog("success", "Message sent successfully, received response");
      console.log('Message response:', response);
    });
  }, [addLog]);
  
  // Clear logs
  const clearLogs = React.useCallback(() => {
    setLogs([]);
    addLog("info", "Logs cleared");
  }, [addLog]);
  
  // Render log entries
  const renderLogs = React.useCallback(() => {
    return logs.map((log, index) => {
      const colorClasses: Record<string, string> = {
        info: "text-blue-600 dark:text-blue-400",
        error: "text-red-600 dark:text-red-400",
        success: "text-green-600 dark:text-green-400",
        warn: "text-yellow-600 dark:text-yellow-400"
      };
      
      return (
        <div 
          key={index} 
          className={`py-1 border-b border-gray-100 dark:border-gray-800 ${colorClasses[log.level] || ""}`}
        >
          <span className="text-gray-500 dark:text-gray-400">[{log.timestamp}]</span> {log.message}
        </div>
      );
    });
  }, [logs]);
  
  // Add initial log entry
  React.useEffect(() => {
    addLog("info", "Socket test page initialized");
  }, [addLog]);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">Socket.IO Connection Test</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Test direct Socket.IO connection to backend server
      </p>
      
      {/* Status section */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <StatusIndicator status={connectionStatus} />
          {socketId && <div className="text-sm text-gray-500">ID: {socketId}</div>}
        </div>
        
        {error && (
          <div className="ml-0 md:ml-auto text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
            Error: {error}
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          onClick={connectSocket}
          disabled={connectionStatus === 'connected' || connectionStatus === 'connecting'}
          variant="default"
        >
          Connect Socket
        </Button>
        
        <Button 
          onClick={disconnectSocket}
          disabled={connectionStatus === 'disconnected'}
          variant="outline"
        >
          Disconnect
        </Button>
        
        <Button
          onClick={sendTestMessage}
          disabled={connectionStatus !== 'connected'}
          variant="secondary"
        >
          Send Test Message
        </Button>
        
        <Button 
          onClick={clearLogs}
          variant="ghost"
        >
          Clear Logs
        </Button>
      </div>
      
      {/* Logs section */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-100 dark:bg-gray-800 p-2 border-b font-medium">
          Event Logs
        </div>
        <div 
          ref={logsRef}
          className="h-[400px] overflow-y-auto p-4 font-mono text-sm bg-white dark:bg-gray-900"
        >
          {logs.length === 0 ? (
            <div className="text-gray-400 italic">No logs yet</div>
          ) : (
            renderLogs()
          )}
        </div>
      </div>
      
      {/* Help text */}
      <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        <p className="mb-2">
          This page tests direct socket connection between the browser and your backend socket server.
        </p>
        <p>
          If connection fails, check:
        </p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>Backend server is running on port 4100</li>
          <li>CORS settings on the backend allow connections from this origin</li>
          <li>No network issues or firewalls blocking WebSocket or HTTP connections</li>
          <li>Check browser developer console for additional errors</li>
        </ul>
      </div>
    </div>
  );
} 