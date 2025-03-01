# Socket.IO Architecture

This document provides an overview of the Socket.IO implementation in our application.

## Overview

The Socket.IO implementation follows a layered architecture:

1. **Core Layer**: Provides basic socket functionality and connection management
2. **Utility Layer**: Generic hooks for socket events and emitting
3. **Domain Layer**: Domain-specific hooks for features like chat
4. **UI Layer**: Components for displaying socket status and debugging

## Components

### Core Components

- `SocketProvider`: Manages the socket connection lifecycle
- `useSocket`: Hook to access socket connection and state

### Utility Hooks

- `useSocketEvent`: Generic hook for subscribing to socket events
- `useSocketEmit`: Generic hook for emitting socket events

### UI Components

- `SocketStatus`: Displays the current socket connection status
- `SocketDebug`: Provides a debugging interface for socket events
- `SocketTools`: Combines status and debug components for easy integration

## Usage Examples

### Basic Socket Provider Setup

```tsx
import { SocketProvider } from '@/lib/socket/socket-provider';

function App() {
  const socketOptions = {
    url: process.env.NEXT_PUBLIC_SOCKET_URL,
    userId: 'user-123',
    username: 'Example User'
  };

  return (
    <SocketProvider options={socketOptions}>
      <YourApp />
    </SocketProvider>
  );
}
```

### Using Socket Hooks

```tsx
import { useSocketEvent, useSocketEmit } from '@/lib/socket/use-socket-event';

function ChatComponent() {
  const [messages, setMessages] = useState([]);
  
  // Listen for incoming messages
  useSocketEvent<{ text: string; sender: string }>('chat:message', (data) => {
    setMessages(prev => [...prev, `${data.sender}: ${data.text}`]);
  });
  
  // Send messages
  const emitMessage = useSocketEmit();
  
  const sendMessage = (text) => {
    emitMessage<{ text: string }, { success: boolean }>(
      'chat:send', 
      { text }, 
      true,  // expect response
      5000   // timeout
    )
      .then(response => console.log('Message sent', response))
      .catch(error => console.error('Failed to send message', error));
  };
  
  return (
    // Your component UI
  );
}
```

### Adding Socket Status Indicator

```tsx
import { SocketStatus } from '@/components/ui/socket-status';

function YourComponent() {
  return (
    <div>
      <div className="flex justify-between">
        <h1>Your Component</h1>
        <SocketStatus size="md" />
      </div>
      
      {/* Rest of your component */}
    </div>
  );
}
```

### Using Socket Debug Panel

```tsx
import { SocketDebug } from '@/components/ui/socket-debug';

function YourComponent() {
  return (
    <div>
      {/* Your component */}
      
      {/* Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <SocketDebug defaultOpen={false} />
      )}
    </div>
  );
}
```

### Using Combined Socket Tools

```tsx
import { SocketTools } from '@/components/ui/socket-tools';

function YourComponent() {
  return (
    <div>
      {/* Your component */}
      
      <SocketTools 
        position="bottom-right"
        showStatus={true}
        showDebug={process.env.NODE_ENV === 'development'}
      />
    </div>
  );
}
```

## Event Handling

The socket implementation supports various event types:

- Connection events: connect, disconnect, reconnect
- Custom application events: message events, user events, etc.

## Type Safety

The implementation uses TypeScript generics to provide type safety:

```tsx
// Using typed events
useSocketEvent<{ userId: string; message: string }>('chat:message', (data) => {
  // data is typed as { userId: string; message: string }
});

// Using typed emit with response
const emitMessage = useSocketEmit();
emitMessage<RequestType, ResponseType>('event:name', requestData, true)
  .then(response => {
    // response is typed as ResponseType
  });
```

## Debugging

The `SocketDebug` component provides real-time debugging of socket events:

- Shows connection state
- Logs socket events and responses
- Provides reconnect functionality
- Displays connection details

## Best Practices

1. Always wrap your application with `SocketProvider` at a high level
2. Use domain-specific hooks for domain logic
3. Handle connection state changes appropriately
4. Provide proper error handling for socket operations
5. Use the debug tools in development environment
6. Implement proper cleanup for socket event listeners

## Integration Example

See `frontend/components/examples/socket-example.tsx` for a complete integration example. 