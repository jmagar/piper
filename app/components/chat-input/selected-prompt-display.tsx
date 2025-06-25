import React from 'react';
import { Prompt } from '@/app/components/chat-input/use-agent-command'; // Adjust path if necessary
import { Badge } from '@/components/ui/badge';
import { XIcon } from 'lucide-react';

interface SelectedPromptDisplayProps {
  selectedPrompt: Prompt | null;
  removeSelectedPrompt: () => void;
}

export const SelectedPromptDisplay: React.FC<SelectedPromptDisplayProps> = ({ selectedPrompt, removeSelectedPrompt }) => {
  if (!selectedPrompt) return null;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1.5 pl-2 pr-1 py-1 text-sm font-normal bg-background">
        <span className="mr-1">System Prompt:</span>
        <span className="font-semibold">{selectedPrompt.name}</span>
        <button
          onClick={removeSelectedPrompt}
          className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={`Remove ${selectedPrompt.name} prompt`}
        >
          <XIcon size={14} />
        </button>
      </Badge>
    </div>
  );
};
