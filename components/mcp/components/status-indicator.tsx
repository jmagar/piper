'use client';

import React from 'react';
import { McpServerInfo } from '@/app/api/mcp-servers/route';
import { AlertCircle, CheckCircle2, HelpCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatusIndicatorProps {
  status: McpServerInfo['status'];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function StatusIndicator({ status, className, size = 'md' }: StatusIndicatorProps) {
  const baseClasses = sizeClasses[size];

  switch (status) {
    case 'success':
      return <CheckCircle2 className={cn(baseClasses, "text-green-500", className)} />;
    case 'error':
      return <XCircle className={cn(baseClasses, "text-red-500", className)} />;
    case 'no_tools_found':
      return <AlertCircle className={cn(baseClasses, "text-yellow-500", className)} />;
    case 'uninitialized':
    default:
      return <HelpCircle className={cn(baseClasses, "text-gray-400", className)} />;
  }
} 