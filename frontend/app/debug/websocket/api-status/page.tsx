/**
 * WebSocket API Status Page
 * 
 * This page checks the status of WebSocket-related API endpoints and
 * provides information about the server's configuration.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PingResponse {
  success: boolean;
  timestamp: string;
  message: string;
  websocketServer?: {
    status: string;
    url?: string;
  };
  env?: Record<string, string>;
  error?: string;
}

export default function ApiStatusPage() {
  const [pingResponse, setPingResponse] = useState<PingResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkApiStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/ping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client: "WebSocketDebugger" }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPingResponse(data);
      } else {
        const text = await response.text();
        setError(`API returned status ${response.status}: ${text}`);
      }
    } catch (error) {
      setError(`Failed to reach API: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  // Check status on initial load
  useEffect(() => {
    checkApiStatus();
  }, []);

  // Format JSON for display
  const formatJson = (obj: any): string => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">WebSocket API Status</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Check server-side WebSocket configuration and status
          </p>
        </div>
        <div>
          <Link href="/debug/websocket" className="text-blue-500 hover:underline mr-4">
            Back to WebSocket Debug
          </Link>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button 
            onClick={checkApiStatus} 
            disabled={loading}
          >
            {loading ? "Checking..." : "Check Status"}
          </Button>
          {lastChecked && (
            <span className="text-sm text-gray-500">
              Last checked: {lastChecked}
            </span>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardHeader className="bg-red-50 dark:bg-red-900">
            <CardTitle className="text-red-700 dark:text-red-300">Error</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-red-600 dark:text-red-400">{error}</div>
          </CardContent>
        </Card>
      )}

      {pingResponse && (
        <div className="space-y-6">
          <Card>
            <CardHeader className={pingResponse.success ? "bg-green-50 dark:bg-green-900" : "bg-red-50 dark:bg-red-900"}>
              <CardTitle className={pingResponse.success ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                API Status: {pingResponse.success ? "Online" : "Error"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div><strong>Message:</strong> {pingResponse.message}</div>
                <div><strong>Timestamp:</strong> {new Date(pingResponse.timestamp).toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>

          {pingResponse.websocketServer && (
            <Card>
              <CardHeader className={
                pingResponse.websocketServer.status === "running" 
                  ? "bg-green-50 dark:bg-green-900" 
                  : "bg-red-50 dark:bg-red-900"
              }>
                <CardTitle className={
                  pingResponse.websocketServer.status === "running" 
                    ? "text-green-700 dark:text-green-300" 
                    : "text-red-700 dark:text-red-300"
                }>
                  WebSocket Server: {pingResponse.websocketServer.status}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {pingResponse.websocketServer.url && (
                    <div>
                      <strong>URL:</strong> {pingResponse.websocketServer.url}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {pingResponse.env && (
            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto font-mono text-sm">
                  {formatJson(pingResponse.env)}
                </pre>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Raw Response</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto font-mono text-sm">
                {formatJson(pingResponse)}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Server Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            <p>
              To test the WebSocket server directly from the command line, you can use the provided Node.js script:
            </p>
            
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md font-mono text-sm">
              <p>1. Navigate to the backend directory:</p>
              <p className="text-green-600 dark:text-green-400 mt-2">cd backend</p>
              
              <p className="mt-4">2. Install WebSocket dependencies if needed:</p>
              <p className="text-green-600 dark:text-green-400 mt-2">./src/tools/install-test-deps.sh</p>
              
              <p className="mt-4">3. Run the test script:</p>
              <p className="text-green-600 dark:text-green-400 mt-2">node src/tools/test-websocket.js 4100</p>
              
              <p className="mt-4">4. Expected output if successful:</p>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Connecting to WebSocket server at ws://localhost:4100...<br/>
                Connection established!<br/>
                Sending ping message...<br/>
                Received message: &#123;"type":"pong","data":"Server received ping"&#125;<br/>
                Test completed successfully! WebSocket server is running properly.
              </p>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Note: The server must be running on port 4100 for this test to succeed. 
              If you're using a different port, replace 4100 with your port number.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 