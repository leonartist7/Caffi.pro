'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { LocationModal } from '@/components/locations/LocationModal'
import { CategoryModal } from '@/components/menu/CategoryModal'
import {
  MenuItemModal,
  type MenuItemFormData,
  type MenuItem as MenuItemType,
  type Category as CategoryType,
} from '@/components/menu/MenuItemModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface Tenant {
  tenant_id: string
  business_name: string
  app_name: string
  owner_email: string
}

interface Location {
  location_id: string
  tenant_id: string
  name: string
  address: string
  city: string
  state: string
  postal_code: string
  country: string
  phone: string
  email: string
  latitude: number | null
  longitude: number | null
  hours: Record<string, string>
  is_active: boolean
  accepts_mobile_orders: boolean
  accepts_dine_in_orders: boolean
  estimated_prep_time: number
}

interface Category extends CategoryType {
  description: string
  display_order: number
  is_active: boolean
  image_url: string
  icon_name: string
}

interface MenuItem extends MenuItemType {
  tenant_id: string
  categories?: { name: string }
}

export default function TenantDetailPage() {
  const params = useParams()
  const tenantId = params?.id as string
  const { confirm, confirmState, closeConfirm } = useConfirm()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal states
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [menuItemModalOpen, setMenuItemModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null)

  useEffect(() => {
    fetchData()
  }, [tenantId])

  const fetchData = async () => {
    setLoading(true)
    setError('')

    try {
      // Fetch tenant info (mock for now, you'd implement the tenant API)
      setTenant({
        tenant_id: tenantId,
        business_name: 'Coffee Shop',
        app_name: 'My Café App',
        owner_email: 'owner@example.com',
      })

      // Fetch locations
      const locationsRes = await fetch(`/api/locations?tenant_id=${tenantId}`)
      const locationsData = await locationsRes.json()
      setLocations(locationsData.locations || [])

      // Fetch categories
      const categoriesRes = await fetch(`/api/categories?tenant_id=${tenantId}`)
      const categoriesData = await categoriesRes.json()
      setCategories(categoriesData.categories || [])

      // Fetch menu items
      const menuItemsRes = await fetch(`/api/menu-items?tenant_id=${tenantId}`)
      const menuItemsData = await menuItemsRes.json()
      setMenuItems(menuItemsData.menu_items || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  // Location handlers
  const handleAddLocation = () => {
    setEditingLocation(null)
    setLocationModalOpen(true)
  }

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location)
    setLocationModalOpen(true)
  }

  const handleSaveLocation = async (locationData: Partial<Location>) => {
    if (editingLocation) {
      // Update
      const res = await fetch(`/api/locations/${editingLocation.location_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData),
      })

      if (!res.ok) throw new Error('Failed to update location')
    } else {
      // Create
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData),
      })

      if (!res.ok) throw new Error('Failed to create location')
    }

    await fetchData()
  }

  const handleDeleteLocation = async (locationId: string) => {
    const confirmed = await confirm({
      title: 'Delete Location',
      message: 'Are you sure you want to delete this location? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    })

    if (!confirmed) return

    const res = await fetch(`/api/locations/${locationId}`, {
      method: 'DELETE',
    })

    if (!res.ok) throw new Error('Failed to delete location')
    await fetchData()
  }

  // Category handlers
  const handleAddCategory = () => {
    setEditingCategory(null)
    setCategoryModalOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryModalOpen(true)
  }

  const handleSaveCategory = async (categoryData: Partial<Category>) => {
    if (editingCategory) {
      // Update
      const res = await fetch(`/api/categories/${editingCategory.category_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      })

      if (!res.ok) throw new Error('Failed to update category')
    } else {
      // Create
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      })

      if (!res.ok) throw new Error('Failed to create category')
    }

    await fetchData()
  }

  const handleDeleteCategory = async (categoryId: string) => {
    const confirmed = await confirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    })

    if (!confirmed) return

    const res = await fetch(`/api/categories/${categoryId}`, {
      method: 'DELETE',
    })

    if (!res.ok) throw new Error('Failed to delete category')
    await fetchData()
  }

  // Menu Item handlers
  const handleAddMenuItem = () => {
    setEditingMenuItem(null)
    setMenuItemModalOpen(true)
  }

  const handleEditMenuItem = (menuItem: MenuItem) => {
    setEditingMenuItem(menuItem)
    setMenuItemModalOpen(true)
  }

  const handleSaveMenuItem = async (menuItemData: MenuItemFormData) => {
    if (editingMenuItem) {
      // Update
      const res = await fetch(`/api/menu-items/${editingMenuItem.item_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuItemData),
      })

      if (!res.ok) throw new Error('Failed to update menu item')
    } else {
      // Create
      const res = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menuItemData),
      })

      if (!res.ok) throw new Error('Failed to create menu item')
    }

    await fetchData()
  }

  const handleDeleteMenuItem = async (itemId: string) => {
    const confirmed = await confirm({
      title: 'Delete Menu Item',
      message: 'Are you sure you want to delete this menu item? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger',
    })

    if (!confirmed) return

    const res = await fetch(`/api/menu-items/${itemId}`, {
      method: 'DELETE',
    })

    if (!res.ok) throw new Error('Failed to delete menu item')
    await fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{tenant?.business_name}</h1>
          <p className="text-gray-600 mt-1">{tenant?.owner_email}</p>
        </div>

        {/* Locations Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Locations</h2>
            <button
              onClick={handleAddLocation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Add Location
            </button>
          </div>

          <div className="space-y-4">
            {locations.length === 0 ? (
              <p className="text-gray-500">No locations yet</p>
            ) : (
              locations.map(location => (
                <div key={location.location_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                      <p className="text-gray-600">
                        {location.address}, {location.city} {location.postal_code}
                      </p>
                      {location.phone && <p className="text-gray-600">Phone: {location.phone}</p>}
                      <div className="mt-2 flex gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            location.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {location.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {location.accepts_mobile_orders && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Mobile Orders
                          </span>
                        )}
                        {location.accepts_dine_in_orders && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            Dine-in
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditLocation(location)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location.location_id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Categories Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Categories</h2>
            <button
              onClick={handleAddCategory}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.length === 0 ? (
              <p className="text-gray-500 col-span-full">No categories yet</p>
            ) : (
              categories.map(category => (
                <div key={category.category_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        category.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {category.description && (
                    <p className="text-gray-600 text-sm mb-3">{category.description}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.category_id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Menu Items Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Menu Items</h2>
            <button
              onClick={handleAddMenuItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Add Menu Item
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.length === 0 ? (
              <p className="text-gray-500 col-span-full">No menu items yet</p>
            ) : (
              menuItems.map(item => (
                <div
                  key={item.item_id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                      <span className="text-lg font-bold text-blue-600">
                        €{item.price.toFixed(2)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                    )}
                    {item.categories && (
                      <p className="text-gray-500 text-xs mb-2">Category: {item.categories.name}</p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          item.is_available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditMenuItem(item)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMenuItem(item.item_id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onSave={handleSaveLocation}
        location={editingLocation || undefined}
        tenantId={tenantId}
      />

      <CategoryModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        category={editingCategory || undefined}
        tenantId={tenantId}
      />

      <MenuItemModal
        isOpen={menuItemModalOpen}
        onClose={() => setMenuItemModalOpen(false)}
        onSave={handleSaveMenuItem}
        menuItem={editingMenuItem ?? undefined}
        tenantId={tenantId}
        categories={categories}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
      />
    </div>
  )
}
