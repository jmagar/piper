// Direct browser socket connection test
// This can be included in a script tag or run in the browser console

// Self-executing function to avoid polluting global scope
(function() {
  console.log('🔌 DIRECT SOCKET TEST: Starting direct socket connection test...');
  
  // Force direct connection with bare minimum options
  const directSocket = io('http://localhost:4100', {
    transports: ['polling', 'websocket'], // Try polling first as it's more reliable for initial connection
    reconnection: true,
    forceNew: true,
    timeout: 30000, // Longer timeout
    auth: {
      userId: 'browser-test-user',
      username: 'Browser Test',
      timestamp: Date.now()
    }
  });
  
  console.log('🔌 DIRECT SOCKET TEST: Socket object created', directSocket);
  
  // Connection events
  directSocket.on('connect', () => {
    console.log('🔌 DIRECT SOCKET TEST: ✅ CONNECTED! Socket ID:', directSocket.id);
    
    // Send a test message after connecting
    directSocket.emit('message:sent', {
      id: `browser-test-${Date.now()}`,
      content: 'This is a test message from browser',
      role: 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'sending',
      userId: 'browser-test-user',
      username: 'Browser Test'
    }, response => {
      console.log('🔌 DIRECT SOCKET TEST: Response received:', response);
    });
  });
  
  directSocket.on('connect_error', (err) => {
    console.error('🔌 DIRECT SOCKET TEST: ❌ CONNECTION ERROR:', err.message);
    console.error('Error details:', err);
  });
  
  directSocket.io.on('reconnect_attempt', (attempt) => {
    console.log(`🔌 DIRECT SOCKET TEST: Reconnection attempt ${attempt}`);
  });
  
  directSocket.on('disconnect', (reason) => {
    console.log('🔌 DIRECT SOCKET TEST: Disconnected:', reason);
  });
  
  // Log all events
  directSocket.onAny((event, ...args) => {
    console.log(`🔌 DIRECT SOCKET TEST: Event received: ${event}`, args);
  });
  
  // Expose the socket for manual testing in console
  window.debugSocket = directSocket;
  
  console.log('🔌 DIRECT SOCKET TEST: Test initialized. Socket exposed as window.debugSocket');
})(); 