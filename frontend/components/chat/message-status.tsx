import * as React from 'react';

import { Check, CheckCheck, Clock, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ExtendedChatMessage } from '@/types/chat';

interface MessageStatusProps {
  message: ExtendedChatMessage;
  className?: string;
}

/**
 * A component that shows the current status of a message
 * @param message - The message to show status for
 * @param className - Optional className for styling
 */
export function MessageStatus({ message, className }: MessageStatusProps) {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sending':
        return <Clock className="h-3 w-3 animate-pulse" />;
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (message.status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'error':
        return 'Failed to send';
      default:
        return '';
    }
  };

  if (!message.status) return null;

  return (
    <div 
      className={cn(
        'flex items-center gap-1 text-xs text-muted-foreground',
        message.status === 'error' && 'text-destructive',
        className
      )}
      title={getStatusText()}
    >
      {getStatusIcon()}
    </div>
  );
} 