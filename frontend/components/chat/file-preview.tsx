import * as React from 'react';
import Image from 'next/image';

import { FileIcon, X } from 'lucide-react';
import prettyBytes from 'pretty-bytes';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
  files: File[];
  onRemove: (file: File) => void;
  className?: string;
}

/**
 * A component that displays file attachment previews
 * @param files - Array of files to preview
 * @param onRemove - Callback when a file is removed
 * @param className - Optional className for styling
 */
export function FilePreview({ files, onRemove, className }: FilePreviewProps) {
  const renderPreview = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const isVideo = file.type.startsWith('video/');

    if (isImage) {
      return (
        <div className="relative aspect-square w-32 overflow-hidden rounded-lg border">
          <Image
            src={URL.createObjectURL(file)}
            alt={file.name}
            width={200}
            height={200}
            className="h-full w-full object-cover"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 bg-background/80 hover:bg-background"
            onClick={() => onRemove(file)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="relative flex aspect-[3/4] w-24 flex-col items-center justify-center rounded-lg border bg-muted p-2">
          <FileIcon className="h-8 w-8 text-foreground" />
          <span className="mt-2 text-xs font-medium">PDF</span>
          <span className="text-xs text-muted-foreground">
            {prettyBytes(file.size)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6"
            onClick={() => onRemove(file)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="relative aspect-video w-48 overflow-hidden rounded-lg border">
          <video
            src={URL.createObjectURL(file)}
            className="h-full w-full"
            controls
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-6 w-6 bg-background/80 hover:bg-background"
            onClick={() => onRemove(file)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="relative flex aspect-square w-24 flex-col items-center justify-center rounded-lg border bg-muted p-2">
        <FileIcon className="h-8 w-8 text-foreground" />
        <span className="mt-2 text-xs font-medium line-clamp-1">
          {file.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {prettyBytes(file.size)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-6 w-6"
          onClick={() => onRemove(file)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`}>
          {renderPreview(file)}
        </div>
      ))}
    </div>
  );
} 