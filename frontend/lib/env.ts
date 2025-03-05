/**
 * Environment variable utility for frontend
 * Provides a centralized place to access environment variables
 * and handle cases where they might be undefined
 */

// Default values - use current hostname for more flexible development
const DEFAULT_API_URL = typeof window !== 'undefined' 
  ? `${window.location.protocol}//${window.location.hostname}:4100`
  : 'http://localhost:4100';
const DEFAULT_WEBSOCKET_URL = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:4100`
  : 'http://localhost:4100';

/**
 * Get API URL from environment variables with fallback
 */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

/**
 * Get WebSocket URL from environment variables with fallback
 */
export function getWebSocketUrl(): string {
  return process.env.NEXT_PUBLIC_WEBSOCKET_URL || DEFAULT_WEBSOCKET_URL;
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
