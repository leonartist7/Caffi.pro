import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { QueryProvider } from '@/components/providers/QueryProvider'
import PWARegister from '@/components/PWARegister'
import { Toaster } from 'sonner'

// aro brand fonts (AURA/app/aura-landing.css) exposed as CSS vars the
// tailwind fontFamily tokens reference (font-display/serif/body/mono).
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
})
const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  variable: '--font-instrument',
  display: 'swap',
})
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

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
    <html
      lang="en"
      className={`${bricolage.variable} ${instrument.variable} ${inter.variable} ${jetbrains.variable}`}
    >
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
