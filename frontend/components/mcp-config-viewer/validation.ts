import { MCPConfig, MCPServerConfig, ServerValidationError } from './types';

/**
 * Validates an MCP server configuration
 * @param serverName - The name of the server
 * @param serverConfig - The server configuration to validate
 * @returns An array of validation error messages or empty array if valid
 */
export const validateMCPServer = (
  serverName: string, 
  serverConfig: MCPServerConfig
): string[] => {
  const errors: string[] = [];

  // Check if serverConfig is an object
  if (typeof serverConfig !== 'object' || serverConfig === null) {
    errors.push(`${serverName}: Server configuration must be an object`);
    return errors;
  }

  // Check command property
  if (!('command' in serverConfig) || typeof serverConfig.command !== 'string') {
    errors.push(`${serverName}: Command must be a string`);
  } else if (serverConfig.command.trim() === '') {
    errors.push(`${serverName}: Command cannot be empty`);
  }

  // Check args property
  if (!('args' in serverConfig) || !Array.isArray(serverConfig.args)) {
    errors.push(`${serverName}: Args must be an array`);
  } else {
    // Check if all args are strings
    const nonStringArgs = serverConfig.args.filter(arg => typeof arg !== 'string');
    if (nonStringArgs.length > 0) {
      errors.push(`${serverName}: All args must be strings`);
    }
  }

  // Check env property if it exists
  if ('env' in serverConfig && serverConfig.env !== undefined) {
    if (typeof serverConfig.env !== 'object' || serverConfig.env === null) {
      errors.push(`${serverName}: Environment variables must be an object`);
    } else {
      // Check if all env values are strings
      for (const [key, value] of Object.entries(serverConfig.env)) {
        if (typeof value !== 'string') {
          errors.push(`${serverName}: Environment variable ${key} must be a string`);
        }
      }
    }
  }

  return errors;
};

/**
 * Validates all MCP servers in the configuration
 * @param mcp_servers - The servers configuration object
 * @returns Array of validation error objects with server names and error messages
 */
export const validateAllMCPServers = (
  mcp_servers: MCPConfig['mcp_servers']
): ServerValidationError[] => {
  return Object.entries(mcp_servers)
    .map(([serverName, serverConfig]) => ({
      serverName,
      errors: validateMCPServer(serverName, serverConfig)
    }))
    .filter(result => result.errors.length > 0);
};
