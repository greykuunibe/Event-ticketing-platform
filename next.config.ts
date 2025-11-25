import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
  // Prevent .env files from being included in standalone output
  output: 'standalone',
  outputFileTracingExcludes: {
    '*': [
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
      '.env.test',
      '.env*.local',
    ],
  },
};

export default nextConfig;