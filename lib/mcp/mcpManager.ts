import { ToolSet } from "ai";
import { appLogger } from '@/lib/logger';
import { getCachedAppConfig as getAppConfig, type AppConfig, type ServerConfigEntry, type EnhancedTransportConfig } from './enhanced/index';
import { LogLevel } from '@/lib/logger/constants';

// Import focused modules
import {
  processLargeToolResponse,
  redisCacheManager,
  mcpServiceRegistry,
  serverStatusManager,
  pollingManager,
  toolCollectionManager,
  type ManagedServerInfo,
  type MCPServiceStatus,
} from './modules';

// Enhance globalThis for HMR persistence in development
declare global {
  // eslint-disable-next-line no-var
  var __isMCPManagerInitialized: boolean | undefined;
}

let isManagerInitialized: boolean;

// Initialize isManagerInitialized
if (process.env.NODE_ENV === 'production') {
  isManagerInitialized = false;
  appLogger.logSource('MCP', LogLevel.INFO, '[MCP Manager] Initialized isManagerInitialized for production.');
} else {
  // Development HMR logic
  if (globalThis.__isMCPManagerInitialized === undefined) {
    globalThis.__isMCPManagerInitialized = false;
    appLogger.logSource('MCP', LogLevel.INFO, '[MCP Manager] Initialized globalThis.__isMCPManagerInitialized for development.');
  }
  isManagerInitialized = globalThis.__isMCPManagerInitialized;
}

/**
 * Main MCP Manager - orchestrates all MCP operations using focused modules
 */
