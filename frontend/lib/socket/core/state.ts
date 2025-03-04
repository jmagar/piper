/**
 * Socket State Management
 * 
 * Manages socket connection state and provides
 * a persistent store for socket state across component renders.
 */

import { ConnectionState } from './events';
import type { Socket } from './types';

/**
 * Socket session state
 */
interface SocketSessionState {
  reconnectAttempts: number;
  lastConnectionTime?: number;
  userId?: string;
  error?: Error | null;
}

/**
 * Socket connection metrics
 */
interface ConnectionMetrics {
  connectionTime?: number;
  reconnectAttempts: number;
  disconnections: number;
  lastError?: string;
}

/**
 * Socket state manager
 * Maintains connection state and session information
 */
export class SocketStateManager {
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private sessionState: SocketSessionState = {
    reconnectAttempts: 0
  };
  private metrics: ConnectionMetrics = {
    reconnectAttempts: 0,
    disconnections: 0
  };
  private listeners = new Set<(state: ConnectionState) => void>();
  
  /**
   * Set the connection state and notify listeners
   */
  setConnectionState(state: ConnectionState, error?: Error): void {
    // Update state
    this.connectionState = state;
    
    // Update metrics
    if (state === ConnectionState.CONNECTED) {
      this.sessionState.lastConnectionTime = Date.now();
      this.metrics.connectionTime = Date.now();
      this.sessionState.reconnectAttempts = 0;
    } else if (state === ConnectionState.DISCONNECTED) {
      this.metrics.disconnections++;
    } else if (state === ConnectionState.FAILED && error) {
      this.sessionState.error = error;
      this.metrics.lastError = error.message;
    }
    
    // Notify listeners
    this.notifyListeners();
  }
  
  /**
   * Get the current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }
  
  /**
   * Set the reconnect attempts
   */
  setReconnectAttempts(attempts: number): void {
    this.sessionState.reconnectAttempts = attempts;
    this.metrics.reconnectAttempts = attempts;
    this.notifyListeners();
  }
  
  /**
   * Get the session state
   */
  getSessionState(): SocketSessionState {
    return { ...this.sessionState };
  }
  
  /**
   * Get the connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Add a state change listener
   * @returns Function to remove the listener
   */
  addListener(listener: (state: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notify all listeners of a state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.connectionState);
      } catch (err) {
        console.error('Error in socket state listener:', err);
      }
    });
  }
  
  /**
   * Clear error state
   */
  clearError(): void {
    this.sessionState.error = null;
    this.notifyListeners();
  }
  
  /**
   * Set the user ID
   */
  setUserId(userId: string): void {
    this.sessionState.userId = userId;
  }
  
  /**
   * Reset the state
   */
  reset(): void {
    this.connectionState = ConnectionState.DISCONNECTED;
    this.sessionState = {
      reconnectAttempts: 0
    };
    this.notifyListeners();
  }
}

// Global state manager instance for singleton pattern
let stateManagerInstance: SocketStateManager | null = null;

/**
 * Get the socket state manager instance
 * Creates a new instance if one doesn't exist
 */
export function getSocketStateManager(): SocketStateManager {
  if (!stateManagerInstance) {
    stateManagerInstance = new SocketStateManager();
  }
  
  return stateManagerInstance;
}

/**
 * Apply socket state to a socket instance
 */
export function attachStateManager(socket: Socket, stateManager: SocketStateManager): void {
  // Register state handling events
  socket.on('connect', () => {
    stateManager.setConnectionState(ConnectionState.CONNECTED);
  });
  
  socket.on('disconnect', () => {
    stateManager.setConnectionState(ConnectionState.DISCONNECTED);
  });
  
  socket.on('connect_error', (err) => {
    stateManager.setConnectionState(ConnectionState.FAILED, err);
  });
  
  socket.io.on('reconnect_attempt', (attemptNumber) => {
    stateManager.setConnectionState(ConnectionState.RECONNECTING);
    stateManager.setReconnectAttempts(attemptNumber);
  });
  
  socket.io.on('reconnect_failed', () => {
    stateManager.setConnectionState(ConnectionState.FAILED);
  });
  
  socket.on('error', (err) => {
    stateManager.setConnectionState(
      ConnectionState.FAILED, 
      typeof err === 'string' ? new Error(err) : err
    );
  });
} 