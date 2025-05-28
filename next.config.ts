import type { NextConfig } from "next"

// const withBundleAnalyzer = require("@next/bundle-analyzer")({
//   enabled: process.env.ANALYZE === "true",
// })

const nextConfig: NextConfig = { // Removed withBundleAnalyzer wrapper
  experimental: {
  //   optimizePackageImports: ["@phosphor-icons/react"], // Keep this commented for now
    nodeMiddleware: true, // Restore this for middleware
  },
  eslint: {
    // @todo: remove before going live
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
