import Redis from 'ioredis';
import { appLogger } from '@/lib/logger';

// Enhance globalThis for HMR persistence in development
declare global {
  // eslint-disable-next-line no-var
  var __mcpServicesMap: Map<string, MCPService> | undefined;
  // eslint-disable-next-line no-var
  var __isMCPManagerInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var __redisClientForMCP: Redis | undefined;
  // eslint-disable-next-line no-var
  var __pollIntervalId: NodeJS.Timeout | null | undefined;
}

import { ToolSet } from "ai";
import {
  ManagedMCPClient as MCPService, // Alias for compatibility or refactor later
  FetchedToolInfo as FetchedTool,
  ServerConfigEntry,
  AppConfig,
  getAppConfig,
  EnhancedTransportConfig as MCPTransportConfig,
  AISDKToolCollection
} from './enhanced-mcp-client';

// Smart content processing for large tool responses
interface ChunkedContent {
  type: 'chunked_response';
  tool: string;
  summary: string;
  sections: Array<{
    title: string;
    content: string;
    importance: 'high' | 'medium' | 'low';
  }>;
  metadata: {
    original_length: number;
    processed_length: number;
    url?: string;
    title?: string;
  };
}

/**
 * Processes large tool responses into manageable, structured chunks
 */
export function processLargeToolResponse(toolName: string, result: unknown): unknown {
  // Only process string results that are large
  if (typeof result !== 'string' || result.length < 5000) {
    return result;
  }

  appLogger.mcp.info(`[MCP Manager] Processing large ${toolName} response: ${result.length} characters`);

  try {
    if (toolName === 'fetch' || toolName.includes('fetch')) {
      return processFetchResponse(result);
    } else if (toolName.includes('search') || toolName.includes('crawl')) {
      return processSearchResponse(toolName, result);
    } else {
      return processGenericLargeResponse(toolName, result);
    }
  } catch (error) {
    appLogger.mcp.warn(`[MCP Manager] Error processing large response for ${toolName}:`, error);
    // Fallback to truncated version
    return {
      type: 'truncated_response',
      tool: toolName,
      content: result.substring(0, 3000),
      note: `Content truncated from ${result.length} to 3000 characters due to processing error`,
      original_length: result.length
    };
  }
}

/**
 * Specifically processes fetch tool responses (HTML content)
 */
function processFetchResponse(htmlContent: string): ChunkedContent {
  const sections: Array<{ title: string; content: string; importance: 'high' | 'medium' | 'low' }> = [];
  
  // Extract title
  const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Web Page';
  
  // Extract URL if present in content
  const urlMatch = htmlContent.match(/https?:\/\/[^\s<>"']+/);
  const url = urlMatch ? urlMatch[0] : undefined;
  
  // Extract headings and their content
  const headingMatches = htmlContent.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || [];
  const headings = headingMatches.map(h => h.replace(/<[^>]*>/g, '').trim()).slice(0, 8);
  
  // Extract meta description
  const metaDescMatch = htmlContent.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1] : '';
  
  // Extract main content (remove scripts, styles, nav, footer)
  const mainContent = htmlContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  // Create summary
  let summary = metaDescription;
  if (!summary && mainContent.length > 200) {
    summary = mainContent.substring(0, 300) + '...';
  }
  
  // Add title section
  if (title && title !== 'Web Page') {
    sections.push({
      title: 'Page Title',
      content: title,
      importance: 'high' as const
    });
  }
  
  // Add summary section
  if (summary) {
    sections.push({
      title: 'Summary',
      content: summary,
      importance: 'high' as const
    });
  }
  
  // Add headings as sections
  if (headings.length > 0) {
    sections.push({
      title: 'Key Sections',
      content: headings.join(' • '),
      importance: 'medium' as const
    });
  }
  
  // Add main content chunks (max 2000 chars per chunk)
  if (mainContent.length > 500) {
    const chunks = chunkText(mainContent, 2000);
    chunks.slice(0, 3).forEach((chunk, index) => {
      sections.push({
        title: `Content Part ${index + 1}`,
        content: chunk,
        importance: index === 0 ? 'medium' as const : 'low' as const
      });
    });
  }
  
  return {
    type: 'chunked_response',
    tool: 'fetch',
    summary: `Fetched: ${title}${url ? ` from ${url}` : ''}`,
    sections,
    metadata: {
      original_length: htmlContent.length,
      processed_length: sections.reduce((acc, s) => acc + s.content.length, 0),
      url,
      title
    }
  };
}

/**
 * Processes search/crawl tool responses
 */
function processSearchResponse(toolName: string, content: string): ChunkedContent {
  const sections: Array<{ title: string; content: string; importance: 'high' | 'medium' | 'low' }> = [];
  
  // Try to parse as JSON first (many search tools return JSON)
  try {
    const parsed = JSON.parse(content);
    if (parsed.results && Array.isArray(parsed.results)) {
      sections.push({
        title: 'Search Results',
        content: `Found ${parsed.results.length} results`,
        importance: 'high' as const
      });
      
      parsed.results.slice(0, 5).forEach((result: unknown, index: number) => {
        const resultObj = result as Record<string, unknown>;
        sections.push({
          title: `Result ${index + 1}`,
          content: `${resultObj.title || resultObj.name || 'Result'}: ${resultObj.description || resultObj.snippet || resultObj.content || ''}`.substring(0, 500),
          importance: index < 2 ? 'medium' as const : 'low' as const
        });
      });
    }
  } catch {
    // Not JSON, treat as text
    const chunks = chunkText(content, 1500);
    chunks.slice(0, 4).forEach((chunk, index) => {
      sections.push({
        title: `${toolName} Result ${index + 1}`,
        content: chunk,
        importance: index === 0 ? 'high' as const : 'medium' as const
      });
    });
  }
  
  return {
    type: 'chunked_response',
    tool: toolName,
    summary: `${toolName} completed with ${sections.length} sections`,
    sections,
    metadata: {
      original_length: content.length,
      processed_length: sections.reduce((acc, s) => acc + s.content.length, 0)
    }
  };
}

/**
 * Generic processor for other large responses
 */
function processGenericLargeResponse(toolName: string, content: string): ChunkedContent {
  const chunks = chunkText(content, 2000);
  const sections = chunks.slice(0, 3).map((chunk, index) => ({
    title: `${toolName} Output ${index + 1}`,
    content: chunk,
    importance: index === 0 ? ('high' as const) : ('medium' as const)
  }));
  
  return {
    type: 'chunked_response',
    tool: toolName,
    summary: `${toolName} returned ${content.length} characters in ${sections.length} chunks`,
    sections,
    metadata: {
      original_length: content.length,
      processed_length: sections.reduce((acc, s) => acc + s.content.length, 0)
    }
  };
}

/**
 * Utility function to split text into chunks
 */
function chunkText(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
      }
      currentChunk = trimmedSentence.length <= maxChunkSize ? trimmedSentence : trimmedSentence.substring(0, maxChunkSize - 3) + '...';
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + (currentChunk.endsWith('.') ? '' : '.'));
  }
  
  return chunks.filter(chunk => chunk.trim().length > 0);
}

