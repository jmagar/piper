import { NextRequest, NextResponse } from 'next/server';
// import { appLogger } from '@/lib/logger'; // Remove appLogger import
import { getCurrentCorrelationId, getCurrentContext } from '@/lib/logger/correlation';
// import { HttpLogEntry, LoggingMiddlewareConfig } from '@/lib/logger/types'; // Remove HttpLogEntry
import { LoggingMiddlewareConfig } from '@/lib/logger/types'; 
// import { ExpressRequest, ExpressResponse, NextFunction } from './correlation'; // To be removed by commenting out Express fns

// Default sensitive headers to exclude from logging
const DEFAULT_SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-session-token',
  'authentication',
  'proxy-authorization',
  'x-forwarded-authorization',
  'x-csrf-token',
  'x-xsrf-token',
];

// Default sensitive fields to mask in request/response bodies
// const DEFAULT_SENSITIVE_FIELDS = [ // Now unused
//   'password',
//   'token',
//   'secret',
//   'key',
//   'auth',
//   'authorization',
//   'credential',
//   'private',
//   'sensitive',
//   'ssn',
//   'social_security',
//   'credit_card',
//   'card_number',
//   'cvv',
//   'pin',
// ];

// Default configuration for logging middleware
export const DEFAULT_LOGGING_CONFIG: LoggingMiddlewareConfig = {
  enableRequestLogging: true,
  enableResponseLogging: true,
  enableErrorLogging: true,
  logBody: false, // Disabled by default for security
  logHeaders: true,
  excludePaths: [
    '/_next/',
    '/api/health',
    '/health',
    '/metrics',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ],
  sensitiveHeaders: DEFAULT_SENSITIVE_HEADERS,
  maxBodySize: 1024 * 10, // 10KB max body size for logging
  enableCorrelationId: true,
};

/**
 * Sanitize headers by removing sensitive information
 */
function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>,
  sensitiveHeaders: string[] = DEFAULT_SENSITIVE_HEADERS
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveHeaders.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (Array.isArray(value)) {
      sanitized[key] = value.join(', ');
    } else if (value) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Check if a path should be excluded from logging
 */
function shouldExcludePath(path: string, excludePaths: string[]): boolean {
  return excludePaths.some(excludePath => path.includes(excludePath));
}

/**
 * Get client IP from request
 */
function getClientIP(req: NextRequest /*| ExpressRequest*/): string | undefined { // Simplified for NextRequest only
  if (req instanceof NextRequest) {
    return req.headers.get('x-forwarded-for') || 
           req.headers.get('x-real-ip') || 
           req.headers.get('cf-connecting-ip') ||
           undefined;
  // } else { // Removed ExpressRequest path
  //   return req.ip || 
  //          (req.headers['x-forwarded-for'] as string) || 
  //          (req.headers['x-real-ip'] as string) ||
  //          undefined;
  }
  return undefined; // Fallback
}

/**
 * Next.js request logging middleware
 */
export function nextRequestLoggingMiddleware(
  request: NextRequest,
  config: Partial<LoggingMiddlewareConfig> = {}
): NextResponse | undefined {
  const finalConfig = { ...DEFAULT_LOGGING_CONFIG, ...config };
  
  // Check if path should be excluded
  if (shouldExcludePath(request.nextUrl.pathname, finalConfig.excludePaths)) {
    return undefined; // Continue without logging
  }
  
  if (!finalConfig.enableRequestLogging) {
    return undefined;
  }
  
  try {
    const startTime = Date.now();
    const correlationId = getCurrentCorrelationId();
    const context = getCurrentContext();
    
    // Prepare request log data
    const requestData = {
      method: request.method,
      url: request.url,
      path: request.nextUrl.pathname,
      query: Object.fromEntries(request.nextUrl.searchParams.entries()),
      headers: finalConfig.logHeaders ? 
        sanitizeHeaders(Object.fromEntries(request.headers.entries()), finalConfig.sensitiveHeaders) : 
        undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: getClientIP(request),
      correlationId,
      userId: context?.userId,
      timestamp: new Date().toISOString(),
      startTime,
    };
    
    // Log the request
    console.info('[Middleware] Incoming request', { // Changed to console
      request: requestData,
      source: 'next-middleware',
    });
    
    // Store start time for response logging
    const response = NextResponse.next();
    response.headers.set('x-request-start-time', startTime.toString());
    
    return response;
  } catch (error) {
    // Use console for middleware context logging
    console.error('[Middleware] Error in request logging middleware', { 
      error,
      path: request.nextUrl.pathname,
      method: request.method
    });
    return undefined;
  }
}

