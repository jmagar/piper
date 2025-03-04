import { getSocketLogger } from './logger';

// Create a namespaced logger for debug utilities
const logger = getSocketLogger({ namespace: 'socket:debug' });

/**
 * Debug utility for socket connection issues
 */
export const SocketDebug = {
  /**
   * Checks connection environment and logs diagnostic information
   */
  checkEnvironment: () => {
    if (typeof window === 'undefined') {
      logger.info('Running in server environment');
      return;
    }

    const diagnostics = {
      hostname: window.location.hostname,
      port: window.location.port,
      protocol: window.location.protocol,
      online: window.navigator.onLine,
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      apiHost: process.env.NEXT_PUBLIC_API_HOST,
      apiPort: process.env.NEXT_PUBLIC_API_PORT,
      userAgent: window.navigator.userAgent,
      connectionType: (navigator as any).connection?.type, // Additional connection info if available
      time: new Date().toISOString()
    };

    logger.info('Socket environment diagnostics:', diagnostics);
    return diagnostics;
  },

  /**
   * Tests a socket.io server connection and reports results
   * @param url The socket server URL to test
   * @param path The socket.io path
   */
  testConnection: async (url: string, path = '/socket.io') => {
    try {
      // Test HTTP endpoint first (health check)
      const httpUrl = `${url}${path === '/socket.io' ? '/socket.io/socket.io.js' : path}`;
      logger.info(`Testing HTTP connection to ${httpUrl}`);

      const startTime = Date.now();
      const response = await fetch(httpUrl, { 
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache'
      });
      const endTime = Date.now();

      logger.info('HTTP connection test result:', {
        url: httpUrl,
        success: response.ok,
        status: response.status,
        latency: endTime - startTime
      });

      return {
        success: response.ok,
        url: httpUrl,
        status: response.status,
        latency: endTime - startTime
      };
    } catch (error) {
      logger.error('HTTP connection test failed:', {
        url: `${url}${path}`,
        error: (error as Error).message
      });

      return {
        success: false,
        url: `${url}${path}`,
        error: (error as Error).message
      };
    }
  }
}; 