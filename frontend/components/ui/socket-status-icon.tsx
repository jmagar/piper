import * as React from 'react';
import { useSocket } from '@/lib/socket-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SocketStatusIconProps {
  className?: string;
}

/**
 * Compact socket status icon for header usage
 */
export function SocketStatusIcon({ className }: SocketStatusIconProps) {
  const { isConnected, isConnecting, error, reconnect } = useSocket();
  
  // Status indicator classes - memoize to prevent re-renders
  const statusClasses = React.useMemo(() => {
    if (isConnected) {
      return 'bg-green-500';
    } else if (isConnecting) {
      return 'bg-yellow-500 animate-pulse';
    } else {
      return 'bg-red-500';
    }
  }, [isConnected, isConnecting]);
  
  // Connection state text - memoize to prevent re-renders
  const connectionState = React.useMemo(() => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting';
    return 'Disconnected';
  }, [isConnected, isConnecting]);
  
  // Memoize the onClick handler to prevent infinite re-renders
  const handleReconnectClick = React.useCallback(() => {
    if (typeof reconnect === 'function') {
      reconnect();
    } else {
      // Fallback - refresh the page
      window.location.reload();
    }
  }, [reconnect]);
  
  return (
    <TooltipProvider>
      <div className={cn("flex items-center", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <div
                className={cn(
                  "rounded-full w-2 h-2",
                  statusClasses
                )}
                aria-hidden="true"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Socket: {connectionState}</p>
            {error && (
              <p className="text-red-500 text-xs">{String(error)}</p>
            )}
          </TooltipContent>
        </Tooltip>
        
        {!isConnected && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReconnectClick}
                className="h-6 w-6 ml-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span className="sr-only">Reconnect</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Refresh the page to reconnect</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
} 