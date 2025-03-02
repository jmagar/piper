"use client";

import * as React from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

/**
 * ErrorFallback component for graceful error handling
 * 
 * @param props - Error fallback props
 * @param props.error - Error that occurred
 * @param props.resetErrorBoundary - Function to reset the error boundary
 * @returns Fallback UI for errors
 */
function ErrorFallback({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        className="rounded bg-primary px-4 py-2 text-primary-foreground"
        onClick={resetErrorBoundary}
        aria-label="Try again"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * Application-wide error boundary component
 * Provides consistent error handling throughout the app
 * 
 * @param props - Component props
 * @param props.children - Child components to render
 * @returns Error boundary wrapped around children
 */
export function AppErrorBoundary({ 
  children 
}: { 
  children: React.ReactNode;
}) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Optional: Reset state or perform other cleanup here
        window.location.reload();
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
} 