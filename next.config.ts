import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.creatomate.com' },
      { protocol: 'https', hostname: 'cdn.creatomate.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
}

export default nextConfig
