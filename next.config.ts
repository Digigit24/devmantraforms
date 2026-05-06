import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  

  images: {
    unoptimized: true,   // 🔥 THIS IS THE FIX
    domains: [],
  },
};

export default nextConfig;
