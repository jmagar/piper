// Simple socket.io client to test backend WebSocket connection
import { io } from 'socket.io-client';

// Get URL and other parameters from command line arguments
const args = process.argv.slice(2);
const url = args[0] || 'http://localhost:4100';
const userId = args[1] || 'test-user-1';
const userName = args[2] || 'Test User';

console.log(`Testing WebSocket connection to ${url}`);
console.log(`Using userId: ${userId}, userName: ${userName}`);

// Create socket connection
const socket = io(url, {
  transports: ['websocket', 'polling'],
  forceNew: true,
  reconnection: true,
  timeout: 10000,
  auth: {
    userId,
    username: userName,
    timestamp: Date.now()
  }
});

// Setup event handlers
socket.on('connect', () => {
  console.log(`✅ CONNECTED to ${url}, socket id: ${socket.id}`);
  
  // Send a test message after connection
  setTimeout(() => {
    console.log('Sending a test message...');
    socket.emit('message:sent', {
      id: `test-${Date.now()}`,
      content: 'This is a test message from socket-test.js',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'sending',
      userId,
      username: userName
    }, (response) => {
      console.log('Received response:', response);
    });
  }, 1000);
});

socket.on('connect_error', (error) => {
  console.error(`❌ CONNECTION ERROR: ${error.message}`);
  console.error('Error details:', error);
});

socket.on('disconnect', (reason) => {
  console.warn(`⚠️ DISCONNECTED: ${reason}`);
});

// Listen for all events for debugging
socket.onAny((eventName, ...args) => {
  console.log(`📨 Event received: ${eventName}`, args);
});

// Keep the script running for at least 20 seconds
setTimeout(() => {
  console.log('Test complete. Disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 20000);

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('Interrupted. Disconnecting...');
  socket.disconnect();
  process.exit(0);
});

console.log('Waiting for events... (Press Ctrl+C to exit)'); 