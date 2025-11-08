import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary to-accent flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ☕ Caffi.pro
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Multi-tenant SaaS for Coffee Shop Apps
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <Link
              href="/analytics"
              className="bg-primary hover:bg-primary/90 text-white font-semibold py-6 px-8 rounded-xl shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              <div className="text-3xl mb-2">📊</div>
              <div className="text-xl">Analytics Dashboard</div>
              <div className="text-sm opacity-90 mt-2">View insights and reports</div>
            </Link>
            
            <div className="bg-gray-100 text-gray-400 font-semibold py-6 px-8 rounded-xl shadow-lg cursor-not-allowed">
              <div className="text-3xl mb-2">🏪</div>
              <div className="text-xl">Tenants</div>
              <div className="text-sm opacity-90 mt-2">Coming soon</div>
            </div>
          </div>

          <div className="mt-12 p-6 bg-blue-50 rounded-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Getting Started</h2>
            <ol className="text-left text-sm text-gray-700 space-y-2">
              <li>1. Copy <code className="bg-white px-2 py-1 rounded">.env.example</code> to <code className="bg-white px-2 py-1 rounded">.env.local</code></li>
              <li>2. Add your <code className="bg-white px-2 py-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> from Supabase Dashboard</li>
              <li>3. Run <code className="bg-white px-2 py-1 rounded">npm install</code> to install dependencies</li>
              <li>4. Run <code className="bg-white px-2 py-1 rounded">npm run dev</code> to start the development server</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  )
}