/**
 * Processes large tool responses into manageable, structured chunks
 */
/* // Commented out unused function
function processLargeToolResponse(toolName: string, result: unknown): unknown {
  // Only process string results that are large
  if (typeof result !== 'string' || result.length < 5000) {
    return result;
  }

  appLogger.mcp.info(`[MCP Manager] Processing large ${toolName} response: ${result.length} characters`);

  try {
    if (toolName === 'fetch' || toolName.includes('fetch')) {
      return processFetchResponse(result);
    } else if (toolName.includes('search') || toolName.includes('crawl')) {
      return processSearchResponse(toolName, result);
    } else {
      return processGenericLargeResponse(toolName, result);
    }
  } catch (error) {
    appLogger.mcp.warn(`[MCP Manager] Error processing large response for ${toolName}:`, error);
    // Fallback to truncated version
    return {
      type: 'truncated_response',
      tool: toolName,
      content: result.substring(0, 3000),
      note: `Content truncated from ${result.length} to 3000 characters due to processing error`,
      original_length: result.length
    };
  }
}
*/

// TODO: Integrate large response processing functions into tool execution pipeline
// These functions were designed to handle large tool responses by chunking them into manageable pieces.
// They should be integrated into the enhanced MCP client's tool execution wrapper.

export interface ManagedServerInfo {
  key: string;
  label: string;
  status: MCPServiceStatus;
  tools: Array<{ name: string; description?: string; inputSchema?: unknown; [key: string]: unknown }>; 
  errorDetails?: string;
  transportType: MCPTransportConfig['type'] | 'unknown';
}

// Define MCPServiceStatus locally as it's a union type not directly exported
export type MCPServiceStatus = 'pending' | 'success' | 'error' | 'initializing' | 'no_tools_found' | 'disabled' | 'uninitialized';

// Interface for what we expect a tool definition to contain for caching
interface ToolDefinitionLike {
  description?: string;
  inputSchema?: unknown;
  // Potentially other properties like 'annotations' if they are ever used from AISDKToolCollection
}

// Interface for the combined data structure fetched from a server
export interface FetchedServerData {
  status: MCPServiceStatus;
  error?: string;
  tools: AISDKToolCollection | null; // From enhanced-mcp-client
  toolsCount?: number;
  displayName: string;
  serverKey: string;
  transportType: MCPTransportConfig['type'] | 'unknown'; // MCPTransportConfig is alias for EnhancedTransportConfig
  pid?: number; // Optional, as it was in the original structure
  initializationTime?: number; // Optional
}

let mcpServices: Map<string, MCPService>;
let isManagerInitialized: boolean;
let redisClient: Redis | undefined;

