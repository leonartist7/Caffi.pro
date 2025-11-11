'use client'

import { useEffect, useState } from 'react'
import { useStaffAuth } from '@/contexts/StaffAuthContext'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import {
  Package,
  Plus,
  Edit,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react'
import { SkeletonCard, SkeletonList } from '@/components/SkeletonLoader'

interface InventoryItem {
  inventory_item_id: string
  name: string
  description?: string
  category: string
  sku?: string
  current_stock: number
  unit: string
  min_stock_level: number
  max_stock_level?: number
  unit_cost?: number
  is_active: boolean
  last_restocked_at?: string
}

interface Transaction {
  transaction_id: string
  transaction_type: string
  quantity: number
  unit: string
  notes?: string
  created_at: string
  staff: {
    full_name: string
  }
  item: {
    name: string
  }
}

const CATEGORIES = ['coffee_beans', 'milk', 'syrups', 'cups', 'food', 'supplies', 'other']

export default function InventoryPage() {
  const { staffUser } = useStaffAuth()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [transactionModalOpen, setTransactionModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other',
    sku: '',
    current_stock: 0,
    unit: 'units',
    min_stock_level: 0,
    max_stock_level: 0,
    unit_cost: 0,
  })

  const [transactionData, setTransactionData] = useState({
    transaction_type: 'restock',
    quantity: 0,
    notes: '',
  })

  const supabase = createClient()

  const fetchItems = async () => {
    if (!staffUser) return

    try {
      let query = supabase
        .from('inventory_items')
        .select('*')
        .eq('tenant_id', staffUser.tenant_id)
        .order('name')

      if (staffUser.assigned_location_id) {
        query = query.eq('location_id', staffUser.assigned_location_id)
      }

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory)
      }

      const { data, error } = await query

      if (error) throw error

      let filteredData = data || []

      if (showLowStockOnly) {
        filteredData = filteredData.filter(item => item.current_stock <= item.min_stock_level)
      }

      setItems(filteredData)
    } catch (error) {
      console.error('Error fetching inventory:', error)
    }
  }

  const fetchTransactions = async () => {
    if (!staffUser) return

    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(
          `
          *,
          staff:staff_id (
            full_name
          ),
          item:inventory_item_id (
            name
          )
        `
        )
        .eq('tenant_id', staffUser.tenant_id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchItems(), fetchTransactions()])
      setLoading(false)
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffUser, filterCategory, showLowStockOnly])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error('Item name is required')
      return
    }

    // Validate numeric fields
    if (formData.current_stock < 0) {
      toast.error('Current stock cannot be negative')
      return
    }

    if (formData.min_stock_level < 0) {
      toast.error('Minimum stock level cannot be negative')
      return
    }

    if (formData.unit_cost && formData.unit_cost < 0) {
      toast.error('Unit cost cannot be negative')
      return
    }

    try {
      const payload = {
        ...formData,
        tenant_id: staffUser!.tenant_id,
        location_id: staffUser!.assigned_location_id || null,
      }

      if (editingItem) {
        const { error } = await supabase
          .from('inventory_items')
          .update(payload)
          .eq('inventory_item_id', editingItem.inventory_item_id)

        if (error) throw error
        toast.success('Item updated successfully!')
      } else {
        const { error } = await supabase.from('inventory_items').insert(payload)

        if (error) throw error
        toast.success('Item added successfully!')
      }

      await fetchItems()
      setModalOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving item:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to save item: ${message}`)
    }
  }

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedItem) return

    // Validate quantity
    if (transactionData.quantity <= 0) {
      toast.error('Quantity must be greater than zero')
      return
    }

    try {
      // Determine quantity sign based on transaction type
      let quantity = parseFloat(transactionData.quantity.toString())
      if (['usage', 'waste'].includes(transactionData.transaction_type)) {
        quantity = -Math.abs(quantity)
      }

      // Prevent negative stock
      const newStock = selectedItem.current_stock + quantity
      if (newStock < 0) {
        toast.error(
          `Cannot process transaction: would result in negative stock (${newStock.toFixed(2)} ${selectedItem.unit})`
        )
        return
      }

      // Create transaction
      const { error: transError } = await supabase.from('inventory_transactions').insert({
        tenant_id: staffUser!.tenant_id,
        inventory_item_id: selectedItem.inventory_item_id,
        staff_id: staffUser!.staff_id,
        transaction_type: transactionData.transaction_type,
        quantity,
        unit: selectedItem.unit,
        notes: transactionData.notes,
      })

      if (transError) throw transError

      // Update inventory stock level (newStock already calculated above)
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          current_stock: newStock,
          ...(transactionData.transaction_type === 'restock'
            ? { last_restocked_at: new Date().toISOString() }
            : {}),
        })
        .eq('inventory_item_id', selectedItem.inventory_item_id)

      if (updateError) throw updateError

      await Promise.all([fetchItems(), fetchTransactions()])
      setTransactionModalOpen(false)
      setSelectedItem(null)
      resetTransactionForm()
      toast.success('Stock updated successfully!')
    } catch (error) {
      console.error('Error recording transaction:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to update stock: ${message}`)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'other',
      sku: '',
      current_stock: 0,
      unit: 'units',
      min_stock_level: 0,
      max_stock_level: 0,
      unit_cost: 0,
    })
    setEditingItem(null)
  }

  const resetTransactionForm = () => {
    setTransactionData({
      transaction_type: 'restock',
      quantity: 0,
      notes: '',
    })
  }

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      sku: item.sku || '',
      current_stock: item.current_stock,
      unit: item.unit,
      min_stock_level: item.min_stock_level,
      max_stock_level: item.max_stock_level || 0,
      unit_cost: item.unit_cost || 0,
    })
    setModalOpen(true)
  }

  const openTransactionModal = (item: InventoryItem) => {
    setSelectedItem(item)
    resetTransactionForm()
    setTransactionModalOpen(true)
  }

  const lowStockCount = items.filter(item => item.current_stock <= item.min_stock_level).length

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-dark-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonList items={5} />
      </div>
    )
  }

  // Check permissions
  if (!staffUser?.can_manage_inventory) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to manage inventory.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track and manage your stock levels</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setModalOpen(true)
          }}
          className="bg-coffee-700 hover:bg-coffee-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Alerts */}
      {lowStockCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900">Low Stock Alert</h3>
            <p className="text-sm text-yellow-700 mt-1">
              {lowStockCount} item{lowStockCount !== 1 ? 's are' : ' is'} running low on stock.{' '}
              <button
                onClick={() => setShowLowStockOnly(true)}
                className="underline hover:text-yellow-900"
              >
                View now
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`px-4 py-2 rounded-lg border ${
            showLowStockOnly
              ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
              : 'bg-white border-gray-300 text-gray-700'
          }`}
        >
          Low Stock Only
        </button>

        <button
          onClick={() => {
            fetchItems()
            fetchTransactions()
          }}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => {
          const isLowStock = item.current_stock <= item.min_stock_level
          const stockPercentage = item.max_stock_level
            ? (item.current_stock / item.max_stock_level) * 100
            : 0

          return (
            <div
              key={item.inventory_item_id}
              className={`bg-white rounded-lg shadow border-2 p-4 ${
                isLowStock ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{item.name}</h3>
                  <p className="text-xs text-gray-500 capitalize">
                    {item.category.replace('_', ' ')}
                  </p>
                  {item.sku && <p className="text-xs text-gray-400 mt-1">SKU: {item.sku}</p>}
                </div>
                <button
                  onClick={() => openEditModal(item)}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-sm text-gray-600">Current Stock</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {item.current_stock}{' '}
                      <span className="text-sm text-gray-500">{item.unit}</span>
                    </span>
                  </div>
                  {item.max_stock_level && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          isLowStock ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-sm text-gray-600">
                  <span>Min Level:</span>
                  <span className="font-medium">
                    {item.min_stock_level} {item.unit}
                  </span>
                </div>

                {item.max_stock_level && item.max_stock_level > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Max Level:</span>
                    <span className="font-medium">
                      {item.max_stock_level} {item.unit}
                    </span>
                  </div>
                )}

                <button
                  onClick={() => openTransactionModal(item)}
                  className="w-full mt-3 bg-coffee-700 hover:bg-coffee-800 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Update Stock
                </button>
              </div>
            </div>
          )
        })}

        {items.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No inventory items found</p>
            <button
              onClick={() => {
                resetForm()
                setModalOpen(true)
              }}
              className="text-coffee-700 hover:underline mt-2"
            >
              Add your first item
            </button>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Transactions</h2>
        <div className="space-y-3">
          {transactions.slice(0, 10).map(tx => (
            <div
              key={tx.transaction_id}
              className="flex items-center justify-between py-2 border-b border-gray-100"
            >
              <div className="flex items-center space-x-3">
                {tx.quantity > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{tx.item?.name}</p>
                  <p className="text-sm text-gray-600">
                    {tx.transaction_type.replace('_', ' ')} by {tx.staff?.full_name}
                  </p>
                  {tx.notes && <p className="text-xs text-gray-500 mt-1">{tx.notes}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.quantity > 0 ? '+' : ''}
                  {tx.quantity} {tx.unit}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(tx.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <p className="text-center text-gray-500 py-8">No transactions yet</p>
          )}
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stock *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.current_stock}
                    onChange={e =>
                      setFormData({ ...formData, current_stock: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  >
                    <option value="units">Units</option>
                    <option value="kg">Kilograms</option>
                    <option value="g">Grams</option>
                    <option value="liters">Liters</option>
                    <option value="ml">Milliliters</option>
                    <option value="bags">Bags</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stock Level *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.min_stock_level}
                    onChange={e =>
                      setFormData({ ...formData, min_stock_level: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Stock Level
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.max_stock_level}
                    onChange={e =>
                      setFormData({ ...formData, max_stock_level: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={e =>
                      setFormData({ ...formData, unit_cost: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {transactionModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Update Stock: {selectedItem.name}
            </h2>

            <form onSubmit={handleTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Type *
                </label>
                <select
                  value={transactionData.transaction_type}
                  onChange={e =>
                    setTransactionData({ ...transactionData, transaction_type: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                >
                  <option value="restock">Restock (Add)</option>
                  <option value="usage">Usage (Remove)</option>
                  <option value="waste">Waste (Remove)</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity ({selectedItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={transactionData.quantity}
                  onChange={e =>
                    setTransactionData({ ...transactionData, quantity: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current stock: {selectedItem.current_stock} {selectedItem.unit}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={transactionData.notes}
                  onChange={e => setTransactionData({ ...transactionData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  rows={2}
                  placeholder="Optional notes about this transaction"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setTransactionModalOpen(false)
                    setSelectedItem(null)
                    resetTransactionForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg"
                >
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
