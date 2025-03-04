# Socket.IO Implementation

This directory contains a comprehensive Socket.IO implementation for React applications with TypeScript support. It provides a layered architecture with proper separation of concerns, type safety, and robust error handling.

## Architecture

The implementation follows a layered architecture pattern:

```
frontend/lib/socket/
  ├── core/              # Core connection management and types
  │   ├── connection.ts  # Socket connection management
  │   ├── events.ts      # Event definitions and types
  │   ├── state.ts       # Connection state management
  │   └── types.ts       # Type definitions
  ├── hooks/             # React hooks for socket functionality
  │   ├── use-socket.ts  # Main socket hook
  │   ├── use-socket-emit.ts # Hook for emitting events
  │   └── use-socket-event.ts # Hook for listening to events
  ├── providers/         # React context providers
  │   └── socket-provider.tsx # Socket context provider
  ├── utils/             # Utility functions
  │   ├── logger.ts      # Socket-specific logging
  │   └── url-resolver.ts # Resolve WebSocket URLs
  └── index.ts           # Public API
```

## Usage

### Basic Setup

1. Wrap your application with the `SocketProvider`:

```tsx
import { SocketProvider } from '@/lib/socket/providers';

function App() {
  return (
    <SocketProvider
      initialAuth={{ userId: 'user-123' }}
      config={{ showToasts: true }}
    >
      <YourApp />
    </SocketProvider>
  );
}
```

2. Use the socket in your components:

```tsx
import { useSocket } from '@/lib/socket/hooks';
import { useSocketEvent } from '@/lib/socket/hooks';

function ChatComponent() {
  const { socket, isConnected } = useSocket();
  
  // Listen for new messages
  useSocketEvent('message:new', (message) => {
    console.log('New message:', message);
  });
  
  // Send a message
  const sendMessage = () => {
    if (socket && isConnected) {
      socket.emit('message:send', {
        content: 'Hello, world!',
        conversationId: 'conv-123'
      });
    }
  };
  
  return (
    <div>
      <p>Connection status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <button onClick={sendMessage}>Send Message</button>
    </div>
  );
}
```

### Advanced Usage

#### Using the Emit Hook

```tsx
import { useSocketEmit } from '@/lib/socket/hooks';

function ChatForm() {
  const { emit } = useSocketEmit();
  
  const sendMessage = async (content: string) => {
    const result = await emit('message:send', {
      content,
      conversationId: 'conv-123'
    });
    
    if (result.success) {
      console.log('Message sent successfully:', result.data);
    } else {
      console.error('Failed to send message:', result.error);
    }
  };
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      sendMessage('Hello, world!');
    }}>
      <button type="submit">Send</button>
    </form>
  );
}
```

#### Listening to Multiple Events

```tsx
import { useSocketEvents } from '@/lib/socket/hooks';

function EventLogger() {
  useSocketEvents(
    ['message:new', 'message:update', 'message:delete'],
    (eventName, ...args) => {
      console.log(`Event ${eventName} received:`, args);
    }
  );
  
  return null;
}
```

#### Direct Socket Access (Non-React)

```ts
import { getSocket, initSocket, disconnectSocket } from '@/lib/socket/index';

// Initialize socket
initSocket({ userId: 'user-123' });

// Get socket instance
const socket = getSocket();

// Listen for events
socket?.on('message:new', (message) => {
  console.log('New message:', message);
});

// Disconnect when done
disconnectSocket();
```

## Features

- **Singleton Pattern**: Ensures only one socket connection is established per client
- **Type Safety**: Comprehensive TypeScript interfaces for all socket events
- **Layered Architecture**: Clear separation of concerns between connection, state, and UI
- **React Integration**: Custom hooks for easy integration with React components
- **Error Handling**: Robust error handling and recovery mechanisms
- **Logging**: Structured logging with log levels and filtering
- **Environment Awareness**: Automatically adapts to development and production environments
- **Toast Notifications**: Optional toast notifications for connection events

## Type System

The implementation uses a comprehensive type system to ensure type safety:

- `ServerToClientEvents`: Events sent from server to client
- `ClientToServerEvents`: Events sent from client to server
- `Socket`: Socket.IO socket with properly typed events
- `SocketContextValue`: Context value provided to components
- `ConnectionState`: Enum for connection states

## Best Practices

- **Use the hooks**: Prefer using the provided hooks over direct socket access
- **Error handling**: Always handle errors from socket operations
- **Cleanup**: Always clean up event listeners when components unmount
- **Authentication**: Always authenticate before sending sensitive data
- **Reconnection**: Let the socket handle reconnection automatically
- **Offline support**: Implement queue mechanisms for offline operation

## Security Considerations

- **Authentication**: Always authenticate users before allowing socket connections
- **Input Validation**: Validate all data received from the socket
- **HTTPS/WSS**: Always use secure connections in production
- **Token Storage**: Store authentication tokens securely
- **Rate Limiting**: Implement rate limiting for message sending 