// Initialize mcpServices and isManagerInitialized
if (process.env.NODE_ENV === 'production') {
  mcpServices = new Map<string, MCPService>();
  isManagerInitialized = false;
  appLogger.mcp.info('[MCP Manager] Initialized mcpServices and isManagerInitialized for production.');
} else {
  // Development HMR logic
  if (!globalThis.__mcpServicesMap) {
    globalThis.__mcpServicesMap = new Map<string, MCPService>();
    appLogger.mcp.info('[MCP Manager] Initialized globalThis.__mcpServicesMap for development.');
  }
  mcpServices = globalThis.__mcpServicesMap;

  if (globalThis.__isMCPManagerInitialized === undefined) {
    globalThis.__isMCPManagerInitialized = false;
    appLogger.mcp.info('[MCP Manager] Initialized globalThis.__isMCPManagerInitialized for development.');
  }
  isManagerInitialized = globalThis.__isMCPManagerInitialized;
}

const REDIS_CACHE_PREFIX = 'mcp_status:';
const REDIS_CACHE_EXPIRY_SECONDS = 300;

function getRedisClient(): Redis | undefined {
  // If already initialized (either by this function previously or HMR in dev), return it
  if (redisClient) {
    return redisClient;
  }
  // For development HMR, if globalThis has it, use it and assign to module scope
  if (process.env.NODE_ENV !== 'production' && globalThis.__redisClientForMCP) {
    appLogger.mcp.info('[MCP Manager] Using existing Redis client from globalThis (HMR).');
    redisClient = globalThis.__redisClientForMCP;
    return redisClient;
  }

  // Proceed with new initialization
  if (!process.env.REDIS_URL) {
    appLogger.mcp.warn('[MCP Manager] REDIS_URL environment variable is not set. Redis client will not be initialized. Caching will be disabled.');
    return undefined;
  }

  try {
    appLogger.mcp.info(`[MCP Manager] Initializing new Redis client for ${process.env.NODE_ENV} mode. URL: ${process.env.REDIS_URL}`);
    const newClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000, // 5 seconds
      // Keep offline queue enabled by default, so commands queue if not connected yet.
      // Disable it if commands should fail fast when disconnected: enableOfflineQueue: false
    });

    newClient.on('error', (err) => appLogger.mcp.error('[MCP Manager] Redis Client Error:', err.message || err));
    newClient.on('connect', () => appLogger.mcp.info('[MCP Manager] Redis Client Connected.'));
    newClient.on('ready', () => appLogger.mcp.info('[MCP Manager] Redis Client Ready.'));
    newClient.on('reconnecting', () => appLogger.mcp.info('[MCP Manager] Redis Client Reconnecting...'));
    
    redisClient = newClient; // Assign to module-scoped variable

    if (process.env.NODE_ENV !== 'production') {
      globalThis.__redisClientForMCP = newClient; // Assign to global for HMR
      appLogger.mcp.info('[MCP Manager] Development Redis client stored on globalThis.__redisClientForMCP.');
    }
    return redisClient;

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    appLogger.mcp.error(`[MCP Manager] Failed to initialize Redis client: ${errorMessage}`);
    if (errorMessage.includes('ENOTFOUND')) {
        appLogger.mcp.warn(`[MCP Manager] Redis host not found (ENOTFOUND). This is common during build if service isn't up. Caching will be unavailable.`);
    }
    return undefined;
  }
}


function getDisplayTransportType(serverConfig: ServerConfigEntry): MCPTransportConfig['type'] | 'unknown' {
  if (serverConfig.transport?.type) {
    return serverConfig.transport.type;
  }
  if (serverConfig.url) return 'sse';
  if (serverConfig.command) return 'stdio';
  return 'unknown';
}

