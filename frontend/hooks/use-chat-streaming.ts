import * as React from 'react';

/**
 * Hook for managing streaming content state in chat messages
 */
export function useChatStreaming() {
  const [streamingContent, setStreamingContent] = React.useState<{ [messageId: string]: string }>({});
  const [completedStreamContent, setCompletedStreamContent] = React.useState<{ [messageId: string]: string }>({});

  /**
   * Updates streaming content for a message
   */
  const updateStreamingContent = React.useCallback((messageId: string, chunk: string): string => {
    let updatedContent = '';
    
    setStreamingContent(prev => {
      // Initialize with empty string if undefined
      const currentContent = prev[messageId] || '';
      updatedContent = currentContent + chunk;
      
      console.log(`UPDATED STREAMING CONTENT for ${messageId}: length=${updatedContent.length}`);
      
      return {
        ...prev,
        [messageId]: updatedContent
      };
    });
    
    return updatedContent;
  }, []);

  /**
   * Detects if the content contains patterns that indicate a tool is being invoked
   */
  const detectToolInvocation = React.useCallback((content: string): boolean => {
    if (!content) return false;
    
    // Common patterns indicating tool invocation
    const toolPatterns = [
      /I'll use the ([a-zA-Z_]+) tool/i,
      /I'll (search|read|check|look at|examine|analyze|run|execute|invoke)/i,
      /<function_calls>/i,
      /<invoke name=/i,
      /I need to (search|read|check|look at|examine|analyze|run|execute|invoke)/i,
      /Let me (search|read|check|look at|examine|analyze|run|execute|invoke)/i,
      /I will (search|read|check|look at|examine|analyze|run|execute|invoke)/i,
      /Using the ([a-zA-Z_]+) tool/i,
      /Invoking ([a-zA-Z_]+) to/i,
      /\*\*Invoking Tool\*\*/i,
      /Calling the ([a-zA-Z_]+) tool/i,
      /calling the ([a-zA-Z_]+) function/i
    ];
    
    // Check each pattern against the content
    return toolPatterns.some(pattern => pattern.test(content));
  }, []);

  /**
   * Saves completed content for a message
   */
  const saveCompletedContent = React.useCallback((messageId: string, content: string) => {
    if (!content || content.length === 0) return;
    
    console.log(`Saving completed content (${content.length} chars) for message ${messageId}`);
    
    setCompletedStreamContent(prev => ({
      ...prev,
      [messageId]: content
    }));
  }, []);

  /**
   * Cleans up streaming content for a message
   */
  const cleanupStreamingContent = React.useCallback((messageId: string) => {
    console.log(`Cleanup: Removing streaming state for ${messageId}`);
    
    setStreamingContent(prev => {
      const newContent = { ...prev };
      delete newContent[messageId];
      return newContent;
    });
  }, []);

  /**
   * Gets the best content to display for a message
   */
  const getBestContent = React.useCallback(
    (messageId: string, currentContent: string, messageStatus: string): { 
      content: string;
      source: 'streaming' | 'completed' | 'message' | 'fallback';
    } => {
      const streamingContentForMessage = streamingContent[messageId];
      const completedContentForMessage = completedStreamContent[messageId];
      
      if (messageStatus === 'streaming' && streamingContentForMessage) {
        return { 
          content: streamingContentForMessage,
          source: 'streaming'
        };
      } 
      
      if (completedContentForMessage) {
        return { 
          content: completedContentForMessage,
          source: 'completed'
        };
      } 
      
      if (typeof currentContent === 'string' && currentContent.length > 0) {
        return { 
          content: currentContent,
          source: 'message'
        };
      }
      
      return { 
        content: 'No content available',
        source: 'fallback'
      };
    },
    [streamingContent, completedStreamContent]
  );

  return {
    streamingContent,
    completedStreamContent,
    updateStreamingContent,
    detectToolInvocation,
    saveCompletedContent,
    cleanupStreamingContent,
    getBestContent
  };
} 