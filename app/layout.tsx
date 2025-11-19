import type { Metadata, Viewport } from 'next'
import React from 'react'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { QueryProvider } from '@/components/providers/QueryProvider'
import PWARegister from '@/components/PWARegister'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Caffi.pro - Admin Dashboard',
  description: 'Manage your café clients from one powerful dashboard',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Caffi.pro',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#6b3410',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans antialiased">
        <PWARegister />
        <QueryProvider>
          <ThemeProvider>
            <Toaster position="top-right" richColors closeButton />
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
