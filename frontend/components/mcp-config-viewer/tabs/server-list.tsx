"use client";

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MCPConfig, MCPServerConfig, ServerValidationError } from '../types';
import { ErrorSummary } from '../components/error-summary';
import { ServerItem } from '../components/server-item';
import { JsonInput } from '../components/json-input';

interface ServerListProps {
  config: MCPConfig;
  isEditing: boolean;
  validationErrors: ServerValidationError[];
  updateServerValue: (
    serverName: string, 
    key: 'command' | 'args' | 'env', 
    value: string | string[] | Record<string, string> | undefined
  ) => void;
  removeServer: (serverName: string) => void;
  addServers: (servers: Record<string, MCPServerConfig>) => void;
}

export const ServerList = ({ 
  config, 
  isEditing, 
  validationErrors, 
  updateServerValue, 
  removeServer,
  addServers
}: ServerListProps) => {
  const [newServerName, setNewServerName] = useState<string>('');
  const [showJsonInput, setShowJsonInput] = useState<boolean>(false);

  const handleAddServer = () => {
    if (!newServerName.trim()) return;
    
    const serverName = newServerName.trim();
    const newServer = {
      command: 'npx',
      args: ['-y', ''],
    };
    
    addServers({ [serverName]: newServer });
    setNewServerName('');
  };

  const hasServerErrors = (serverName: string): boolean => {
    return validationErrors.some(e => e.serverName === serverName);
  };

  const getServerErrors = (serverName: string): string[] => {
    const serverError = validationErrors.find(e => e.serverName === serverName);
    return serverError ? serverError.errors : [];
  };

  return (
    <div className="space-y-6">
      {isEditing && (
        <div className="space-y-3">
          {showJsonInput ? (
            <JsonInput 
              onAddServers={addServers}
              onCancel={() => setShowJsonInput(false)}
            />
          ) : (
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Enter server name"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddServer}
                  disabled={!newServerName.trim()}
                  className="h-10 px-3 flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Server</span>
                </Button>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowJsonInput(true)}
                className="w-full h-10 mt-2 border-dashed border-2 border-border text-muted-foreground hover:text-foreground"
              >
                <span>Paste JSON Configuration</span>
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Server validation errors summary */}
      <ErrorSummary validationErrors={validationErrors} />
      
      {/* Display each server config */}
      <AnimatePresence initial={false}>
        {config && Object.entries(config.mcp_servers).map(([serverName, serverConfig], index) => (
          <ServerItem
            key={serverName}
            serverName={serverName}
            serverConfig={serverConfig}
            index={index}
            isEditing={isEditing}
            hasErrors={hasServerErrors(serverName)}
            errors={getServerErrors(serverName)}
            updateServerValue={updateServerValue}
            removeServer={removeServer}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
