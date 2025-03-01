"use client";

import * as React from 'react';

/**
 * Debug component to help diagnose socket connection issues
 * Injects a socket connection and provides UI for debugging
 */
export default function DebugSocket() {
  const [debugData, setDebugData] = React.useState<{
    attempts: number;
    connected: boolean;
    error: string | null;
    logs: string[];
  }>({
    attempts: 0,
    connected: false,
    error: null,
    logs: []
  });
  
  // Add a log message
  const addLog = React.useCallback((message: string) => {
    setDebugData(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-19), message]
    }));
  }, []);
  
  // Force a direct socket connection
  const forceConnection = React.useCallback(() => {
    try {
      // Socket.io might not be available immediately
      if (typeof window === 'undefined' || !(window as any).io) {
        addLog("⚠️ Socket.io not available - loading dynamically");
        
        // Try to load Socket.io dynamically
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.4/socket.io.min.js';
        script.async = true;
        script.onload = () => {
          addLog("✅ Socket.io loaded dynamically");
          setTimeout(forceConnection, 100);
        };
        script.onerror = () => {
          addLog("❌ Failed to load Socket.io");
        };
        document.head.appendChild(script);
        return;
      }
      
      const io = (window as any).io;
      addLog("🔄 Creating direct socket connection...");
      
      setDebugData(prev => ({
        ...prev,
        attempts: prev.attempts + 1
      }));
      
      // Create socket with explicit options
      const socket = io('http://localhost:4100', {
        transports: ['polling', 'websocket'], // Try polling first
        reconnection: true,
        reconnectionAttempts: 5,
        timeout: 10000,
        forceNew: true,
        auth: {
          userId: 'debug-component',
          username: 'Debug Component',
          timestamp: Date.now()
        }
      });
      
      addLog(`🔌 Socket object created (attempt ${debugData.attempts + 1})`);
      
      // Handle connection
      socket.on('connect', () => {
        addLog(`✅ CONNECTED! Socket ID: ${socket.id}`);
        setDebugData(prev => ({
          ...prev,
          connected: true,
          error: null
        }));
        
        // Try sending a test message
        try {
          socket.emit('message:sent', {
            id: `debug-${Date.now()}`,
            content: 'Test message from debug component',
            role: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'sending',
            userId: 'debug-component'
          }, (response: any) => {
            addLog(`📩 Response received: ${JSON.stringify(response).substring(0, 50)}...`);
          });
          addLog("📤 Test message sent");
        } catch (err) {
          addLog(`⚠️ Error sending message: ${err instanceof Error ? err.message : String(err)}`);
        }
      });
      
      // Handle connection error
      socket.on('connect_error', (err: Error) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        addLog(`❌ CONNECTION ERROR: ${errorMsg}`);
        setDebugData(prev => ({
          ...prev,
          connected: false,
          error: errorMsg
        }));
      });
      
      // Handle disconnection
      socket.on('disconnect', (reason: string) => {
        addLog(`⚠️ Disconnected: ${reason}`);
        setDebugData(prev => ({
          ...prev,
          connected: false
        }));
      });
      
      // Log all events
      socket.onAny((event: string, ...args: unknown[]) => {
        addLog(`📨 Event: ${event}`);
      });
      
      // Store socket for cleanup
      (window as any).debugComponentSocket = socket;
      
      // Clean up after 30 seconds
      setTimeout(() => {
        if ((window as any).debugComponentSocket) {
          addLog("⏱️ Auto-cleanup after 30s");
          (window as any).debugComponentSocket.disconnect();
          delete (window as any).debugComponentSocket;
        }
      }, 30000);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ ERROR: ${errorMsg}`);
      setDebugData(prev => ({
        ...prev,
        error: errorMsg
      }));
    }
  }, [addLog, debugData.attempts]);
  
  // Try connection on mount
  React.useEffect(() => {
    addLog("🚀 Debug component mounted");
    
    // Wait a bit before attempting connection
    const timer = setTimeout(() => {
      forceConnection();
    }, 500);
    
    return () => {
      clearTimeout(timer);
      
      // Clean up socket if it exists
      if ((window as any).debugComponentSocket) {
        (window as any).debugComponentSocket.disconnect();
        delete (window as any).debugComponentSocket;
      }
      
      addLog("🛑 Debug component unmounted");
    };
  }, [addLog, forceConnection]);
  
  return (
    <div className="fixed bottom-0 right-0 z-50 w-80 bg-black/80 text-white text-xs p-2 rounded-tl-md font-mono">
      <div className="flex justify-between items-center mb-1">
        <div className="font-bold">Socket Debugger</div>
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-1 ${debugData.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{debugData.connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      {debugData.error && (
        <div className="bg-red-900/50 p-1 rounded mb-1 text-red-300">
          Error: {debugData.error}
        </div>
      )}
      
      <div className="flex gap-1 mt-1 mb-1">
        <button 
          onClick={forceConnection}
          className="bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded text-xs"
        >
          Force Connect
        </button>
        <button 
          onClick={() => {
            if ((window as any).debugComponentSocket) {
              (window as any).debugComponentSocket.disconnect();
              delete (window as any).debugComponentSocket;
              addLog("🔌 Socket manually disconnected");
              setDebugData(prev => ({
                ...prev,
                connected: false
              }));
            }
          }}
          className="bg-gray-600 hover:bg-gray-700 px-2 py-0.5 rounded text-xs"
        >
          Disconnect
        </button>
        <button 
          onClick={() => setDebugData(prev => ({ ...prev, logs: [] }))}
          className="bg-gray-600 hover:bg-gray-700 px-2 py-0.5 rounded text-xs ml-auto"
        >
          Clear
        </button>
      </div>
      
      <div className="h-32 overflow-y-auto border border-gray-700 p-1 rounded bg-black/60">
        {debugData.logs.map((log, i) => (
          <div key={i} className="mb-0.5 leading-tight">{log}</div>
        ))}
        {debugData.logs.length === 0 && (
          <div className="text-gray-500 italic">No logs yet</div>
        )}
      </div>
    </div>
  );
} 