"use client";

import { useState } from 'react';
import { Server, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { MCPServerConfig } from '../types';

interface JsonInputProps {
  onAddServers: (servers: Record<string, MCPServerConfig>) => void;
  onCancel: () => void;
}

export const JsonInput = ({ onAddServers, onCancel }: JsonInputProps) => {
  const [jsonInput, setJsonInput] = useState<string>('');

  const handleAddServersFromJson = () => {
    if (!jsonInput.trim()) return;
    
    try {
      // Try to parse the JSON input
      let parsedInput = JSON.parse(jsonInput.trim());
      let serversToAdd: Record<string, MCPServerConfig> = {};
      
      // Check if input has a mcpServers or mcp_servers property
      if (parsedInput.mcpServers) {
        serversToAdd = parsedInput.mcpServers;
      } else if (parsedInput.mcp_servers) {
        serversToAdd = parsedInput.mcp_servers;
      } else if (typeof parsedInput === 'object') {
        // Assume direct server object format
        serversToAdd = parsedInput;
      }
      
      if (Object.keys(serversToAdd).length === 0) {
        throw new Error('No valid server configurations found in the input');
      }
      
      onAddServers(serversToAdd);
      setJsonInput('');
      
      toast({
        title: 'Servers Added',
        description: `Added ${Object.keys(serversToAdd).length} server configurations`,
        variant: 'default',
      });
    } catch (err) {
      console.error('Error parsing JSON input:', err);
      toast({
        variant: 'destructive',
        title: 'Invalid JSON',
        description: err instanceof Error ? err.message : 'Failed to parse JSON input',
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="json-input" className="text-base font-medium flex items-center gap-1.5">
          <Server className="h-4 w-4 text-primary" />
          <span>Paste JSON Server Configuration</span>
        </Label>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onCancel}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="border rounded-md p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground mb-2">
          Paste a server configuration in JSON format. You can paste either:
        </p>
        <ul className="list-disc text-xs text-muted-foreground pl-5 mb-3 space-y-1">
          <li>A single server object</li>
          <li>Multiple servers under a <code>mcp_servers</code> property</li>
          <li>Multiple servers under a <code>mcpServers</code> property</li>
        </ul>
        <textarea
          id="json-input"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          className="w-full h-[200px] p-3 text-sm font-mono bg-background border rounded-md"
          placeholder='{\n  "example-server": {\n    "command": "npx",\n    "args": ["-y", "package-name"]\n  }\n}'
        />
        <div className="flex justify-end mt-3">
          <Button 
            variant="default" 
            size="sm"
            onClick={handleAddServersFromJson}
            disabled={!jsonInput.trim()}
            className="px-4"
          >
            Add Servers from JSON
          </Button>
        </div>
      </div>
    </div>
  );
};
