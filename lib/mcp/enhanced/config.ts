import { readFileSync } from 'fs';
import { join as pathJoin } from 'path';
import { appLogger } from '@/lib/logger';
import {
  AppConfig,
  ServerConfigEntry
} from './types';

/**
 * Loads application configuration from config.json.
 * Assumes config.json is in the directory specified by CONFIG_DIR env var or /config.
 */
export function getAppConfig(): AppConfig {
  const configPath = pathJoin(process.env.CONFIG_DIR || '/config', 'config.json');
  
  try {
    const rawConfig = readFileSync(configPath, 'utf-8');
    const parsedConfig = JSON.parse(rawConfig);
    
    if (!parsedConfig.mcpServers) {
      appLogger.logSource('MCP', 'error', 'config.json is missing the mcpServers property.');
      return { mcpServers: {} };
    }

    // Config is now used as-is - no normalization needed for new simplified format
    return parsedConfig;
  } catch (error) {
    appLogger.logSource('MCP', 'error', `Failed to load or parse config.json from ${configPath}:`, error as Error);
    return { mcpServers: {} };
  }
}

/**
 * Validates server configuration
 */
export function validateServerConfig(config: ServerConfigEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.transport) {
    errors.push('Missing transport configuration');
    return { valid: false, errors };
  }

  const transport = config.transport;

  switch (transport.type) {
    case 'stdio':
      if (!transport.command) {
        errors.push('stdio transport requires command');
      }
      break;
    case 'sse':
    case 'streamable-http':
      if (!transport.url) {
        errors.push(`${transport.type} transport requires url`);
      } else {
        try {
          new URL(transport.url);
        } catch {
          errors.push(`Invalid URL format for ${transport.type} transport`);
        }
      }
      break;
    default:
      errors.push(`Unsupported transport type: ${(transport as { type: string }).type}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Gets configuration for a specific server
 */
export function getServerConfig(serverKey: string): ServerConfigEntry | null {
  const config = getAppConfig();
  return config.mcpServers[serverKey] || null;
}

/**
 * Lists all configured server keys
 */
export function getConfiguredServers(): string[] {
  const config = getAppConfig();
  return Object.keys(config.mcpServers).filter(key => !config.mcpServers[key].disabled);
}

/**
 * Checks if a server is enabled in configuration
 */
export function isServerEnabled(serverKey: string): boolean {
  const config = getServerConfig(serverKey);
  return config !== null && !config.disabled;
}