export async function initializeMCPManager(appConfig: AppConfig): Promise<void> {
  // Use the module-scoped isManagerInitialized flag first
  if (isManagerInitialized) {
    appLogger.mcp.info('[MCP Manager] Already initialized. Skipping re-initialization.');
    return;
  }
  // Fallback to globalThis check for HMR scenarios, though module scope should primarily handle it
  if (process.env.NODE_ENV !== 'production' && globalThis.__isMCPManagerInitialized) {
    appLogger.mcp.info('[MCP Manager] Already initialized (development mode). Skipping re-initialization.');
    return;
  }
  appLogger.mcp.info('[MCP Manager] Initializing MCP Manager...');

  if (!appConfig || !appConfig.mcpServers) {
    appLogger.mcp.error('[MCP Manager] MCP server configuration is missing or invalid. Cannot initialize.');
    // Set flags here too, to prevent re-attempts if config is bad
    isManagerInitialized = true; 
    if (process.env.NODE_ENV !== 'production') globalThis.__isMCPManagerInitialized = true;
    return;
  }

  mcpServices.clear();
  const initializationPromises: Promise<void>[] = [];

  for (const key in appConfig.mcpServers) {
    const serverConfig = appConfig.mcpServers[key] as ServerConfigEntry;
    // Construct the transport object if not explicitly provided
    // Now check if transport is correctly formed or if it was missing from raw config and couldn't be derived
    if (!serverConfig.transport || (serverConfig.transport.type !== 'stdio' && serverConfig.transport.type !== 'sse' && serverConfig.transport.type !== 'streamable-http')) {
      if (serverConfig.command) {
        serverConfig.transport = {
          type: 'stdio',
          command: serverConfig.command,
          args: serverConfig.args,
          env: serverConfig.env,
          cwd: serverConfig.cwd
        };
      } else if (serverConfig.url) {
        serverConfig.transport = {
          type: 'sse',
          url: serverConfig.url,
          headers: serverConfig.headers
        };
      } else {
        // If still no transport, then it's an error (handled by the next block)
      }
    }

    const serviceLabel = serverConfig.label || key;

    if (serverConfig.disabled === true) {
      appLogger.mcp.info(`[MCP Manager] Skipping disabled server: ${serviceLabel}`);
      const disabledInfo: ManagedServerInfo = {
        key: key,
        label: serviceLabel,
        status: 'disabled',
        tools: [],
        transportType: getDisplayTransportType(serverConfig),
        errorDetails: 'This server is disabled in the configuration.'
      };
      const currentRedisClient = getRedisClient();
      if (currentRedisClient) {
        currentRedisClient.set(`${REDIS_CACHE_PREFIX}${key}`, JSON.stringify(disabledInfo), 'EX', REDIS_CACHE_EXPIRY_SECONDS)
          .catch(err => appLogger.mcp.error(`[MCP Manager] Error setting disabled status in cache for ${serviceLabel}:`, err));
      } else {
        appLogger.mcp.warn(`[MCP Manager] Redis client not available. Cannot cache disabled status for ${serviceLabel}.`);
      }
      continue;
    }
    
    if (!serverConfig.transport) {
        appLogger.mcp.error(`[MCP Manager] Cannot initialize ${serviceLabel}: Missing 'transport' configuration for enabled server.`);
        const errorInfo: ManagedServerInfo = {
            key: key, label: serviceLabel, status: 'error', tools: [],
            errorDetails: "Missing 'transport' configuration for enabled server.",
            transportType: getDisplayTransportType(serverConfig),
        };
        const currentRedisClient = getRedisClient();
        if (currentRedisClient) {
            currentRedisClient.set(`${REDIS_CACHE_PREFIX}${key}`, JSON.stringify(errorInfo), 'EX', REDIS_CACHE_EXPIRY_SECONDS)
                .catch(err => appLogger.mcp.error(`[MCP Manager] Error setting error status in cache for ${serviceLabel}:`, err));
        } else {
            appLogger.mcp.warn(`[MCP Manager] Redis client not available. Cannot cache error status for ${serviceLabel}.`);
        }
        continue; 
    }

    appLogger.mcp.info(`[MCP Manager] Creating MCPService for '${serviceLabel}'. Transport: ${serverConfig.transport.type}`);
    const service = new MCPService(serverConfig, key);
    mcpServices.set(key, service);

    const initPromise = (async () => {
      try {
        appLogger.mcp.info(`[MCP Manager] Initializing and fetching status & tools for ${serviceLabel}...`);
        const statusResult = await service.getStatus();
        const toolsResult = await service.getTools(); // AISDKToolCollection | null
        
        const combinedFetchedData: FetchedServerData = {
          status: statusResult.status,
          tools: toolsResult,
          error: statusResult.error || (toolsResult === null && statusResult.status === 'success' ? 'No tools found but status is success' : undefined),
          transportType: statusResult.transportType as FetchedServerData['transportType'], 
          pid: undefined, // pid is not available from getStatus()
          displayName: serviceLabel,
          serverKey: key,
          toolsCount: toolsResult ? Object.keys(toolsResult).length : 0,
          initializationTime: undefined // initializationTime is not available from getStatus()
        };

        appLogger.mcp.info(`[MCP Manager] Successfully fetched initial data for ${serviceLabel}. Status: ${combinedFetchedData.status}, Tools: ${combinedFetchedData.toolsCount}`);
        await updateServerStatusInCache(key, serviceLabel, combinedFetchedData);
      } catch (e: unknown) {
        appLogger.mcp.error(`[MCP Manager] Error during initial fetch/cache for ${serviceLabel}:`, e instanceof Error ? e.message : String(e));
        const errorResult: FetchedServerData = {
            status: 'error' as const,
            tools: null, // AISDKToolCollection is Record<string, unknown>, so null is appropriate here
            error: e instanceof Error ? e.message : String(e),
            transportType: serverConfig.transport?.type || getDisplayTransportType(serverConfig),
            displayName: serviceLabel, // Added missing property
            serverKey: key // Added missing property
        };
        await updateServerStatusInCache(key, serviceLabel, errorResult); 
      }
    })();
    initializationPromises.push(initPromise);
  }

  try {
    await Promise.all(initializationPromises);
    appLogger.mcp.info('[MCP Manager] All server initial fetch and cache attempts completed.');
  } catch (e: unknown) {
    appLogger.mcp.error('[MCP Manager] Error during Promise.all in initializeMCPManager (should not happen if IIFEs catch their errors):', e instanceof Error ? e.message : String(e));
  }

  appLogger.mcp.info('[MCP Manager] MCP Manager initialized. Starting polling...');
  isManagerInitialized = true; 
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__isMCPManagerInitialized = true; 
    // Store the services map on globalThis for HMR persistence if needed by other parts
    // This ensures that if mcpServices was populated from globalThis earlier, it's the one we keep
    if (!globalThis.__mcpServicesMap || globalThis.__mcpServicesMap !== mcpServices) {
        globalThis.__mcpServicesMap = mcpServices;
    }
  }

  startPolling();
}

