import { getTenantBySlug } from '@/lib/get-tenant'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Coffee, ShoppingBag, Gift, Clock, MapPin } from 'lucide-react'

/**
 * Shop Home Page - Customer-facing landing page
 *
 * This is the main landing page for each coffee shop's customer app.
 * URL pattern: /shop/[slug]
 */
export default async function ShopHomePage() {
  const headersList = headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  const tenant = await getTenantBySlug(tenantSlug)

  if (!tenant) {
    return null // Layout handles this case
  }

  const shopUrl = `/shop/${tenant.slug}`

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-coffee-700 via-coffee-600 to-coffee-800 text-white p-8 md:p-12 shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Coffee className="w-12 h-12" />
            <h1 className="text-4xl md:text-5xl font-bold">
              Welcome to {tenant.app_name || tenant.business_name}
            </h1>
          </div>
          <p className="text-xl text-cream-100 max-w-2xl mb-6">
            Order your favorite coffee, earn rewards, and enjoy the perfect cup every time.
          </p>
          <Link
            href={`${shopUrl}/menu`}
            className="inline-flex items-center gap-2 bg-white text-coffee-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-cream-100 transition-colors shadow-lg"
          >
            <Coffee size={24} />
            Browse Menu
          </Link>
        </div>

        {/* Decorative coffee beans */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-coffee-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-coffee-400/20 rounded-full blur-3xl" />
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-2xl font-bold text-coffee-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            href={`${shopUrl}/menu`}
            icon={<Coffee className="w-8 h-8" />}
            title="Browse Menu"
            description="Explore our delicious selection"
            color="from-coffee-600 to-coffee-700"
          />
          <QuickActionCard
            href={`${shopUrl}/orders`}
            icon={<ShoppingBag className="w-8 h-8" />}
            title="My Orders"
            description="Track your current and past orders"
            color="from-amber-600 to-amber-700"
          />
          {tenant.features_enabled?.rewards && (
            <QuickActionCard
              href={`${shopUrl}/rewards`}
              icon={<Gift className="w-8 h-8" />}
              title="Rewards"
              description="Earn points and get free drinks"
              color="from-emerald-600 to-emerald-700"
            />
          )}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-2xl font-bold text-coffee-900 dark:text-white mb-4">
          Why Order With Us?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Clock className="w-10 h-10 text-coffee-600" />}
            title="Quick Ordering"
            description="Skip the line and order ahead for pickup"
          />
          {tenant.features_enabled?.loyalty && (
            <FeatureCard
              icon={<Gift className="w-10 h-10 text-coffee-600" />}
              title="Loyalty Rewards"
              description={`Earn ${tenant.loyalty_config?.points_per_euro || 10} points per ${tenant.currency || 'EUR'} spent`}
            />
          )}
          <FeatureCard
            icon={<MapPin className="w-10 h-10 text-coffee-600" />}
            title="Multiple Locations"
            description="Find the nearest café to you"
          />
          <FeatureCard
            icon={<Coffee className="w-10 h-10 text-coffee-600" />}
            title="Fresh Coffee"
            description="Made to order, just the way you like it"
          />
          <FeatureCard
            icon={<ShoppingBag className="w-10 h-10 text-coffee-600" />}
            title="Easy Pickup"
            description="Get notified when your order is ready"
          />
          {tenant.features_enabled?.delivery && (
            <FeatureCard
              icon={<MapPin className="w-10 h-10 text-coffee-600" />}
              title="Delivery Available"
              description="Get your coffee delivered to your door"
            />
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center bg-gradient-to-br from-cream-100 to-coffee-100 rounded-2xl p-8 md:p-12">
        <Coffee className="w-16 h-16 mx-auto mb-4 text-coffee-600" />
        <h2 className="text-3xl font-bold text-coffee-900 mb-3">Ready to Order?</h2>
        <p className="text-lg text-coffee-700 mb-6 max-w-xl mx-auto">
          Start browsing our menu and customize your perfect drink.
        </p>
        <Link
          href={`${shopUrl}/menu`}
          className="inline-flex items-center gap-2 bg-coffee-700 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-coffee-800 transition-colors shadow-lg"
        >
          <Coffee size={24} />
          View Menu
        </Link>
      </section>
    </div>
  )
}

// Helper Components
function QuickActionCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden bg-gradient-to-br ${color} text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:scale-105`}
    >
      <div className="relative z-10">
        <div className="mb-3">{icon}</div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-cream-100 text-sm">{description}</p>
      </div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:w-32 group-hover:h-32 transition-all" />
    </Link>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg p-6 rounded-xl shadow-md border border-coffee-200/50 dark:border-dark-700">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-coffee-900 dark:text-white mb-2">{title}</h3>
      <p className="text-coffee-600 dark:text-coffee-300 text-sm">{description}</p>
    </div>
  )
}
