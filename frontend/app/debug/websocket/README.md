# WebSocket Debugging Suite

This directory contains a comprehensive set of tools for debugging WebSocket connections in the application.

## Overview

The WebSocket debugging suite provides tools to help diagnose and troubleshoot WebSocket connection issues. It includes components for:

1. **Visualizing WebSocket connections and messages**
2. **Testing raw WebSocket connections directly**
3. **Checking server-side WebSocket configuration**
4. **Server-side testing tools**

## Available Tools

### WebSocket Debug Page (`/debug/websocket`)

The main debug page provides a high-level overview of WebSocket functionality and links to specialized debugging tools. It displays:

- Current connection status
- WebSocket configuration
- Environment variables
- Links to specialized testing tools

### Raw WebSocket Tester (`/debug/websocket/raw-tester`)

This tool allows direct testing of WebSocket connections without application-specific logic. Features:

- Direct connection to the WebSocket server
- Manual message sending
- Automatic reconnection
- Detailed connection logs
- Visualization of sent and received messages
- Support for raw or JSON message formats
- Ping functionality to test server responsiveness

### API WebSocket Status (`/debug/websocket/api-status`)

Checks the backend server's WebSocket configuration through the REST API. Features:

- Server-side WebSocket status check
- Environment variable inspection
- Detailed server configuration display
- Connection testing

### Server-Side Test Script (`backend/src/tools/test-websocket.js`)

A Node.js script that tests WebSocket connections directly from the server, bypassing browser limitations. Usage:

```bash
# Install dependencies
cd backend
./src/tools/install-test-deps.sh

# Run the test
node src/tools/test-websocket.js 4100
```

## Common Issues & Solutions

### Connection Refused

If you see "Connection refused" errors:

- Verify the WebSocket server is running on the specified port
- Check for firewall or network restrictions
- Ensure the hostname/IP is correct and accessible

### Path Not Found (404)

If the connection is rejected with a 404-like error:

- Verify the WebSocket path in the URL
- Some servers use specific paths like "/socket" or "/ws"
- Others use the root path - try removing any path component

### CORS Issues

If you see CORS-related errors in the browser console:

- The WebSocket server needs to allow your origin
- Check the server's CORS configuration

### Protocol Errors

If the connection closes with protocol errors:

- Ensure you're sending data in the format the server expects
- Many WebSocket servers expect valid JSON messages
- Try toggling between raw mode and JSON mode

### Certificate Issues

If using secure WebSockets (wss://) and seeing certificate errors:

- Ensure the server has a valid SSL certificate
- If using a self-signed certificate, it may not work in browsers

## Environment Variables

The WebSocket implementation uses these environment variables:

- `NEXT_PUBLIC_WEBSOCKET_URL`: The WebSocket server URL (default: `ws://localhost:4100`)
- `NEXT_PUBLIC_API_URL`: The REST API URL (default: `http://localhost:4100`)

## Implementation Details

### Client-Side Components

- `use-websocket.ts`: Main WebSocket hook with reconnection logic
- `websocket-connection.tsx`: Connection status display component
- `websocket-debug.tsx`: Floating debug panel for in-app debugging

### Server-Side Components

- `/api/ping` endpoint: Bridge between frontend and backend for status checks
- `/ping` backend endpoint: Server-side health check
- `test-websocket.js`: Direct testing script for server-to-server connections

## Troubleshooting Steps

1. **Check server status**: Ensure the WebSocket server is running
2. **Verify URL**: Make sure the WebSocket URL is correct (including protocol, host, port, and path)
3. **Check network**: Ensure there are no network restrictions blocking WebSocket connections
4. **Test with Raw Tester**: Use the raw tester to bypass application logic
5. **Check server logs**: Look for errors or connection rejections
6. **Try server-side script**: Test connections directly from the server
7. **Check CORS**: Ensure CORS is configured properly if connecting from a different origin

## Best Practices

1. Always include proper error handling for WebSocket connections
2. Implement reconnection logic with exponential backoff
3. Provide clear visual feedback about connection status to users
4. Log WebSocket events with timestamps for debugging
5. Separate connection logic from application logic for easier troubleshooting 