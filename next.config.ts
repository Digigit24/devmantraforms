import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['undici'],

  images: {
    unoptimized: true,   // 🔥 THIS IS THE FIX
    domains: [],
  },
};

export default nextConfig;
