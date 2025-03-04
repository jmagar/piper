/**
 * URL Resolver
 * 
 * Utility for resolving WebSocket server URLs based on the environment.
 * Handles development and production environments appropriately.
 */

/**
 * URL resolution options
 */
interface UrlResolverOptions {
  /**
   * Force HTTPS protocol
   */
  forceHttps?: boolean;
  
  /**
   * Use relative URL
   */
  useRelative?: boolean;
  
  /**
   * Custom URL override
   */
  customUrl?: string;
  
  /**
   * Custom port
   */
  port?: number | string;
  
  /**
   * Use localhost instead of hostname
   * Only applies in development
   */
  useLocalhost?: boolean;
}

/**
 * Default resolver options
 */
const DEFAULT_OPTIONS: UrlResolverOptions = {
  forceHttps: false,
  useRelative: false,
  useLocalhost: false
};

/**
 * Resolve Socket.IO URL based on environment and configuration
 */
export function resolveSocketUrl(options: Partial<UrlResolverOptions> = {}): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // If we have a custom URL, use it directly
  if (mergedOptions.customUrl) {
    return mergedOptions.customUrl;
  }
  
  // Check environment variables
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // In browser environment, construct URL from window location
  if (typeof window !== 'undefined') {
    const protocol = mergedOptions.forceHttps ? 'https:' : window.location.protocol;
    
    // Get hostname - use environment variable, localhost option, or current hostname
    let hostname = window.location.hostname;
    if (process.env.NEXT_PUBLIC_API_HOST) {
      hostname = process.env.NEXT_PUBLIC_API_HOST;
    } else if (mergedOptions.useLocalhost) {
      hostname = 'localhost';
    }
    
    // Get port from options, environment, or default to 4100
    const port = options.port || process.env.NEXT_PUBLIC_API_PORT || '4100';
    
    // For relative URLs (same origin), just return the path
    if (mergedOptions.useRelative) {
      return '';
    }
    
    // Return full URL with protocol, hostname and port
    return `${protocol}//${hostname}:${port}`;
  }
  
  // Fallback URL for server-side rendering
  return 'http://localhost:4100';
}

/**
 * Resolve WebSocket path
 */
export function resolveSocketPath(customPath?: string): string {
  if (customPath) {
    return customPath;
  }
  
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_SOCKET_PATH) {
    return process.env.NEXT_PUBLIC_SOCKET_PATH;
  }
  
  return '/socket.io';
} 