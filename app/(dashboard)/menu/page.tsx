'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useTenant } from '@/contexts/TenantContext'
import {
  Coffee,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Tag,
  DollarSign,
  Eye,
  EyeOff,
  X,
  Building2,
} from 'lucide-react'

interface Category {
  category_id: string
  tenant_id: string
  name: string
  display_order: number
  is_active: boolean
}

interface MenuItem {
  item_id: string
  tenant_id: string
  category_id: string
  name: string
  description: string
  price: number
  image_url: string | null
  is_active: boolean
  modifiers: any
  tags: string[]
  created_at: string
  categories?: {
    name: string
  }
}

export default function MenuPage() {
  const { selectedTenant } = useTenant()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_active: true,
  })

  useEffect(() => {
    if (selectedTenant) {
      fetchData()
    }
  }, [selectedTenant])

  async function fetchData() {
    if (!selectedTenant) return

    try {
      setLoading(true)

      // Fetch menu items with category names
      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select(
          `
          *,
          categories!inner(name)
        `
        )
        .eq('tenant_id', selectedTenant.tenant_id)
        .order('created_at', { ascending: false })

      if (itemsError) throw itemsError

      // Fetch categories
      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', selectedTenant.tenant_id)
        .order('name')

      if (catsError) throw catsError

      setMenuItems(items || [])
      setCategories(cats || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditingItem(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      is_active: true,
    })
    setShowModal(true)
  }

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id,
      is_active: item.is_active,
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!selectedTenant) return

    try {
      if (!formData.name || !formData.price || !formData.category_id) {
        alert('Please fill in all required fields (Name, Price, Category)')
        return
      }

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: formData.name,
            description: formData.description,
            price: parseFloat(formData.price),
            category_id: formData.category_id,
            is_active: formData.is_active,
          })
          .eq('item_id', editingItem.item_id)
          .eq('tenant_id', selectedTenant.tenant_id)

        if (error) throw error
        alert('Menu item updated successfully!')
      } else {
        // Create new item
        const { error } = await supabase.from('menu_items').insert({
          tenant_id: selectedTenant.tenant_id,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category_id: formData.category_id,
          is_active: formData.is_active,
          modifiers: {},
          tags: [],
        })

        if (error) throw error
        alert('Menu item created successfully!')
      }

      setShowModal(false)
      fetchData()
    } catch (error) {
      console.error('Error saving menu item:', error)
      alert('Failed to save menu item. Please try again.')
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!selectedTenant) return

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('item_id', itemId)
        .eq('tenant_id', selectedTenant.tenant_id)

      if (error) throw error

      alert('Menu item deleted successfully!')
      setDeleteConfirm(null)
      fetchData()
    } catch (error) {
      console.error('Error deleting menu item:', error)
      alert('Failed to delete menu item. Please try again.')
    }
  }

  const toggleAvailability = async (item: MenuItem) => {
    if (!selectedTenant) return

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_active: !item.is_active })
        .eq('item_id', item.item_id)
        .eq('tenant_id', selectedTenant.tenant_id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error toggling availability:', error)
    }
  }

  const filteredItems = menuItems.filter(item => {
    const matchesSearch =
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && item.is_active) ||
      (filterStatus === 'inactive' && !item.is_active)

    return matchesSearch && matchesCategory && matchesStatus
  })

  const stats = {
    total: menuItems.length,
    active: menuItems.filter(i => i.is_active).length,
    categories: categories.length,
    avgPrice:
      menuItems.length > 0
        ? (menuItems.reduce((acc, i) => acc + i.price, 0) / menuItems.length).toFixed(2)
        : '0.00',
  }

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
            Please select a client from the dropdown above to manage their menu items and
            categories.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
            Menu Management
          </h1>
          <p className="text-coffee-600 dark:text-cream-400 mt-1 lg:mt-2 text-sm lg:text-lg">
            Manage {selectedTenant.business_name}'s menu items and categories
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="self-start lg:self-auto flex items-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-gradient-coffee text-cream-100 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
          <span className="text-sm lg:text-base">Add Menu Item</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Total Items
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.total}
              </p>
            </div>
            <Coffee className="w-6 h-6 lg:w-8 lg:h-8 text-coffee-600 dark:text-cream-300" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Active
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.active}
              </p>
            </div>
            <Eye className="w-6 h-6 lg:w-8 lg:h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Categories
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                {stats.categories}
              </p>
            </div>
            <Tag className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs lg:text-sm text-coffee-600 dark:text-cream-400 uppercase tracking-wide">
                Avg. Price
              </p>
              <p className="text-2xl lg:text-3xl font-bold text-coffee-900 dark:text-cream-100 mt-1">
                €{stats.avgPrice}
              </p>
            </div>
            <DollarSign className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-6 shadow-lg border border-coffee-200/50 dark:border-dark-700 mb-6 lg:mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-coffee-400 dark:text-cream-500" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 placeholder:text-coffee-400 dark:placeholder:text-cream-500 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-coffee-600 dark:text-cream-300" />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Menu Items Grid */}
      {loading ? (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-12 shadow-lg border border-coffee-200/50 dark:border-dark-700 text-center">
          <div className="inline-block w-8 h-8 border-4 border-coffee-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-coffee-600 dark:text-cream-400 mt-4">Loading menu items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-12 shadow-lg border border-coffee-200/50 dark:border-dark-700 text-center">
          <Coffee className="w-12 h-12 text-coffee-300 dark:text-dark-600 mx-auto mb-4" />
          <p className="text-coffee-600 dark:text-cream-400">No menu items found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {filteredItems.map(item => (
            <div
              key={item.item_id}
              className={`group bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-4 lg:p-5 shadow-lg border border-coffee-200/50 dark:border-dark-700 hover:shadow-xl hover:scale-105 transition-all duration-300 ${
                !item.is_active && 'opacity-60'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base lg:text-lg text-coffee-900 dark:text-cream-100 truncate">
                    {item.name}
                  </h3>
                  <p className="text-xs text-coffee-500 dark:text-cream-500 mt-0.5">
                    {item.categories?.name || 'Uncategorized'}
                  </p>
                </div>

                <button onClick={() => toggleAvailability(item)} className="ml-2 flex-shrink-0">
                  {item.is_active ? (
                    <Eye className="w-5 h-5 text-green-600" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Description */}
              <p className="text-sm text-coffee-600 dark:text-cream-400 mb-4 line-clamp-2 min-h-[40px]">
                {item.description || 'No description available'}
              </p>

              {/* Price */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold text-coffee-900 dark:text-cream-100 font-mono">
                  €{item.price.toFixed(2)}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    item.is_active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700/30 text-gray-700 dark:text-gray-400'
                  }`}
                >
                  {item.is_active ? 'Available' : 'Unavailable'}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(item)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all text-sm font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(item.item_id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === item.item_id && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-sm text-red-900 dark:text-red-300 font-semibold mb-2">
                    Delete this item?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(item.item_id)}
                      className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-all"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 px-3 py-1.5 bg-gray-200 dark:bg-dark-700 text-coffee-900 dark:text-cream-100 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-dark-600 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto border border-coffee-200/50 dark:border-dark-700">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-dark-800 rounded-t-2xl p-6 border-b border-coffee-200/50 dark:border-dark-700 flex items-center justify-between z-10">
              <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-coffee-700 to-mocha bg-clip-text text-transparent">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-coffee-100 dark:hover:bg-dark-700 transition-all"
              >
                <X className="w-5 h-5 text-coffee-600 dark:text-cream-300" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Cappuccino"
                  className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe your menu item..."
                  className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                    Price (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    placeholder="4.50"
                    className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-cream-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-coffee-200 dark:border-dark-600 bg-white dark:bg-dark-900 text-coffee-900 dark:text-cream-100 focus:outline-none focus:ring-2 focus:ring-coffee-500 dark:focus:ring-coffee-600"
                  >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                      <option key={cat.category_id} value={cat.category_id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-coffee-300 text-coffee-600 focus:ring-coffee-500"
                />
                <label htmlFor="isActive" className="text-sm text-coffee-700 dark:text-cream-300">
                  Available for order
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-dark-800 rounded-b-2xl p-6 border-t border-coffee-200/50 dark:border-dark-700 flex justify-end gap-3 z-10">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 rounded-xl text-coffee-700 dark:text-cream-300 hover:bg-coffee-100 dark:hover:bg-dark-700 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-gradient-coffee text-cream-100 rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-105 transition-all"
              >
                {editingItem ? 'Update Item' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
