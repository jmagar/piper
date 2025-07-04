import { promises as fs } from 'fs'
import { watch, FSWatcher } from 'fs'
import { z } from 'zod'
import { MCPConnectionPool } from './enhanced/connection-pool'
import type { AppConfig, ServerConfigEntry } from './enhanced/types'
import { AppConfigSchema } from './schemas'

// Enhanced MCP Configuration schema for validation - removed unused schema definition

// Unused schema definition removed - ServerConfigEntrySchema

// Re-export types for backward compatibility
export type MCPServerConfig = ServerConfigEntry
export type MCPConfig = AppConfig

export interface ConfigWatcherOptions {
  configPath: string
  validateOnLoad: boolean
  autoReconnect: boolean
  backupOnChange: boolean
  connectionPool?: MCPConnectionPool
  onConfigChange?: (config: AppConfig, previousConfig?: AppConfig) => Promise<void>
  onValidationError?: (error: z.ZodError) => void
  onReloadError?: (error: Error) => void
}

/**
 * Configuration file watcher for hot reloading MCP server configurations
 * Updated to use Enhanced MCP Client types and validation
 */
export class MCPConfigWatcher {
  private watcher?: FSWatcher
  private currentConfig?: AppConfig
  private configBackups: AppConfig[] = []
  private maxBackups = 5
  private isReloading = false

  constructor(private options: ConfigWatcherOptions) {}

  async start(): Promise<AppConfig> {
    try {
      console.log(`[Config Watcher] Starting watcher for: ${this.options.configPath}`)
      
      // Load initial configuration
      const config = await this.loadConfig()
      this.currentConfig = config

      // Start file watcher
      this.watcher = watch(this.options.configPath, (eventType, filename) => {
        if (eventType === 'change' && filename) {
          this.handleConfigChange()
        }
      })

      console.log('[Config Watcher] Started successfully')
      return config
    } catch (error) {
      console.error('[Config Watcher] Failed to start:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.watcher) {
        this.watcher.close()
        this.watcher = undefined
      }
      console.log('[Config Watcher] Stopped')
    } catch (error) {
      console.error('[Config Watcher] Error stopping watcher:', error)
    }
  }

  private async loadConfig(): Promise<AppConfig> {
    try {
      const configContent = await fs.readFile(this.options.configPath, 'utf-8')
      const rawConfig = JSON.parse(configContent)
      
      if (this.options.validateOnLoad) {
        const validatedConfig = AppConfigSchema.parse(rawConfig)
        console.log('[Config Watcher] Configuration loaded and validated with Enhanced MCP types')
        // Cast to AppConfig since the schema validation ensures compatibility
        return validatedConfig as AppConfig
      } else {
        console.log('[Config Watcher] Configuration loaded (validation skipped)')
        return rawConfig as AppConfig
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[Config Watcher] Configuration validation failed:', error.errors)
        if (this.options.onValidationError) {
          this.options.onValidationError(error)
        }
      }
      console.error('[Config Watcher] Failed to load configuration:', error)
      throw error
    }
  }

  private async handleConfigChange(): Promise<void> {
    if (this.isReloading) {
      console.log('[Config Watcher] Reload already in progress, skipping')
      return
    }

    this.isReloading = true

    try {
      console.log('[Config Watcher] Configuration file changed, reloading...')
      
      // Create backup of current config
      if (this.options.backupOnChange && this.currentConfig) {
        this.createConfigBackup(this.currentConfig)
      }

      // Load new configuration
      const newConfig = await this.loadConfig()
      const previousConfig = this.currentConfig

      // Validate configuration changes
      const configDiff = this.analyzeConfigChanges(previousConfig, newConfig)
      console.log('[Config Watcher] Configuration changes detected:', configDiff)

      // Update current config
      this.currentConfig = newConfig

      // Handle server reconnections if needed
      if (this.options.autoReconnect && this.options.connectionPool) {
        await this.handleServerReconnections(configDiff)
      }

      // Notify about config change
      if (this.options.onConfigChange) {
        await this.options.onConfigChange(newConfig, previousConfig)
      }

      console.log('[Config Watcher] Configuration reloaded successfully')
    } catch (error) {
      console.error('[Config Watcher] Failed to reload configuration:', error)
      
      if (this.options.onReloadError) {
        this.options.onReloadError(error instanceof Error ? error : new Error(String(error)))
      }

      // Attempt rollback if backup is available
      await this.attemptRollback()
    } finally {
      this.isReloading = false
    }
  }

