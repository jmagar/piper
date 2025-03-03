# Socket.IO Refactoring Task

## Context

You are tasked with refactoring a Socket.IO implementation in a React/Node.js application that has evolved organically, resulting in multiple implementations, inconsistent patterns, and security concerns. The codebase has a multi-layered architecture spanning both frontend and backend components.

The current implementation has several positive aspects, including a well-structured `frontend/lib/socket/client.tsx` using the singleton pattern, LangGraph integration for structured streaming events, and a dual-layer persistence strategy with Redis and PostgreSQL. However, it suffers from implementation duplication, security vulnerabilities, inconsistent typing, and other issues identified in a comprehensive audit.

Your task is to refactor this implementation to address the identified issues while preserving the existing functionality and leveraging the best aspects of the current code.

## Current Architecture

### Backend Components:
- `websocket.ts`: Socket.IO server setup
- `socket-logger.ts`: Debug log interception
- `state-persistence.mts`: State management with Redis and PostgreSQL

### Frontend Components:
- Multiple socket implementations:
  - `frontend/lib/socket/client.tsx` (preferred implementation with singleton pattern)
  - `socket-setup.js`
  - `socket-setup.tsx`
  - `socket.ts`
  - `socket-provider.tsx`
- Event handling hooks and utilities
- UI components for status display and debugging

## Critical Issues to Address

1. **Implementation Duplication**: Consolidate multiple socket initialization implementations to the singleton pattern in `frontend/lib/socket/client.tsx`.

2. **Type Inconsistencies**:
   - Standardize type usage (eliminate `any` where possible)
   - Centralize event type definitions in a single file
   - Ensure proper typing across all components

3. **Reconnection Inconsistencies**:
   - Standardize reconnection parameters
   - Improve application state recovery during reconnections

4. **Multiple State Management Approaches**:
   - Standardize on a single state management pattern
   - Implement proper error recovery for persistence failures

## Desired Architecture

Implement a modular architecture based on the existing structure in `frontend/lib/socket`:

```
frontend/lib/socket/
  ├── core/
  │   ├── connection.ts     # Core connection management
  │   ├── events.ts         # Event definitions and types
  │   └── state.ts          # Connection state management
  ├── hooks/
  │   ├── use-socket.ts     # Main socket hook
  │   ├── use-socket-emit.ts
  │   └── use-socket-event.ts
  ├── providers/
  │   └── socket-provider.tsx
  ├── utils/
  │   ├── logger.ts         # Socket-specific logging
  │   └── url-resolver.ts   # Resolve WebSocket URLs
  └── index.ts              # Public API
```

## Refactoring Instructions

### Phase 1: Consolidate Frontend Implementations

1. Start by examining `frontend/lib/socket/client.tsx` as the reference implementation.
2. Create the directory structure according to the desired architecture.
3. Move appropriate code from `client.tsx` into the new file structure.
4. Implement a clean public API in `index.ts` that exclusively uses the consolidated implementation.
5. Add deprecation warnings to the other implementations.

### Phase 2: Standardize Types and Event Definitions

1. Create a centralized event definition file in `core/events.ts`:
   ```typescript
   // Define all event types
   export interface ServerToClientEvents {
     // All server-to-client events
   }
   
   export interface ClientToServerEvents {
     // All client-to-server events
   }
   
   // Define LangGraph-style event types
   export interface StreamEvent {
     // LangGraph event structure
   }
   ```

2. Eliminate `any` types and use proper interfaces:
   ```typescript
   // Replace:
   function handleMessage(message: any) {
     // ...
   }
   
   // With:
   function handleMessage(message: ChatMessage) {
     // ...
   }
   ```

3. Standardize event naming conventions (choose either camelCase or kebab-case).

### Phase 3: Backend Improvements

1. Enhance the state persistence layer:
   ```typescript
   async saveState(threadId: string, state: StateWithMeta, config: SaveStateConfig = {}): Promise<void> {
     try {
       // Implement transactions for consistency
       await this.prisma.$transaction(async (tx) => {
         // Redis cache update
         // PostgreSQL update
       });
     } catch (err) {
       // Enhanced error handling with recovery mechanisms
     }
   }
   ```

2. Improve logging with log levels:
   ```typescript
   export function emitLog(namespace: string, level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
     if (!ioInstance) return;
     
     const logEntry: LogEntry = {
       timestamp: new Date().toISOString(),
       namespace,
       level,
       message,
       server: 'Backend'
     };
     
     // Only emit logs of appropriate levels based on configuration
     if (shouldEmitLogLevel(level)) {
       ioInstance.emit(`log:${level}`, logEntry);
       ioInstance.emit('mcp:all:logs', logEntry);
     }
   }
   ```

### Phase 4: Performance Optimizations

1. Ensure singleton socket instances:
   ```typescript
   // In your socket core module:
   let socketInstance: Socket | null = null;
   
   export function getSocket(): Socket {
     if (!socketInstance) {
       throw new Error('Socket not initialized');
     }
     return socketInstance;
   }
   
   export function initSocket(config): Socket {
     if (socketInstance) {
       return socketInstance;
     }
     
     socketInstance = createNewSocket(config);
     return socketInstance;
   }
   ```

2. Implement throttling for high-frequency events:
   ```typescript
   // Create a throttled event emitter
   export function throttleEvent(socket: Socket, event: string, data: any, options = { limit: 100 }) {
     // Implement throttling logic
   }
   ```

## Testing Approach

1. Create comprehensive tests for the socket implementation:
   - Unit tests for each component
   - Integration tests for socket connections
   - End-to-end tests for real-time communication

2. Test specifically for:
   - Connection management
   - Reconnection scenarios
   - Security features
   - Performance under load

## Success Criteria

Your refactoring will be considered successful if:

1. The application maintains all existing functionality
2. Only a single socket connection is established per client
3. Types are consistent and strongly enforced
4. The codebase follows the modular architecture outlined above
5. There are no duplicate implementations
6. Performance is maintained or improved
7. The code is well-documented with clear usage examples
8. All old code is removed.

## Additional Resources

- Socket.IO documentation: https://socket.io/docs/v4/
- React Context API: https://reactjs.org/docs/context.html
- TypeScript handbook: https://www.typescriptlang.org/docs/handbook/intro.html

## Implementation Notes

- Backwards compatability is not necessary during development, remove ALL old code before you begin
- Document the new approach thoroughly
- Follow best practices