export function normalizeServerConfig(config: ServerConfigEntry): ServerConfigEntry {
  const newConfig = { ...config };

  // Normalize 'disabled' to 'enabled'
  if (typeof newConfig.disabled === 'boolean') {
    newConfig.enabled = !newConfig.disabled;
    delete newConfig.disabled; // Remove the old key
  }

  // Normalize 'transportType' to 'transport'
  if (newConfig.transportType) {
    const transportType = newConfig.transportType; // Capture for use
    delete newConfig.transportType; // Remove legacy key early

    if (transportType === 'stdio') {
      newConfig.transport = {
        type: 'stdio',
        command: newConfig.command || '', // Ensure command is present
      } as EnhancedTransportConfig; // Asserting the overall union type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (newConfig.args) (newConfig.transport as any).args = newConfig.args;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (newConfig.env) (newConfig.transport as any).env = newConfig.env;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (newConfig.cwd) (newConfig.transport as any).cwd = newConfig.cwd;
    } else if (transportType === 'sse' || transportType === 'streamable-http') {
      newConfig.transport = {
        type: transportType,
        httpSettings: {
          url: newConfig.url || '', // Ensure url is present
          ...(newConfig.headers && { headers: newConfig.headers }),
        },
      } as unknown as EnhancedTransportConfig; // Asserting the overall union type
    }
    
    // Remove other legacy top-level keys after migrating them
    delete newConfig.command;
    delete newConfig.args;
    delete newConfig.env;
    delete newConfig.cwd;
    delete newConfig.url;
    delete newConfig.headers;

  } else if (newConfig.command && (!newConfig.transport || !newConfig.transport.type)) {
    // If command exists but transport.type doesn't, assume stdio
    const command = newConfig.command; // Capture for use
    delete newConfig.command; // Remove legacy key

    newConfig.transport = {
      type: 'stdio',
      command: command,
    } as EnhancedTransportConfig;
    if (newConfig.args) (newConfig.transport as EnhancedTransportConfig & { type: 'stdio' }).args = newConfig.args;
    if (newConfig.env) (newConfig.transport as EnhancedTransportConfig & { type: 'stdio' }).env = newConfig.env;
    if (newConfig.cwd) (newConfig.transport as EnhancedTransportConfig & { type: 'stdio' }).cwd = newConfig.cwd;

    delete newConfig.args;
    delete newConfig.env;
    delete newConfig.cwd;

  } else if (newConfig.url && (!newConfig.transport || !newConfig.transport.type)) {
    // If url exists but transport.type doesn't, assume sse (or streamable-http if specified later)
    const url = newConfig.url; // Capture for use
    delete newConfig.url; // Remove legacy key

    newConfig.transport = {
      type: 'sse', // Default to sse
      httpSettings: {
        url: url,
      },
    } as unknown as EnhancedTransportConfig;
    if (newConfig.headers) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (newConfig.transport as any).httpSettings.headers = newConfig.headers;
      delete newConfig.headers; // Remove legacy key
    }
  }

  // After legacy migrations, handle partially-migrated configs where properties are on transport but need nesting
  if (newConfig.transport) {
    const transport = newConfig.transport;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transportAsAny = transport as any;

    if (transportAsAny.type === 'stdio') {
      // For stdio, 'command', 'args', 'env', 'cwd' should be directly on the transport object.
      // The legacy migration (handling top-level command/args/etc.) already moves them to transport.
      // This section ensures they are present as expected by the schema and not incorrectly nested or removed.

      // Check if 'command' is valid as per schema requirements (present and non-empty string).
      if (typeof transportAsAny.command !== 'string' || transportAsAny.command.trim() === '') {
        appLogger.mcp!.warn(`Stdio transport for ${newConfig.label || 'server'} is missing a command or has an empty command. This may cause validation errors.`, { configBeingProcessed: newConfig });
        // Ensure command property exists to avoid undefined errors, though schema validation should fail if it's truly missing/empty and required.
        if (typeof transportAsAny.command === 'undefined') {
          transportAsAny.command = '';
        }
      }

      // 'args', 'env', 'cwd' are optional. Ensure they are not in 'transport.info' for stdio.
      // If 'transport.info' exists for stdio, it's unexpected and should be removed to align with the schema.
      if (transportAsAny.info) {
        appLogger.mcp!.debug(`Removing unexpected 'transport.info' for stdio server ${newConfig.label || 'server'}. Properties like command, args, env, cwd belong directly on transport for stdio.`, { currentTransport: transportAsAny });
        // If any properties were mistakenly put into info, try to move them back if not already on transport
        if (transportAsAny.info.command && !transportAsAny.command) transportAsAny.command = transportAsAny.info.command;
        if (transportAsAny.info.args && !transportAsAny.args) transportAsAny.args = transportAsAny.info.args;
        if (transportAsAny.info.env && !transportAsAny.env) transportAsAny.env = transportAsAny.info.env;
        if (transportAsAny.info.cwd && !transportAsAny.cwd) transportAsAny.cwd = transportAsAny.info.cwd;
        delete transportAsAny.info;
      }
    } else if (transportAsAny.type === 'sse' || transportAsAny.type === 'streamable-http') {
      const configLabel = newConfig.label || 'server'; // Define configLabel here
      
      // Step 1: Consolidate any top-level url/headers into httpSettings.
      // This ensures that if a legacy config has url/headers directly on transport, they are moved to httpSettings.
      const legacyTopLevelUrl = transportAsAny.url;
      const legacyTopLevelHeaders = transportAsAny.headers;

      if (typeof legacyTopLevelUrl === 'string' && legacyTopLevelUrl.trim() !== '') {
        if (!transportAsAny.httpSettings) {
          transportAsAny.httpSettings = { url: '' };
        }
        // Only overwrite httpSettings.url if it's not already set or is empty
        if (typeof transportAsAny.httpSettings.url !== 'string' || transportAsAny.httpSettings.url.trim() === '') {
          transportAsAny.httpSettings.url = legacyTopLevelUrl;
          appLogger.mcp!.debug(`SSE: Initialized httpSettings.url from legacy top-level transport.url ('${legacyTopLevelUrl}') for '${configLabel}'.`);
        }
        // If there were legacy top-level headers, move them to httpSettings.headers, potentially overwriting if httpSettings.headers already existed but httpSettings.url was just set from legacy.
        if (legacyTopLevelHeaders) {
          transportAsAny.httpSettings.headers = legacyTopLevelHeaders;
          appLogger.mcp!.debug(`SSE: Initialized httpSettings.headers from legacy top-level transport.headers for '${configLabel}'.`);
        }
        // Clean up the legacy top-level properties as they are now consolidated into httpSettings
        delete transportAsAny.url;
        delete transportAsAny.headers;
      } else if (legacyTopLevelHeaders && !transportAsAny.httpSettings?.headers) {
        // Case: No top-level URL, but top-level headers exist. Ensure they get into httpSettings.
        if (!transportAsAny.httpSettings) {
          transportAsAny.httpSettings = { url: '' };
        }
        transportAsAny.httpSettings.headers = legacyTopLevelHeaders;
        appLogger.mcp!.debug(`SSE: Initialized httpSettings.headers from legacy top-level transport.headers (no top-level url) for '${configLabel}'.`);
        delete transportAsAny.headers; // Cleaned up
      }

      // Ensure httpSettings object exists if we expect to read from it, even if no legacy top-level url/headers were processed.
      if (!transportAsAny.httpSettings) {
        transportAsAny.httpSettings = { url: '' };
        appLogger.mcp!.debug(`SSE: Initialized empty httpSettings for '${configLabel}' as none existed.`);
      }

      // Step 2: Ensure top-level transport.url and transport.headers are set from httpSettings for AI SDK compatibility.
      if (typeof transportAsAny.httpSettings.url === 'string' && transportAsAny.httpSettings.url.trim() !== '') {
        transportAsAny.url = transportAsAny.httpSettings.url;
        if (transportAsAny.httpSettings.headers) {
          transportAsAny.headers = transportAsAny.httpSettings.headers;
        } else {
          // If httpSettings has a URL but no headers, ensure top-level headers are cleared/absent.
          delete transportAsAny.headers;
        }
        appLogger.mcp!.debug(`SSE: Set transport.url='${transportAsAny.url}' from httpSettings for '${configLabel}'. Headers also set/cleared from httpSettings.`);
      } else {
        // If httpSettings.url is empty or invalid, ensure transport.url is also empty and transport.headers are cleared.
        // This might happen if httpSettings existed but had no URL, or was just initialized empty.
        transportAsAny.url = ''; // Explicitly set to empty string if not properly derived
        delete transportAsAny.headers;
        appLogger.mcp!.debug(`SSE: httpSettings.url was empty/invalid for '${configLabel}', so transport.url is set to empty and transport.headers cleared.`);
      }

      // Final check and warning if URL is still missing after all normalization attempts.
      // The schema validation should ultimately catch this, but an early warning is good.
      if (typeof transportAsAny.url !== 'string' || transportAsAny.url.trim() === '') {
        appLogger.mcp!.warn(`SSE/Streamable-HTTP transport for '${configLabel}' still has a missing or empty URL after all normalization. This will likely cause validation errors.`, { configBeingProcessed: newConfig, currentTransport: transportAsAny });
      }
      // Note: We are keeping transport.httpSettings populated. The AI SDK will ignore it for SSE/streamable-http if transport.url is present.
      // This preserves the fully normalized form internally in case other parts of Piper expect httpSettings.
    }
  }

  if (typeof newConfig.enabled === 'undefined') {
    newConfig.enabled = true;
  }

  appLogger.mcp!.debug(`Final normalized configuration for server '${newConfig.label || 'unknown'}':`, { normalizedConfig: newConfig });
  return newConfig;
}

