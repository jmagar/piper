import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import { mcpServiceRegistry } from './service-registry';
import { serverStatusManager } from './status-manager';
import { getCachedAppConfig as getAppConfig, type AppConfig, type ServerConfigEntry } from '../enhanced/index';
import { mcpManager } from '../mcpManager';

// Enhance globalThis for HMR persistence in development
declare global {
  // eslint-disable-next-line no-var
  var __pollIntervalId: NodeJS.Timeout | null | undefined;
}

export class PollingManager {
  private static instance: PollingManager;
  private intervalId: NodeJS.Timeout | null = null;
  private isPolling = false;
  private pollingIntervalMs = 60 * 1000; // 60 seconds default

  private constructor() {
    // Initialize polling state with HMR support
    if (process.env.NODE_ENV !== 'production' && globalThis.__pollIntervalId) {
      this.intervalId = globalThis.__pollIntervalId;
      this.isPolling = true;
      appLogger.debug('[Polling Manager] Restored polling state from globalThis (HMR).', {
        correlationId: getCurrentCorrelationId(),
        operationId: 'PollingManager.constructor'
      });
    }
  }

  static getInstance(): PollingManager {
    if (!PollingManager.instance) {
      PollingManager.instance = new PollingManager();
    }
    return PollingManager.instance;
  }

  /**
   * Set polling interval in milliseconds
   */
  setPollingInterval(intervalMs: number): void {
    if (intervalMs < 1000) {
      appLogger.warn('[Polling Manager] Polling interval too short, minimum is 1000ms.', {
        correlationId: getCurrentCorrelationId(),
        operationId: 'setPollingInterval'
      });
      return;
    }
    
    this.pollingIntervalMs = intervalMs;
    appLogger.info(`[Polling Manager] Polling interval set to ${intervalMs}ms.`, {
      correlationId: getCurrentCorrelationId(),
      operationId: 'setPollingInterval'
    });
    
    // If currently polling, restart with new interval
    if (this.isPolling) {
      this.stopPolling();
      this.startPolling();
    }
  }

  /**
   * Start periodic polling
   */
  startPolling(): void {
    if (this.intervalId && process.env.NODE_ENV !== 'production') {
      appLogger.info('[Polling Manager] Polling already started (development HMR). Not starting another.', {
        correlationId: getCurrentCorrelationId(),
        operationId: 'startPolling'
      });
      return;
    }
    
    if (this.intervalId && process.env.NODE_ENV === 'production') {
      clearInterval(this.intervalId);
    }
    
    appLogger.info(`[Polling Manager] Starting periodic polling every ${this.pollingIntervalMs / 1000} seconds.`, {
      correlationId: getCurrentCorrelationId(),
      operationId: 'startPolling'
    });
    
    this.intervalId = setInterval(async () => {
      appLogger.info('[Polling Manager] Periodic poll triggered.', {
        correlationId: getCurrentCorrelationId(),
        operationId: 'startPolling.interval'
      });
      try {
        await this.executePollingCycle();
      } catch (error) {
        appLogger.error('[Polling Manager] Error during polling cycle:', {
          error,
          correlationId: getCurrentCorrelationId(),
          operationId: 'startPolling.interval'
        });
      }
    }, this.pollingIntervalMs);

    this.isPolling = true;

    if (process.env.NODE_ENV !== 'production') {
      globalThis.__pollIntervalId = this.intervalId;
    }
  }

  /**
   * Stop periodic polling
   */
  stopPolling(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.isPolling = false;
      appLogger.info('[Polling Manager] Polling stopped.', {
        correlationId: getCurrentCorrelationId(),
        operationId: 'stopPolling'
      });
    }

