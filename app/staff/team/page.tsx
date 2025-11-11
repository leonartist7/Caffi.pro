'use client'

import { useEffect, useState } from 'react'
import { useStaffAuth } from '@/contexts/StaffAuthContext'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, User, MapPin, Shield } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface StaffMember {
  staff_id: string
  email: string
  full_name: string
  phone?: string
  role: 'owner' | 'manager' | 'barista' | 'kitchen' | 'cashier'
  assigned_location_id?: string
  can_manage_orders: boolean
  can_manage_inventory: boolean
  can_manage_staff: boolean
  can_view_reports: boolean
  is_active: boolean
  created_at: string
  last_login?: string
  location?: {
    name: string
  }
}

interface Location {
  location_id: string
  name: string
}

export default function StaffTeamPage() {
  const { staffUser } = useStaffAuth()
  const { confirm, confirmState, closeConfirm } = useConfirm()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [formData, setFormData] = useState<{
    email: string
    full_name: string
    phone: string
    role: 'owner' | 'manager' | 'barista' | 'kitchen' | 'cashier'
    assigned_location_id: string
    can_manage_orders: boolean
    can_manage_inventory: boolean
    can_manage_staff: boolean
    can_view_reports: boolean
  }>({
    email: '',
    full_name: '',
    phone: '',
    role: 'barista',
    assigned_location_id: '',
    can_manage_orders: true,
    can_manage_inventory: false,
    can_manage_staff: false,
    can_view_reports: false,
  })
  const supabase = createClient()

  const fetchStaffMembers = async () => {
    if (!staffUser) return

    try {
      const { data, error } = await supabase
        .from('staff_users')
        .select(
          `
          *,
          location:assigned_location_id (
            name
          )
        `
        )
        .eq('tenant_id', staffUser.tenant_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setStaffMembers((data as any) || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchLocations = async () => {
    if (!staffUser) return

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('location_id, name')
        .eq('tenant_id', staffUser.tenant_id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      setLocations(data || [])
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchStaffMembers(), fetchLocations()])
      setLoading(false)
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.email.trim()) {
      toast.error('Email is required')
      return
    }

    if (!formData.full_name.trim()) {
      toast.error('Full name is required')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address')
      return
    }

    // Validate phone format if provided
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[+\d\s\-()]+$/
      if (!phoneRegex.test(formData.phone)) {
        toast.error('Please enter a valid phone number')
        return
      }
    }

    try {
      const payload = {
        ...formData,
        tenant_id: staffUser!.tenant_id,
        assigned_location_id: formData.assigned_location_id || null,
      }

      if (editingStaff) {
        // Update existing staff
        const { error } = await supabase
          .from('staff_users')
          .update(payload)
          .eq('staff_id', editingStaff.staff_id)

        if (error) throw error
        toast.success('Staff member updated successfully!')
      } else {
        // Create new staff
        const { error } = await supabase.from('staff_users').insert(payload)

        if (error) throw error
        toast.success(
          'Staff member added successfully! They can now sign in at /staff/login with their email and password.'
        )
      }

      await fetchStaffMembers()
      setModalOpen(false)
      resetForm()
    } catch (error: any) {
      console.error('Error saving staff:', error)
      toast.error(`Failed to save staff member: ${error.message}`)
    }
  }

  const handleDelete = async (staffId: string) => {
    const confirmed = await confirm({
      title: 'Remove Staff Member',
      message: 'Are you sure you want to remove this staff member? This action cannot be undone.',
      confirmText: 'Remove',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      const { error } = await supabase.from('staff_users').delete().eq('staff_id', staffId)

      if (error) throw error

      await fetchStaffMembers()
      toast.success('Staff member removed successfully!')
    } catch (error: any) {
      console.error('Error deleting staff:', error)
      toast.error(`Failed to remove staff member: ${error.message}`)
    }
  }

  const toggleActiveStatus = async (staff: StaffMember) => {
    try {
      const { error } = await supabase
        .from('staff_users')
        .update({ is_active: !staff.is_active })
        .eq('staff_id', staff.staff_id)

      if (error) throw error

      await fetchStaffMembers()
    } catch (error: any) {
      console.error('Error toggling status:', error)
      toast.error(`Failed to update status: ${error.message}`)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      phone: '',
      role: 'barista',
      assigned_location_id: '',
      can_manage_orders: true,
      can_manage_inventory: false,
      can_manage_staff: false,
      can_view_reports: false,
    })
    setEditingStaff(null)
  }

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff)
    setFormData({
      email: staff.email,
      full_name: staff.full_name,
      phone: staff.phone || '',
      role: staff.role,
      assigned_location_id: staff.assigned_location_id || '',
      can_manage_orders: staff.can_manage_orders,
      can_manage_inventory: staff.can_manage_inventory,
      can_manage_staff: staff.can_manage_staff,
      can_view_reports: staff.can_view_reports,
    })
    setModalOpen(true)
  }

  const openAddModal = () => {
    resetForm()
    setModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coffee-700"></div>
      </div>
    )
  }

  // Check permissions
  if (!staffUser?.can_manage_staff) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to manage staff members.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Team</h1>
          <p className="text-gray-600 mt-1">Manage your team members and their permissions</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-coffee-700 hover:bg-coffee-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Staff</span>
        </button>
      </div>

      {/* Staff List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {staffMembers.map(staff => (
          <div
            key={staff.staff_id}
            className={`bg-white rounded-lg shadow border p-4 ${!staff.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-coffee-100 text-coffee-700 flex items-center justify-center font-bold text-lg">
                  {staff.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{staff.full_name}</h3>
                  <p className="text-sm text-gray-600">{staff.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => openEditModal(staff)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(staff.staff_id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="px-3 py-1 bg-coffee-100 text-coffee-700 rounded-full font-medium capitalize">
                  {staff.role}
                </span>
              </div>

              {staff.location && (
                <div className="flex items-center text-gray-700">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>{(staff.location as any).name}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <button
                  onClick={() => toggleActiveStatus(staff)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    staff.is_active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {staff.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-1">Permissions:</p>
                <div className="flex flex-wrap gap-1">
                  {staff.can_manage_orders && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                      Orders
                    </span>
                  )}
                  {staff.can_manage_inventory && (
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                      Inventory
                    </span>
                  )}
                  {staff.can_manage_staff && (
                    <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded">
                      Staff
                    </span>
                  )}
                  {staff.can_view_reports && (
                    <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                      Reports
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {staffMembers.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No staff members yet</p>
            <button onClick={openAddModal} className="text-coffee-700 hover:underline mt-2">
              Add your first staff member
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  >
                    <option value="barista">Barista</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Location
                  </label>
                  <select
                    value={formData.assigned_location_id}
                    onChange={e =>
                      setFormData({ ...formData, assigned_location_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                  >
                    <option value="">All Locations</option>
                    {locations.map(location => (
                      <option key={location.location_id} value={location.location_id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Permissions</p>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.can_manage_orders}
                      onChange={e =>
                        setFormData({ ...formData, can_manage_orders: e.target.checked })
                      }
                      className="rounded border-gray-300 text-coffee-700 focus:ring-coffee-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Can manage orders</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.can_manage_inventory}
                      onChange={e =>
                        setFormData({ ...formData, can_manage_inventory: e.target.checked })
                      }
                      className="rounded border-gray-300 text-coffee-700 focus:ring-coffee-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Can manage inventory</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.can_manage_staff}
                      onChange={e =>
                        setFormData({ ...formData, can_manage_staff: e.target.checked })
                      }
                      className="rounded border-gray-300 text-coffee-700 focus:ring-coffee-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Can manage staff</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.can_view_reports}
                      onChange={e =>
                        setFormData({ ...formData, can_view_reports: e.target.checked })
                      }
                      className="rounded border-gray-300 text-coffee-700 focus:ring-coffee-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Can view reports</span>
                  </label>
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
                  {editingStaff ? 'Update Staff' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
