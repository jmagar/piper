const { io } = require('socket.io-client');

/**
 * Test script for Socket.IO connection with proper architecture based on README.md
 * Uses the singleton pattern and proper event types
 */

// Constants defined to match frontend configuration
const SOCKET_URL = 'http://localhost:4100';
const SOCKET_PATH = '/socket.io';

// Connection configuration - matches the structure in socket-provider.tsx
const connectionConfig = {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  withCredentials: false, // Disable credentials for CORS
  extraHeaders: {
    "x-client-version": "1.0.0",
    "x-client-hostname": "localhost"
  },
  path: SOCKET_PATH
};

// Authentication options from README.md
const authOptions = {
  userId: 'test-user',
  token: 'demo-token'
};

// Create socket instance
console.log(`Connecting to socket at ${SOCKET_URL}${SOCKET_PATH} with auth:`, authOptions);
const socket = io(SOCKET_URL, connectionConfig);

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to server with socket ID:', socket.id);
  
  // Authenticate with the socket (as shown in README)
  console.log('🔑 Authenticating with user ID:', authOptions.userId);
  socket.emit('auth', authOptions, (authResponse) => {
    console.log('Authentication response:', authResponse);
    
    if (authResponse?.success) {
      console.log('✅ Authentication successful');
      
      // Send a test message matching the expected structure in use-chat-messages.ts
      const testMessageId = `test-message-${Date.now()}`;
      const testResponseId = `test-response-${Date.now()}`;
      
      console.log('📤 Sending test message with ID:', testMessageId);
      socket.emit('message:send', {
        content: 'Hello, this is a test message from the command line!',
        conversationId: 'test-conversation',
        metadata: {
          message_id: testMessageId,
          response_id: testResponseId,
          thread_id: 'test-thread'
        }
      }, (response) => {
        console.log('Message acknowledgement received:', response);
      });
    } else {
      console.error('❌ Authentication failed:', authResponse?.error || 'Unknown error');
    }
  });
});

socket.on('connect_error', (err) => {
  console.error('❌ Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

// Listen for message events (following the ServerToClientEvents structure)
socket.on('message:new', (message) => {
  console.log('📩 New message received:', message);
});

socket.on('message:chunk', (chunk) => {
  process.stdout.write(chunk.chunk || ''); // Stream the response
});

socket.on('message:complete', (data) => {
  console.log('\n✅ Message complete:', data);
  
  // Disconnect after receiving the complete message
  setTimeout(() => {
    console.log('👋 Disconnecting...');
    socket.disconnect();
    process.exit(0);
  }, 1000);
});

socket.on('message:error', (error) => {
  console.error('❌ Message error:', error);
});

// Also listen for typing indicators
socket.on('user:typing', (data) => {
  console.log('⌨️ User typing:', data);
});

// Stream events as shown in websocket.ts
socket.on('stream:event', (event) => {
  console.log(`🔄 Stream event [${event.event}]:`, event.data?.chunk?.content || '');
});

// Disconnect after 30 seconds if no response (safety timeout)
setTimeout(() => {
  if (socket.connected) {
    console.log('⏱️ Timeout reached, disconnecting...');
    socket.disconnect();
    process.exit(1);
  }
}, 30000);

console.log('🔄 Attempting to connect to WebSocket server...'); 