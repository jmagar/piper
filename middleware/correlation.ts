import { NextRequest, NextResponse } from 'next/server';
import { correlationManager, CORRELATION_HEADERS } from '../lib/logger/correlation';
import { LogContext } from '../lib/logger/types';

// Express-style middleware interface
export interface ExpressRequest {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
  ip?: string;
  user?: { id: string };
  correlationId?: string;
  context?: LogContext;
}

// Define a type for Next.js App Router context (second argument to handlers)
interface AppRouterContext {
  params?: Record<string, string | string[]>;
  [key: string]: unknown; // For other potential properties Next.js might add
}

export interface ExpressResponse {
  setHeader: (name: string, value: string) => void;
  locals?: Record<string, unknown>;
}

export interface NextFunction {
  (error?: unknown): void;
}

/**
 * Next.js Middleware for correlation ID handling
 * This runs on every request in Next.js Edge Runtime
 */
export function nextCorrelationMiddleware(request: NextRequest): NextResponse {
  // Extract or generate correlation ID
  const existingCorrelationId = correlationManager.extractCorrelationId(
    Object.fromEntries(request.headers.entries())
  );
  
  const correlationId = existingCorrelationId || correlationManager.generateCorrelationId();
  
  // Create context from request
  const context = correlationManager.createContextFromRequest({
    headers: Object.fromEntries(request.headers.entries()),
    method: request.method,
    url: request.url,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
  });

  // Create response with correlation headers
  const response = NextResponse.next();
  
  // Add correlation ID to response headers
  response.headers.set(CORRELATION_HEADERS.CORRELATION_ID, correlationId);
  response.headers.set(CORRELATION_HEADERS.REQUEST_ID, context.requestId || correlationId);
  
  // Store context in headers for downstream middleware/handlers
  response.headers.set('x-internal-correlation-context', JSON.stringify(context));
  
  return response;
}

/**
 * Express-style middleware for correlation ID handling
 * This works with API routes and server-side code
 */
