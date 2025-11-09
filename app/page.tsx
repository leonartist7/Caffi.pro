'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page
    router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-accent flex items-center justify-center p-8">
      <div className="text-center text-white">
        <div className="text-6xl mb-4">☕</div>
        <p className="text-xl">Redirecting to login...</p>
      </div>
    </div>
  )
}
