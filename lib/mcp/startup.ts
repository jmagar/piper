/**
 * Piper Startup Process
 * 
 * This module is responsible for handling application-level initialization tasks
 * that should run once when the server starts. It ensures that long-running
 * processes, like initializing MCP servers, are started asynchronously in the
 * background without blocking the application's boot sequence.
 */
import { appLogger } from '@/lib/logger';
import { getCachedAppConfig, invalidateConfigCache } from './enhanced';
import { initializeMCPManager } from './mcpManager';
import { MCPConfigWatcher } from './config-watcher';
import { join as pathJoin } from 'path';

let isStartupProcessInitiated = false;
let configWatcher: MCPConfigWatcher | null = null;

function runStartupProcess() {
  if (isStartupProcessInitiated) {
    appLogger.info('[Startup] Startup process already initiated. Skipping.');
    return;
  }
  isStartupProcessInitiated = true;
  
  appLogger.info('[Startup] Initiating application startup process...');
  
  // Initialize config file watcher for automatic cache invalidation
  const configPath = pathJoin(process.env.CONFIG_DIR || '/config', 'config.json');
  configWatcher = new MCPConfigWatcher({
    configPath,
    validateOnLoad: false,
    autoReconnect: false,
    backupOnChange: false,
    onConfigChange: async (newConfig) => {
      appLogger.info('[Startup] Config file changed, invalidating cache and reloading MCP manager');
      await invalidateConfigCache();
      // Optionally trigger MCP manager reload here if needed
      try {
        await initializeMCPManager(newConfig);
        appLogger.info('[Startup] MCP manager reloaded successfully after config change');
      } catch (error) {
        appLogger.error('[Startup] Failed to reload MCP manager after config change', { error });
      }
    },
    onReloadError: (error) => {
      appLogger.error('[Startup] Config file reload error', { error });
    }
  });

  // Start the config watcher
  configWatcher.start().catch(error => {
    appLogger.error('[Startup] Failed to start config file watcher', { error });
  });
  
  // Asynchronously initialize the MCP Manager. This is a fire-and-forget
  // operation that allows the application to start serving requests immediately
  // while tool servers are being prepared in the background.
  getCachedAppConfig()
    .then(config => {
      if (config) {
        appLogger.info('[Startup] App config loaded. Initializing MCP Manager asynchronously.');
        initializeMCPManager(config).catch(error => {
          appLogger.error('[Startup] Unhandled error during background MCP initialization.', { error });
        });
      } else {
        appLogger.warn('[Startup] No app configuration found. MCP Manager will not be initialized.');
      }
    })
    .catch(error => {
      appLogger.error('[Startup] Failed to load app config for startup process.', { error });
    });

  appLogger.info('[Startup] Application startup process has been handed off to background tasks.');
}

// Cleanup function for graceful shutdown
export function stopStartupProcess() {
  if (configWatcher) {
    configWatcher.stop().catch(error => {
      appLogger.error('[Startup] Error stopping config watcher', { error });
    });
    configWatcher = null;
  }
}

// Immediately invoke the startup process when this module is loaded.
runStartupProcess(); 