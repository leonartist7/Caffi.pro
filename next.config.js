const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Demo menu/reward photos use Unsplash; Storage uploads can be added later.
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      {
        protocol: 'https',
        hostname: 'jjgccfrwjkwknyjtbtxa.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    domains: ['localhost', 'images.unsplash.com'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Only ignore type errors if absolutely necessary
    ignoreBuildErrors: false,
  },
  experimental: {
    // Next 14: needed so instrumentation.ts (Sentry server init) runs.
    instrumentationHook: true,
  },
}

module.exports = withSentryConfig(nextConfig, {
  // Build must stay green with no Sentry account configured:
  silent: true,
  telemetry: false,
  // Source-map upload only when a token is provided (CI/owner action);
  // otherwise the plugin is inert.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  disableLogger: true,
})
