import { readFileSync } from 'fs';
import path from 'path';

import debug from 'debug';
import JSON5 from 'json5';

const log = debug('mcp:config');
const error = debug('mcp:config:error');

export interface LLMConfig {
  model_provider: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface Config {
  llm: LLMConfig;
  example_queries?: string[];
  mcp_servers: {
    [key: string]: MCPServerConfig;
  }
}

export function loadConfig(configPath: string): Config {
  try {
    // Determine if the configPath is relative to the project root or absolute
    const resolvedPath = configPath.startsWith('/')
      ? configPath  // Absolute path
      : path.resolve(
          process.cwd().endsWith('/backend') 
            ? path.join(process.cwd(), '..') // If cwd is /backend, go up one level
            : process.cwd(),                 // Otherwise use cwd directly
          configPath
        );
    
    log('Loading configuration from %s', resolvedPath);
    
    let json5Str = readFileSync(resolvedPath, 'utf-8');

    // Replace environment variables in the format ${VAR_NAME} with their values
    json5Str = json5Str.replace(/\${([^}]+)}/g, (_, varName) => {
      const value = process.env[varName];
      if (value === undefined) {
        log('Warning: Environment variable %s not found', varName);
        return '';
      }
      log('Substituted environment variable %s', varName);
      return value;
    });

    const config = JSON5.parse(json5Str);
    log('Successfully parsed JSON5 configuration');

    // Validate required fields
    validateConfig(config);
    log('Configuration validation successful');

    // Log server count
    const serverCount = Object.keys(config.mcp_servers).length;
    log('Loaded configuration with %d MCP server(s)', serverCount);

    return config;
  } catch (err) {
    error('Failed to load configuration from "%s": %s', configPath, err instanceof Error ? err.message : String(err));
    throw new Error(`Failed to load configuration from "${configPath}": ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function validateConfig(config: unknown): asserts config is Config {
  log('Validating configuration structure');
  if (typeof config !== 'object' || config === null) {
    error('Invalid configuration: must be an object');
    throw new Error('Configuration must be an object');
  }

  if (!('llm' in config)) {
    error('Invalid configuration: missing LLM configuration');
    throw new Error('LLM configuration is required');
  }
  validateLLMConfig(config.llm);

  if ('example_queries' in config) {
    log('Validating example queries');
    if (!Array.isArray(config.example_queries)) {
      error('Invalid configuration: example_queries must be an array');
      throw new Error('example_queries must be an array if provided');
    }
    if (config.example_queries.some((query: unknown) => typeof query !== 'string')) {
      error('Invalid configuration: all example queries must be strings');
      throw new Error('All example queries must be strings');
    }
    log('Validated %d example queries', config.example_queries.length);
  }

  if (!('mcp_servers' in config)) {
    error('Invalid configuration: missing mcp_servers configuration');
    throw new Error('mcp_servers configuration is required');
  }
  if (typeof config.mcp_servers !== 'object' || config.mcp_servers === null) {
    error('Invalid configuration: mcp_servers must be an object');
    throw new Error('mcp_servers must be an object');
  }

  Object.entries(config.mcp_servers).forEach(([key, value]) => {
    log('Validating MCP server configuration: %s', key);
    try {
      validateMCPServerConfig(value);
    } catch (err) {
      error('Invalid configuration for MCP server %s: %s', key, err instanceof Error ? err.message : String(err));
      throw new Error(`Invalid configuration for MCP server "${key}": ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}

function validateLLMConfig(llmConfig: unknown): asserts llmConfig is LLMConfig {
  log('Validating LLM configuration');
  if (typeof llmConfig !== 'object' || llmConfig === null) {
    error('Invalid LLM configuration: must be an object');
    throw new Error('LLM configuration must be an object');
  }

  if (!('model_provider' in llmConfig) || typeof llmConfig.model_provider !== 'string') {
    error('Invalid LLM configuration: model_provider must be a string');
    throw new Error('LLM model_provider must be a string');
  }

  if ('model' in llmConfig && typeof llmConfig.model !== 'string') {
    error('Invalid LLM configuration: model must be a string if provided');
    throw new Error('LLM model must be a string if provided');
  }

  if ('temperature' in llmConfig && typeof llmConfig.temperature !== 'number') {
    error('Invalid LLM configuration: temperature must be a number if provided');
    throw new Error('LLM temperature must be a number if provided');
  }

  if ('max_tokens' in llmConfig && typeof llmConfig.max_tokens !== 'number') {
    error('Invalid LLM configuration: max_tokens must be a number if provided');
    throw new Error('LLM max_tokens must be a number if provided');
  }

  log('LLM configuration validated successfully: %s', llmConfig.model_provider);
}

function validateMCPServerConfig(serverConfig: unknown): asserts serverConfig is MCPServerConfig {
  if (typeof serverConfig !== 'object' || serverConfig === null) {
    error('Invalid MCP server configuration: must be an object');
    throw new Error('MCP server configuration must be an object');
  }

  if (!('command' in serverConfig) || typeof serverConfig.command !== 'string') {
    error('Invalid MCP server configuration: command must be a string');
    throw new Error('MCP server command must be a string');
  }

  if (!('args' in serverConfig) || !Array.isArray(serverConfig.args)) {
    error('Invalid MCP server configuration: args must be an array');
    throw new Error('MCP server args must be an array');
  }

  if (serverConfig.args.some((arg: unknown) => typeof arg !== 'string')) {
    error('Invalid MCP server configuration: all args must be strings');
    throw new Error('All MCP server args must be strings');
  }

  if ('env' in serverConfig && serverConfig.env !== undefined) {
    if (typeof serverConfig.env !== 'object' || serverConfig.env === null) {
      error('Invalid MCP server configuration: env must be an object if provided');
      throw new Error('MCP server env must be an object if provided');
    }

    // Validate that all env values are strings
    for (const [key, value] of Object.entries(serverConfig.env)) {
      if (typeof value !== 'string') {
        error('Invalid MCP server configuration: env value for %s must be a string', key);
        throw new Error('All MCP server env values must be strings');
      }
    }
  }

  log('MCP server configuration validated successfully: %s %j', serverConfig.command, serverConfig.args);
}