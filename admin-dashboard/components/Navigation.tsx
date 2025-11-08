import Link from 'next/link'
import { dashboardOwner, integrationLinks } from '@/lib/dashboardConfig'

export default function Navigation() {
  const { brand, tagline, name, email } = dashboardOwner
  const ownerInitial = name.charAt(0).toUpperCase()

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between py-4">
          <div className="flex items-center justify-between lg:justify-start w-full">
            <Link href="/" className="flex items-center space-x-3">
              <div className="h-11 w-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{brand}</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tagline}</p>
              </div>
            </Link>

            <div className="flex items-center gap-4 lg:hidden">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {ownerInitial}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-center lg:gap-10 w-full">
            <div className="flex items-center justify-center gap-4 lg:justify-start">
              <Link
                href="/"
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/tenants"
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                App Profiles
              </Link>
              <Link
                href="/analytics"
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Analytics
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 w-full">
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{email}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {ownerInitial}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {integrationLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
