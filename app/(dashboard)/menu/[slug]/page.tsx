'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface Category {
  category_id: string
  name: string
  display_order: number
  is_active: boolean
}

interface MenuItem {
  item_id: string
  category_id: string
  name: string
  description: string
  price: number
  image_url: string | null
  is_active: boolean
  modifiers: any
  tags: string[]
}

interface Cafe {
  tenant_id: string
  slug: string
  business_name: string
}

export default function MenuManagementPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [cafe, setCafe] = useState<Cafe | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  // Form states
  const [categoryName, setCategoryName] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemCategory, setItemCategory] = useState('')
  const [itemActive, setItemActive] = useState(true)

  useEffect(() => {
    if (slug) {
      fetchCafe()
      fetchCategories()
      fetchMenuItems()
    }
  }, [slug])

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0].category_id)
    }
  }, [categories])

  const fetchCafe = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('tenants')
        .select('tenant_id, slug, business_name')
        .eq('slug', slug)
        .single()

      if (error) throw error
      setCafe(data)
    } catch (error) {
      console.error('Error fetching cafe:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      if (!slug) return

      const supabase = createClient()

      // Get tenant_id first
      const { data: tenant } = await supabase
        .from('tenants')
        .select('tenant_id')
        .eq('slug', slug)
        .single()

      if (!tenant) return

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .order('display_order')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMenuItems = async () => {
    try {
      if (!slug) return

      const supabase = createClient()

      const { data: tenant } = await supabase
        .from('tenants')
        .select('tenant_id')
        .eq('slug', slug)
        .single()

      if (!tenant) return

      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('tenant_id', tenant.tenant_id)
        .order('name')

      if (error) throw error
      setMenuItems(data || [])
    } catch (error) {
      console.error('Error fetching menu items:', error)
    }
  }

  const createCategory = async () => {
    try {
      if (!cafe || !categoryName) return

      const supabase = createClient()

      const { error } = await supabase.from('categories').insert({
        tenant_id: cafe.tenant_id,
        name: categoryName,
        display_order: categories.length,
        is_active: true,
      })

      if (error) throw error

      setCategoryName('')
      setShowCategoryModal(false)
      fetchCategories()
      toast.success('Category created successfully!')
    } catch (error) {
      console.error('Error creating category:', error)
      toast.error('Failed to create category')
    }
  }

  const updateCategory = async () => {
    try {
      if (!editingCategory || !categoryName) return

      const supabase = createClient()

      const { error } = await supabase
        .from('categories')
        .update({ name: categoryName })
        .eq('category_id', editingCategory.category_id)

      if (error) throw error

      setCategoryName('')
      setEditingCategory(null)
      setShowCategoryModal(false)
      fetchCategories()
      toast.success('Category updated successfully!')
    } catch (error) {
      console.error('Error updating category:', error)
      toast.error('Failed to update category')
    }
  }

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const supabase = createClient()

      const { error } = await supabase.from('categories').delete().eq('category_id', categoryId)

      if (error) throw error
      fetchCategories()
      toast.success('Category deleted successfully!')
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Failed to delete category')
    }
  }

  const createMenuItem = async () => {
    try {
      if (!cafe || !itemName || !itemPrice || !itemCategory) {
        toast.error('Please fill in all required fields')
        return
      }

      const supabase = createClient()

      const { error } = await supabase.from('menu_items').insert({
        tenant_id: cafe.tenant_id,
        category_id: itemCategory,
        name: itemName,
        description: itemDescription,
        price: parseFloat(itemPrice),
        is_active: itemActive,
        modifiers: {},
        tags: [],
      })

      if (error) throw error

      resetItemForm()
      setShowItemModal(false)
      fetchMenuItems()
      toast.success('Menu item created successfully!')
    } catch (error) {
      console.error('Error creating menu item:', error)
      toast.error('Failed to create menu item')
    }
  }

  const updateMenuItem = async () => {
    try {
      if (!editingItem || !itemName || !itemPrice) return

      const supabase = createClient()

      const { error } = await supabase
        .from('menu_items')
        .update({
          name: itemName,
          description: itemDescription,
          price: parseFloat(itemPrice),
          category_id: itemCategory,
          is_active: itemActive,
        })
        .eq('item_id', editingItem.item_id)

      if (error) throw error

      resetItemForm()
      setEditingItem(null)
      setShowItemModal(false)
      fetchMenuItems()
      toast.success('Menu item updated successfully!')
    } catch (error) {
      console.error('Error updating menu item:', error)
      toast.error('Failed to update menu item')
    }
  }

  const toggleItemAvailability = async (item: MenuItem) => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('menu_items')
        .update({ is_active: !item.is_active })
        .eq('item_id', item.item_id)

      if (error) throw error
      fetchMenuItems()
    } catch (error) {
      console.error('Error toggling item:', error)
    }
  }

  const deleteMenuItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const supabase = createClient()

      const { error } = await supabase.from('menu_items').delete().eq('item_id', itemId)

      if (error) throw error
      fetchMenuItems()
      toast.success('Menu item deleted successfully!')
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  const resetItemForm = () => {
    setItemName('')
    setItemDescription('')
    setItemPrice('')
    setItemCategory('')
    setItemActive(true)
  }

  const openEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setShowCategoryModal(true)
  }

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setItemName(item.name)
    setItemDescription(item.description)
    setItemPrice(item.price.toString())
    setItemCategory(item.category_id)
    setItemActive(item.is_active)
    setShowItemModal(true)
  }

  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.category_id === selectedCategory)
    : menuItems

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">☕</div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    )
  }

  if (!cafe) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Café not found</h2>
        <Link href="/cafes" className="text-primary hover:underline mt-4 inline-block">
          Back to Cafés
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/cafes/${cafe.slug}`}
          className="inline-flex items-center text-gray-600 hover:text-primary mb-4"
        >
          ← Back to {cafe.business_name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
            <p className="text-gray-600 mt-2 font-serif italic">{cafe.business_name}</p>
          </div>
          <button
            onClick={() => {
              resetItemForm()
              setEditingItem(null)
              setItemCategory(selectedCategory || '')
              setShowItemModal(true)
            }}
            className="bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all hover:shadow-xl flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add Menu Item
          </button>
        </div>
      </div>

      {/* Two-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Categories */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Categories</h2>
              <button
                onClick={() => {
                  setCategoryName('')
                  setEditingCategory(null)
                  setShowCategoryModal(true)
                }}
                className="text-primary hover:text-primary-dark"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No categories yet</p>
              ) : (
                categories.map(category => (
                  <div
                    key={category.category_id}
                    className={`p-3 rounded-xl cursor-pointer transition-all group ${
                      selectedCategory === category.category_id
                        ? 'bg-primary text-white [&::selection]:bg-white/30 [&::selection]:text-white [&_*::selection]:bg-white/30 [&_*::selection]:text-white'
                        : 'bg-surface-alt hover:bg-gray-200 text-gray-900'
                    }`}
                    onClick={() => setSelectedCategory(category.category_id)}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-medium ${selectedCategory === category.category_id ? 'text-white' : 'text-gray-900'}`}
                      >
                        {category.name}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            openEditCategory(category)
                          }}
                          className={`p-1 rounded ${
                            selectedCategory === category.category_id
                              ? 'hover:bg-white/20'
                              : 'hover:bg-white'
                          }`}
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            deleteCategory(category.category_id)
                          }}
                          className={`p-1 rounded ${
                            selectedCategory === category.category_id
                              ? 'hover:bg-white/20'
                              : 'hover:bg-white'
                          }`}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        selectedCategory === category.category_id
                          ? 'text-white/80'
                          : 'text-gray-500'
                      }`}
                    >
                      {menuItems.filter(item => item.category_id === category.category_id).length}{' '}
                      items
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Menu Items */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">
              {selectedCategory
                ? categories.find(c => c.category_id === selectedCategory)?.name
                : 'All Items'}
            </h2>

            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍽️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No menu items yet</h3>
                <p className="text-gray-600 mb-6">Add your first menu item to get started</p>
                <button
                  onClick={() => {
                    resetItemForm()
                    setEditingItem(null)
                    setItemCategory(selectedCategory || '')
                    setShowItemModal(true)
                  }}
                  className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-6 rounded-xl"
                >
                  Add Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map(item => (
                  <div
                    key={item.item_id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      item.is_active
                        ? 'border-gray-200 hover:border-primary hover:shadow-md'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {item.description || 'No description'}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => openEditItem(item)}
                          className="p-2 rounded-lg hover:bg-gray-100"
                        >
                          <PencilIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item.item_id)}
                          className="p-2 rounded-lg hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <p className="text-lg font-bold text-primary font-mono">
                        €{item.price.toFixed(2)}
                      </p>
                      <button
                        onClick={() => toggleItemAvailability(item)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          item.is_active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {item.is_active ? 'Available' : 'Unavailable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Name *
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={e => setCategoryName(e.target.value)}
                placeholder="e.g., Espresso Drinks"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCategoryModal(false)
                  setEditingCategory(null)
                  setCategoryName('')
                }}
                className="px-6 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={editingCategory ? updateCategory : createCategory}
                className="bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-xl transition-all"
              >
                {editingCategory ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  placeholder="e.g., Cappuccino"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={itemDescription}
                  onChange={e => setItemDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your item..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemPrice}
                    onChange={e => setItemPrice(e.target.value)}
                    placeholder="4.50"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    value={itemCategory}
                    onChange={e => setItemCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  >
                    <option value="">Choose category...</option>
                    {categories.map(category => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="itemActive"
                  checked={itemActive}
                  onChange={e => setItemActive(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="itemActive" className="text-sm font-medium text-gray-700">
                  Available for order
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowItemModal(false)
                  setEditingItem(null)
                  resetItemForm()
                }}
                className="px-6 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? updateMenuItem : createMenuItem}
                className="bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-3 rounded-xl transition-all"
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
