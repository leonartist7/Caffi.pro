'use client'

import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Tenant } from '@/types/database'

interface DeleteTenantDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  tenant: Tenant | null
}

export default function DeleteTenantDialog({ isOpen, onClose, onSuccess, tenant }: DeleteTenantDialogProps) {
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = async () => {
    if (!tenant || confirmText !== tenant.slug) return
    
    setLoading(true)

    try {
      const response = await fetch(`/api/tenants/${tenant.tenant_id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onSuccess()
        onClose()
        setConfirmText('')
      } else {
        const error = await response.json()
        alert(`Failed to delete tenant: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting tenant:', error)
      alert('Error deleting tenant')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !tenant) return null

  const isConfirmed = confirmText === tenant.slug

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Delete Tenant</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium mb-2">
              ⚠️ Warning: This action cannot be undone!
            </p>
            <p className="text-sm text-red-700">
              Deleting this tenant will permanently remove:
            </p>
            <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
              <li>All locations</li>
              <li>All menu items and categories</li>
              <li>All customer data</li>
              <li>All orders and transactions</li>
              <li>All loyalty points and rewards</li>
            </ul>
          </div>

          <div>
            <p className="text-sm text-gray-700 mb-2">
              You are about to delete:
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="font-semibold text-gray-900">{tenant.business_name}</p>
              <p className="text-sm text-gray-600">Slug: {tenant.slug}</p>
              <p className="text-sm text-gray-600">Owner: {tenant.owner_email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-mono font-bold">{tenant.slug}</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={tenant.slug}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete Tenant'}
          </button>
        </div>
      </div>
    </div>
  )
}

