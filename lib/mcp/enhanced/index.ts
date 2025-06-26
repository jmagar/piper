/**
 * Enhanced MCP Client - Modular Implementation
 * 
 * A comprehensive, modular implementation of an enhanced MCP client with:
 * - Type safety and configuration management
 * - Robust error handling and repair capabilities
 * - Multi-modal content support
 * - Performance metrics and monitoring
 * - Connection pooling and lifecycle management
 */

// Core Types and Interfaces
export * from './types'

// Configuration Management
export * from './config'

// Cached Configuration Management (Performance Optimized)
export {
  getCachedAppConfig,
  getCachedServerConfig, 
  getCachedConfiguredServers,
  isCachedServerEnabled,
  invalidateConfigCache,
  getConfigCacheStats
} from './cached-config'

// Metrics Collection
export { MCPMetricsCollector, globalMetricsCollector } from './metrics-collector'

// Tool Call Repair System
export {
  ToolCallRepairDetector,
  ToolCallRepairer,
  ToolRepairService,
  DEFAULT_REPAIR_CONFIG
} from './tool-repair'

// Multi-Modal Content Handling
export {
  MultiModalContentHandler,
  MultiModalUtils
} from './multimodal-handler'

// Client Factory Functions
export {
  createEnhancedStdioMCPClient,
  createEnhancedSSEMCPClient,
  createEnhancedStreamableHTTPMCPClient,
  createTypedMCPClient,
  createMCPClientFromConfig,
  loadMCPToolsFromLocalEnhanced,
  loadMCPToolsFromURLEnhanced
} from './client-factory'

// Managed Client Implementation
export { ManagedMCPClient } from './managed-client'

// Connection Pool Management
export { MCPConnectionPool, globalMCPPool } from './connection-pool'

/**
 * Convenience re-exports for common operations
 */
export {
  // Error types
  MCPClientError,
  CallToolError,
  
  // Main interfaces
  type MCPToolSet,
  type AISDKToolCollection,
  type ServerConfigEntry,
  type AppConfig,
  
  // Configuration types
  type EnhancedStdioConfig,
  type EnhancedSSEConfig,
  type EnhancedStreamableHTTPConfig,
  type EnhancedTransportConfig,
  
  // Multi-modal types
  type MultiModalContent,
  type MultiModalToolResult,
  type ImageContent,
  type FileContent,
  type AudioContent,
  type VideoContent,
  type DataContent,
  
  // Metrics types
  type ServerMetrics,
  type GlobalMCPSummary,
  
  // Tool repair types
  type ToolCallRepairConfig,
  type ToolCallRepairResult,
  type ToolCallRepairContext
} from './types'

// Import all required components for default export
import { 
  getAppConfig, 
  validateServerConfig, 
  getServerConfig, 
  isServerEnabled 
} from './config'
import {
  getCachedAppConfig,
  getCachedServerConfig,
  getCachedConfiguredServers,
  isCachedServerEnabled
} from './cached-config'
import {
  createEnhancedStdioMCPClient,
  createEnhancedSSEMCPClient,
  createEnhancedStreamableHTTPMCPClient,
  createTypedMCPClient,
  createMCPClientFromConfig
} from './client-factory'
import { ManagedMCPClient } from './managed-client'
import { MCPConnectionPool, globalMCPPool } from './connection-pool'
import { MCPMetricsCollector, globalMetricsCollector } from './metrics-collector'
import { MultiModalContentHandler } from './multimodal-handler'
import { ToolCallRepairer } from './tool-repair'

/**
 * Default export for the enhanced MCP client system
 */
const enhancedMCP = {
  // Core factories
  createStdioClient: createEnhancedStdioMCPClient,
  createSSEClient: createEnhancedSSEMCPClient,
  createStreamableHTTPClient: createEnhancedStreamableHTTPMCPClient,
  createTypedClient: createTypedMCPClient,
  createFromConfig: createMCPClientFromConfig,
  
  // Management
  ManagedClient: ManagedMCPClient,
  ConnectionPool: MCPConnectionPool,
  
  // Utilities
  MetricsCollector: MCPMetricsCollector,
  ContentHandler: MultiModalContentHandler,
  ToolRepairer: ToolCallRepairer,
  
  // Global instances
  globalPool: globalMCPPool,
  globalMetrics: globalMetricsCollector,
  
  // Configuration (Regular - Synchronous)
  getConfig: getAppConfig,
  validateConfig: validateServerConfig,
  getServerConfig,
  isServerEnabled,
  
  // Configuration (Cached - Performance Optimized - Asynchronous)
  getCachedConfig: getCachedAppConfig,
  getCachedServerConfig,
  getCachedConfiguredServers,
  isCachedServerEnabled
}

export default enhancedMCP; 