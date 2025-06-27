import type { NextConfig } from "next"
import withSerwist from '@serwist/next'

// const withBundleAnalyzer = require("@next/bundle-analyzer")({
//   enabled: process.env.ANALYZE === "true",
// })

const nextConfig: NextConfig = { // Removed withBundleAnalyzer wrapper
  experimental: {
  //   optimizePackageImports: ["@phosphor-icons/react"], // Keep this commented for now
    nodeMiddleware: true, // Restore this for middleware
  },
  // Fix for pino/winston logger issues in Next.js App Router
  serverExternalPackages: [
    'winston',
    'winston-daily-rotate-file', 
    'pino',
    'pino-pretty',
    'thread-stream',
    'pino-worker',
    'pino-file'
  ],
  webpack: (config) => {
    // Additional webpack externals to prevent bundling issues
    config.externals.push({
      'thread-stream': 'commonjs thread-stream',
      'pino': 'commonjs pino',
      'winston': 'commonjs winston'
    });
    return config;
  },
  eslint: {
    // @todo: remove before going live
    ignoreDuringBuilds: true,
  },
  typescript: {
    // @todo: fix MCP server type issues and remove this
    ignoreBuildErrors: true,
  },
}

export default withSerwist({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development', // Optionally disable PWA in dev for faster builds
})(nextConfig)
