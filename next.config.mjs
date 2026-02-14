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
  // Prevent Next.js from bundling postgres.js — it needs its native type
  // serializers (Date, Buffer, etc.) which get broken by webpack bundling
  serverExternalPackages: ['postgres'],
};

export default nextConfig;
