import React from 'react';
import { MCPTool } from '@/app/components/chat-input/use-agent-command'; // Adjust path if necessary
import { Badge } from '@/components/ui/badge';
import { XIcon, CogIcon } from 'lucide-react'; // Added CogIcon for tool visual

interface SelectedToolDisplayProps {
  selectedTool: MCPTool | null;
  removeSelectedTool: () => void;
}

export const SelectedToolDisplay: React.FC<SelectedToolDisplayProps> = ({ selectedTool, removeSelectedTool }) => {
  if (!selectedTool) return null;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1.5 pl-2 pr-1 py-1 text-sm font-normal bg-background">
        <CogIcon size={14} className="mr-1 text-muted-foreground" />
        <span className="mr-1">Tool:</span>
        <span className="font-semibold">{selectedTool.name}</span>
        {selectedTool.serverLabel && <span className="text-xs text-muted-foreground">({selectedTool.serverLabel})</span>}
        <button
          onClick={removeSelectedTool}
          className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={`Remove ${selectedTool.name} tool`}
        >
          <XIcon size={14} />
        </button>
      </Badge>
    </div>
  );
};