async function updateServerStatusInCache(
  serverKey: string, 
  serviceLabel: string, 
  fetchedResult: FetchedServerData
) {
  try {
    const toolsForCache: FetchedTool[] = [];
    if (fetchedResult.tools) {
      for (const toolName in fetchedResult.tools) {
        const toolDef = fetchedResult.tools[toolName] as ToolDefinitionLike;
        toolsForCache.push({
          name: toolName,
          description: toolDef?.description,
          inputSchema: toolDef?.inputSchema,
          // Add other relevant properties if they exist on toolDef and are needed by FetchedTool
        });
      }
    }

    const infoToCache: ManagedServerInfo = {
      key: serverKey,
      label: serviceLabel,
      status: fetchedResult.status,
      tools: toolsForCache, // Use the transformed tools
      errorDetails: fetchedResult.error, // Use error from FetchedServerData
      transportType: fetchedResult.transportType
    };
    const currentRedisClient = getRedisClient();
    if (currentRedisClient) {
      await currentRedisClient.set(`${REDIS_CACHE_PREFIX}${serverKey}`, JSON.stringify(infoToCache), 'EX', REDIS_CACHE_EXPIRY_SECONDS);
    } else {
      appLogger.mcp.warn(`[MCP Manager] Redis client not available. Cannot update cache for ${serviceLabel}.`);
    }
  } catch (error: unknown) {
    appLogger.mcp.error(`[MCP Manager] Error updating cache for ${serviceLabel}:`, error instanceof Error ? error.message : String(error));
  }
}

let pollIntervalId: NodeJS.Timeout | null = null;

function startPolling() {
  if (pollIntervalId && process.env.NODE_ENV !== 'production') {
    appLogger.mcp.info('[MCP Manager] Polling already started (development HMR). Not starting another.');
    return;
  }
  if (pollIntervalId && process.env.NODE_ENV === 'production') clearInterval(pollIntervalId);
  
  appLogger.mcp.info(`[MCP Manager] Starting periodic polling every 60 seconds.`);
  pollIntervalId = setInterval(async () => {
    appLogger.mcp.info('[MCP Manager] Periodic poll triggered.');
    const currentAppConfig = getAppConfig();
    if (!currentAppConfig || !currentAppConfig.mcpServers) {
      appLogger.mcp.error('[MCP Manager] Polling: MCP server configuration is missing or invalid. Stopping poll.');
      if(pollIntervalId) clearInterval(pollIntervalId);
      pollIntervalId = null;
      return;
    }
    await pollAllServers();
  }, 60 * 1000);

  if (process.env.NODE_ENV !== 'production') globalThis.__pollIntervalId = pollIntervalId;
}

/**
 * Initialize a single new MCP server dynamically
 */
