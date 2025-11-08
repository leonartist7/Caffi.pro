'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EditTenantModal from '@/components/EditTenantModal'
import DeleteTenantDialog from '@/components/DeleteTenantDialog'
import { Tenant } from '@/types/database'

interface TenantActionsProps {
  tenant: Tenant
}

export default function TenantActions({ tenant }: TenantActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const router = useRouter()

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <>
      <button 
        onClick={(e) => {
          e.stopPropagation() // Prevent row click
          setIsEditModalOpen(true)
        }}
        className="text-blue-600 hover:text-blue-900 mr-4"
      >
        Edit
      </button>
      <button 
        onClick={(e) => {
          e.stopPropagation() // Prevent row click
          setIsDeleteDialogOpen(true)
        }}
        className="text-red-600 hover:text-red-900"
      >
        Delete
      </button>

      <EditTenantModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleSuccess}
        tenant={tenant}
      />

      <DeleteTenantDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onSuccess={handleSuccess}
        tenant={tenant}
      />
    </>
  )
}

