import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',   // Required for cPanel / Node.js server deployment
  images: {
    domains: [],
  },
};

export default nextConfig;