export async function initializeNewServer(serverKey: string, serverConfig: ServerConfigEntry): Promise<void> {
  // Skip if server already exists in our managed services
  if (mcpServices.has(serverKey)) {
    appLogger.mcp.info(`[MCP Manager] Server '${serverKey}' already initialized. Skipping.`);
    return;
  }

  const serviceLabel = serverConfig.label || serverKey;
  appLogger.mcp.info(`[MCP Manager] Dynamically initializing new server: ${serviceLabel}`);

  // Handle transport configuration (same logic as in initializeMCPManager)
  if (!serverConfig.transport || (serverConfig.transport.type !== 'stdio' && serverConfig.transport.type !== 'sse' && serverConfig.transport.type !== 'streamable-http')) {
    if (serverConfig.command) {
      serverConfig.transport = {
        type: 'stdio',
        command: serverConfig.command,
        args: serverConfig.args,
        env: serverConfig.env,
        cwd: serverConfig.cwd
      };
    } else if (serverConfig.url) {
      serverConfig.transport = {
        type: 'sse',
        url: serverConfig.url,
        headers: serverConfig.headers
      };
    }
  }

  // Handle disabled servers
  if (serverConfig.disabled === true) {
    appLogger.mcp.info(`[MCP Manager] New server ${serviceLabel} is disabled. Setting cache status.`);
    const disabledInfo: ManagedServerInfo = {
      key: serverKey,
      label: serviceLabel,
      status: 'disabled',
      tools: [],
      transportType: getDisplayTransportType(serverConfig),
      errorDetails: 'This server is disabled in the configuration.'
    };
    const currentRedisClient = getRedisClient();
    if (currentRedisClient) {
      await currentRedisClient.set(`${REDIS_CACHE_PREFIX}${serverKey}`, JSON.stringify(disabledInfo), 'EX', REDIS_CACHE_EXPIRY_SECONDS)
        .catch(err => appLogger.mcp.error(`[MCP Manager] Error setting disabled status in cache for ${serviceLabel}:`, err));
    } else {
      appLogger.mcp.warn(`[MCP Manager] Redis client not available. Cannot cache disabled status for new server ${serviceLabel}.`);
    }
    return;
  }

  // Handle missing transport
  if (!serverConfig.transport) {
    appLogger.mcp.error(`[MCP Manager] Cannot initialize ${serviceLabel}: Missing 'transport' configuration for enabled server.`);
    const errorInfo: ManagedServerInfo = {
      key: serverKey, 
      label: serviceLabel, 
      status: 'error', 
      tools: [],
      errorDetails: "Missing 'transport' configuration for enabled server.",
      transportType: getDisplayTransportType(serverConfig),
    };
    const currentRedisClient = getRedisClient();
    if (currentRedisClient) {
      await currentRedisClient.set(`${REDIS_CACHE_PREFIX}${serverKey}`, JSON.stringify(errorInfo), 'EX', REDIS_CACHE_EXPIRY_SECONDS)
        .catch(err => appLogger.mcp.error(`[MCP Manager] Error setting error status in cache for ${serviceLabel}:`, err));
    } else {
      appLogger.mcp.warn(`[MCP Manager] Redis client not available. Cannot cache error status for new server ${serviceLabel}.`);
    }
    return; 
  }

  // Create and initialize the service
  appLogger.mcp.info(`[MCP Manager] Creating MCPService for new server '${serviceLabel}'. Transport: ${serverConfig.transport.type}`);
  const service = new MCPService(serverConfig, serverKey);
  mcpServices.set(serverKey, service);

  try {
    appLogger.mcp.info(`[MCP Manager] Waiting for initialization of new server ${serviceLabel}...`);
    // getStatus() and getTools() will internally await the initializationPromise from ManagedMCPClient
    const statusResult = await service.getStatus();
    const toolsResult = await service.getTools();

    const serverDataForCache: FetchedServerData = {
      status: statusResult.status === 'success' && (toolsResult && Object.keys(toolsResult).length > 0)
        ? 'success'
        : (statusResult.status === 'success' && (!toolsResult || Object.keys(toolsResult).length === 0)
          ? 'no_tools_found'
          : statusResult.status as MCPServiceStatus), // Cast as MCPServiceStatus
      error: statusResult.error,
      tools: toolsResult,
      toolsCount: statusResult.toolsCount,
      displayName: serviceLabel,
      serverKey: serverKey,
      transportType: statusResult.transportType as MCPTransportConfig['type'] | 'unknown',
    };
    appLogger.mcp.info(`[MCP Manager] Successfully initialized new server ${serviceLabel}. Status: ${serverDataForCache.status}`);
    await updateServerStatusInCache(serverKey, serviceLabel, serverDataForCache);
  } catch (e: unknown) {
    appLogger.mcp.error(`[MCP Manager] Error during initialization of new server ${serviceLabel}:`, e instanceof Error ? e.message : String(e));
    const errorData: FetchedServerData = {
      status: 'error',
      tools: null,
      error: e instanceof Error ? e.message : String(e),
      displayName: serviceLabel,
      serverKey: serverKey,
      transportType: serverConfig.transport?.type || getDisplayTransportType(serverConfig) as MCPTransportConfig['type'] | 'unknown',
    };
    await updateServerStatusInCache(serverKey, serviceLabel, errorData);
  }
}

/**
 * Check for new servers in config and initialize them
 */
export async function checkAndInitializeNewServers(): Promise<void> {
  const currentAppConfig = getAppConfig();
  if (!currentAppConfig || !currentAppConfig.mcpServers) {
    appLogger.mcp.info('[MCP Manager] No valid config found for checking new servers.');
    return;
  }

  const configServerKeys = Object.keys(currentAppConfig.mcpServers);
  const managedServerKeys = Array.from(mcpServices.keys());
  
  // Find servers in config that are not in our managed services
  const newServerKeys = configServerKeys.filter(key => !managedServerKeys.includes(key));
  
  if (newServerKeys.length === 0) {
    appLogger.mcp.info('[MCP Manager] No new servers found in config.');
    return;
  }

  appLogger.mcp.info(`[MCP Manager] Found ${newServerKeys.length} new server(s) in config: ${newServerKeys.join(', ')}`);
  
  // Initialize new servers in parallel
  const initPromises = newServerKeys.map(async (serverKey) => {
    const serverConfig = currentAppConfig.mcpServers[serverKey] as ServerConfigEntry;
    await initializeNewServer(serverKey, serverConfig);
  });

  await Promise.all(initPromises);
  appLogger.mcp.info(`[MCP Manager] Completed initialization of ${newServerKeys.length} new server(s).`);
}

