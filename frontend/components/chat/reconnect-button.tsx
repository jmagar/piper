"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useSocket } from '@/lib/socket-provider';
import { RefreshCw } from 'lucide-react';

interface ReconnectButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Button that shows connection status and allows users to reconnect
 */
export function ReconnectButton({ 
  className, 
  variant = 'outline',
  size = 'default'
}: ReconnectButtonProps) {
  const { isConnected } = useSocket();
  
  if (isConnected) return null;
  
  return (
    <Button
      className={className}
      variant={variant}
      size={size}
      onClick={() => {
        // Refresh the page to reconnect
        window.location.reload();
      }}
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      Reconnect
    </Button>
  );
}