'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTenant } from '@/contexts/TenantContext'
import { toast } from 'sonner'
import { useMenu } from '@/hooks/useMenuQueries'
import { useQueryClient } from '@tanstack/react-query'
import {
  Coffee,
  Search,
  Plus,
  Edit2,
  Trash2,
  Tag,
  Eye,
  EyeOff,
  X,
  Building2,
  Check,
  Image as ImageIcon,
  Save,
  ExternalLink,
} from 'lucide-react'
import type { MenuItem, Category } from '@/hooks/useMenuQueries'

export default function MenuPage() {
  const { selectedTenant } = useTenant()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showCategorySection, setShowCategorySection] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [addingNewItem, setAddingNewItem] = useState(false)
  const [addingNewCategory, setAddingNewCategory] = useState(false)
  const supabase = createClient()

  // Fetch menu data with React Query caching
  const { categories, menuItems, isLoading } = useMenu(selectedTenant?.tenant_id, {
    activeOnly: false, // Admin needs to see all items
  })

  // Refetch when tenant changes
  useEffect(() => {
    if (selectedTenant) {
      // Invalidate all queries for this tenant by using partial key matching
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['menuItems'] })
    }
  }, [selectedTenant?.tenant_id, queryClient])

  // Refetch data after mutations
  const refetchData = async () => {
    // Invalidate all queries to ensure fresh data
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['menuItems'] }),
    ])
  }

  // NEW ITEM STATE
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_active: true,
  })

  // NEW CATEGORY STATE
  const [newCategory, setNewCategory] = useState({
    name: '',
    image_url: '',
  })

  // EDITING STATES
  const [editItem, setEditItem] = useState<Partial<MenuItem>>({})
  const [editCategory, setEditCategory] = useState<Partial<Category>>({})

  const handleAddItem = async () => {
    if (!selectedTenant) return
    if (!newItem.name || !newItem.price || !newItem.category_id) {
      toast.error('Please fill in Name, Price, and Category')
      return
    }

    try {
      const { error } = await supabase.from('menu_items').insert({
        tenant_id: selectedTenant.tenant_id,
        name: newItem.name,
        description: newItem.description,
        price: parseFloat(newItem.price),
        category_id: newItem.category_id,
        is_active: newItem.is_active,
        modifiers: {},
        tags: [],
      })

      if (error) {
        console.error('Menu item creation error:', error)
        throw error
      }

      toast.success('Menu item created!')
      setNewItem({
        name: '',
        description: '',
        price: '',
        category_id: newItem.category_id,
        is_active: true,
      })
      refetchData()
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (error?.code) {
        toast.error(`Database error (${error.code}): ${error.message || errorMessage}`)
      } else {
        toast.error(`Failed to save: ${errorMessage}`)
      }
    }
  }

  const handleSaveItem = async (itemId: string) => {
    if (!selectedTenant) return

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: editItem.name,
          description: editItem.description,
          price: editItem.price,
          category_id: editItem.category_id,
          is_active: editItem.is_active,
        })
        .eq('item_id', itemId)
        .eq('tenant_id', selectedTenant.tenant_id)

      if (error) throw error

      toast.success('Updated!')
      setEditingItemId(null)
      setEditItem({})
      refetchData()
    } catch (error) {
      toast.error('Failed to update item')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!selectedTenant || !confirm('Delete this item?')) return

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('item_id', itemId)
        .eq('tenant_id', selectedTenant.tenant_id)

      if (error) throw error
      toast.success('Item deleted!')
      refetchData()
    } catch (error) {
      toast.error('Failed to delete item')
    }
  }

  const handleToggleActive = async (item: MenuItem) => {
    if (!selectedTenant) return

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_active: !item.is_active })
        .eq('item_id', item.item_id)
        .eq('tenant_id', selectedTenant.tenant_id)

      if (error) throw error
      refetchData()
    } catch (error) {
      toast.error('Failed to toggle status')
    }
  }

  const handleAddCategory = async () => {
    if (!selectedTenant || !newCategory.name) {
      toast.error('Category name is required')
      return
    }

    try {
      const { error } = await supabase.from('categories').insert({
        tenant_id: selectedTenant.tenant_id,
        name: newCategory.name,
        image_url: newCategory.image_url || null,
        display_order: 0,
      })

      if (error) throw error

      toast.success('Category created!')
      setNewCategory({ name: '', image_url: '' })
      refetchData()
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      if (error?.code) {
        toast.error(`Database error (${error.code}): ${error.message || errorMessage}`)
      } else {
        toast.error(`Failed to save category: ${errorMessage}`)
      }
    }
  }

  const handleSaveCategory = async (categoryId: string) => {
    if (!selectedTenant) return

    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: editCategory.name,
          image_url: editCategory.image_url || null,
        })
        .eq('category_id', categoryId)
        .eq('tenant_id', selectedTenant.tenant_id)

      if (error) throw error

      toast.success('Category updated!')
      setEditingCategoryId(null)
      setEditCategory({})
      refetchData()
    } catch (error) {
      toast.error('Failed to update category')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!selectedTenant || !confirm('Delete this category? Menu items will need reassignment.'))
      return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('category_id', categoryId)
        .eq('tenant_id', selectedTenant.tenant_id)

      if (error) throw error
      toast.success('Category deleted!')
      refetchData()
    } catch (error) {
      toast.error('Failed to delete category')
    }
  }

  const startEditingItem = (item: MenuItem) => {
    setEditingItemId(item.item_id)
    setEditItem({
      name: item.name,
      description: item.description,
      price: item.price,
      category_id: item.category_id,
      is_active: item.is_active,
    })
  }

  const startEditingCategory = (category: Category) => {
    setEditingCategoryId(category.category_id)
    setEditCategory({
      name: category.name,
      image_url: category.image_url || '',
    })
  }

  const filteredItems = (menuItems.data || []).filter(item => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory

    return matchesSearch && matchesCategory
  })

  // No tenant selected state
  if (!selectedTenant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-coffee flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Building2 className="w-10 h-10 lg:w-12 lg:h-12 text-cream-100" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mb-3">
            Select a Coffee Shop Client
          </h2>
          <p className="text-coffee-600 dark:text-cream-400 mb-6">
            Please select a client from the dropdown above to manage their menu.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
            Menu Management
          </h1>
          <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
            Manage {selectedTenant.business_name}'s menu
          </p>
        </div>
        <a
          href={`/shop/${selectedTenant.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-coffee text-cream-100 rounded-xl font-semibold hover:shadow-lg transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="hidden lg:inline">View Shop</span>
        </a>
      </div>

      {/* Search Bar with Buttons */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500"
            />
          </div>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500"
          >
            <option value="all">All Categories</option>
            {(categories.data || []).map(cat => (
              <option key={cat.category_id} value={cat.category_id}>
                {cat.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowCategorySection(!showCategorySection)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-dark-800 text-coffee-700 dark:text-cream-300 border-2 border-coffee-300 dark:border-dark-600 rounded-xl font-semibold hover:bg-coffee-50 dark:hover:bg-dark-700 transition-all"
          >
            <Tag className="w-4 h-4" />
            <span>Manage Categories</span>
          </button>

          <button
            onClick={() => setAddingNewItem(!addingNewItem)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-coffee text-cream-100 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* CATEGORY MANAGEMENT SECTION */}
      {showCategorySection && (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-coffee-900 dark:text-cream-100">Categories</h3>
            <button
              onClick={() => setAddingNewCategory(!addingNewCategory)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-coffee text-cream-100 rounded-lg text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          {/* Add New Category Row */}
          {addingNewCategory && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl mb-3 border-2 border-green-200 dark:border-green-700">
              <input
                type="text"
                placeholder="Category name..."
                value={newCategory.name}
                onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                className="lg:col-span-4 px-3 py-2 rounded-lg border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500"
              />
              <input
                type="url"
                placeholder="Image URL (optional)..."
                value={newCategory.image_url}
                onChange={e => setNewCategory({ ...newCategory, image_url: e.target.value })}
                className="lg:col-span-6 px-3 py-2 rounded-lg border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500"
              />
              <div className="lg:col-span-2 flex gap-2">
                <button
                  onClick={handleAddCategory}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                >
                  <Check className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => {
                    setAddingNewCategory(false)
                    setNewCategory({ name: '', image_url: '' })
                  }}
                  className="px-3 py-2 bg-gray-200 dark:bg-dark-700 text-coffee-900 dark:text-cream-100 rounded-lg hover:bg-gray-300 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Category List */}
          <div className="space-y-2">
            {(categories.data || []).map(category => {
              const isEditing = editingCategoryId === category.category_id

              return (
                <div
                  key={category.category_id}
                  className={`grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 rounded-xl border transition-all ${
                    isEditing
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                      : 'bg-white dark:bg-dark-900 border-coffee-200/50 dark:border-dark-700'
                  }`}
                >
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editCategory.name}
                        onChange={e => setEditCategory({ ...editCategory, name: e.target.value })}
                        className="lg:col-span-4 px-3 py-2 rounded-lg border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-coffee-500"
                      />
                      <input
                        type="url"
                        value={editCategory.image_url || ''}
                        onChange={e =>
                          setEditCategory({ ...editCategory, image_url: e.target.value })
                        }
                        placeholder="Image URL..."
                        className="lg:col-span-6 px-3 py-2 rounded-lg border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-coffee-500"
                      />
                      <div className="lg:col-span-2 flex gap-2">
                        <button
                          onClick={() => handleSaveCategory(category.category_id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCategoryId(null)
                            setEditCategory({})
                          }}
                          className="px-3 py-2 bg-gray-200 dark:bg-dark-700 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="lg:col-span-10 flex items-center gap-3">
                        {category.image_url ? (
                          <img
                            src={category.image_url}
                            alt={category.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-coffee-100 dark:bg-dark-700 flex items-center justify-center">
                            <Tag className="w-5 h-5 text-coffee-600 dark:text-cream-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-coffee-900 dark:text-cream-100">
                            {category.name}
                          </p>
                          <p className="text-xs text-coffee-500 dark:text-cream-500">
                            {category.image_url ? 'Has image' : 'No image'}
                          </p>
                        </div>
                      </div>
                      <div className="lg:col-span-2 flex gap-2 justify-end">
                        <button
                          onClick={() => startEditingCategory(category)}
                          className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.category_id)}
                          className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ADD NEW ITEM ROW */}
      {addingNewItem && (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg border-2 border-green-500 dark:border-green-600 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-coffee-900 dark:text-cream-100">
              Add New Menu Item
            </h3>
            <button
              onClick={() => setAddingNewItem(false)}
              className="p-1 hover:bg-coffee-100 dark:hover:bg-dark-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <input
              type="text"
              placeholder="Item name..."
              value={newItem.name}
              onChange={e => setNewItem({ ...newItem, name: e.target.value })}
              className="lg:col-span-3 px-3 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-coffee-500"
            />
            <input
              type="text"
              placeholder="Description..."
              value={newItem.description}
              onChange={e => setNewItem({ ...newItem, description: e.target.value })}
              className="lg:col-span-4 px-3 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-coffee-500"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Price..."
              value={newItem.price}
              onChange={e => setNewItem({ ...newItem, price: e.target.value })}
              className="lg:col-span-2 px-3 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-coffee-500"
            />
            <select
              value={newItem.category_id}
              onChange={e => setNewItem({ ...newItem, category_id: e.target.value })}
              className="lg:col-span-2 px-3 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-coffee-500"
            >
              <option value="">Category...</option>
              {(categories.data || []).map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddItem}
              className="lg:col-span-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all"
            >
              <Check className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>
      )}

      {/* MENU ITEMS LIST */}
      {isLoading ? (
        <div className="bg-white/80 dark:bg-dark-800/80 rounded-2xl p-12 text-center">
          <div className="inline-block w-8 h-8 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-coffee-600 dark:text-cream-400 mt-4">Loading menu...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white/80 dark:bg-dark-800/80 rounded-2xl p-12 text-center">
          <Coffee className="w-12 h-12 text-coffee-300 mx-auto mb-4" />
          <p className="text-coffee-600 dark:text-cream-400">
            {addingNewItem
              ? 'Fill in the form above to add your first item!'
              : 'No menu items found'}
          </p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-coffee-200/50 dark:border-dark-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-coffee-100 dark:bg-dark-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase hidden lg:table-cell">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-coffee-700 dark:text-cream-300 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-200/50 dark:divide-dark-700">
                {filteredItems.map(item => {
                  const isEditing = editingItemId === item.item_id

                  return (
                    <tr
                      key={item.item_id}
                      className={`hover:bg-coffee-50 dark:hover:bg-dark-800 transition-colors ${
                        isEditing ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editItem.name}
                            onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                            className="w-full px-2 py-1 rounded border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-coffee-500"
                          />
                        ) : (
                          <div>
                            <p className="font-semibold text-coffee-900 dark:text-cream-100">
                              {item.name}
                            </p>
                            <p className="text-xs text-coffee-500 dark:text-cream-500 lg:hidden">
                              {item.description || 'No description'}
                            </p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editItem.description || ''}
                            onChange={e =>
                              setEditItem({ ...editItem, description: e.target.value })
                            }
                            className="w-full px-2 py-1 rounded border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-coffee-500"
                          />
                        ) : (
                          <p className="text-sm text-coffee-600 dark:text-cream-400">
                            {item.description || '-'}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editItem.price}
                            onChange={e =>
                              setEditItem({ ...editItem, price: parseFloat(e.target.value) })
                            }
                            className="w-20 px-2 py-1 rounded border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-coffee-500"
                          />
                        ) : (
                          <p className="font-semibold text-coffee-900 dark:text-cream-100">
                            €{item.price.toFixed(2)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select
                            value={editItem.category_id}
                            onChange={e =>
                              setEditItem({ ...editItem, category_id: e.target.value })
                            }
                            className="w-full px-2 py-1 rounded border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 focus:outline-none focus:ring-2 focus:ring-coffee-500"
                          >
                            {(categories.data || []).map(cat => (
                              <option key={cat.category_id} value={cat.category_id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2 py-1 bg-coffee-100 dark:bg-dark-700 text-coffee-700 dark:text-cream-300 rounded-full text-xs font-semibold">
                            {item.categories?.name || 'Uncategorized'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            item.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200'
                              : 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {item.is_active ? (
                            <>
                              <Eye className="w-3 h-3 inline mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 inline mr-1" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveItem(item.item_id)}
                                className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingItemId(null)
                                  setEditItem({})
                                }}
                                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditingItem(item)}
                                className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.item_id)}
                                className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
