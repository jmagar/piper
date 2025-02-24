import { ExternalLink, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import Image from 'next/image';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LinkPreviewProps {
  url: string;
  className?: string;
}

interface LinkMetadata {
  title: string;
  description: string;
  image: string;
  favicon: string;
  siteName: string;
}

/**
 * A component that displays a preview card for URLs with metadata
 * @param url - The URL to preview
 * @param className - Optional className for styling
 */
export function LinkPreview({ url, className }: LinkPreviewProps) {
  const { mutate: fetchMetadata, data: metadata, isPending, error } = useMutation({
    mutationFn: async (url: string): Promise<LinkMetadata> => {
      const response = await fetch('/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch link metadata');
      }
      
      return response.json();
    }
  });

  React.useEffect(() => {
    if (url) {
      void fetchMetadata(url);
    }
  }, [url, fetchMetadata]);

  if (error || !metadata) return null;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-4 p-4 transition-colors hover:bg-muted/50 sm:items-center"
      >
        {isPending ? (
          <div className="flex h-20 w-20 items-center justify-center rounded bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : metadata.image ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded">
            <Image
              src={metadata.image}
              alt={metadata.title}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        ) : null}
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {metadata.favicon && (
              <div className="relative h-4 w-4">
                <Image
                  src={metadata.favicon}
                  alt=""
                  fill
                  sizes="16px"
                  className="object-contain"
                />
              </div>
            )}
            <span className="text-sm font-medium">{metadata.siteName}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium leading-tight">
            {metadata.title}
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {metadata.description}
          </p>
        </div>
      </a>
    </Card>
  );
} 