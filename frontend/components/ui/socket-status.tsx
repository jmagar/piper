import * as React from 'react';
import { useSocket } from '@/lib/socket/socket-provider';
import { ConnectionState } from '@/types/socket';
import { AlertCircle, CheckCircle2, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SocketStatusProps {
  className?: string;
  showDebug?: boolean;
  showConnectionState?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Component for displaying socket connection status
 */
export function SocketStatus({ 
  className, 
  showDebug = false,
  showConnectionState = false,
  size = 'sm'
}: SocketStatusProps) {
  const { connectionState, error, reconnect, isConnected } = useSocket();
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false);
  
  // Show success message temporarily when connection is established
  React.useEffect(() => {
    if (isConnected) {
      setShowSuccessMessage(true);
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected]);
  
  // Status indicator classes
  const getStatusClasses = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'bg-green-500';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'bg-yellow-500 animate-pulse';
      case ConnectionState.FAILED:
      case ConnectionState.DISCONNECTED:
      default:
        return 'bg-red-500';
    }
  };
  
  // Size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'text-xs',
          indicator: 'w-2 h-2',
          button: 'h-6 w-6'
        };
      case 'lg':
        return {
          container: 'text-base',
          indicator: 'w-3 h-3',
          button: 'h-8 w-8'
        };
      case 'md':
      default:
        return {
          container: 'text-sm',
          indicator: 'w-2.5 h-2.5',
          button: 'h-7 w-7'
        };
    }
  };
  
  const sizeClasses = getSizeClasses();
  
  return (
    <TooltipProvider>
      <div className={cn("flex items-center space-x-2", className, sizeClasses.container)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <div
                className={cn(
                  "rounded-full mr-2",
                  sizeClasses.indicator,
                  getStatusClasses()
                )}
                aria-hidden="true"
              />
              
              <span className="font-medium">
                {showConnectionState ? connectionState : (isConnected ? 'Connected' : 'Disconnected')}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Socket.IO connection status: {connectionState}</p>
            {error && <p className="text-red-500">{error}</p>}
          </TooltipContent>
        </Tooltip>
        
        {!isConnected && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => reconnect()}
                className={sizeClasses.button}
              >
                <RefreshCw className="h-4 w-4" />
                <span className="sr-only">Reconnect</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reconnect to the server</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {isConnected && showSuccessMessage && (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        )}
        
        {error && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-red-500 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span className="truncate max-w-[200px]">Error</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{error}</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {showDebug && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={sizeClasses.button}
                asChild
              >
                <a href="/debug/socket">
                  <Info className="h-4 w-4" />
                  <span className="sr-only">Socket Debug</span>
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Open socket debug panel</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
} 