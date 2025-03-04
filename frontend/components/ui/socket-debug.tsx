import * as React from 'react';
import { useSocket } from '@/lib/socket/hooks/use-socket';
import { X, Minimize, Maximize, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SocketDebugProps {
  className?: string;
  showFullLogs?: boolean;
  defaultOpen?: boolean;
}

type LogEntry = {
  timestamp: string;
  message: string;
  data?: any;
  level: 'info' | 'warn' | 'error' | 'debug';
};

/**
 * Component for debugging socket connections
 */
export function SocketDebug({ 
  className, 
  showFullLogs = false, 
  defaultOpen = false 
}: SocketDebugProps) {
  const { error, isConnected, isConnecting, socket } = useSocket();
  // Create a local connectionState for compatibility
  const connectionState = React.useMemo(() => {
    if (isConnected) return 'connected';
    if (isConnecting) return 'connecting';
    if (error) return 'failed';
    return 'disconnected';
  }, [isConnected, isConnecting, error]);
  
  // Implement reconnect function
  const reconnect = React.useCallback(() => {
    window.location.reload();
  }, []);
  
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const logsContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Add log when connection state changes
  React.useEffect(() => {
    const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || '';
    
    setLogs(prev => [
      ...prev.slice(showFullLogs ? -99 : -19),
      {
        timestamp,
        message: `Connection state: ${connectionState}${error ? ` (Error: ${error})` : ''}`,
        level: error ? 'error' : 'info'
      }
    ]);
  }, [connectionState, error, showFullLogs]);
  
  // Listen for socket events
  React.useEffect(() => {
    if (!socket || !isOpen) return;
    
    const handleEvent = (event: string, data: any) => {
      const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || '';
      
      setLogs(prev => [
        ...prev.slice(showFullLogs ? -99 : -19),
        {
          timestamp,
          message: `Event: ${event}`,
          data,
          level: 'debug'
        }
      ]);
    };
    
    // Listen for all events
    if (showFullLogs && (socket as any).onAny) {
      (socket as any).onAny(handleEvent);
    }
    
    // Listen for specific events
    (socket as any).on('connect', () => handleEvent('connect', null));
    (socket as any).on('disconnect', (reason: string) => handleEvent('disconnect', reason));
    (socket as any).on('connect_error', (err: Error) => handleEvent('connect_error', err));
    
    // Clean up
    return () => {
      if (showFullLogs && (socket as any).offAny) {
        (socket as any).offAny(handleEvent);
      }
      
      (socket as any).off('connect');
      (socket as any).off('disconnect');
      (socket as any).off('connect_error');
    };
  }, [socket, isOpen, showFullLogs]);
  
  // Scroll to bottom when logs change
  React.useEffect(() => {
    if (logsContainerRef.current && isOpen) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, isOpen]);
  
  // Skip rendering in production unless forced
  if (process.env.NODE_ENV === 'production' && !showFullLogs) {
    return null;
  }
  
  // Helper function for log styling
  const getLogStyle = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'debug':
        return 'text-blue-400';
      case 'info':
      default:
        return 'text-gray-300';
    }
  };
  
  return (
    <div className={cn(
      "fixed z-50",
      isExpanded ? "inset-4" : "bottom-0 right-0",
      className
    )}>
      {/* Toggle button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          variant="secondary"
          className={`rounded-t-md rounded-b-none px-3 py-1 text-xs font-mono ${
            isConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
          } text-white border-b-0`}
        >
          Socket: {connectionState}
        </Button>
      )}
      
      {/* Debug panel */}
      {isOpen && (
        <div className={cn(
          "bg-gray-900 text-gray-200 rounded-md flex flex-col overflow-hidden border border-gray-700",
          isExpanded ? "h-full" : "h-80 w-full md:w-96"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
              <h3 className="font-medium">Socket Debug: {connectionState}</h3>
            </div>
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-gray-400 hover:text-white"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-gray-400 hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Toolbar */}
          <div className="flex justify-between items-center p-2 bg-gray-800 border-b border-gray-700">
            <div className="text-xs">
              {isConnected ? "Connected" : `Disconnected${error ? `: ${error}` : ''}`}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => reconnect()}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Reconnect
            </Button>
          </div>
          
          {/* Log container */}
          <div 
            ref={logsContainerRef}
            className="flex-1 overflow-auto p-2 font-mono text-xs"
          >
            {logs.length === 0 ? (
              <div className="text-gray-500 italic p-2">No socket events recorded yet.</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`mb-1 ${getLogStyle(log.level)}`}>
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  {log.data && (
                    <pre className="ml-6 mt-1 p-1 bg-gray-800 rounded overflow-x-auto">
                      {typeof log.data === 'object' 
                        ? JSON.stringify(log.data, null, 2) 
                        : String(log.data)
                      }
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
          
          {/* Footer */}
          <div className="p-2 border-t border-gray-700 bg-gray-800 text-xs flex justify-between">
            <span>
              Socket ID: {socket?.id || 'Not connected'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => setLogs([])}
            >
              Clear logs
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 