'use client';

import * as React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Interface for MCP Config context
 */
interface MCPConfigContextType {
  /** Current config content */
  config: string;
  /** Whether the config is currently loading */
  isLoading: boolean;
  /** Error message if loading or saving failed */
  error: string | null;
  /** Function to save the config */
  saveConfig: (newConfig: string) => Promise<void>;
  /** Function to reload the config */
  reloadConfig: () => Promise<void>;
  /** Function to create a backup of the current config */
  createBackup: () => Promise<void>;
  /** List of available backups */
  backups: ConfigBackup[];
  /** Whether backups are currently loading */
  isLoadingBackups: boolean;
}

/**
 * Interface for configuration backup
 */
interface ConfigBackup {
  id: string;
  timestamp: string;
  path: string;
}

/**
 * Default context value
 */
const defaultContext: MCPConfigContextType = {
  config: '',
  isLoading: false,
  error: null,
  saveConfig: async () => {},
  reloadConfig: async () => {},
  createBackup: async () => {},
  backups: [],
  isLoadingBackups: false,
};

/**
 * Context for MCP configuration
 */
const MCPConfigContext = createContext<MCPConfigContextType>(defaultContext);

/**
 * Props for the MCPConfigProvider component
 */
interface MCPConfigProviderProps {
  /** React children */
  children: React.ReactNode;
}

/**
 * Provider component for MCP configuration
 * Handles loading and saving the configuration file
 * 
 * @example
 * ```tsx
 * <MCPConfigProvider>
 *   <MCPConfigEditor />
 * </MCPConfigProvider>
 * ```
 */
export function MCPConfigProvider({ children }: MCPConfigProviderProps) {
  const [config, setConfig] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [backups, setBackups] = useState<ConfigBackup[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const { toast } = useToast();

  /**
   * Load the MCP configuration from the server
   */
  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/mcp/config');
      
      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Convert the configuration object to a string if needed
      const configStr = typeof data === 'string' 
        ? data 
        : JSON.stringify(data, null, 2);
        
      setConfig(configStr);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';
      setError(errorMessage);
      
      toast({
        variant: "destructive",
        title: "Error loading configuration",
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save the MCP configuration to the server
   */
  const saveConfig = async (newConfig: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Parse the config string to ensure it's valid JSON
      let configData;
      try {
        // Remove comments before parsing
        const cleanConfig = newConfig
          .replace(/\/\/.*$/gm, '')
          .replace(/\/\*[\s\S]*?\*\//g, '');
        configData = JSON.parse(cleanConfig);
      } catch (parseError) {
        throw new Error('Invalid JSON syntax. Please check your configuration.');
      }
      
      // Use PUT method as defined in the OpenAPI spec
      const response = await fetch('/api/mcp/config?createBackup=true', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save configuration: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.backupCreated) {
        toast({
          title: "Backup created",
          description: `A backup of your previous configuration was created at ${result.backupPath}`,
          duration: 5000,
        });
        
        // Refresh the backups list
        loadBackups();
      }
      
      setConfig(newConfig);
      
      toast({
        title: "Configuration saved",
        description: "Your MCP configuration has been updated successfully.",
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setError(errorMessage);
      throw err; // Re-throw to allow the editor to handle the error
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load the list of configuration backups
   */
  const loadBackups = async () => {
    setIsLoadingBackups(true);
    
    try {
      const response = await fetch('/api/mcp/config/backup');
      
      if (!response.ok) {
        throw new Error(`Failed to load backups: ${response.statusText}`);
      }
      
      const data = await response.json();
      setBackups(data.backups || []);
    } catch (err) {
      console.error('Error loading backups:', err);
      // Don't show a toast for this error as it's not critical
    } finally {
      setIsLoadingBackups(false);
    }
  };

  /**
   * Create a backup of the current configuration
   */
  const createBackup = async () => {
    try {
      const response = await fetch('/api/mcp/config/backup', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create backup: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Backup created",
          description: "A backup of your current configuration was created successfully.",
          duration: 3000,
        });
        
        // Refresh the backups list
        loadBackups();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create backup';
      
      toast({
        variant: "destructive",
        title: "Error creating backup",
        description: errorMessage,
        duration: 5000,
      });
    }
  };

  // Load the configuration and backups on component mount
  useEffect(() => {
    loadConfig();
    loadBackups();
  }, []);

  // Context value
  const value = {
    config,
    isLoading,
    error,
    saveConfig,
    reloadConfig: loadConfig,
    createBackup,
    backups,
    isLoadingBackups,
  };

  return (
    <MCPConfigContext.Provider value={value}>
      {children}
    </MCPConfigContext.Provider>
  );
}

/**
 * Hook to access the MCP configuration context
 * @returns The MCP configuration context
 * 
 * @example
 * ```tsx
 * const { config, isLoading, saveConfig } = useMCPConfig();
 * ```
 */
export function useMCPConfig() {
  const context = useContext(MCPConfigContext);
  
  if (context === undefined) {
    throw new Error('useMCPConfig must be used within a MCPConfigProvider');
  }
  
  return context;
}
