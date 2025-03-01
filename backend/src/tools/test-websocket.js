#!/usr/bin/env node

/**
 * WebSocket Server Connection Test Tool
 * 
 * This script tests WebSocket server connectivity from the server-side
 * using both raw WebSocket and HTTP upgrading protocols.
 * 
 * Usage:
 *   node test-websocket.js [port]
 * 
 * Example:
 *   node test-websocket.js 4100
 */

const WebSocket = require('ws');
const http = require('http');
const net = require('net');

// Get port from command line or use default
const port = process.argv[2] || 4100;
const host = 'localhost';

console.log(`=== WebSocket Server Connection Tester ===`);
console.log(`Testing connection to ws://${host}:${port}`);
console.log(`Time: ${new Date().toISOString()}\n`);

// Function to add timestamps to logs
function logWithTime(message) {
  const timestamp = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  console.log(`[${timestamp}] ${message}`);
}

// Test 1: Direct WebSocket connection
logWithTime('TEST 1: Direct WebSocket connection');
try {
  const ws = new WebSocket(`ws://${host}:${port}`);
  
  ws.on('open', () => {
    logWithTime('✓ WebSocket connection established successfully');
    
    // Send a test message
    const testMessage = JSON.stringify({
      type: 'test',
      data: 'Server-side test message',
      timestamp: new Date().toISOString()
    });
    
    logWithTime(`Sending test message: ${testMessage}`);
    ws.send(testMessage);
    
    // Close after 2 seconds
    setTimeout(() => {
      logWithTime('Closing WebSocket connection');
      ws.close();
    }, 2000);
  });
  
  ws.on('message', (data) => {
    logWithTime(`Message received: ${data}`);
  });
  
  ws.on('close', (code, reason) => {
    logWithTime(`Connection closed: Code=${code}, Reason=${reason || 'No reason provided'}`);
    console.log('\nDirect WebSocket test complete.');
    
    // Run the next test after this one completes
    setTimeout(testSocketUpgrade, 1000);
  });
  
  ws.on('error', (error) => {
    logWithTime(`❌ ERROR: ${error.message}`);
    console.log('\nDirect WebSocket test failed.');
    
    // Run the next test after this one fails
    setTimeout(testSocketUpgrade, 1000);
  });
} catch (error) {
  logWithTime(`❌ ERROR creating WebSocket: ${error.message}`);
  console.log('\nDirect WebSocket test failed.');
  
  // Run the next test after this one fails
  setTimeout(testSocketUpgrade, 1000);
}

// Test 2: HTTP Upgrade to WebSocket
function testSocketUpgrade() {
  logWithTime('\nTEST 2: HTTP Upgrade to WebSocket');
  
  const options = {
    host: host,
    port: port,
    path: '/',
    headers: {
      'Connection': 'Upgrade',
      'Upgrade': 'websocket',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', // Base64 encoded test key
      'Sec-WebSocket-Version': '13'
    }
  };
  
  const req = http.request(options);
  
  req.on('upgrade', (res, socket, upgradeHead) => {
    logWithTime('✓ Connection upgraded to WebSocket successfully');
    logWithTime(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
    
    // Test socket is writable
    if (socket.writable) {
      logWithTime('✓ Socket is writable');
    }
    
    // Close socket after tests
    setTimeout(() => {
      logWithTime('Closing upgraded socket');
      socket.end();
    }, 1000);
  });
  
  req.on('response', (res) => {
    const statusCode = res.statusCode;
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      logWithTime(`❌ Server responded with HTTP ${statusCode} instead of upgrading`);
      if (data) {
        logWithTime(`Response data: ${data.toString().substring(0, 200)}`);
      }
      console.log('\nHTTP Upgrade test failed.');
      
      // Run the next test
      setTimeout(testTCPConnection, 1000);
    });
  });
  
  req.on('error', (error) => {
    logWithTime(`❌ ERROR: ${error.message}`);
    console.log('\nHTTP Upgrade test failed.');
    
    // Run the next test
    setTimeout(testTCPConnection, 1000);
  });
  
  req.end();
}

// Test 3: Basic TCP socket connection
function testTCPConnection() {
  logWithTime('\nTEST 3: Basic TCP Socket connection');
  
  const socket = new net.Socket();
  let connected = false;
  
  socket.connect(port, host, () => {
    connected = true;
    logWithTime(`✓ TCP connection established to ${host}:${port}`);
    
    // Send a basic HTTP request (works for any TCP server)
    socket.write('GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n');
  });
  
  socket.on('data', (data) => {
    logWithTime(`Data received: ${data.toString().substring(0, 100)}...`);
    socket.end();
  });
  
  socket.on('close', () => {
    if (connected) {
      logWithTime('Socket closed');
      console.log('\nTCP connection test complete.');
      
      // Final summary
      printSummary();
    } else {
      logWithTime('❌ Socket closed without connecting');
      console.log('\nTCP connection test failed.');
      
      // Final summary
      printSummary();
    }
  });
  
  socket.on('error', (error) => {
    logWithTime(`❌ ERROR: ${error.message}`);
    console.log('\nTCP connection test failed.');
    
    // Final summary
    printSummary();
  });
  
  // Set a timeout for the connection
  socket.setTimeout(5000, () => {
    logWithTime('❌ Connection timed out');
    socket.destroy();
  });
}

// Print a summary of the test results
function printSummary() {
  console.log('\n=== TEST SUMMARY ===');
  console.log('If any of the tests succeeded, your WebSocket server is running');
  console.log('If all tests failed, check the following:');
  console.log('1. Is the server actually running on port ' + port + '?');
  console.log('2. Is there a firewall blocking the connection?');
  console.log('3. Is something else using that port?');
  console.log('\nNext steps:');
  console.log('- Check server logs for connection attempts');
  console.log('- Run "netstat -tulpn | grep ' + port + '" to see if port is in use');
  console.log('- Try running the server with more verbose logging enabled');
  
  // Exit with appropriate status code
  process.exit(0);
} 