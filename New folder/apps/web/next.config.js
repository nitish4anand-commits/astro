/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_NOMINATIM_URL: process.env.NEXT_PUBLIC_NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=(), camera=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "img-src 'self' data: https:",
              "style-src 'self' 'unsafe-inline'",
              "script-src 'self' 'unsafe-inline' https: https://maps.googleapis.com https://maps.gstatic.com",
              "connect-src 'self' http://localhost:8000 https://nominatim.openstreetmap.org https://maps.googleapis.com https://maps.gstatic.com https://places.googleapis.com",
              "font-src 'self' data:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
