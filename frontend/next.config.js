// @ts-check
/* eslint-env node */
/* global process */

/**
 * Next.js Configuration
 * 
 * NOTE: Environment variables come from the ROOT .env file only.
 * Do NOT create a separate .env file in the frontend directory.
 * All environment variables should be defined in the project root .env file.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100'
  },
  async rewrites() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';
    return [
      // Send API requests to backend
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${API_URL}/socket.io/:path*`,
      },
      // API calls for mcp data - note the specific path patterns
      {
        source: '/mcp/config/backup/:path*',
        destination: `${API_URL}/api/mcp/config/backup/:path*`,
      },
      {
        source: '/mcp/config/validate',
        destination: `${API_URL}/api/mcp/config/validate`,
      },
      {
        source: '/mcp/servers/:path*',
        destination: `${API_URL}/api/mcp/servers/:path*`,
      },
      {
        source: '/mcp/tools/:path*',
        destination: `${API_URL}/api/mcp/tools/:path*`,
      },
      {
        source: '/mcp/health',
        destination: `${API_URL}/api/mcp/health`,
      },
      // API endpoint for getting/setting config
      {
        source: '/api/mcp/config',
        destination: `${API_URL}/api/mcp/config`,
      }
      // Note: We are NOT redirecting /mcp/config itself, so it can render the React component
    ];
  },
  experimental: {
    // Package optimizations
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      'date-fns'
    ],
    // Enable Turbopack
    turbo: {
      rules: {
        // Add any Turbopack-specific rules here
      }
    }
  }
};

export default nextConfig;