    if (process.env.NODE_ENV !== 'production' && globalThis.__pollIntervalId) {
      clearInterval(globalThis.__pollIntervalId);
      globalThis.__pollIntervalId = null;
    }
  }

  /**
   * Execute a single polling cycle
   */
  async executePollingCycle(): Promise<void> {
    const appConfig = await getAppConfig();
    if (!appConfig || !appConfig.mcpServers) {
      appLogger.error('[Polling Manager] AppConfig not available. Stopping poll.', {
        correlationId: getCurrentCorrelationId(),
        operationId: 'executePollingCycle'
      });
      this.stopPolling();
      return;
    }

    // Check for new servers before polling existing ones
    await this.checkAndInitializeNewServers(appConfig);

    const registryStats = mcpServiceRegistry.getRegistryStats();
    if (registryStats.totalServices === 0) {
      appLogger.info('[Polling Manager] No MCP services registered to poll.', {
        correlationId: getCurrentCorrelationId(),
        operationId: 'executePollingCycle'
      });
      return;
    }

    appLogger.info(`[Polling Manager] Polling ${registryStats.totalServices} managed MCP services...`, {
      correlationId: getCurrentCorrelationId(),
      operationId: 'executePollingCycle'
    });
    await this.pollAllServices(appConfig);
    appLogger.info('[Polling Manager] All servers polled.', {
      correlationId: getCurrentCorrelationId(),
      operationId: 'executePollingCycle'
    });
  }

  /**
   * Poll all registered services
   */
  private async pollAllServices(appConfig: AppConfig): Promise<void> {
    const pollPromises: Promise<void>[] = [];
    const allServices = mcpServiceRegistry.getAllServices();

    allServices.forEach((service, key) => {
      const serverConfig = appConfig.mcpServers[key] as ServerConfigEntry;
      const serviceLabel = serverConfig?.label || key;
      
      if (serverConfig && !serverConfig.disabled) {
        const pollPromise = this.pollSingleService(key, serviceLabel);
        pollPromises.push(pollPromise);
      }
    });

    await Promise.all(pollPromises);
  }

  /**
   * Poll a single service
   */
  private async pollSingleService(serverKey: string, serviceLabel: string): Promise<void> {
    try {
      await serverStatusManager.refreshServerStatus(serverKey, serviceLabel);
    } catch (error: unknown) {
      appLogger.error(`[Polling Manager] Error polling server ${serviceLabel}:`, {
        error,
        correlationId: getCurrentCorrelationId(),
        operationId: 'pollSingleService',
        serverKey,
        serviceLabel
      });
      // Update cache with error status
      const appConfig = await getAppConfig();
      if (appConfig?.mcpServers[serverKey]) {
        const serverConfig = appConfig.mcpServers[serverKey] as ServerConfigEntry;
        const errorMessage = error instanceof Error ? error.message : String(error);
        await serverStatusManager.initializeErrorServerStatus(serverKey, serverConfig, errorMessage);
      }
    }
  }

  /**
   * Check for new servers in config and initialize them
   */
  private async checkAndInitializeNewServers(appConfig: AppConfig): Promise<void> {
    const configServerKeys = Object.keys(appConfig.mcpServers);
    const managedServerKeys = mcpServiceRegistry.getServiceKeys();
    
    // Find servers in config that are not in our managed services
    const newServerKeys = configServerKeys.filter(key => !managedServerKeys.includes(key));
    
    if (newServerKeys.length === 0) {
      appLogger.info('[Polling Manager] No new servers found in config.', {
        correlationId: getCurrentCorrelationId(),
        operationId: 'checkAndInitializeNewServers'
      });
      return;
    }

    appLogger.info(`[Polling Manager] Found ${newServerKeys.length} new server(s) in config: ${newServerKeys.join(', ')}`, {
      correlationId: getCurrentCorrelationId(),
      operationId: 'checkAndInitializeNewServers'
    });
    
    // Initialize new servers in parallel
    const initPromises = newServerKeys.map(async (serverKey) => {
      const serverConfig = appConfig.mcpServers[serverKey] as ServerConfigEntry;
      await this.initializeNewServer(serverKey, serverConfig);
    });

    await Promise.all(initPromises);
    appLogger.info(`[Polling Manager] Completed initialization of ${newServerKeys.length} new server(s).`, {
      correlationId: getCurrentCorrelationId(),
      operationId: 'checkAndInitializeNewServers'
    });
  }

  /**
   * Initialize a single new MCP server dynamically
   */
  private async initializeNewServer(serverKey: string, serverConfig: ServerConfigEntry): Promise<void> {
    // Skip if server already exists in our managed services
    if (mcpServiceRegistry.hasService(serverKey)) {
      appLogger.info(`[Polling Manager] Server '${serverKey}' already initialized. Skipping.`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'initializeNewServer',
        serverKey
      });
      return;
    }

    const serviceLabel = serverConfig.label || serverKey;
    appLogger.info(`[Polling Manager] Dynamically initializing new server via MCPManager: ${serviceLabel}`, {
      correlationId: getCurrentCorrelationId(),
      operationId: 'initializeNewServer',
      serverKey
    });

    try {
      // Delegate to MCPManager's initializeNewServer for consistent logic
      await mcpManager.initializeNewServer(serverKey, serverConfig);
      appLogger.info(`[Polling Manager] Successfully delegated initialization for new server ${serviceLabel}`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'initializeNewServer',
        serverKey
      });
    } catch (e: unknown) {
      appLogger.error(`[Polling Manager] Error during delegated dynamic initialization for ${serviceLabel}:`, {
        error: e instanceof Error ? e.message : String(e),
        correlationId: getCurrentCorrelationId(),
        operationId: 'initializeNewServer',
        serverKey
      });
      // MCPManager's initializeServer (called by initializeNewServer) should handle error status updates.
      // If not, we might need to call serverStatusManager.initializeErrorServerStatus here as a fallback.
    }
  }

  /**
   * Force an immediate poll of all servers
   */
  async forcePoll(): Promise<void> {
    appLogger.info('[Polling Manager] Force polling triggered.', {
      correlationId: getCurrentCorrelationId(),
      operationId: 'forcePoll'
    });
    await this.executePollingCycle();
  }

  /**
   * Force an immediate poll of a specific server
   */
  async forcePollServer(serverKey: string): Promise<void> {
    const appConfig = await getAppConfig();
    if (!appConfig?.mcpServers[serverKey]) {
      appLogger.error(`[Polling Manager] Server '${serverKey}' not found in config.`, {
        correlationId: getCurrentCorrelationId(),
        operationId: 'forcePollServer',
        serverKey
      });
      return;
    }

    const serverConfig = appConfig.mcpServers[serverKey] as ServerConfigEntry;
    const serviceLabel = serverConfig.label || serverKey;
    
    appLogger.info(`[Polling Manager] Force polling server: ${serviceLabel}`, {
      correlationId: getCurrentCorrelationId(),
      operationId: 'forcePollServer',
      serverKey
    });
    await this.pollSingleService(serverKey, serviceLabel);
  }

  /**
   * Get polling status
   */
  getPollingStatus(): {
    isPolling: boolean;
    intervalMs: number;
    nextPollIn?: number;
  } {
    const status = {
      isPolling: this.isPolling,
      intervalMs: this.pollingIntervalMs,
    };

    // Calculate next poll time if polling is active
    if (this.isPolling && this.intervalId) {
      // This is an approximation as we can't get exact timing from setInterval
      const nextPollIn = this.pollingIntervalMs;
      return { ...status, nextPollIn };
    }

    return status;
  }

  /**
   * Clean up for HMR
   */
  cleanupForHmr(): void {
    if (process.env.NODE_ENV !== 'production' && globalThis.__pollIntervalId) {
      clearInterval(globalThis.__pollIntervalId);
      globalThis.__pollIntervalId = null;
      appLogger.info('[Polling Manager] Cleared polling interval for HMR.', {
        correlationId: getCurrentCorrelationId(),
        operationId: 'cleanupForHmr'
      });
    }
  }
}

// Export singleton instance
export const pollingManager = PollingManager.getInstance(); 