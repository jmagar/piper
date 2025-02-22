// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100'
  },
  async rewrites() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${API_URL}/socket.io/:path*`,
      },
    ];
  },
  experimental: {
    // Package optimizations
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      'date-fns'
    ],
    // Modern features
    typedRoutes: true
  }
};

export default nextConfig;