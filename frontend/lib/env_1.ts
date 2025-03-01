/**
 * Environment variable utility for frontend
 * Provides a centralized place to access environment variables
 * and handle cases where they might be undefined
 */

// Default values
const DEFAULT_API_URL = 'http://localhost:4100';
const DEFAULT_WEBSOCKET_URL = 'http://localhost:4100';

/**
 * Get API URL from environment variables with fallback
 */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

/**
 * Get WebSocket URL from environment with secure defaults
 * @returns WebSocket URL with appropriate protocol
 */
export function getWebSocketUrl(): string {
  // For Socket.IO, we use HTTP/HTTPS URLs, not WebSocket URLs (ws/wss)
  // Socket.IO will handle the protocol upgrade internally
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = process.env.NEXT_PUBLIC_WEBSOCKET_HOST || window.location.hostname;
    const port = process.env.NEXT_PUBLIC_WEBSOCKET_PORT || (window.location.protocol === 'https:' ? '443' : '4100');
    
    const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || `${protocol}//${host}:${port}`;
    
    // Force HTTPS in production environment
    if (process.env.NODE_ENV === 'production' && !socketUrl.startsWith('https:') && typeof window !== 'undefined') {
      console.warn('Insecure Socket.IO URL detected in production. Upgrading to HTTPS.');
      return socketUrl.replace(/^http:/, 'https:');
    }
    
    // Add debug log to show the WebSocket URL being used
    console.log('Socket.IO connecting to URL:', socketUrl);
    
    return socketUrl;
  }
  
  // Server-side rendering fallback
  return process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:4100';
}

/**
 * Get WebSocket path from environment
 * @returns WebSocket path
 */
export function getWebSocketPath(): string {
  return process.env.NEXT_PUBLIC_WEBSOCKET_PATH || '/socket.io';
}

/**
 * Get authentication token for socket connection
 * @returns Authentication token if available
 */
export function getSocketAuthToken(): string | undefined {
  // Get from secure storage like localStorage or cookies
  return typeof window !== 'undefined' ? localStorage.getItem('authToken') || undefined : undefined;
}

/**
 * Get all environment variables for the browser
 */
export function getPublicEnv() {
  return {
    API_URL: getApiUrl(),
    WEBSOCKET_URL: getWebSocketUrl()
  };
}

/**
 * Get a single environment variable with a fallback
 */
export function getEnv(key: string, fallback: string = ''): string {
  if (key.startsWith('NEXT_PUBLIC_')) {
    return process.env[key] || fallback;
  }
  
  // Only allow NEXT_PUBLIC_ prefixed env vars to be accessed
  console.warn(`Attempted to access non-public env var: ${key}`);
  return fallback;
}