// /**
//  * Express-style request logging middleware
//  */
// export function expressRequestLoggingMiddleware(
//   config: Partial<LoggingMiddlewareConfig> = {}
// ) {
//   const finalConfig = { ...DEFAULT_LOGGING_CONFIG, ...config };
  
//   return function requestLoggingMiddleware(
//     req: ExpressRequest,
//     res: ExpressResponse,
//     next: NextFunction
//   ): void {
//     try {
//       // Check if path should be excluded
//       if (shouldExcludePath(req.url, finalConfig.excludePaths)) {
//         return next();
//       }
      
//       if (!finalConfig.enableRequestLogging) {
//         return next();
//       }
      
//       const startTime = Date.now();
//       const correlationId = getCurrentCorrelationId() || req.correlationId;
//       const context = getCurrentContext() || req.context;
      
//       // Store timing info on request
//       (req as any).startTime = startTime;
      
//       // Prepare request log data
//       const requestData = {
//         method: req.method,
//         url: req.url,
//         headers: finalConfig.logHeaders ? 
//           sanitizeHeaders(req.headers, finalConfig.sensitiveHeaders) : 
//           undefined,
//         userAgent: req.headers['user-agent'],
//         ip: getClientIP(req),
//         correlationId,
//         userId: context?.userId,
//         timestamp: new Date().toISOString(),
//         startTime,
//       };
      
//       // Log request body if enabled and present
//       if (finalConfig.logBody && (req as any).body) {
//         (requestData as any).body = sanitizeBody((req as any).body, DEFAULT_SENSITIVE_FIELDS, finalConfig.maxBodySize);
//       }
      
//       // Log the request
//       console.info('[Middleware] Incoming request', { // Changed to console
//         request: requestData,
//         source: 'express-middleware',
//       });
      
//       // Set up response logging if enabled
//       if (finalConfig.enableResponseLogging) {
//         const originalSend = (res as any).send;
//         const originalJson = (res as any).json;
        
//         // Override response methods to capture response data
//         (res as any).send = function(body: any) {
//           logResponse(req, res, body, startTime, finalConfig);
//           return originalSend.call(this, body);
//         };
        
//         (res as any).json = function(body: any) {
//           logResponse(req, res, body, startTime, finalConfig);
//           return originalJson.call(this, body);
//         };
//       }
      
//       next();
//     } catch (error) {
//       // Use console for middleware context logging
//       console.error('[Middleware] Error in request logging middleware', {error});
//       next();
//     }
//   };
// }

// /**
//  * Log response for Express middleware
//  */
// function logResponse(
//   req: ExpressRequest,
//   res: ExpressResponse,
//   body: unknown,
//   startTime: number,
//   config: LoggingMiddlewareConfig
// ): void {
//   try {
//     const endTime = Date.now();
//     const duration = endTime - startTime;
//     const correlationId = getCurrentCorrelationId() || req.correlationId;
//     const context = getCurrentContext() || req.context;
    
//     const responseData = {
//       statusCode: (res as any).statusCode || 200,
//       headers: config.logHeaders ? 
//         sanitizeHeaders((res as any).getHeaders?.() || {}, config.sensitiveHeaders) : 
//         undefined,
//       duration,
//       timestamp: new Date().toISOString(),
//       correlationId,
//       userId: context?.userId,
//     };
    
//     // Log response body if enabled
//     if (config.logBody && body) {
//       (responseData as { body?: unknown }).body = sanitizeBody(body, DEFAULT_SENSITIVE_FIELDS, config.maxBodySize);
//     }
    
//     // Determine log level based on status code
//     const logLevel = (res as any).statusCode >= 500 ? 'error' : 
//                     (res as any).statusCode >= 400 ? 'warn' : 'info';
    
//     // Use console for middleware context logging
//     const consoleLogLevel = logLevel === 'fatal' ? 'error' : logLevel; // Should not be fatal here
//     console[consoleLogLevel]('[Middleware] Response sent', {
//       request: {
//         method: req.method,
//         url: req.url,
//         correlationId,
//       },
//       response: responseData,
//       source: 'express-middleware',
//     });
//   } catch (error) {
//     // Use console for middleware context logging
//     console.error('[Middleware] Error logging response', {error});
//   }
// }

