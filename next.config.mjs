/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    // Prevent Next.js from bundling postgres.js — it needs its native type
    // serializers (Date, Buffer, etc.) which get broken by webpack bundling
    serverComponentsExternalPackages: ['postgres'],
  },
};

export default nextConfig;
