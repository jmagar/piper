import { appLogger, LogLevel } from '@/lib/logger';
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
      appLogger.logSource('MCP', LogLevel.DEBUG, '[Polling Manager] Restored polling state from globalThis (HMR).');
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
      appLogger.logSource('MCP', LogLevel.WARN, '[Polling Manager] Polling interval too short, minimum is 1000ms.');
      return;
    }
    
    this.pollingIntervalMs = intervalMs;
    appLogger.logSource('MCP', LogLevel.INFO, `[Polling Manager] Polling interval set to ${intervalMs}ms.`);
    
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
      appLogger.logSource('MCP', LogLevel.INFO, '[Polling Manager] Polling already started (development HMR). Not starting another.');
      return;
    }
    
    if (this.intervalId && process.env.NODE_ENV === 'production') {
      clearInterval(this.intervalId);
    }
    
    appLogger.logSource('MCP', LogLevel.INFO, `[Polling Manager] Starting periodic polling every ${this.pollingIntervalMs / 1000} seconds.`);
    
    this.intervalId = setInterval(async () => {
      appLogger.logSource('MCP', LogLevel.INFO, '[Polling Manager] Periodic poll triggered.');
      try {
        await this.executePollingCycle();
      } catch (error) {
        appLogger.logSource('MCP', LogLevel.ERROR, '[Polling Manager] Error during polling cycle:', { error });
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
      appLogger.logSource('MCP', LogLevel.INFO, '[Polling Manager] Polling stopped.');
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
      appLogger.logSource('MCP', LogLevel.ERROR, '[Polling Manager] AppConfig not available. Stopping poll.');
      this.stopPolling();
      return;
    }

    // Check for new servers before polling existing ones
    await this.checkAndInitializeNewServers(appConfig);

    const registryStats = mcpServiceRegistry.getRegistryStats();
    if (registryStats.totalServices === 0) {
      appLogger.logSource('MCP', LogLevel.INFO, '[Polling Manager] No MCP services registered to poll.');
      return;
    }

    appLogger.logSource('MCP', LogLevel.INFO, `[Polling Manager] Polling ${registryStats.totalServices} managed MCP services...`);
    await this.pollAllServices(appConfig);
    appLogger.logSource('MCP', LogLevel.INFO, '[Polling Manager] All servers polled.');
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
      appLogger.logSource('MCP', LogLevel.ERROR, `[Polling Manager] Error polling server ${serviceLabel}:`, { error });
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
      appLogger.logSource('MCP', LogLevel.INFO, '[Polling Manager] No new servers found in config.');
      return;
    }

    appLogger.logSource('MCP', LogLevel.INFO, `[Polling Manager] Found ${newServerKeys.length} new server(s) in config: ${newServerKeys.join(', ')}`);
    
    // Initialize new servers in parallel
    const initPromises = newServerKeys.map(async (serverKey) => {
      const serverConfig = appConfig.mcpServers[serverKey] as ServerConfigEntry;
      await this.initializeNewServer(serverKey, serverConfig);
    });

    await Promise.all(initPromises);
    appLogger.logSource('MCP', LogLevel.INFO, `[Polling Manager] Completed initialization of ${newServerKeys.length} new server(s).`);
  }

  /**
   * Initialize a single new MCP server dynamically
   */
  private async initializeNewServer(serverKey: string, serverConfig: ServerConfigEntry): Promise<void> {
    // Skip if server already exists in our managed services
    if (mcpServiceRegistry.hasService(serverKey)) {
      appLogger.logSource('MCP', LogLevel.INFO, `[Polling Manager] Server '${serverKey}' already initialized. Skipping.`);
      return;
    }

    const serviceLabel = serverConfig.label || serverKey;
    appLogger.logSource('MCP', LogLevel.INFO, `[Polling Manager] Dynamically initializing new server via MCPManager: ${serviceLabel}`);

    try {
      // Delegate to MCPManager's initializeNewServer for consistent logic
      await mcpManager.initializeNewServer(serverKey, serverConfig);
      appLogger.logSource('MCP', LogLevel.INFO, `[Polling Manager] Successfully delegated initialization for new server ${serviceLabel}`);
    } catch (e: unknown) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Polling Manager] Error during delegated dynamic initialization for ${serviceLabel}:`, { error: e instanceof Error ? e.message : String(e) });
      // MCPManager's initializeServer (called by initializeNewServer) should handle error status updates.
      // If not, we might need to call serverStatusManager.initializeErrorServerStatus here as a fallback.
    }
  }

  /**
   * Force an immediate poll of all servers
   */
  async forcePoll(): Promise<void> {
    appLogger.logSource('MCP', LogLevel.INFO, '[Polling Manager] Force polling triggered.');
    await this.executePollingCycle();
  }

  /**
   * Force an immediate poll of a specific server
   */
  async forcePollServer(serverKey: string): Promise<void> {
    const appConfig = await getAppConfig();
    if (!appConfig?.mcpServers[serverKey]) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[Polling Manager] Server '${serverKey}' not found in config.`);
      return;
    }

    const serverConfig = appConfig.mcpServers[serverKey] as ServerConfigEntry;
    const serviceLabel = serverConfig.label || serverKey;
    
    appLogger.logSource('MCP', LogLevel.INFO, `[Polling Manager] Force polling server: ${serviceLabel}`);
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
      appLogger.logSource('MCP', LogLevel.INFO, '[Polling Manager] Cleared polling interval for HMR.');
    }
  }
}

// Export singleton instance
export const pollingManager = PollingManager.getInstance(); 