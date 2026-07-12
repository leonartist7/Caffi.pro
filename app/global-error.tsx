'use client'

import { useEffect } from 'react'
import {} from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log critical error
    console.error('CRITICAL ERROR:', error)
  }, [error])

  return (
    <html>
      <body>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(to bottom right, #FFF8F0, #F5E6D3)',
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '1rem',
              padding: '3rem',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
            }}
          >
            {/* Error Icon */}
            <div
              style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 2rem',
                borderRadius: '50%',
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#DC2626"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#4A2511',
                marginBottom: '1rem',
              }}
            >
              Critical Error
            </h1>

            {/* Message */}
            <p
              style={{
                fontSize: '1rem',
                color: '#6B4423',
                marginBottom: '2rem',
                lineHeight: '1.5',
              }}
            >
              We encountered a critical error that prevented the application from loading. Please
              refresh the page or contact support if the problem persists.
            </p>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && (
              <div
                style={{
                  marginBottom: '2rem',
                  padding: '1rem',
                  background: '#FEE2E2',
                  borderRadius: '0.5rem',
                  border: '1px solid #FECACA',
                }}
              >
                <p
                  style={{
                    fontSize: '0.875rem',
                    fontFamily: 'monospace',
                    color: '#991B1B',
                    wordBreak: 'break-all',
                    textAlign: 'left',
                  }}
                >
                  {error.message}
                </p>
                {error.digest && (
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: '#DC2626',
                      marginTop: '0.5rem',
                      textAlign: 'left',
                    }}
                  >
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            {/* Retry Button */}
            <button
              onClick={reset}
              style={{
                padding: '0.75rem 2rem',
                background: '#6B4423',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#4A2511'
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#6B4423'
              }}
            >
              Reload Application
            </button>

            {/* Support Text */}
            <p
              style={{
                marginTop: '2rem',
                fontSize: '0.875rem',
                color: '#9CA3AF',
              }}
            >
              If this error continues, please contact{' '}
              <a
                href="mailto:support@caffi.pro"
                style={{
                  color: '#6B4423',
                  textDecoration: 'underline',
                }}
              >
                support@caffi.pro
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
