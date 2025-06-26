import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';
import {
  ManagedMCPClient as MCPService,
  type ServerConfigEntry,
} from '../enhanced';

// Enhance globalThis for HMR persistence in development
declare global {
  // eslint-disable-next-line no-var
  var __mcpServicesMap: Map<string, MCPService> | undefined;
}

export class MCPServiceRegistry {
  private static instance: MCPServiceRegistry;
  private services: Map<string, MCPService>;

  private constructor() {
    // Initialize services map with HMR support
    if (process.env.NODE_ENV === 'production') {
      this.services = new Map<string, MCPService>();
      appLogger.info('[Service Registry] Initialized services map for production', {
        correlationId: getCurrentCorrelationId(),
        operationId: 'service_registry_init_production'
      });
    } else {
      // Development HMR logic
      if (!globalThis.__mcpServicesMap) {
        globalThis.__mcpServicesMap = new Map<string, MCPService>();
        appLogger.info('[Service Registry] Initialized globalThis.__mcpServicesMap for development', {
          correlationId: getCurrentCorrelationId(),
          operationId: 'service_registry_init_development'
        });
      }
      this.services = globalThis.__mcpServicesMap;
    }
  }

  static getInstance(): MCPServiceRegistry {
    if (!MCPServiceRegistry.instance) {
      MCPServiceRegistry.instance = new MCPServiceRegistry();
    }
    return MCPServiceRegistry.instance;
  }

  /**
   * Register a new service in the registry
   */
  registerService(serverKey: string, serverConfig: ServerConfigEntry): MCPService {
    const serviceLabel = serverConfig.label || serverKey;
    appLogger.info(`[Service Registry] Registering service '${serviceLabel}' with key '${serverKey}'`, {
      correlationId: getCurrentCorrelationId(),
      operationId: 'service_registry_register',
      args: { serverKey, serviceLabel }
    });
    
    const service = new MCPService(serverConfig, serverKey);
    this.services.set(serverKey, service);
    
    // Update globalThis for HMR if in development
    if (process.env.NODE_ENV !== 'production' && !globalThis.__mcpServicesMap) {
      globalThis.__mcpServicesMap = this.services;
    }
    
    return service;
  }

  /**
   * Get a service by key
   */
  getService(serverKey: string): MCPService | undefined {
    return this.services.get(serverKey);
  }

  /**
   * Check if a service exists
   */
  hasService(serverKey: string): boolean {
    return this.services.has(serverKey);
  }

  /**
   * Get all registered service keys
   */
  getServiceKeys(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get all registered services
   */
  getAllServices(): Map<string, MCPService> {
    return new Map(this.services);
  }

  /**
   * Remove a service from the registry
   */
  async removeService(serverKey: string): Promise<boolean> {
    const service = this.services.get(serverKey);
    if (service) {
      if (typeof service.close === 'function') {
        try {
          appLogger.info(`[Service Registry] Shutting down service '${service.displayName}' with key '${serverKey}'`, {
            correlationId: getCurrentCorrelationId(),
            operationId: 'service_registry_shutdown',
            args: { serverKey, displayName: service.displayName }
          });
          await service.close();
        } catch (error) {
          appLogger.error(`[Service Registry] Error shutting down service '${service.displayName}' with key '${serverKey}'`, {
            correlationId: getCurrentCorrelationId(),
            operationId: 'service_registry_shutdown_error',
            args: { serverKey, displayName: service.displayName },
            error: error as Error
          });
          // Continue with removal even if shutdown fails
        }
      }
      const removed = this.services.delete(serverKey);
      if (removed) {
        appLogger.info(`[Service Registry] Removed service with key '${serverKey}' from map`, {
          correlationId: getCurrentCorrelationId(),
          operationId: 'service_registry_removed',
          args: { serverKey }
        });
      }
      return removed;
    }
    return false;
  }

  /**
   * Clear all services from the registry
   */
  clearAll(): void {
    const count = this.services.size;
    this.services.clear();
    appLogger.info(`[Service Registry] Cleared ${count} services from registry`, {
      correlationId: getCurrentCorrelationId(),
      operationId: 'service_registry_clear_all',
      args: { servicesCleared: count }
    });
  }

  /**
   * Get the number of registered services
   */
  getServiceCount(): number {
    return this.services.size;
  }

  /**
   * Get services with their metadata
   */
  getServicesWithMetadata(): Array<{
    key: string;
    service: MCPService;
    hasService: boolean;
  }> {
    return Array.from(this.services.entries()).map(([key, service]) => ({
      key,
      service,
      hasService: true,
    }));
  }

  /**
   * Execute an operation on all services
   */
  async forEachService<T>(
    operation: (service: MCPService, key: string) => Promise<T>
  ): Promise<Map<string, T | Error>> {
    const results = new Map<string, T | Error>();
    
    const promises = Array.from(this.services.entries()).map(async ([key, service]) => {
      try {
        const result = await operation(service, key);
        results.set(key, result);
      } catch (error) {
        results.set(key, error instanceof Error ? error : new Error(String(error)));
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get services that match a predicate
   */
  getServicesWhere(predicate: (service: MCPService, key: string) => boolean): Map<string, MCPService> {
    const filtered = new Map<string, MCPService>();
    
    this.services.forEach((service, key) => {
      if (predicate(service, key)) {
        filtered.set(key, service);
      }
    });
    
    return filtered;
  }

  /**
   * Get detailed registry statistics
   */
  getRegistryStats(): {
    totalServices: number;
    servicesWithKeys: string[];
    registryHealth: 'healthy' | 'empty' | 'unknown';
  } {
    const totalServices = this.services.size;
    const servicesWithKeys = Array.from(this.services.keys());
    
    let registryHealth: 'healthy' | 'empty' | 'unknown' = 'unknown';
    if (totalServices === 0) {
      registryHealth = 'empty';
    } else if (totalServices > 0) {
      registryHealth = 'healthy';
    }

    return {
      totalServices,
      servicesWithKeys,
      registryHealth,
    };
  }
}

// Export singleton instance
export const mcpServiceRegistry = MCPServiceRegistry.getInstance(); 