// /**
//  * Error logging middleware for Express
//  */
// export function expressErrorLoggingMiddleware(
//   config: Partial<LoggingMiddlewareConfig> = {}
// ) {
//   const finalConfig = { ...DEFAULT_LOGGING_CONFIG, ...config };
  
//   return function errorLoggingMiddleware(
//     error: Error,
//     req: ExpressRequest,
//     res: ExpressResponse,
//     next: NextFunction
//   ): void {
//     if (!finalConfig.enableErrorLogging) {
//       return next(error);
//     }
    
//     try {
//       const correlationId = getCurrentCorrelationId() || req.correlationId;
//       const context = getCurrentContext() || req.context;
//       const startTime = (req as any).startTime || Date.now();
//       const duration = Date.now() - startTime;
      
//       const errorData = {
//         name: error.name,
//         message: error.message,
//         stack: error.stack,
//         statusCode: (error as any).statusCode || 500,
//         correlationId,
//         userId: context?.userId,
//         request: {
//           method: req.method,
//           url: req.url,
//           userAgent: req.headers['user-agent'],
//           ip: getClientIP(req),
//         },
//         duration,
//         timestamp: new Date().toISOString(),
//       };
      
//       console.error('[Middleware] Request error occurred', { // Changed to console
//         error,
//         errorDetails: errorData,
//         source: 'express-error-middleware',
//       });
//     } catch (loggingError) {
//       // Fallback to console if logger fails
//       console.error('[Middleware] Error in error logging middleware:', {loggingError});
//       console.error('[Middleware] Original error:', {error});
//     }
    
//     next(error);
//   };
// }

// /**
//  * Create a configurable logging middleware factory
//  */
// export function createLoggingMiddleware(
//   config: Partial<LoggingMiddlewareConfig> = {}
// ) {
//   return {
//     request: expressRequestLoggingMiddleware(config),
//     error: expressErrorLoggingMiddleware(config),
//   };
// }

// /**
//  * Higher-order function to wrap API route handlers with logging
//  */
// export function withRequestLogging<T extends (...args: any[]) => any>(
//   handler: T,
//   config: Partial<LoggingMiddlewareConfig> = {}
// ): T {
//   const finalConfig = { ...DEFAULT_LOGGING_CONFIG, ...config };
  
//   return (async (req: ExpressRequest, res: ExpressResponse, ...args: any[]) => {
//     const startTime = Date.now();
    
//     try {
//       // Log request if enabled
//       if (finalConfig.enableRequestLogging && 
//           !shouldExcludePath(req.url, finalConfig.excludePaths)) {
        
//         const correlationId = getCurrentCorrelationId() || req.correlationId;
//         const context = getCurrentContext() || req.context;
        
//         console.info('[Middleware] API route called', { // Changed to console
//           request: {
//             method: req.method,
//             url: req.url,
//             correlationId,
//             userId: context?.userId,
//             timestamp: new Date().toISOString(),
//           },
//           source: 'api-route-wrapper',
//         });
//       }
      
//       // Execute handler
//       const result = await handler(req, res, ...args);
      
//       // Log successful completion
//       if (finalConfig.enableResponseLogging) {
//         const duration = Date.now() - startTime;
//         const correlationId = getCurrentCorrelationId() || req.correlationId;
        
//         console.info('[Middleware] API route completed', { // Changed to console
//           request: {
//             method: req.method,
//             url: req.url,
//             correlationId,
//           },
//           response: {
//             duration,
//             timestamp: new Date().toISOString(),
//           },
//           source: 'api-route-wrapper',
//         });
//       }
      
//       return result;
//     } catch (error) {
//       // Log error if enabled
//       if (finalConfig.enableErrorLogging) {
//         const duration = Date.now() - startTime;
//         const correlationId = getCurrentCorrelationId() || req.correlationId;
        
//         // Use console for middleware context logging
//         console.error('[Middleware] API route error', {
//           error,
//           request: {
//             method: req.method,
//             url: req.url,
//             correlationId,
//             duration,
//           },
//           source: 'api-route-wrapper',
//         });
//       }
      
//       throw error; // Re-throw the error
//     }
//   }) as T;
// }

// // Export configured middleware instances
// export const requestLoggingMiddleware = expressRequestLoggingMiddleware();
// export const errorLoggingMiddleware = expressErrorLoggingMiddleware();

// // Export the default logging middleware factory
// export const loggingMiddleware = createLoggingMiddleware(); 