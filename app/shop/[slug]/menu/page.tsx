'use client'

import { useState, useEffect } from 'react'
import { getTenantBySlug } from '@/lib/get-tenant'
import { Search, Coffee, Loader2 } from 'lucide-react'
import MenuItemCard, { type MenuItem } from '@/components/shop/MenuItem'
import CategoryFilter, { type Category } from '@/components/shop/CategoryFilter'
import ItemDetailModal, { type ItemOptions } from '@/components/shop/ItemDetailModal'
import { useCart } from '@/contexts/CartContext'
import { useMenu } from '@/hooks/useMenuQueries'

export default function MenuPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [currency, setCurrency] = useState('EUR')

  const { addItem } = useCart()

  // Fetch menu data with React Query caching
  const { categories, menuItems, isLoading } = useMenu(tenantId, { activeOnly: true })

  // Extract tenant slug from URL on mount
  useEffect(() => {
    const pathname = window.location.pathname
    const segments = pathname.split('/').filter(Boolean)
    // URL: /shop/joesbeans/menu -> segments: ['shop', 'joesbeans', 'menu']
    const slug = segments[1]
    setTenantSlug(slug)
  }, [])

  // Fetch tenant info when slug is available
  useEffect(() => {
    if (tenantSlug) {
      fetchTenantInfo()
    }
  }, [tenantSlug])

  async function fetchTenantInfo() {
    if (!tenantSlug) return

    try {
      // Get tenant info for currency and tenant_id
      const tenant = await getTenantBySlug(tenantSlug)
      if (tenant) {
        setCurrency(tenant.currency || 'EUR')
        setTenantId(tenant.tenant_id)
      }
    } catch (error) {
      console.error('Error fetching tenant info:', error)
    }
  }

  // Filter menu items
  const filteredItems = (menuItems.data || []).filter(item => {
    // Category filter
    if (selectedCategory !== 'all' && item.category_id !== selectedCategory) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return true
  })

  // Count items per category
  const itemCounts: Record<string, number> = {}
  ;(menuItems.data || []).forEach(item => {
    itemCounts[item.category_id] = (itemCounts[item.category_id] || 0) + 1
  })

  const handleViewDetails = (item: MenuItem) => {
    setSelectedItem(item)
    setIsModalOpen(true)
  }

  const handleAddToCart = (item: MenuItem, options?: ItemOptions) => {
    if (!tenantId) return

    if (options) {
      // From modal with customization
      addItem(
        {
          item_id: item.item_id,
          tenant_id: tenantId,
          name: item.name,
          description: item.description,
          price: item.price,
          image_url: item.image_url,
        },
        {
          size: options.size,
          addons: options.addons,
        },
        options.quantity,
        options.special_instructions
      )
    } else {
      // Quick add from card (no customization)
      addItem(
        {
          item_id: item.item_id,
          tenant_id: tenantId,
          name: item.name,
          description: item.description,
          price: item.price,
          image_url: item.image_url,
        },
        {
          addons: [],
        },
        1
      )
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-coffee-900 dark:text-white mb-2">
            Our Menu
          </h1>
          <p className="text-coffee-600 dark:text-coffee-300">
            Explore our selection of handcrafted beverages and treats
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-coffee-400" size={20} />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/80 dark:bg-dark-800/80 backdrop-blur-lg border border-coffee-200 dark:border-dark-700 rounded-xl text-coffee-900 dark:text-white placeholder-coffee-400 dark:placeholder-dark-500 focus:border-coffee-700 dark:focus:border-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-700/20"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-coffee-600 animate-spin mb-4" />
          <p className="text-coffee-600 dark:text-coffee-300">Loading menu...</p>
        </div>
      )}

      {/* Category Filter */}
      {!isLoading && (categories.data || []).length > 0 && (
        <CategoryFilter
          categories={categories.data || []}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          itemCounts={itemCounts}
        />
      )}

      {/* Menu Items Grid */}
      {!isLoading && (
        <>
          {filteredItems.length > 0 ? (
            <>
              {/* Results Count */}
              <div className="text-coffee-600 dark:text-coffee-300">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                {searchQuery && ` matching "${searchQuery}"`}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map(item => (
                  <MenuItemCard
                    key={item.item_id}
                    item={item}
                    onViewDetails={handleViewDetails}
                    onAddToCart={handleAddToCart}
                    currency={currency}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Coffee className="w-16 h-16 text-coffee-300 dark:text-dark-600 mb-4" />
              <h3 className="text-xl font-bold text-coffee-700 dark:text-coffee-200 mb-2">
                No items found
              </h3>
              <p className="text-coffee-600 dark:text-coffee-300">
                {searchQuery
                  ? `No items match "${searchQuery}". Try a different search.`
                  : 'No menu items available in this category.'}
              </p>
              {(searchQuery || selectedCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('all')
                  }}
                  className="mt-4 px-6 py-2 bg-coffee-700 text-white rounded-full hover:bg-coffee-800 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedItem(null)
        }}
        onAddToCart={handleAddToCart}
        currency={currency}
      />
    </div>
  )
}