export async function pollAllServers(): Promise<void> {
  const appConfig = getAppConfig(); // Get fresh config for polling
  if (!appConfig) {
    appLogger.mcp.error('[MCP Manager] pollAllServers: AppConfig not available. Stopping poll.');
    if (pollIntervalId) clearInterval(pollIntervalId);
    if (globalThis.__pollIntervalId) clearInterval(globalThis.__pollIntervalId);
    return;
  }

  // Check for new servers before polling existing ones
  await checkAndInitializeNewServers();

  if (!mcpServices || mcpServices.size === 0) {
    appLogger.mcp.info('[MCP Manager] No MCP services registered to poll.');
    return;
  }
  appLogger.mcp.info(`[MCP Manager] Polling ${mcpServices.size} managed MCP services...`);

  const pollPromises: Promise<void>[] = [];
  mcpServices.forEach((service, key) => {
    const serverConfig = appConfig.mcpServers[key] as ServerConfigEntry;
    const serviceLabel = serverConfig?.label || key;
    if (serverConfig && !serverConfig.disabled) {
      const p = (async () => {
        try {
          const statusResult = await service.getStatus();
          const toolsResult = await service.getTools();

          const combinedResult: FetchedServerData = {
            status: statusResult.status === 'success' && (toolsResult && Object.keys(toolsResult).length > 0)
              ? 'success'
              : (statusResult.status === 'success' && (!toolsResult || Object.keys(toolsResult).length === 0)
                ? 'no_tools_found'
                : statusResult.status as MCPServiceStatus), // Cast as MCPServiceStatus
            error: statusResult.error,
            tools: toolsResult,
            toolsCount: statusResult.toolsCount,
            displayName: serviceLabel,
            serverKey: key,
            transportType: statusResult.transportType as MCPTransportConfig['type'] | 'unknown',
            // pid and initializationTime are not directly available from getStatus/getTools
            // They were part of the old MCPService. If needed, ManagedMCPClient would have to expose them.
          };
          await updateServerStatusInCache(key, serviceLabel, combinedResult);
        } catch (error: unknown) {
          appLogger.mcp.error(`[MCP Manager] Error polling server ${serviceLabel}:`, error instanceof Error ? error.message : String(error));
          const errorData: FetchedServerData = {
            status: 'error',
            tools: null,
            error: error instanceof Error ? error.message : String(error),
            displayName: serviceLabel,
            serverKey: key,
            transportType: serverConfig.transport?.type || getDisplayTransportType(serverConfig) as MCPTransportConfig['type'] | 'unknown',
          };
          await updateServerStatusInCache(key, serviceLabel, errorData);
        }
      })();
      pollPromises.push(p);
    }
  });

  await Promise.all(pollPromises);
  appLogger.mcp.info('[MCP Manager] All servers polled.');
}

export async function getManagedServersInfo(appConfig?: AppConfig): Promise<ManagedServerInfo[]> {
  // If appConfig is not provided, try to load it. This allows calling from API without passing config.
  const currentAppConfig = appConfig || getAppConfig();
  if (!currentAppConfig) {
    appLogger.mcp.error('[MCP Manager] getManagedServersInfo: AppConfig not available.');
    return [];
  }
  const serversInfo: ManagedServerInfo[] = [];
  const serverKeysFromConfig = Object.keys(currentAppConfig.mcpServers);

  for (const key of serverKeysFromConfig) {
    const serverConfig = currentAppConfig.mcpServers[key] as ServerConfigEntry;
    if (serverConfig.disabled === true) { 
      serversInfo.push({
        key,
        label: serverConfig.label || key,
        status: 'disabled',
        tools: [],
        transportType: getDisplayTransportType(serverConfig),
        errorDetails: 'This server is disabled in the configuration.'
      });
    }
  }

  const enabledServerKeys = serverKeysFromConfig.filter(key => {
    const sc = currentAppConfig.mcpServers[key] as ServerConfigEntry;
    return !sc.disabled; 
  });

  if (enabledServerKeys.length === 0) {
    return serversInfo; 
  }

  const redisKeys = enabledServerKeys.map(key => `${REDIS_CACHE_PREFIX}${key}`);
  let cachedData: (string | null)[] = []; // Default to empty array if no client

  const currentRedisClient = getRedisClient();
  if (currentRedisClient) {
    if (redisKeys.length > 0) { // Only call mget if there are keys
      cachedData = await currentRedisClient.mget(redisKeys);
    }
  } else {
    appLogger.mcp.warn('[MCP Manager] Redis client not available for getManagedServersInfo. Returning uninitialized status for enabled servers.');
  }

  enabledServerKeys.forEach((key, index) => {
    const sc = currentAppConfig.mcpServers[key];
    const label = sc.label || key;
    const data = cachedData[index];

    if (data) {
      try {
        serversInfo.push(JSON.parse(data) as ManagedServerInfo);
      } catch (e: unknown) {
        appLogger.mcp.error(`[MCP Manager] Error parsing cached data for ${label}:`, e instanceof Error ? e.message : String(e));
        serversInfo.push({
          key, label, status: 'error', tools: [],
          errorDetails: 'Failed to parse cached status.',
          transportType: sc.transport?.type || getDisplayTransportType(sc),
        });
      }
    } else {
      serversInfo.push({
        key, label, status: 'uninitialized', tools: [],
        errorDetails: 'Status not yet available in cache. Awaiting next poll.',
        transportType: sc.transport?.type || getDisplayTransportType(sc),
      });
    }
  });

  return serversInfo;
}

export function getManagedClient(serverKey: string): MCPService | undefined {
  return mcpServices.get(serverKey);
}

export function cleanupForHmr() {
  if (process.env.NODE_ENV !== 'production' && globalThis.__pollIntervalId) {
    clearInterval(globalThis.__pollIntervalId);
    globalThis.__pollIntervalId = null;
    appLogger.mcp.info('[MCP Manager] Cleared polling interval for HMR.');
  }
}

