import { appLogger } from '@/lib/logger';
import { getCurrentCorrelationId } from '@/lib/logger/correlation';

// Smart content processing for large tool responses
export interface ChunkedContent {
  type: 'chunked_response';
  tool: string;
  summary: string;
  sections: Array<{
    title: string;
    content: string;
    importance: 'high' | 'medium' | 'low';
  }>;
  metadata: {
    original_length: number;
    processed_length: number;
    url?: string;
    title?: string;
  };
}

export interface TruncatedContent {
  type: 'truncated_response';
  tool: string;
  content: string;
  note: string;
  original_length: number;
}

/**
 * Processes large tool responses into manageable, structured chunks
 */
export function processLargeToolResponse(toolName: string, result: unknown): unknown {
  // Only process string results that are large
  if (typeof result !== 'string' || result.length < 5000) {
    return result;
  }

  appLogger.info(`[Large Response Processor] Processing large ${toolName} response: ${result.length} characters`, {
    correlationId: getCurrentCorrelationId(),
    operationId: `process_large_response_${toolName}`,
    args: { toolName, responseLength: result.length }
  });

  try {
    if (toolName === 'fetch' || toolName.includes('fetch')) {
      return processFetchResponse(result);
    } else if (toolName.includes('search') || toolName.includes('crawl')) {
      return processSearchResponse(toolName, result);
    } else {
      return processGenericLargeResponse(toolName, result);
    }
  } catch (error) {
    appLogger.warn(`[Large Response Processor] Error processing large response for ${toolName}`, {
      correlationId: getCurrentCorrelationId(),
      operationId: `process_large_response_error_${toolName}`,
      error: error as Error
    });
    // Fallback to truncated version
    return createTruncatedResponse(toolName, result, 'processing error');
  }
}

/**
 * Creates a truncated response fallback
 */
function createTruncatedResponse(toolName: string, content: string, reason: string): TruncatedContent {
  return {
    type: 'truncated_response',
    tool: toolName,
    content: content.substring(0, 3000),
    note: `Content truncated from ${content.length} to 3000 characters due to ${reason}`,
    original_length: content.length
  };
}

/**
 * Specifically processes fetch tool responses (HTML content)
 */
function processFetchResponse(htmlContent: string): ChunkedContent {
  const sections: Array<{ title: string; content: string; importance: 'high' | 'medium' | 'low' }> = [];
  
  // Extract title
  const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Web Page';
  
  // Extract URL if present in content
  const urlMatch = htmlContent.match(/https?:\/\/[^\s<>"']+/);
  const url = urlMatch ? urlMatch[0] : undefined;
  
  // Extract headings and their content
  const headingMatches = htmlContent.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi) || [];
  const headings = headingMatches.map(h => h.replace(/<[^>]*>/g, '').trim()).slice(0, 8);
  
  // Extract meta description
  const metaDescMatch = htmlContent.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1] : '';
  
  // Extract main content (remove scripts, styles, nav, footer)
  const mainContent = htmlContent
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  // Create summary
  let summary = metaDescription;
  if (!summary && mainContent.length > 200) {
    summary = mainContent.substring(0, 300) + '...';
  }
  
  // Add title section
  if (title && title !== 'Web Page') {
    sections.push({
      title: 'Page Title',
      content: title,
      importance: 'high' as const
    });
  }
  
  // Add summary section
  if (summary) {
    sections.push({
      title: 'Summary',
      content: summary,
      importance: 'high' as const
    });
  }
  
  // Add headings as sections
  if (headings.length > 0) {
    sections.push({
      title: 'Key Sections',
      content: headings.join(' • '),
      importance: 'medium' as const
    });
  }
  
  // Add main content chunks (max 2000 chars per chunk)
  if (mainContent.length > 500) {
    const chunks = chunkText(mainContent, 2000);
    chunks.slice(0, 3).forEach((chunk, index) => {
      sections.push({
        title: `Content Part ${index + 1}`,
        content: chunk,
        importance: index === 0 ? 'medium' as const : 'low' as const
      });
    });
  }
  
  return {
    type: 'chunked_response',
    tool: 'fetch',
    summary: `Fetched: ${title}${url ? ` from ${url}` : ''}`,
    sections,
    metadata: {
      original_length: htmlContent.length,
      processed_length: sections.reduce((acc, s) => acc + s.content.length, 0),
      url,
      title
    }
  };
}

/**
 * Processes search/crawl tool responses
 */
function processSearchResponse(toolName: string, content: string): ChunkedContent {
  const sections: Array<{ title: string; content: string; importance: 'high' | 'medium' | 'low' }> = [];
  
  // Try to parse as JSON first (many search tools return JSON)
  try {
    const parsed = JSON.parse(content);
    if (parsed.results && Array.isArray(parsed.results)) {
      sections.push({
        title: 'Search Results',
        content: `Found ${parsed.results.length} results`,
        importance: 'high' as const
      });
      
      parsed.results.slice(0, 5).forEach((result: unknown, index: number) => {
        const resultObj = result as Record<string, unknown>;
        sections.push({
          title: `Result ${index + 1}`,
          content: `${resultObj.title || resultObj.name || 'Result'}: ${resultObj.description || resultObj.snippet || resultObj.content || ''}`.substring(0, 500),
          importance: index < 2 ? 'medium' as const : 'low' as const
        });
      });
    }
  } catch {
    // Not JSON, treat as text
    const chunks = chunkText(content, 1500);
    chunks.slice(0, 4).forEach((chunk, index) => {
      sections.push({
        title: `${toolName} Result ${index + 1}`,
        content: chunk,
        importance: index === 0 ? 'high' as const : 'medium' as const
      });
    });
  }
  
  return {
    type: 'chunked_response',
    tool: toolName,
    summary: `${toolName} completed with ${sections.length} sections`,
    sections,
    metadata: {
      original_length: content.length,
      processed_length: sections.reduce((acc, s) => acc + s.content.length, 0)
    }
  };
}

/**
 * Generic processor for other large responses
 */
function processGenericLargeResponse(toolName: string, content: string): ChunkedContent {
  const chunks = chunkText(content, 2000);
  const sections = chunks.slice(0, 3).map((chunk, index) => ({
    title: `${toolName} Output ${index + 1}`,
    content: chunk,
    importance: index === 0 ? ('high' as const) : ('medium' as const)
  }));
  
  return {
    type: 'chunked_response',
    tool: toolName,
    summary: `${toolName} returned ${content.length} characters in ${sections.length} chunks`,
    sections,
    metadata: {
      original_length: content.length,
      processed_length: sections.reduce((acc, s) => acc + s.content.length, 0)
    }
  };
}

/**
 * Utility function to split text into chunks
 */
function chunkText(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
      }
      currentChunk = trimmedSentence.length <= maxChunkSize ? trimmedSentence : trimmedSentence.substring(0, maxChunkSize - 3) + '...';
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk + (currentChunk.endsWith('.') ? '' : '.'));
  }
  
  return chunks.filter(chunk => chunk.trim().length > 0);
} 