'use client';

import { useEffect } from 'react';
import { getPublicEnv } from '@/lib/env';

/**
 * Environment provider component that exposes environment variables to window
 * This allows static HTML files and client components to access env vars
 */
export function EnvProvider() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Make environment variables available globally for static HTML files
      window.env = getPublicEnv();
      console.log('Environment variables loaded:', window.env);
    }
  }, []);
  
  return null;
}

// Add type declaration for window.env
declare global {
  interface Window {
    env?: {
      API_URL: string;
      WEBSOCKET_URL: string;
      [key: string]: string;
    };
  }
}