export class MCPManager {
  private static instance: MCPManager;

  static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  /**
   * Initialize the MCP Manager with all its modules
   */
  async initialize(appConfig: AppConfig): Promise<void> {
    // Use the module-scoped isManagerInitialized flag first
    if (isManagerInitialized) {
      appLogger.logSource('MCP', LogLevel.INFO, '[MCP Manager] Already initialized. Skipping re-initialization.');
      return;
    }
    // Fallback to globalThis check for HMR scenarios
    if (process.env.NODE_ENV !== 'production' && globalThis.__isMCPManagerInitialized) {
      appLogger.logSource('MCP', LogLevel.INFO, '[MCP Manager] Already initialized (development mode). Skipping re-initialization.');
      return;
    }

    appLogger.logSource('MCP', LogLevel.INFO, '[MCP Manager] Initializing MCP Manager...');

    if (!appConfig || !appConfig.mcpServers) {
      appLogger.logSource('MCP', LogLevel.ERROR, '[MCP Manager] MCP server configuration is missing or invalid. Cannot initialize.');
      // Set flags here too, to prevent re-attempts if config is bad
      isManagerInitialized = true;
      if (process.env.NODE_ENV !== 'production') globalThis.__isMCPManagerInitialized = true;
      return;
    }

    // Clear existing services
    mcpServiceRegistry.clearAll();

    // Initialize all servers from config
    const initializationPromises: Promise<void>[] = [];

    for (const key in appConfig.mcpServers) {
      const serverConfig = appConfig.mcpServers[key] as ServerConfigEntry;
      const initPromise = this.initializeServer(key, serverConfig);
      initializationPromises.push(initPromise);
    }

    try {
      await Promise.all(initializationPromises);
      appLogger.logSource('MCP', LogLevel.INFO, '[MCP Manager] All server initial fetch and cache attempts completed.');
    } catch (e: unknown) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[MCP Manager] Error during Promise.all in initialization: ${e instanceof Error ? e.message : String(e)}`, { error: e });
    }

    appLogger.logSource('MCP', LogLevel.INFO, '[MCP Manager] MCP Manager initialized. Starting polling...');
    isManagerInitialized = true;
    if (process.env.NODE_ENV !== 'production') {
      globalThis.__isMCPManagerInitialized = true;
    }

    // Start polling
    pollingManager.startPolling();
  }

  /**
   * Initialize a single server
   */
  private async initializeServer(serverKey: string, originalServerConfig: ServerConfigEntry): Promise<void> {
    const serverConfig = normalizeServerConfig(originalServerConfig);
    const serviceLabel = serverConfig.label || serverKey;

    // Check 'enabled' status AFTER normalization
    if (serverConfig.enabled === false) {
      appLogger.logSource('MCP', LogLevel.INFO, `[MCP Manager] Skipping disabled server: ${serviceLabel}`);
      await serverStatusManager.initializeDisabledServerStatus(serverKey, serverConfig);
      return;
    }

    // Handle missing transport
    if (!serverConfig.transport) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[MCP Manager] Cannot initialize ${serviceLabel}: Missing 'transport' configuration for enabled server.`);
      await serverStatusManager.initializeErrorServerStatus(serverKey, serverConfig, "Missing 'transport' configuration for enabled server.");
      return;
    }

    // Register the service and initialize
    appLogger.logSource('MCP', LogLevel.INFO, `[MCP Manager] Creating MCPService for '${serviceLabel}'. Transport: ${serverConfig.transport.type}`);

    try {
      mcpServiceRegistry.registerService(serverKey, serverConfig);

      // Get initial status and cache it
      await serverStatusManager.refreshServerStatus(serverKey, serviceLabel);
      appLogger.logSource('MCP', LogLevel.INFO, `[MCP Manager] Successfully initialized server ${serviceLabel}.`);
    } catch (e: unknown) {
      appLogger.logSource('MCP', LogLevel.ERROR, `[MCP Manager] Error during initial fetch/cache for ${serviceLabel}: ${e instanceof Error ? e.message : String(e)}`, { error: e });
      await serverStatusManager.initializeErrorServerStatus(serverKey, serverConfig, e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Initialize a single new MCP server dynamically
   */
  async initializeNewServer(serverKey: string, serverConfig: ServerConfigEntry): Promise<void> {
    await this.initializeServer(serverKey, serverConfig);
  }

  /**
   * Check for new servers in config and initialize them
   */
  async checkAndInitializeNewServers(): Promise<void> {
    const currentAppConfig = await getAppConfig();
    if (!currentAppConfig || !currentAppConfig.mcpServers) {
      appLogger.logSource('MCP', LogLevel.INFO, '[MCP Manager] No valid config found for checking new servers.');
      return;
    }

    const configServerKeys = Object.keys(currentAppConfig.mcpServers);
    const managedServerKeys = mcpServiceRegistry.getServiceKeys();

    // Find servers in config that are not in our managed services
    const newServerKeys = configServerKeys.filter(key => !managedServerKeys.includes(key));

    if (newServerKeys.length === 0) {
      appLogger.logSource('MCP', LogLevel.INFO, '[MCP Manager] No new servers found in config.');
      return;
    }

    appLogger.logSource('MCP', LogLevel.INFO, `[MCP Manager] Found ${newServerKeys.length} new server(s) in config: ${newServerKeys.join(', ')}`);

    // Initialize new servers in parallel
    const initPromises = newServerKeys.map(async (serverKey) => {
      const serverConfig = currentAppConfig.mcpServers[serverKey] as ServerConfigEntry;
      await this.initializeNewServer(serverKey, serverConfig);
    });

    await Promise.all(initPromises);
    appLogger.logSource('MCP', LogLevel.INFO, `[MCP Manager] Completed initialization of ${newServerKeys.length} new server(s).`);
  }

  /**
   * Poll all servers (delegates to polling manager)
   */
  async pollAllServers(): Promise<void> {
    await pollingManager.forcePoll();
  }

  /**
   * Get managed servers info (delegates to status manager and cache)
   */
  async getManagedServersInfo(appConfig?: AppConfig): Promise<ManagedServerInfo[]> {
    const currentAppConfig = appConfig || await getAppConfig();
    if (!currentAppConfig || !currentAppConfig.mcpServers) {
      appLogger.logSource('MCP', LogLevel.ERROR, '[MCP Manager] getManagedServersInfo: AppConfig not available.');
      return [];
    }

    const serverKeysFromConfig = Object.keys(currentAppConfig.mcpServers);

    // Step 1: Normalize all server configs once
    const allNormalizedConfigs = serverKeysFromConfig.map(key => {
      const originalConfig = currentAppConfig.mcpServers[key] as ServerConfigEntry;
      return {
        key,
        config: normalizeServerConfig(originalConfig),
      };
    });

    // Step 2: Separate enabled and disabled servers
    const enabledServers = allNormalizedConfigs.filter(item => item.config.enabled);
    const disabledServers = allNormalizedConfigs.filter(item => !item.config.enabled);

    const serversInfo: ManagedServerInfo[] = [
      ...disabledServers.map(item => serverStatusManager.createDisabledServerInfo(item.key, item.config)),
    ];

    if (enabledServers.length === 0) {
      return serversInfo;
    }

    // Step 3: Get cached data for enabled servers
    const enabledServerKeys = enabledServers.map(item => item.key);
    const cachedData = await redisCacheManager.getMultipleServerStatuses(enabledServerKeys);

    // Step 4: Process enabled servers
    enabledServers.forEach((item, index) => {
      const data = cachedData[index];
      if (data) {
        serversInfo.push(serverStatusManager.convertCachedToManagedInfo(data));
      } else {
        // Use the ALREADY NORMALIZED config here
        serversInfo.push(serverStatusManager.createUninitializedServerInfo(item.key, item.config));
      }
    });

    return serversInfo;
  }

  /**
   * Get a managed client by server key
   */
  getManagedClient(serverKey: string) {
    return mcpServiceRegistry.getService(serverKey);
  }

  /**
   * Get combined MCP tools for AI SDK (delegates to tool collection manager)
   */
  async getCombinedMCPToolsForAISDK(): Promise<ToolSet> {
    return await toolCollectionManager.getCombinedMCPToolsForAISDK();
  }

  /**
   * Handles updates to the MCP server configuration.
   * Reloads the config, identifies changes, and re-initializes services accordingly.
   */
  async handleConfigUpdate(): Promise<void> {
    appLogger.logSource('MCP', LogLevel.INFO, '[MCP Manager] Handling configuration update...');

    const newAppConfig = await getAppConfig(); // Reloads the configuration from file
    if (!newAppConfig || !newAppConfig.mcpServers) {
      appLogger.logSource('MCP', LogLevel.ERROR, '[MCP Manager] Failed to load new configuration or mcpServers missing. Aborting update.');
      return;
    }

    const newServerConfigs = newAppConfig.mcpServers;
    const newServerKeys = Object.keys(newServerConfigs);
    const currentManagedKeys = mcpServiceRegistry.getServiceKeys();

    // Identify and process removed servers
    const removedServerKeys = currentManagedKeys.filter(key => !newServerKeys.includes(key));
    for (const serverKey of removedServerKeys) {
      appLogger.logSource('MCP', LogLevel.INFO, `[MCP Manager] Server '${serverKey}' removed from config. Shutting down and unregistering.`);
      await mcpServiceRegistry.removeService(serverKey); // This now handles shutdown
    }

    // Identify and process new or modified servers
    for (const serverKey of newServerKeys) {
      const newConfig = newServerConfigs[serverKey];
      const currentService = mcpServiceRegistry.getService(serverKey);

      if (!currentService) {
        // New server
        appLogger.logSource('MCP', LogLevel.INFO, `[MCP Manager] New server '${serverKey}' found in config. Initializing...`);
        const normalizedNewConfig = normalizeServerConfig(newConfig);
        // Ensure we don't try to initialize a server that's explicitly disabled in the new config
        if (normalizedNewConfig.enabled === false) {
          appLogger.logSource('MCP', LogLevel.INFO, `[MCP Manager] Server '${serverKey}' is disabled in the new config. Skipping initialization.`);
          // Ensure status reflects disabled state if it was previously active or different
          await serverStatusManager.initializeDisabledServerStatus(serverKey, newConfig);
        } else {
          await this.initializeServer(serverKey, newConfig);
        }
      } else {
        // Existing server, check if modified
        // Compare essential parts of the configuration to decide if a restart is needed.
        // A simple but effective check is stringifying the transport and label, and checking 'disabled' status.
        const oldConfig = currentService.config; // ManagedMCPClient should expose its config
        const significantConfigChanged = 
          JSON.stringify(oldConfig.transport) !== JSON.stringify(newConfig.transport) ||
          oldConfig.label !== newConfig.label ||
          oldConfig.enabled !== newConfig.enabled; // Compare 'enabled' after normalization

        if (significantConfigChanged) {
          appLogger.logSource('MCP', LogLevel.INFO, `[MCP Manager] Server '${serverKey}' configuration modified. Re-initializing...`);
          await mcpServiceRegistry.removeService(serverKey); // Shutdown and remove old instance
          const normalizedNewConfigForReinit = normalizeServerConfig(newConfig);
          // Re-initialize, respecting the new 'enabled' status
          if (normalizedNewConfigForReinit.enabled === false) {
            appLogger.logSource('MCP', LogLevel.INFO, `[MCP Manager] Server '${serverKey}' is now disabled. Skipping re-initialization.`);
            await serverStatusManager.initializeDisabledServerStatus(serverKey, newConfig);
          } else {
            await this.initializeServer(serverKey, newConfig); // Initialize with new config
          }
        } else {
          appLogger.logSource('MCP', LogLevel.DEBUG, `[MCP Manager] Server '${serverKey}' config unchanged. No action needed.`);
        }
      }
    }

    // After all changes, it might be necessary to update the combined tool collection
    // This depends on how toolCollectionManager caches or builds its list.
    // For now, assume it dynamically pulls from mcpServiceRegistry or gets updated by initializeServer.
    // If not, an explicit call like toolCollectionManager.rebuildToolCollection() might be needed here.

    appLogger.logSource('MCP', LogLevel.INFO, '[MCP Manager] Configuration update processed.');
  }

  /**
   * Clean up for HMR
   */
  cleanupForHmr(): void {
    // Logic to clean up resources before HMR reload
    if (process.env.NODE_ENV !== 'production') {
      appLogger.logSource('MCP', LogLevel.WARN, '[MCP Manager] Cleaning up resources for HMR reload...');
      mcpServiceRegistry.clearAll();
      pollingManager.stopPolling();
      if (globalThis.__isMCPManagerInitialized) {
        globalThis.__isMCPManagerInitialized = false;
      }
    }
  }

  /**
   * Get manager statistics
   */
  getManagerStats(): {
    isInitialized: boolean;
    registryStats: ReturnType<typeof mcpServiceRegistry.getRegistryStats>;
    pollingStatus: ReturnType<typeof pollingManager.getPollingStatus>;
    cacheAvailable: boolean;
  } {
    return {
      isInitialized: isManagerInitialized,
      registryStats: mcpServiceRegistry.getRegistryStats(),
      pollingStatus: pollingManager.getPollingStatus(),
      cacheAvailable: redisCacheManager.isAvailable(),
    };
  }
}

//
// Exported Functions for Global Access
//
export async function initializeMCPManager(appConfig: AppConfig): Promise<void> {
  await MCPManager.getInstance().initialize(appConfig);
}

export async function initializeNewServer(serverKey: string, serverConfig: ServerConfigEntry): Promise<void> {
  await MCPManager.getInstance().initializeNewServer(serverKey, serverConfig);
}

export async function checkAndInitializeNewServers(): Promise<void> {
  await MCPManager.getInstance().checkAndInitializeNewServers();
}

export async function pollAllServers(): Promise<void> {
  await MCPManager.getInstance().pollAllServers();
}

export async function getManagedServersInfo(appConfig?: AppConfig): Promise<ManagedServerInfo[]> {
  return await MCPManager.getInstance().getManagedServersInfo(appConfig);
}

export function getManagedClient(serverKey: string) {
  return MCPManager.getInstance().getManagedClient(serverKey);
}

export async function getCombinedMCPToolsForAISDK(): Promise<ToolSet> {
  return await toolCollectionManager.getCombinedMCPToolsForAISDK();
}

export function cleanupForHmr(): void {
  MCPManager.getInstance().cleanupForHmr();
}

// Export the manager instance for modules that need direct access
export const mcpManager = MCPManager.getInstance();

// Re-export types and modules for external use
export type { ManagedServerInfo, MCPServiceStatus };
export { processLargeToolResponse };
export { 
  redisCacheManager,
  mcpServiceRegistry,
  serverStatusManager,
  pollingManager,
  toolCollectionManager,
};
