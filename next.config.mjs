/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Copilot configuration
  env: {
    COPILOT_ENV: process.env.COPILOT_ENV,
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: '',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // V0 configurations for development and build optimization
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  
  // Additional optimizations for v0 components
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    serverActions: {
      bodySizeLimit: '10mb', // Adjust size as needed
    },
  },
}

export default nextConfig