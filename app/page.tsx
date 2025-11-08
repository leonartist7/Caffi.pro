import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Caffi.pro Admin Dashboard
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Manage your café business with ease
        </p>
        
        <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Quick Access
          </h2>
          <p className="text-gray-600 mb-6">
            Enter your tenant ID to access the dashboard
          </p>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const tenantId = formData.get('tenantId');
              if (tenantId) {
                window.location.href = `/tenants/${tenantId}`;
              }
            }}
            className="flex gap-4 max-w-md mx-auto"
          >
            <input
              type="text"
              name="tenantId"
              placeholder="Enter tenant ID..."
              required
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Go
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-blue-600 text-3xl mb-3">📍</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Locations
            </h3>
            <p className="text-gray-600 text-sm">
              Manage your café locations, hours, and settings
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-blue-600 text-3xl mb-3">📂</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Categories
            </h3>
            <p className="text-gray-600 text-sm">
              Organize your menu with custom categories
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-blue-600 text-3xl mb-3">☕</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Menu Items
            </h3>
            <p className="text-gray-600 text-sm">
              Add and edit your products, pricing, and details
            </p>
          </div>
        </div>

        <div className="mt-12 text-gray-500 text-sm">
          <p>Built with Next.js 14, TypeScript, and Supabase</p>
        </div>
      </div>
    </div>
  );
}
