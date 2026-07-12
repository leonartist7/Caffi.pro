import * as Sentry from '@sentry/nextjs'

// Server-side Sentry. No DSN → skipped, loudly, once at boot.
const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  })
} else {
  console.info('[sentry] STUBBED — set SENTRY_DSN to enable server error tracking')
}
