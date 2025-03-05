'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { JSON5Editor } from './json5-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Save, RotateCcw, CheckCircle2, Download, Clock, Archive } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMCPConfig } from './mcp-config-provider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Props for the MCPConfigEditor component
 */
export interface MCPConfigEditorProps {
  /** Additional CSS class names */
  className?: string;
}

/**
 * A specialized editor for MCP configuration files
 * 
 * @example
 * ```tsx
 * <MCPConfigEditor />
 * ```
 */
export function MCPConfigEditor({
  className = '',
}: MCPConfigEditorProps) {
  const { 
    config, 
    isLoading, 
    error, 
    saveConfig, 
    reloadConfig,
    createBackup,
    backups,
    isLoadingBackups
  } = useMCPConfig();
  
  const [localConfig, setLocalConfig] = useState<string>(config);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('editor');
  const { toast } = useToast();

  // Update local config when config from context changes
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  // Check if config has been modified
  const hasChanges = localConfig !== config;

  // Handle save action
  const handleSave = async () => {
    setIsSaving(true);
    setLocalError(null);
    
    try {
      await saveConfig(localConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setLocalError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset to original
  const handleReset = () => {
    setLocalConfig(config);
    setLocalError(null);
    
    toast({
      title: "Configuration reset",
      description: "Your changes have been discarded.",
      duration: 3000,
    });
  };

  // Handle manual backup creation
  const handleCreateBackup = async () => {
    await createBackup();
  };

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle>MCP Configuration Editor</CardTitle>
        <CardDescription>
          Edit your Model Context Protocol server configuration
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="backups">Backups</TabsTrigger>
            <TabsTrigger value="help">Help & Documentation</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="editor" className="space-y-4">
          <CardContent>
            {(error || localError) && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error || localError}</AlertDescription>
              </Alert>
            )}
            
            <div className="rounded-md border vibrant-dark-theme-editor glow-effect">
              <JSON5Editor
                value={localConfig}
                onChange={setLocalConfig}
                height="500px"
                showPreview={false}
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <div className="flex items-center">
              {hasChanges && (
                <span className="text-sm text-yellow-500 dark:text-yellow-400 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Unsaved changes
                </span>
              )}
              {!hasChanges && !error && !localError && (
                <span className="text-sm text-green-500 dark:text-green-400 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Up to date
                </span>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges || isSaving || isLoading}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardFooter>
        </TabsContent>
        
        <TabsContent value="backups" className="mt-0">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Configuration Backups</h3>
              <Button onClick={handleCreateBackup} disabled={isLoadingBackups}>
                <Archive className="h-4 w-4 mr-2" />
                Create Backup
              </Button>
            </div>
            
            {isLoadingBackups ? (
              <div className="py-8 text-center text-muted-foreground">
                Loading backups...
              </div>
            ) : backups.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No backups available
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Backup ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                            {formatDate(backup.timestamp)}
                          </div>
                        </TableCell>
                        <TableCell>{backup.id}</TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    // This would be implemented in a real application
                                    // to download or restore the backup
                                    toast({
                                      title: "Feature not implemented",
                                      description: "Backup restoration is not yet implemented.",
                                      duration: 3000,
                                    });
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Restore this backup</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="help" className="mt-0">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">MCP Configuration Help</h3>
            
            <div className="space-y-4">
              <p>
                The MCP configuration file defines which Model Context Protocol servers are available
                to your application. Each server provides specific tools and capabilities.
              </p>
              
              <h4 className="text-md font-semibold mt-4">Configuration Format</h4>
              <p>
                The configuration uses JSON5 format, which is JSON with additional features like comments,
                trailing commas, and unquoted keys.
              </p>
              
              <pre className="bg-slate-950 text-slate-50 p-4 rounded-md text-sm overflow-auto">
{`{
  // LLM configuration
  llm: {
    model_provider: 'anthropic',  // Provider name
    model: 'claude-3-5-sonnet',   // Model name
    max_tokens: 1000,             // Maximum tokens per response
  },
  
  // Example queries to show in the UI
  example_queries: [
    "What's the weather like?",
    "Read the README file",
  ],
  
  // MCP server definitions
  mcp_servers: {
    // Each server has a unique key and configuration
    memory: {
      command: 'npx',           // Command to run
      args: [                   // Command arguments
        '-y',
        '@modelcontextprotocol/server-memory',
      ],
    },
    
    // You can add environment variables
    'brave-search': {
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-brave-search',
      ],
      env: {
        BRAVE_API_KEY: '\${BRAVE_API_KEY}',  // Environment variable
      },
    },
  },
}`}
              </pre>
              
              <h4 className="text-md font-semibold mt-4">Tips</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>Use comments to document your configuration</li>
                <li>Environment variables are interpolated at runtime</li>
                <li>You can comment out servers you don't want to use</li>
                <li>Changes require a server restart to take effect</li>
              </ul>
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
