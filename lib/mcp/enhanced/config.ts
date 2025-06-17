import { readFileSync } from 'fs';
import { join as pathJoin } from 'path';
import { appLogger, LogLevel } from '@/lib/logger';
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
      appLogger.logSource('MCP', LogLevel.ERROR, 'config.json is missing the mcpServers property.');
      return { mcpServers: {} };
    }

    // Config is now used as-is - no normalization needed for new simplified format
    return parsedConfig;
  } catch (error) {
    appLogger.logSource('MCP', LogLevel.ERROR, `Failed to load or parse config.json from ${configPath}:`, error as Error);
    return { mcpServers: {} };
  }
}

/**
 * Validates server configuration
 */
export function validateServerConfig(config: ServerConfigEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate based on the top-level 'type' discriminator
  switch (config.type) {
    case 'stdio':
      if (!config.command) {
        errors.push('stdio server config requires a command property.');
      }
      // Add other stdio-specific validations if needed (e.g., args format)
      break;
    case 'sse':
      if (!config.url) {
        errors.push('sse server config requires a url property.');
      } else {
        try {
          new URL(config.url);
        } catch {
          errors.push(`Invalid URL format for sse server: ${config.url}`);
        }
      }
      // Add other sse-specific validations if needed (e.g., headers format)
      break;
    case 'streamableHttp': // Matches the type definition 'streamableHttp'
      if (!config.url) {
        errors.push('streamableHttp server config requires a url property.');
      } else {
        try {
          new URL(config.url);
        } catch {
          errors.push(`Invalid URL format for streamableHttp server: ${config.url}`);
        }
      }
      // Add other streamableHttp-specific validations if needed
      break;
    default:
      // This case should ideally not be reached if types are correct elsewhere,
      // but it's good for robustness, especially if config comes from untyped JSON.
      const exhaustiveCheck: never = config;
      errors.push(`Unsupported server type: ${(exhaustiveCheck as ServerConfigEntry).type}`);
      break;
  }

  // Common validations (can be added here if any apply to all types, e.g., label)
  if (!config.label || typeof config.label !== 'string' || config.label.trim() === '') {
    // errors.push('Server config requires a non-empty label.'); // Example, if label becomes mandatory
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