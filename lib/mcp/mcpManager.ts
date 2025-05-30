import Redis from 'ioredis';

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

import { ToolSet, jsonSchema, tool } from "ai";
import {
  getAppConfig,
  MCPService, // MCPService class from client.ts
  ServerConfigEntry,
  AppConfig,
  MCPTransportConfig,
  FetchedToolInfo // Added
} from './client';

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
function processLargeToolResponse(toolName: string, result: unknown): unknown {
  // Only process string results that are large
  if (typeof result !== 'string' || result.length < 5000) {
    return result;
  }

  console.log(`[MCP Manager] Processing large ${toolName} response: ${result.length} characters`);

  try {
    if (toolName === 'fetch' || toolName.includes('fetch')) {
      return processFetchResponse(result);
    } else if (toolName.includes('search') || toolName.includes('crawl')) {
      return processSearchResponse(toolName, result);
    } else {
      return processGenericLargeResponse(toolName, result);
    }
  } catch (error) {
    console.warn(`[MCP Manager] Error processing large response for ${toolName}:`, error);
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

export interface ManagedServerInfo {
  key: string;
  label: string;
  status: 'uninitialized' | 'connected' | 'error' | 'no_tools_found' | 'disabled';
  tools: Array<{ name: string; description?: string; inputSchema?: unknown; [key: string]: unknown }>; 
  errorDetails?: string;
  transportType: MCPTransportConfig['type'] | 'unknown';
}

let mcpServices: Map<string, MCPService>;
let isManagerInitialized: boolean;
let redisClient: Redis;

const REDIS_CACHE_PREFIX = 'mcp_status:';
const REDIS_CACHE_EXPIRY_SECONDS = 300;

if (process.env.NODE_ENV === 'production') {
  mcpServices = new Map<string, MCPService>();
  isManagerInitialized = false;
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  redisClient.on('error', (err) => console.error('[MCP Manager] Redis Client Error:', err));
  redisClient.on('connect', () => console.log('[MCP Manager] Redis Client Connected.'));
  console.log('[MCP Manager] Production mode: Initializing fresh state and Redis client.');
} else {
  if (!globalThis.__mcpServicesMap) {
    console.log('[MCP Manager] Development mode: Initializing __mcpServicesMap on globalThis.');
    globalThis.__mcpServicesMap = new Map<string, MCPService>();
  }
  mcpServices = globalThis.__mcpServicesMap;

  if (globalThis.__isMCPManagerInitialized === undefined) {
    console.log('[MCP Manager] Development mode: Initializing __isMCPManagerInitialized on globalThis.');
    globalThis.__isMCPManagerInitialized = false;
  }
  isManagerInitialized = globalThis.__isMCPManagerInitialized;

  if (!globalThis.__redisClientForMCP) {
    console.log('[MCP Manager] Development mode: Initializing __redisClientForMCP on globalThis.');
    globalThis.__redisClientForMCP = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    globalThis.__redisClientForMCP.on('error', (err) => console.error('[MCP Manager] Redis Client Error (Dev):', err));
    globalThis.__redisClientForMCP.on('connect', () => console.log('[MCP Manager] Redis Client Connected (Dev).'));
  }
  redisClient = globalThis.__redisClientForMCP;
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
    console.log('[MCP Manager] Already initialized. Skipping re-initialization.');
    return;
  }
  // Fallback to globalThis check for HMR scenarios, though module scope should primarily handle it
  if (process.env.NODE_ENV !== 'production' && globalThis.__isMCPManagerInitialized) {
    console.log('[MCP Manager] Already initialized (development mode). Skipping re-initialization.');
    return;
  }
  console.log('[MCP Manager] Initializing MCP Manager...');

  if (!appConfig || !appConfig.mcpServers) {
    console.error('[MCP Manager] MCP server configuration is missing or invalid. Cannot initialize.');
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
    if (!serverConfig.transport || (serverConfig.transport.type !== 'stdio' && serverConfig.transport.type !== 'sse' && serverConfig.transport.type !== 'custom')) {
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
      console.log(`[MCP Manager] Skipping disabled server: ${serviceLabel}`);
      const disabledInfo: ManagedServerInfo = {
        key: key,
        label: serviceLabel,
        status: 'disabled',
        tools: [],
        transportType: getDisplayTransportType(serverConfig),
        errorDetails: 'This server is disabled in the configuration.'
      };
      redisClient.set(`${REDIS_CACHE_PREFIX}${key}`, JSON.stringify(disabledInfo), 'EX', REDIS_CACHE_EXPIRY_SECONDS)
        .catch(err => console.error(`[MCP Manager] Error setting disabled status in cache for ${serviceLabel}:`, err));
      continue;
    }
    
    if (!serverConfig.transport) {
        console.error(`[MCP Manager] Cannot initialize ${serviceLabel}: Missing 'transport' configuration for enabled server.`);
        const errorInfo: ManagedServerInfo = {
            key: key, label: serviceLabel, status: 'error', tools: [],
            errorDetails: "Missing 'transport' configuration for enabled server.",
            transportType: getDisplayTransportType(serverConfig),
        };
        redisClient.set(`${REDIS_CACHE_PREFIX}${key}`, JSON.stringify(errorInfo), 'EX', REDIS_CACHE_EXPIRY_SECONDS)
            .catch(err => console.error(`[MCP Manager] Error setting error status in cache for ${serviceLabel}:`, err));
        continue; 
    }

    console.log(`[MCP Manager] Creating MCPService for '${serviceLabel}'. Transport: ${serverConfig.transport.type}`);
    const service = new MCPService(serverConfig, key);
    mcpServices.set(key, service);

    const initPromise = (async () => {
      try {
        console.log(`[MCP Manager] Initializing and fetching status for ${serviceLabel}...`);
        const fetchedStatus = await service.fetchToolsAndStatus(); 
        console.log(`[MCP Manager] Successfully fetched initial status for ${serviceLabel}. Status: ${fetchedStatus.status}`);
        await updateServerStatusInCache(key, serviceLabel, fetchedStatus);
      } catch (e: unknown) {
        console.error(`[MCP Manager] Error during initial fetch/cache for ${serviceLabel}:`, e instanceof Error ? e.message : String(e));
        const errorResult = {
            status: 'error' as const,
            tools: [] as FetchedToolInfo[], // Ensure type consistency
            errorDetails: e instanceof Error ? e.message : String(e),
            transportType: serverConfig.transport?.type || getDisplayTransportType(serverConfig)
        };
        await updateServerStatusInCache(key, serviceLabel, errorResult); 
      }
    })();
    initializationPromises.push(initPromise);
  }

  try {
    await Promise.all(initializationPromises);
    console.log('[MCP Manager] All server initial fetch and cache attempts completed.');
  } catch (e: unknown) {
    console.error('[MCP Manager] Error during Promise.all in initializeMCPManager (should not happen if IIFEs catch their errors):', e instanceof Error ? e.message : String(e));
  }

  console.log('[MCP Manager] MCP Manager initialized. Starting polling...');
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
  fetchedResult: Awaited<ReturnType<MCPService['fetchToolsAndStatus']>>
) {
  try {
    // Cast fetchedResult.tools to FetchedToolDetail[] for mapping
    const toolsFromService = fetchedResult.tools as FetchedToolInfo[];

    const infoToCache: ManagedServerInfo = {
      key: serverKey,
      label: serviceLabel,
      status: fetchedResult.status,
      tools: toolsFromService.map(tool => {
        const mappedTool: { name: string; description?: string; inputSchema?: unknown; [key: string]: unknown } = {
          name: tool.name,
          description: tool.description,
        };
        if (tool.inputSchema) {
          mappedTool.inputSchema = tool.inputSchema;
        }
        // If FetchedToolDetail has other properties (like annotations) that should be on ManagedServerInfo.tools:
        // if (tool.annotations) { mappedTool.annotations = tool.annotations; }
        // And ensure ManagedServerInfo.tools includes `annotations?: unknown;` etc.
        return mappedTool;
      }),
      errorDetails: fetchedResult.errorDetails,
      transportType: fetchedResult.transportType,
    };
    await redisClient.set(`${REDIS_CACHE_PREFIX}${serverKey}`, JSON.stringify(infoToCache), 'EX', REDIS_CACHE_EXPIRY_SECONDS);
  } catch (error: unknown) {
    console.error(`[MCP Manager] Error updating cache for ${serviceLabel}:`, error instanceof Error ? error.message : String(error));
  }
}

let pollIntervalId: NodeJS.Timeout | null = null;

function startPolling() {
  if (pollIntervalId && process.env.NODE_ENV !== 'production') {
    console.log('[MCP Manager] Polling already started (development HMR). Not starting another.');
    return;
  }
  if (pollIntervalId && process.env.NODE_ENV === 'production') clearInterval(pollIntervalId);
  
  console.log(`[MCP Manager] Starting periodic polling every 60 seconds.`);
  pollIntervalId = setInterval(async () => {
    console.log('[MCP Manager] Periodic poll triggered.');
    const currentAppConfig = getAppConfig();
    if (!currentAppConfig || !currentAppConfig.mcpServers) {
      console.error('[MCP Manager] Polling: MCP server configuration is missing or invalid. Stopping poll.');
      if(pollIntervalId) clearInterval(pollIntervalId);
      pollIntervalId = null;
      return;
    }
    await pollAllServers();
  }, 60 * 1000);

  if (process.env.NODE_ENV !== 'production') globalThis.__pollIntervalId = pollIntervalId;
}

export async function pollAllServers(): Promise<void> {
  const appConfig = getAppConfig(); // Get fresh config for polling
  if (!appConfig) {
    console.error('[MCP Manager] pollAllServers: AppConfig not available. Stopping poll.');
    if (pollIntervalId) clearInterval(pollIntervalId);
    if (globalThis.__pollIntervalId) clearInterval(globalThis.__pollIntervalId);
    return;
  }
  if (!mcpServices || mcpServices.size === 0) {
    console.log('[MCP Manager] No MCP services registered to poll.');
    return;
  }
  console.log(`[MCP Manager] Polling ${mcpServices.size} managed MCP services...`);

  const pollPromises: Promise<void>[] = [];
  mcpServices.forEach((service, key) => {
    const serverConfig = appConfig.mcpServers[key] as ServerConfigEntry;
    const serviceLabel = serverConfig?.label || key;
    if (serverConfig && !serverConfig.disabled) { 
      const p = service.fetchToolsAndStatus()
        .then((fetchedResult) => updateServerStatusInCache(key, serviceLabel, fetchedResult))
        .catch((error: unknown) => {
          console.error(`[MCP Manager] Error polling server ${serviceLabel}:`, error instanceof Error ? error.message : String(error));
          const errorResult = { 
              status: 'error' as const,
              tools: [] as FetchedToolInfo[], // Ensure type consistency
              errorDetails: error instanceof Error ? error.message : String(error),
              transportType: serverConfig.transport?.type || getDisplayTransportType(serverConfig)
          };
          return updateServerStatusInCache(key, serviceLabel, errorResult);
        });
      pollPromises.push(p);
    }
  });

  await Promise.all(pollPromises);
  console.log('[MCP Manager] All servers polled.');
}

export async function getManagedServersInfo(appConfig?: AppConfig): Promise<ManagedServerInfo[]> {
  // If appConfig is not provided, try to load it. This allows calling from API without passing config.
  const currentAppConfig = appConfig || getAppConfig();
  if (!currentAppConfig) {
    console.error('[MCP Manager] getManagedServersInfo: AppConfig not available.');
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
  const cachedData = await redisClient.mget(redisKeys);

  enabledServerKeys.forEach((key, index) => {
    const sc = currentAppConfig.mcpServers[key];
    const label = sc.label || key;
    const data = cachedData[index];

    if (data) {
      try {
        serversInfo.push(JSON.parse(data) as ManagedServerInfo);
      } catch (e: unknown) {
        console.error(`[MCP Manager] Error parsing cached data for ${label}:`, e instanceof Error ? e.message : String(e));
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
    console.log('[MCP Manager] Cleared polling interval for HMR.');
  }
}

export async function getCombinedMCPToolsForAISDK(): Promise<ToolSet> {
  const combinedTools: ToolSet = {};
  const serversInfo = await getManagedServersInfo();

  // Process each connected server
  for (const server of serversInfo) {
    if (server.status === 'connected' && server.tools && server.tools.length > 0) {
      
      try {
        // For SSE servers, use the loadMCPToolsFromURL utility to get properly formatted AI SDK tools
        if (server.transportType === 'sse') {
          const serverConfig = getAppConfig()?.mcpServers[server.key];
          
          if (!serverConfig) {
            console.error(`[MCP Manager] ❌ No config found for SSE server '${server.label}'`);
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
              
              console.log(`[MCP Manager] ✅ Loaded ${Object.keys(mcpTools).length} SSE tools from '${server.label}'`);
              
              // Add tools with server prefix to avoid conflicts - AI SDK tools handle invocation automatically
              Object.entries(mcpTools).forEach(([toolName, toolDefinition]) => {
                const prefixedToolName = `${server.key}_${toolName}`;
                combinedTools[prefixedToolName] = toolDefinition;
              });
            } catch (error) {
              console.error(`[MCP Manager] ❌ Failed to load SSE tools from '${server.label}':`, error);
              // Continue with other servers
            }
          } else {
            console.error(`[MCP Manager] ❌ SSE server '${server.label}' has no valid transport config`);
          }
        } 
        
        // For stdio servers, keep the existing working approach
        else if (server.transportType === 'stdio') {
          for (const toolDef of server.tools) {
            const toolName = `${server.key}_${toolDef.name}`;
            if (toolDef.name && !combinedTools[toolName]) {
              try {
                let params: Record<string, unknown> = { type: 'object', properties: {} };
                
                if (toolDef.inputSchema && typeof toolDef.inputSchema === 'object' && toolDef.inputSchema !== null) {
                  const currentSchema = toolDef.inputSchema as Record<string, unknown>;
                  if (typeof currentSchema.type !== 'string' || currentSchema.type !== 'object') {
                    if (currentSchema.properties && typeof currentSchema.properties === 'object') {
                      console.warn(`[MCP Manager] Tool '${toolName}' inputSchema is missing 'type: "object"'. Wrapping properties.`);
                      params = { type: 'object', properties: { ...currentSchema.properties } };
                    } else {
                      console.warn(`[MCP Manager] Tool '${toolName}' has an inputSchema that is not type 'object' and lacks properties. Using default.`);
                    }
                  } else {
                    params = { ...currentSchema };
                  }

                  if (params.properties && typeof params.properties === 'object') {
                    const newProperties: Record<string, unknown> = {};
                    const propertiesObj = params.properties as Record<string, unknown>;
                    for (const propKey in propertiesObj) {
                      const propValue = propertiesObj[propKey];
                      if (typeof propValue === 'object' && propValue !== null) {
                        const propValueObj = propValue as Record<string, unknown>;
                        if (typeof propValueObj.type !== 'string') {
                          console.warn(`[MCP Manager] Tool '${toolName}', parameter '${propKey}' is missing 'type'. Defaulting to 'string'.`);
                          newProperties[propKey] = { ...propValueObj, type: 'string' };
                        } else {
                          newProperties[propKey] = { ...propValueObj };
                        }
                      } else {
                        console.warn(`[MCP Manager] Tool '${toolName}', parameter '${propKey}' is not a valid object schema. Defaulting to '{ type: "string" }'.`);
                        newProperties[propKey] = { type: 'string', description: `Malformed schema for ${propKey}` };
                      }
                    }
                    params.properties = newProperties;
                  } else if (params.type === 'object' && !params.properties) {
                    params.properties = {};
                  }
                }

                combinedTools[toolName] = tool({
                  description: toolDef.description || `Executes the ${toolDef.name} tool from the ${server.label} MCP server.`,
                  parameters: jsonSchema(params),
                  ...(typeof toolDef.annotations === 'object' && toolDef.annotations !== null && { annotations: toolDef.annotations }),
                  execute: async (args: unknown) => {
                    const mcpArgs = args as Record<string, unknown>;
                    console.log(`[MCP Manager] Executing stdio tool '${toolDef.name}' from server '${server.key}' with args:`, mcpArgs);
                    
                    try {
                      const mcpService = getManagedClient(server.key);
                      if (!mcpService) {
                        const error = `[MCP Manager] MCPService not found for server '${server.key}'`;
                        console.error(error);
                        throw new Error(error);
                      }
                      
                      const result = await mcpService.invokeTool(toolDef.name, mcpArgs);
                      console.log(`[MCP Manager] Stdio tool '${toolDef.name}' executed successfully`);
                      
                      if (result === undefined || result === null) {
                        console.warn(`[MCP Manager] Tool '${toolDef.name}' returned null/undefined, returning empty object`);
                        return {};
                      }
                      
                      return processLargeToolResponse(toolDef.name, result);
                    } catch (error) {
                      console.error(`[MCP Manager] Error executing stdio tool '${toolDef.name}':`, error);
                      return {
                        error: true,
                        message: error instanceof Error ? error.message : String(error),
                        toolName: toolDef.name,
                        serverKey: server.key
                      };
                    }
                  }
                });
              } catch (error) {
                console.error(`[MCP Manager] Error processing schema for stdio tool '${toolDef.name}':`, error);
              }
            }
          }
        }
        
      } catch (error) {
        console.error(`[MCP Manager] ❌ Error loading tools from '${server.label}':`, error);
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
  
  console.log(`[MCP Manager] 🎉 Successfully loaded ${toolCount} total tools:`);
  console.log(`[MCP Manager]   📡 SSE tools: ${sseToolCount}`);
  console.log(`[MCP Manager]   💻 STDIO tools: ${stdioToolCount}`);
  
  if (sseToolCount === 0 && serversInfo.some(s => s.transportType === 'sse' && s.status === 'connected')) {
    console.warn(`[MCP Manager] ⚠️ Warning: Expected SSE tools but got none. Check SSE server connections.`);
  }
  
  return combinedTools;
}

if (typeof window === 'undefined') {
  const initialAppConfig = getAppConfig();
  if (initialAppConfig) {
    initializeMCPManager(initialAppConfig).catch(error => {
      console.error('[MCP Manager] Error during initial MCP Manager setup:', error);
    });
  } else {
    console.error('[MCP Manager] Could not load initial app config. MCP Manager not started.');
  }
}
