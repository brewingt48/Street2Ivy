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
      // Bucketeer S3 (Heroku file storage addon)
      {
        protocol: 'https',
        hostname: 'bucketeer-*.s3.amazonaws.com',
      },
      // Google user avatars (OAuth)
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      // Imgix CDN (if used for image optimization)
      {
        protocol: 'https',
        hostname: '*.imgix.net',
      },
      // Gravatar
      {
        protocol: 'https',
        hostname: '*.gravatar.com',
      },
      // Cloudinary CDN (image/video uploads)
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  experimental: {
    // Prevent Next.js from bundling postgres.js — it needs its native type
    // serializers (Date, Buffer, etc.) which get broken by webpack bundling
    serverComponentsExternalPackages: ['postgres', 'cloudinary'],
  },
  async headers() {
    // Content Security Policy — remove 'unsafe-eval', add upgrade-insecure-requests
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.mailgun.net",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "upgrade-insecure-requests",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
