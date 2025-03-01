"use client";

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ServerValidationError } from '../types';

interface ErrorSummaryProps {
  validationErrors: ServerValidationError[];
}

export const ErrorSummary = ({ validationErrors }: ErrorSummaryProps) => {
  if (validationErrors.length === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-5 w-5" />
      <AlertTitle className="text-base font-semibold">
        Configuration Validation Errors
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">Please fix the following errors before saving:</p>
        <ul className="list-disc pl-5 space-y-1">
          {validationErrors.flatMap(error => 
            error.errors.map((err, i) => (
              <li key={`${error.serverName}-${i}`} className="text-sm">
                {err}
              </li>
            ))
          )}
        </ul>
      </AlertDescription>
    </Alert>
  );
};