export function expressCorrelationMiddleware(
  req: ExpressRequest,
  res: ExpressResponse,
  next: NextFunction
): void {
  try {
    // Extract or generate correlation ID
    const existingCorrelationId = correlationManager.extractCorrelationId(req.headers);
    const correlationId = existingCorrelationId || correlationManager.generateCorrelationId();
    
    // Create context from request
    const context = correlationManager.createContextFromRequest({
      headers: req.headers,
      method: req.method,
      url: req.url,
      ip: (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || req.ip || undefined,
      user: req.user,
    });

    // Store correlation ID and context on request
    req.correlationId = correlationId;
    req.context = context;

    // Add correlation headers to response
    res.setHeader(CORRELATION_HEADERS.CORRELATION_ID, correlationId);
    res.setHeader(CORRELATION_HEADERS.REQUEST_ID, context.requestId || correlationId);

    // Run the rest of the request within correlation context
    correlationManager.runWithContext(context, () => {
      next();
    });
  } catch (error) {
    console.error('Error in correlation middleware:', error);
    next(error);
  }
}

/**
 * Higher-order function to wrap API route handlers with correlation context
 */
export function withCorrelationContext<
  Req extends ExpressRequest,
  Res extends ExpressResponse,
  Args extends unknown[], // Captures 'next' and other args
  Ret // Return type of the original handler
>(
  handler: (req: Req, res: Res, ...args: Args) => Ret
): (req: Req, res: Res, ...args: Args) => Promise<Awaited<Ret>> {
  return async (req: Req, res: Res, ...args: Args): Promise<Awaited<Ret>> => {
    // Check if context already exists (from middleware)
    let context = req.context;
    
    if (!context) {
      // Create context if not exists
      const correlationId = correlationManager.extractCorrelationId(req.headers) || 
                           correlationManager.generateCorrelationId();
      
      context = correlationManager.createContextFromRequest({
        headers: req.headers,
        method: req.method,
        url: req.url,
        ip: (req.headers['x-forwarded-for'] as string) || (req.headers['x-real-ip'] as string) || req.ip || undefined,
        user: req.user,
      });
      
      req.correlationId = correlationId;
      req.context = context;
      
      // Add headers if response object supports it
      if (res.setHeader) {
        res.setHeader(CORRELATION_HEADERS.CORRELATION_ID, correlationId);
        res.setHeader(CORRELATION_HEADERS.REQUEST_ID, context.requestId || correlationId);
      }
    }

    // Run handler within correlation context
    const result: Awaited<Ret> = await correlationManager.runWithContextAsync(context, async () => handler(req, res, ...args));
    return result;
  };
}

/**
 * Next.js API route wrapper for correlation context
 */
export function withNextCorrelationContext(
  handler: (req: NextRequest, routeContext?: AppRouterContext) => Promise<Response | NextResponse>
) {
  return async (req: NextRequest, routeContext?: AppRouterContext): Promise<Response | NextResponse> => {
    // Extract context from headers (set by Next.js middleware)
    const contextHeader = req.headers.get('x-internal-correlation-context');
    let context: LogContext;
    
    if (contextHeader) {
      try {
        context = JSON.parse(contextHeader);
      } catch {
        // Fallback if parsing fails
        context = correlationManager.createContextFromRequest({
          headers: Object.fromEntries(req.headers.entries()),
          method: req.method,
          url: req.url,
          ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
        });
      }
    } else {
      // Create new context
      context = correlationManager.createContextFromRequest({
        headers: Object.fromEntries(req.headers.entries()),
        method: req.method,
        url: req.url,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      });
    }

    // Run handler within correlation context
    return correlationManager.runWithContextAsync(context, () => handler(req, routeContext));
  };
}

/**
 * Utility to get correlation ID from request object
 */
export function getCorrelationIdFromRequest(
  req: ExpressRequest | NextRequest
): string | undefined {
  // Check if already stored on request
  if ('correlationId' in req && req.correlationId) {
    return req.correlationId;
  }

  // Extract from headers
  if (req instanceof NextRequest) {
    return correlationManager.extractCorrelationId(
      Object.fromEntries(req.headers.entries())
    );
  } else {
    return correlationManager.extractCorrelationId(req.headers);
  }
}

/**
 * Utility to add correlation headers to any response
 */
export function addCorrelationHeaders(
  response: NextResponse | ExpressResponse,
  correlationId?: string,
  requestId?: string
): void {
  const corrId = correlationId || correlationManager.getCurrentCorrelationId();
  const reqId = requestId || correlationManager.getCurrentRequestId();

  if (corrId) {
    if (response instanceof NextResponse) {
      response.headers.set(CORRELATION_HEADERS.CORRELATION_ID, corrId);
      if (reqId) response.headers.set(CORRELATION_HEADERS.REQUEST_ID, reqId);
    } else if ('setHeader' in response) {
      response.setHeader(CORRELATION_HEADERS.CORRELATION_ID, corrId);
      if (reqId) response.setHeader(CORRELATION_HEADERS.REQUEST_ID, reqId);
    }
  }
}

/**
 * Configuration options for correlation middleware
 */
export interface CorrelationMiddlewareConfig {
  // Whether to generate correlation ID if not present
  generateIfMissing: boolean;
  // Whether to include correlation ID in response headers
  includeInResponse: boolean;
  // Whether to validate correlation ID format
  validateFormat: boolean;
  // Whether to sanitize correlation ID
  sanitizeId: boolean;
  // Custom header names to check for correlation ID
  customHeaders?: string[];
  // Paths to exclude from correlation processing
  excludePaths?: string[];
}

/**
 * Default configuration
 */
export const DEFAULT_CORRELATION_CONFIG: CorrelationMiddlewareConfig = {
  generateIfMissing: true,
  includeInResponse: true,
  validateFormat: true,
  sanitizeId: true,
  excludePaths: ['/health', '/metrics', '/_next/', '/api/health'],
};

/**
 * Configurable correlation middleware factory
 */
export function createCorrelationMiddleware(
  config: Partial<CorrelationMiddlewareConfig> = {}
) {
  const finalConfig = { ...DEFAULT_CORRELATION_CONFIG, ...config };
  
  return function correlationMiddleware(
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction
  ): void {
    try {
      // Check if path should be excluded
      if (finalConfig.excludePaths?.some(path => req.url?.includes(path))) {
        return next();
      }

      // Extract correlation ID
      let correlationId = correlationManager.extractCorrelationId(req.headers);
      
      // Check custom headers if configured
      if (!correlationId && finalConfig.customHeaders) {
        for (const header of finalConfig.customHeaders) {
          const value = req.headers[header];
          if (value) {
            correlationId = Array.isArray(value) ? value[0] : value;
            break;
          }
        }
      }

      // Generate if missing and configured to do so
      if (!correlationId && finalConfig.generateIfMissing) {
        correlationId = correlationManager.generateCorrelationId();
      }

      // Validate format if configured
      if (correlationId && finalConfig.validateFormat) {
        if (!correlationManager.isValidCorrelationId(correlationId)) {
          correlationId = correlationManager.generateCorrelationId();
        }
      }

      // Sanitize if configured
      if (correlationId && finalConfig.sanitizeId) {
        correlationId = correlationManager.sanitizeCorrelationId(correlationId);
      }

      if (correlationId) {
        // Create context
        const context = correlationManager.createContextFromRequest({
          headers: req.headers,
          method: req.method,
          url: req.url,
          ip: req.ip,
          user: req.user,
        });

        // Store on request
        req.correlationId = correlationId;
        req.context = context;

        // Add to response if configured
        if (finalConfig.includeInResponse) {
          addCorrelationHeaders(res, correlationId, context.requestId);
        }

        // Run within context
        return correlationManager.runWithContext(context, () => next());
      }
      
      next();
    } catch (error) {
      console.error('Error in configurable correlation middleware:', error);
      next(error);
    }
  };
}

// Export default configured middleware
export const correlationMiddleware = createCorrelationMiddleware();

// Export all the middleware functions
export {
  nextCorrelationMiddleware as nextMiddleware,
  expressCorrelationMiddleware as expressMiddleware,
  correlationMiddleware as defaultMiddleware,
}; 