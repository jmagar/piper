"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Error boundary component for the new chat page
 */
export default function NewChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log the error to console
  useEffect(() => {
    console.error("Chat creation error:", error);
  }, [error]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="text-center max-w-md mx-auto">
        <h2 className="text-xl font-medium text-destructive mb-4">
          Failed to create new chat
        </h2>
        <p className="text-muted-foreground mb-6">
          We encountered an error while trying to create a new chat session.
        </p>
        
        <div className="flex flex-col space-y-2">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/chat">Return to chats</Link>
          </Button>
        </div>
      </div>
    </div>
  );
} 