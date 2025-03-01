// Adapted from shadcn/ui toast component
import { toast as sonnerToast, type ToastT } from 'sonner';
import { MouseEvent } from 'react';

type ToastTypes = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  title?: string;
  description?: string;
  type?: ToastTypes;
  duration?: number;
  action?: {
    label: string;
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  };
  cancel?: {
    label: string;
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  };
}

export function toast({
  title,
  description,
  type = 'default',
  duration = 5000,
  action,
  cancel,
}: ToastProps) {
  const options: Partial<ToastT> = {
    duration,
  };

  if (action) {
    options.action = {
      label: action.label,
      onClick: action.onClick,
    };
  }

  if (cancel) {
    options.cancel = {
      label: cancel.label,
      onClick: cancel.onClick || (() => {}),
    };
  }

  switch (type) {
    case 'success':
      return sonnerToast.success(title, {
        description,
        ...options,
      });
    case 'error':
      return sonnerToast.error(title, {
        description,
        ...options,
      });
    case 'warning':
      return sonnerToast.warning(title, {
        description,
        ...options,
      });
    case 'info':
      return sonnerToast.info(title, {
        description,
        ...options,
      });
    default:
      return sonnerToast(title, {
        description,
        ...options,
      });
  }
} 