export async function getCombinedMCPToolsForAISDK(): Promise<ToolSet> {
  const combinedTools: ToolSet = {};
  const serversInfo = await getManagedServersInfo();

  // Process each connected server
  for (const server of serversInfo) {
    if (server.status === 'success' && server.tools && server.tools.length > 0) {
      
      try {
        // For SSE servers, use the loadMCPToolsFromURL utility to get properly formatted AI SDK tools
        if (server.transportType === 'sse') {
          const serverConfig = getAppConfig()?.mcpServers[server.key];
          
          if (!serverConfig) {
            appLogger.mcp.error(`[MCP Manager] ❌ No config found for SSE server '${server.label}'`);
            continue;
          }
          
          // Create transport object if it doesn't exist (legacy config format support)
          let transport = serverConfig.transport;
          if (!transport && serverConfig.url) {
            transport = {
              type: 'sse',
              url: serverConfig.url,
              headers: serverConfig.headers
            };
          }
          
          if (transport?.type === 'sse') {
            try {
              const { loadMCPToolsFromURL } = await import('./load-mcp-from-url');
              const { tools: mcpTools } = await loadMCPToolsFromURL(transport.url);
              
              appLogger.mcp.info(`[MCP Manager] ✅ Loaded ${Object.keys(mcpTools).length} SSE tools from '${server.label}'`);
              
              // Add tools with server prefix to avoid conflicts - AI SDK tools handle invocation automatically
              Object.entries(mcpTools).forEach(([toolName, toolDefinition]) => {
                const prefixedToolName = `${server.key}_${toolName}`;
                // Type assertion: tools from loadMCPToolsFromURL should be AI SDK tools
                combinedTools[prefixedToolName] = toolDefinition as NonNullable<ToolSet[string]>;
              });
            } catch (error) {
              appLogger.mcp.error(`[MCP Manager] ❌ Failed to load SSE tools from '${server.label}':`, error);
              // Continue with other servers
            }
          } else {
            appLogger.mcp.error(`[MCP Manager] ❌ SSE server '${server.label}' has no valid transport config`);
          }
        } 
        
        // For stdio servers, retrieve tools directly from the ManagedMCPClient instance
        else if (server.transportType === 'stdio') {
          const service = mcpServices.get(server.key);
          if (service) {
            try {
              const stdioTools = await service.getTools(); // This returns AISDKToolCollection | null
              if (stdioTools) {
                appLogger.mcp.info(`[MCP Manager] ✅ Loaded ${Object.keys(stdioTools).length} stdio tools from '${server.label}'`);
                Object.entries(stdioTools).forEach(([actualToolName, toolDefinition]) => {
                  const prefixedToolName = `${server.key}_${actualToolName}`;
                  combinedTools[prefixedToolName] = toolDefinition as NonNullable<ToolSet[string]>;
                });
              } else {
                appLogger.mcp.warn(`[MCP Manager] ⚠️ No tools found or null returned for stdio server '${server.label}' via getTools().`);
              }
            } catch (error) {
              appLogger.mcp.error(`[MCP Manager] ❌ Failed to get stdio tools from '${server.label}':`, error);
            }
          }
        }
      }
      catch (error) { 
        appLogger.mcp.error(`[MCP Manager] ❌ Error loading tools from '${server.label}':`, error);
        // Continue with other servers even if one fails
      }
    }
  }
  
  const toolCount = Object.keys(combinedTools).length;
  const sseToolCount = Object.keys(combinedTools).filter(name => 
    ['crawl4mcp', 'mcp-unraid', 'mcp-portainer', 'mcp-gotify', 'mcp-prowlarr', 
     'mcp-plex', 'mcp-qbittorrent', 'mcp-overseerr', 'mcp-tautulli', 
     'mcp-sabnzbd', 'mcp-unifi'].some(server => name.startsWith(server))
  ).length;
  const stdioToolCount = toolCount - sseToolCount;
  
  appLogger.mcp.info(`[MCP Manager] 🎉 Successfully loaded ${toolCount} total tools:`);
  appLogger.mcp.info(`[MCP Manager]   📡 SSE tools: ${sseToolCount}`);
  appLogger.mcp.info(`[MCP Manager]   💻 STDIO tools: ${stdioToolCount}`);
  
  if (sseToolCount === 0 && serversInfo.some((s: ManagedServerInfo) => s.transportType === 'sse' && s.status === 'success')) {
    appLogger.mcp.warn(`[MCP Manager] ⚠️ Warning: Expected SSE tools but got none. Check SSE server connections.`);
  }
  
  return combinedTools;
}

if (typeof window === 'undefined') {
  const initialAppConfig = getAppConfig();
  if (initialAppConfig) {
    initializeMCPManager(initialAppConfig).catch(error => {
      appLogger.mcp.error('[MCP Manager] Failed to initialize MCP Manager on startup:', error);
    });
  } else {
    appLogger.mcp.error('[MCP Manager] Could not load initial app config. MCP Manager not started.');
  }
}
