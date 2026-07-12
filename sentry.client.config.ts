import * as Sentry from '@sentry/nextjs'

// Client-side Sentry. No DSN → init is skipped (visible in console once),
// never a faked connection.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  })
} else if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.info('[sentry] STUBBED — set NEXT_PUBLIC_SENTRY_DSN to enable client error tracking')
}
