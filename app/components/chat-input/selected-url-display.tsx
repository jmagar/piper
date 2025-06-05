import React from 'react';
import { Badge } from '@/components/ui/badge';
import { XIcon, LinkIcon } from 'lucide-react'; // Added LinkIcon for URL visual

export interface AttachedUrl {
  id: string; // A unique ID for the attached URL, e.g., the full rawMention or a generated one
  url: string; // The actual URL
  rawMention: string; // The full @url/... string that was inserted
}

interface SelectedUrlDisplayProps {
  attachedUrls: AttachedUrl[];
  removeAttachedUrl: (rawMention: string) => void;
}

export const SelectedUrlDisplay: React.FC<SelectedUrlDisplayProps> = ({ attachedUrls, removeAttachedUrl }) => {
  if (!attachedUrls || attachedUrls.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      {attachedUrls.map((item) => (
        <Badge key={item.id} variant="outline" className="flex items-center gap-1.5 pl-2 pr-1 py-1 text-sm font-normal bg-background">
          <LinkIcon size={14} className="mr-1 text-muted-foreground" />
          <span className="mr-1">URL:</span>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline truncate max-w-xs" title={item.url}>
            {item.url}
          </a>
          <button
            onClick={() => removeAttachedUrl(item.rawMention)}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label={`Remove URL ${item.url}`}
          >
            <XIcon size={14} />
          </button>
        </Badge>
      ))}
    </div>
  );
};