  private createConfigBackup(config: AppConfig): void {
    this.configBackups.unshift({
      ...config,
      mcpServers: Object.fromEntries(
        Object.entries(config.mcpServers).map(([key, server]) => [key, { ...server }])
      )
    })

    // Limit backup count
    if (this.configBackups.length > this.maxBackups) {
      this.configBackups = this.configBackups.slice(0, this.maxBackups)
    }

    console.log(`[Config Watcher] Created config backup (${this.configBackups.length}/${this.maxBackups})`)
  }

  private analyzeConfigChanges(
    oldConfig?: AppConfig,
    newConfig?: AppConfig
  ): {
    serversAdded: string[]
    serversRemoved: string[]
    serversModified: string[]
    globalChanged: boolean
  } {
    const changes = {
      serversAdded: [] as string[],
      serversRemoved: [] as string[],
      serversModified: [] as string[],
      globalChanged: false
    }

    if (!oldConfig || !newConfig) {
      return changes
    }

    const oldServerIds = new Set(Object.keys(oldConfig.mcpServers))
    const newServerIds = new Set(Object.keys(newConfig.mcpServers))

    // Find added servers
    for (const serverId of newServerIds) {
      if (!oldServerIds.has(serverId)) {
        changes.serversAdded.push(serverId)
      }
    }

    // Find removed servers
    for (const serverId of oldServerIds) {
      if (!newServerIds.has(serverId)) {
        changes.serversRemoved.push(serverId)
      }
    }

    // Find modified servers
    for (const serverId of newServerIds) {
      const oldServer = oldConfig.mcpServers[serverId]
      const newServer = newConfig.mcpServers[serverId]
      if (oldServer && JSON.stringify(oldServer) !== JSON.stringify(newServer)) {
        changes.serversModified.push(serverId)
      }
    }

    // Note: No global config in AppConfig type, so globalChanged always false
    changes.globalChanged = false

    return changes
  }

  private async handleServerReconnections(configDiff: {
    serversAdded: string[]
    serversRemoved: string[]
    serversModified: string[]
    globalChanged: boolean
  }): Promise<void> {
    if (!this.options.connectionPool || !this.currentConfig) {
      return
    }

    try {
      // Remove disconnected servers
      for (const serverId of configDiff.serversRemoved) {
        console.log(`[Config Watcher] Removing server: ${serverId}`)
        await this.options.connectionPool.removeClient(serverId)
      }

      // Reconnect modified servers
      for (const serverId of configDiff.serversModified) {
        console.log(`[Config Watcher] Reconnecting modified server: ${serverId}`)
        await this.options.connectionPool.removeClient(serverId)
        // New connection will be established when needed
      }

      // Add new servers (they will be connected when needed)
      for (const serverId of configDiff.serversAdded) {
        console.log(`[Config Watcher] New server available: ${serverId}`)
      }

      console.log('[Config Watcher] Server reconnections completed')
    } catch (error) {
      console.error('[Config Watcher] Error during server reconnections:', error)
      throw error
    }
  }

  private async attemptRollback(): Promise<void> {
    if (this.configBackups.length === 0) {
      console.warn('[Config Watcher] No backups available for rollback')
      return
    }

    try {
      const backupConfig = this.configBackups[0]
      console.log('[Config Watcher] Attempting configuration rollback')

      // Write backup to file
      await fs.writeFile(
        this.options.configPath,
        JSON.stringify(backupConfig, null, 2),
        'utf-8'
      )

      this.currentConfig = backupConfig
      console.log('[Config Watcher] Configuration rolled back successfully')
    } catch (error) {
      console.error('[Config Watcher] Rollback failed:', error)
    }
  }

  getCurrentConfig(): AppConfig | undefined {
    return this.currentConfig
  }

  getConfigBackups(): AppConfig[] {
    return [...this.configBackups]
  }

  async validateConfig(configPath?: string): Promise<{
    valid: boolean
    errors?: z.ZodError
    config?: AppConfig
  }> {
    try {
      const path = configPath || this.options.configPath
      const configContent = await fs.readFile(path, 'utf-8')
      const rawConfig = JSON.parse(configContent)
      const validatedConfig = AppConfigSchema.parse(rawConfig)
      
      return {
        valid: true,
        config: validatedConfig as AppConfig
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error
        }
      }
      throw error
    }
  }

  async reloadConfig(): Promise<AppConfig> {
    if (this.isReloading) {
      throw new Error('Configuration reload already in progress')
    }

    await this.handleConfigChange()
    if (!this.currentConfig) {
      throw new Error('Failed to reload configuration')
    }

    return this.currentConfig
  }
} 