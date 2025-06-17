// lib/mcp/mcpManager.ts
import { appLogger } from '@/lib/logger';
import { LogLevel, LogContext } from '@/lib/logger/types';
import {
  MCPServerConfig,
  TransportConfig,
  StdioTransportInfo,
  HttpTransportInfo,
  ServerTransportType,
} from '@/lib/schemas/mcp-config.schema';

const MCP_MANAGER_LOG_SOURCE = {
  service: 'mcp-manager',
  component: 'MCPManager',
};

export function normalizeServerConfig(
  serverKey: string,
  config: any,
): MCPServerConfig | null {
  const logContext: LogContext = {
    source: MCP_MANAGER_LOG_SOURCE,
    serverKey,
  };

  appLogger.mcp.debug(
    `Normalizing configuration for server: ${serverKey}`,
    { ...logContext, originalConfig: JSON.parse(JSON.stringify(config)) }, // Deep clone for logging
  );

  if (!config || typeof config !== 'object') {
    appLogger.mcp.warn(
      `Invalid configuration object for server ${serverKey}.`,
      logContext,
    );
    return null;
  }

  const normalized: Partial<MCPServerConfig> = {
    enabled: typeof config.enabled === 'boolean' ? config.enabled : (typeof config.disabled === 'boolean' ? !config.disabled : true),
    transport: {} as TransportConfig,
  };

  let transportType: ServerTransportType | undefined = config.transport?.type;
  if (!transportType && config.transportType) {
    transportType = config.transportType as ServerTransportType;
    appLogger.mcp.debug(
      `Server ${serverKey}: Using legacy transportType '${config.transportType}' -> transport.type`,
      logContext,
    );
  }

  if (!transportType) {
    appLogger.mcp.warn(
      `Server ${serverKey}: Missing transport type. Cannot normalize.`,
      { ...logContext, config },
    );
    return null;
  }
  normalized.transport!.type = transportType;

  switch (transportType) {
    case ServerTransportType.STDIO:
      const stdioInfo: Partial<StdioTransportInfo> = {};
      stdioInfo.command = config.transport?.command || config.command;
      stdioInfo.args = config.transport?.args || config.args;
      stdioInfo.cwd = config.transport?.cwd || config.cwd;
      stdioInfo.env = config.transport?.env || config.env;

      if (!stdioInfo.command) {
        appLogger.mcp.warn(
          `Server ${serverKey} (stdio): Missing command.`,
          { ...logContext, currentNormalized: normalized, originalConfig: config },
        );
        return null;
      }
      normalized.transport = { ...normalized.transport, ...stdioInfo } as StdioTransportInfo;
      break;

    case ServerTransportType.SSE:
    case ServerTransportType.STREAMABLE_HTTP:
      const httpInfo: Partial<HttpTransportInfo> = {};
      let url = config.transport?.url;
      let headers = config.transport?.headers;

      if (!url && config.httpSettings?.url) url = config.httpSettings.url;
      else if (!url && config.url) url = config.url; // top-level legacy url

      if (!headers && config.httpSettings?.headers) headers = config.httpSettings.headers;
      else if (!headers && config.headers) headers = config.headers; // top-level legacy headers
      
      httpInfo.url = url;
      httpInfo.headers = headers;
      httpInfo.method = config.transport?.method || config.method;
      httpInfo.body = config.transport?.body || config.body;

      if (!httpInfo.url) {
        appLogger.mcp.warn(
          `Server ${serverKey} (${transportType}): Missing URL.`,
          { ...logContext, currentNormalized: normalized, originalConfig: config },
        );
        return null;
      }
      normalized.transport = { ...normalized.transport, ...httpInfo } as HttpTransportInfo;
      break;

    default:
      appLogger.mcp.warn(
        `Server ${serverKey}: Unrecognized transport type '${transportType}'. Using raw transport object.`,
        { ...logContext, originalTransport: config.transport },
      );
      if (config.transport && typeof config.transport === 'object') {
        normalized.transport = { ...config.transport, type: transportType };
      } else {
         appLogger.mcp.error(
          `Server ${serverKey}: Transport object is missing or invalid for unknown type '${transportType}'.`,
          logContext,
        );
        return null;
      }
      break;
  }

  if (config.retryPolicy) normalized.retryPolicy = config.retryPolicy;
  if (config.timeout) normalized.timeout = config.timeout;

  appLogger.mcp.info(
    `Successfully normalized configuration for server: ${serverKey}`,
    { ...logContext, normalizedConfig: JSON.parse(JSON.stringify(normalized)) }, // Deep clone for logging
  );

  return normalized as MCPServerConfig;
}

// Minimal MCPManager class or other exports if needed later
export class MCPManager {
    constructor() {
        appLogger.system.info('MCPManager initialized (placeholder)', { source: MCP_MANAGER_LOG_SOURCE });
    }

    public initializeNewServer(serverKey: string, config: any): MCPServerConfig | null {
        return normalizeServerConfig(serverKey, config);
    }
}
