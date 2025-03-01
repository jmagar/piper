"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertCircle, 
  Check, 
  ClipboardCopy, 
  Cpu, 
  Edit, 
  MessageCircle, 
  RefreshCw, 
  Save, 
  Server, 
  Settings, 
  Archive, 
  X 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { MCPConfig, MCPServerConfig, ServerValidationError } from './types';
import { cardVariants } from './animations';
import { validateAllMCPServers } from './validation';
import { LLMSettings } from './tabs/llm-settings';
import { ExampleQueries } from './tabs/example-queries';
import { ServerList } from './tabs/server-list';
import { BackupManager } from './tabs/backup-manager';

/**
 * Component for viewing and editing the current MCP configuration
 * @returns React component for displaying and editing MCP configuration
 */
const MCPConfigViewer = () => {
  const [config, setConfig] = useState<MCPConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<MCPConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('llm');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<ServerValidationError[]>([]);
  
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        // Fetch the config file from the server using the API endpoint
        const response = await window.fetch('/api/mcp/config');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch MCP config: ${response.statusText}`);
        }
        
        const data = await response.json();
        setConfig(data);
        setOriginalConfig(JSON.parse(JSON.stringify(data))); // Deep copy for reset
        
        // Validate servers on initial load
        if (data.mcp_servers) {
          setValidationErrors(validateAllMCPServers(data.mcp_servers));
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching MCP config:', err);
        setError(err instanceof Error ? err.message : 'Failed to load MCP configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  /**
   * Saves the current configuration to the server
   */
  const saveConfig = async () => {
    if (!config) return;
    
    // Validate servers before saving
    const errors = validateAllMCPServers(config.mcp_servers);
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      // Show error toast if validation fails
      toast({
        variant: 'destructive',
        title: 'Validation Failed',
        description: 'Please fix the validation errors before saving.',
      });
      // Switch to servers tab to show errors
      setActiveTab('servers');
      return;
    }
    
    try {
      setIsSaving(true);
      setLoading(true);
      const response = await window.fetch('/api/mcp/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update config: ${response.statusText}`);
      }
      
      setOriginalConfig(JSON.parse(JSON.stringify(config))); // Update original after successful save
      setIsEditing(false);
      toast({
        title: 'Configuration Saved',
        description: 'Your MCP configuration has been updated successfully.',
        variant: 'default',
        action: (
          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="h-5 w-5 text-green-600" />
          </div>
        ),
      });
    } catch (err) {
      console.error('Error saving configuration:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to Save',
        description: err instanceof Error ? err.message : 'An unknown error occurred',
      });
    } finally {
      setIsSaving(false);
      setLoading(false);
    }
  };

  /**
   * Cancels editing and reverts changes
   */
  const cancelEditing = () => {
    if (originalConfig) {
      setConfig(JSON.parse(JSON.stringify(originalConfig))); // Restore from original
      // Re-validate servers
      if (originalConfig.mcp_servers) {
        setValidationErrors(validateAllMCPServers(originalConfig.mcp_servers));
      }
    }
    setIsEditing(false);
  };

  /**
   * Updates a value in the llm section of the config
   */
  const updateLLMValue = (key: keyof MCPConfig['llm'], value: string | number) => {
    if (!config) return;
    
    setConfig({
      ...config,
      llm: {
        ...config.llm,
        [key]: value,
      },
    });
  };

  /**
   * Adds a new example query
   */
  const addExampleQuery = (query: string) => {
    if (!config || !query.trim()) return;
    
    setConfig({
      ...config,
      example_queries: [...config.example_queries, query.trim()],
    });
  };

  /**
   * Removes an example query
   */
  const removeExampleQuery = (index: number) => {
    if (!config) return;
    
    setConfig({
      ...config,
      example_queries: config.example_queries.filter((_, i) => i !== index),
    });
  };

  /**
   * Updates a server configuration value
   */
  const updateServerValue = (
    serverName: string, 
    key: 'command' | 'args' | 'env', 
    value: string | string[] | Record<string, string> | undefined
  ) => {
    if (!config) return;
    
    const updatedConfig = {
      ...config,
      mcp_servers: {
        ...config.mcp_servers,
        [serverName]: {
          ...config.mcp_servers[serverName],
          [key]: value,
        },
      },
    };
    
    setConfig(updatedConfig);
    
    // Validate the specific server that was updated
    const serverErrors = validateAllMCPServers({
      [serverName]: updatedConfig.mcp_servers[serverName]
    });
    
    // Update validation errors
    setValidationErrors(prev => {
      // Filter out errors for this server
      const filteredErrors = prev.filter(e => e.serverName !== serverName);
      
      // If there are new errors, add them
      if (serverErrors.length > 0) {
        return [...filteredErrors, ...serverErrors];
      }
      
      return filteredErrors;
    });
  };

  /**
   * Adds new servers to the configuration
   */
  const addServers = (servers: Record<string, MCPServerConfig>) => {
    if (!config) return;
    
    const updatedConfig = {
      ...config,
      mcp_servers: {
        ...config.mcp_servers,
        ...servers
      },
    };
    
    setConfig(updatedConfig);
    
    // Validate all new servers
    const newValidationErrors = validateAllMCPServers(servers);
    
    // Update validation errors
    setValidationErrors(prev => {
      // Filter out errors for servers that might be replaced
      const filteredErrors = prev.filter(
        e => !Object.keys(servers).includes(e.serverName)
      );
      return [...filteredErrors, ...newValidationErrors];
    });
  };

  /**
   * Removes a server
   */
  const removeServer = (serverName: string) => {
    if (!config) return;
    
    const updatedServers = { ...config.mcp_servers };
    delete updatedServers[serverName];
    
    setConfig({
      ...config,
      mcp_servers: updatedServers,
    });
    
    // Remove validation errors for this server
    setValidationErrors(prev => prev.filter(e => e.serverName !== serverName));
  };

  /**
   * Copies the configuration to clipboard
   */
  const copyConfigToClipboard = () => {
    if (!config) return;
    
    if (typeof window !== 'undefined' && window.navigator?.clipboard) {
      window.navigator.clipboard.writeText(JSON.stringify(config, null, 2))
        .then(() => {
          setCopySuccess(true);
          toast({
            title: 'Copied to Clipboard',
            description: 'The configuration has been copied to your clipboard.',
            variant: 'default',
            action: (
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Check className="h-5 w-5 text-blue-600" />
              </div>
            ),
          });
          if (typeof window !== 'undefined') {
            window.setTimeout(() => setCopySuccess(false), 2000);
          }
        })
        .catch((err) => {
          console.error('Failed to copy config:', err);
          toast({
            variant: 'destructive',
            title: 'Copy Failed',
            description: 'Failed to copy configuration to clipboard.',
          });
        });
    }
  };

  /**
   * Refreshes the configuration from the server
   */
  const refreshConfig = async () => {
    try {
      setLoading(true);
      const response = await window.fetch('/api/mcp/config');
      
      if (!response.ok) {
        throw new Error(`Failed to refresh config: ${response.statusText}`);
      }
      
      const data = await response.json();
      setConfig(data);
      setOriginalConfig(JSON.parse(JSON.stringify(data))); // Deep copy for reset
      
      // Validate servers on initial load
      if (data.mcp_servers) {
        setValidationErrors(validateAllMCPServers(data.mcp_servers));
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching MCP config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load MCP configuration');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !config) {
    return (
      <Card className="w-full border border-border/40 shadow-sm">
        <CardHeader className="pb-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-1" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-[400px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6 animate-in fade-in-50 slide-in-from-top-5">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-base font-semibold">Error Loading Configuration</AlertTitle>
        <AlertDescription className="mt-2">
          {error}
        </AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4" 
          onClick={refreshConfig}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </Alert>
    );
  }

  if (!config) {
    return (
      <Alert className="mb-6 animate-in fade-in-50 slide-in-from-top-5">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-base font-semibold">No Configuration</AlertTitle>
        <AlertDescription className="mt-2">
          No MCP configuration found. Please check if the configuration file exists.
        </AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4" 
          onClick={refreshConfig}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </Alert>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="w-full"
    >
      <Card className="w-full border border-border/40 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
          <div>
            <CardTitle className="text-2xl font-semibold tracking-tight flex items-center">
              <Settings className="h-5 w-5 mr-2 text-primary" />
              MCP Configuration
            </CardTitle>
            <CardDescription className="mt-1 text-base text-muted-foreground">
              View and manage your Model Context Protocol configuration
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshConfig}
                    className="h-9 gap-1"
                    disabled={loading}
                  >
                    <RefreshCw className={cn(
                      "h-4 w-4",
                      loading && "animate-spin"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh configuration</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyConfigToClipboard}
                    className="h-9 gap-1"
                  >
                    {copySuccess ? 
                      <Check className="h-4 w-4 text-green-600" /> : 
                      <ClipboardCopy className="h-4 w-4" />
                    }
                    <span>Copy</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy configuration to clipboard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={cancelEditing}
                  className="h-9 gap-1"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </Button>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={saveConfig}
                  disabled={loading || isSaving}
                  className="h-9 gap-1"
                >
                  {isSaving ? 
                    <RefreshCw className="h-4 w-4 animate-spin" /> : 
                    <Save className="h-4 w-4" />
                  }
                  <span>Save</span>
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setIsEditing(true)}
                className="h-9 gap-1"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger 
                value="llm" 
                className="flex items-center gap-1.5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Cpu className="h-4 w-4" />
                <span>LLM Settings</span>
              </TabsTrigger>
              <TabsTrigger 
                value="queries" 
                className="flex items-center gap-1.5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Example Queries</span>
              </TabsTrigger>
              <TabsTrigger 
                value="servers" 
                className="flex items-center gap-1.5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Server className="h-4 w-4" />
                <span>MCP Servers</span>
              </TabsTrigger>
              <TabsTrigger 
                value="backups" 
                className="flex items-center gap-1.5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <Archive className="h-4 w-4" />
                <span>Backups</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="llm" className="space-y-6 pt-2 animate-in fade-in-50 duration-300">
              <LLMSettings 
                config={config}
                isEditing={isEditing}
                updateLLMValue={updateLLMValue}
              />
            </TabsContent>
            
            <TabsContent value="queries" className="pt-2 animate-in fade-in-50 duration-300">
              <ExampleQueries 
                config={config}
                isEditing={isEditing}
                addExampleQuery={addExampleQuery}
                removeExampleQuery={removeExampleQuery}
              />
            </TabsContent>
            
            <TabsContent value="servers" className="space-y-6 pt-2 animate-in fade-in-50 duration-300">
              <ServerList 
                config={config}
                isEditing={isEditing}
                validationErrors={validationErrors}
                updateServerValue={updateServerValue}
                removeServer={removeServer}
                addServers={addServers}
              />
            </TabsContent>

            <TabsContent value="backups" className="space-y-6 pt-2 animate-in fade-in-50 duration-300">
              <BackupManager 
                refreshMainConfig={refreshConfig}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        {isEditing && (
          <CardFooter className="flex justify-end gap-2 border-t p-4 bg-muted/30">
            <Button 
              variant="outline" 
              onClick={cancelEditing}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button 
              variant="default"
              onClick={saveConfig}
              disabled={loading || isSaving}
              className="gap-1.5"
            >
              {isSaving ? 
                <RefreshCw className="h-4 w-4 animate-spin" /> : 
                <Save className="h-4 w-4" />
              }
              Save Configuration
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
};

export default MCPConfigViewer;
