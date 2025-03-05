'use client';

import React, { useState, useEffect } from 'react';
import { testAllConnections, ConnectionTestResult } from '@/lib/connection-test';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Props for the ConnectionStatus component
 */
interface ConnectionStatusProps {
  /** Whether to auto-run the test on mount */
  autoTest?: boolean;
  /** Callback when all tests are complete */
  onTestComplete?: (results: ConnectionTestResult[]) => void;
  /** Optional class name */
  className?: string;
}

/**
 * Component to display connection status for backend services
 */
export function ConnectionStatus({
  autoTest = true,
  onTestComplete,
  className = '',
}: ConnectionStatusProps) {
  const [results, setResults] = useState<ConnectionTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTestedAt, setLastTestedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (autoTest) {
      runTests();
    }
  }, [autoTest]);

  /**
   * Run connection tests
   */
  const runTests = async () => {
    try {
      setIsLoading(true);
      const testResults = await testAllConnections();
      setResults(testResults);
      setLastTestedAt(new Date());
      
      if (onTestComplete) {
        onTestComplete(testResults);
      }
      
      const allSuccess = testResults.every(result => result.success);
      if (allSuccess) {
        toast.success('All connections are working properly');
      } else {
        toast.error('Some connections failed');
      }
    } catch (error) {
      toast.error('Failed to run connection tests');
      console.error('Error running connection tests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get icon for connection status
   */
  const getIcon = (success: boolean) => {
    if (success) {
      return <Check className="h-4 w-4 text-green-500" />;
    }
    return <X className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Connection Status</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={runTests}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Testing...' : 'Test Connections'}
        </Button>
      </div>
      
      {lastTestedAt && (
        <p className="text-sm text-muted-foreground">
          Last tested: {lastTestedAt.toLocaleTimeString()}
        </p>
      )}
      
      <div className="space-y-2">
        {results.length === 0 && !isLoading ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No connection tests run yet</AlertTitle>
            <AlertDescription>
              Click the button above to test connections
            </AlertDescription>
          </Alert>
        ) : (
          results.map((result) => (
            <Alert key={result.service} variant={result.success ? 'default' : 'destructive'}>
              <div className="flex items-center">
                {getIcon(result.success)}
                <AlertTitle className="ml-2">{result.service}</AlertTitle>
              </div>
              <AlertDescription>
                {result.message}
                {result.details && result.success && (
                  <pre className="mt-2 text-xs p-2 bg-muted rounded overflow-auto max-h-40">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                )}
              </AlertDescription>
            </Alert>
          ))
        )}
      </div>
    </div>
  );
} 