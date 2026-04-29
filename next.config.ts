import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',   // Required for cPanel / Node.js server deployment
  serverExternalPackages: ['undici'],
  images: {
    domains: [],
  },
};

export default nextConfig;
