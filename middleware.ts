import { NextResponse, type NextRequest } from "next/server"
// import { appLogger } from "@/lib/logger" // Now unused
import { 
  nextCorrelationMiddleware,
  addCorrelationHeaders 
} from "./middleware/correlation"
import { nextRequestLoggingMiddleware } from "./middleware/logging"
import { nextErrorHandler } from "./middleware/error-handler"
import { correlationManager } from "./lib/logger/correlation"
import { logThrottledOperation } from "./lib/logger/utils"

export async function middleware(request: NextRequest) {
  try {
    // Initialize correlation context first
    const correlationResponse = nextCorrelationMiddleware(request);
    let response = correlationResponse || NextResponse.next();

    // Extract correlation context for this request
    const context = correlationManager.createContextFromRequest({
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method,
      url: request.url,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    // Run the rest of the middleware within correlation context
    return correlationManager.runWithContext(context, () => {
      // Log the request
      const loggingResponse = nextRequestLoggingMiddleware(request);
      if (loggingResponse) {
        response = loggingResponse;
      }

      // Add security headers (CSP)
      const isDev = process.env.NODE_ENV === "development"
      response.headers.set(
        "Content-Security-Policy",
        isDev
          ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' wss: https://api.openai.com https://api.mistral.ai https://api.github.com;`
          : `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://analytics.umami.is https://vercel.live; frame-src 'self' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' wss: https://api.openai.com https://api.mistral.ai https://api-gateway.umami.dev https://api.github.com;`
      )

      // Add timing header for performance monitoring
      response.headers.set('X-Response-Time', Date.now().toString())

      // Ensure correlation headers are added
      addCorrelationHeaders(response, context.correlationId, context.requestId)

      // Simple completion logging
      console.debug(`[${request.method}] ${request.nextUrl.pathname} completed`, {
        correlationId: context.correlationId?.substring(0, 8),
      });

      return response;
    });

  } catch (error) {
    // Handle any errors in middleware
    console.error('Error in Next.js middleware', {
      error,
      path: request.nextUrl.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      source: 'next-middleware',
    });

    // Use our error handler to create a standardized error response
    return nextErrorHandler(error as Error, request);
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
  runtime: "nodejs",
}
