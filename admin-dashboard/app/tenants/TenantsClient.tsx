'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddTenantModal from '@/components/AddTenantModal'
import EditTenantModal from '@/components/EditTenantModal'
import DeleteTenantDialog from '@/components/DeleteTenantDialog'
import { Plus } from 'lucide-react'
import { Tenant } from '@/types/database'

interface TenantsClientProps {
  tenants: Tenant[]
}

export default function TenantsClient({ tenants }: TenantsClientProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const router = useRouter()

  const handleSuccess = () => {
    router.refresh() // Refresh the page to show changes
  }

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setIsEditModalOpen(true)
  }

  const handleDelete = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    setIsDeleteDialogOpen(true)
  }

  return (
    <>
      <button 
        onClick={() => setIsAddModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Add Tenant
      </button>

      {/* Action Buttons for Each Tenant */}
      <div className="hidden">
        {tenants.map((tenant) => (
          <div key={tenant.tenant_id}>
            <button onClick={() => handleEdit(tenant)}>Edit</button>
            <button onClick={() => handleDelete(tenant)}>Delete</button>
          </div>
        ))}
      </div>

      {/* Modals */}
      <AddTenantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleSuccess}
      />

      <EditTenantModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedTenant(null)
        }}
        onSuccess={handleSuccess}
        tenant={selectedTenant}
      />

      <DeleteTenantDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false)
          setSelectedTenant(null)
        }}
        onSuccess={handleSuccess}
        tenant={selectedTenant}
      />
    </>
  )
}

// Export handlers for use in parent component
export function createTenantHandlers(tenants: Tenant[], router: any) {
  return {
    handleEdit: (tenant: Tenant) => {
      // This will be handled by the client component
    },
    handleDelete: (tenant: Tenant) => {
      // This will be handled by the client component
    }
  }
}

