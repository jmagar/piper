import { NextResponse, type NextRequest } from "next/server"
import { validateCsrfToken } from "./lib/csrf"

export async function middleware(request: NextRequest) {
  // Check for required environment variables on startup
  // if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  //   console.error("ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment variables")
  //   return new NextResponse("Server configuration error", { status: 500 })
  // }

  // Simple basic auth check for admin access
  // const authHeader = request.headers.get("authorization")
  // 
  // if (!authHeader || !authHeader.startsWith("Basic ")) {
  //   return new NextResponse("Authentication required", {
  //     status: 401,
  //     headers: {
  //       "WWW-Authenticate": "Basic realm=\"Admin Access\"",
  //     },
  //   })
  // }

  // const base64Credentials = authHeader.split(" ")[1]
  // const credentials = Buffer.from(base64Credentials, "base64").toString("ascii")
  // const [username, password] = credentials.split(":")

  // if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
  //   return new NextResponse("Invalid credentials", { status: 401 })
  // }

  // CSRF protection for state-changing requests
  if (["POST", "PUT", "DELETE"].includes(request.method)) {
    const csrfCookie = request.cookies.get("csrf_token")?.value
    const headerToken = request.headers.get("x-csrf-token")

    if (!csrfCookie || !headerToken || !validateCsrfToken(headerToken)) {
      return new NextResponse("Invalid CSRF token", { status: 403 })
    }
  }

  // CSP for development and production
  const isDev = process.env.NODE_ENV === "development"

  const response = NextResponse.next()
  response.headers.set(
    "Content-Security-Policy",
    isDev
      ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' wss: https://api.openai.com https://api.mistral.ai https://api.github.com;`
      : `default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://analytics.umami.is https://vercel.live; frame-src 'self' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' wss: https://api.openai.com https://api.mistral.ai https://api-gateway.umami.dev https://api.github.com;`
  )

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
  runtime: "nodejs",
}
