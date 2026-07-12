'use client'

import { useEffect, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { toast } from 'sonner'
import { Plus, Shield, Coffee, KeyRound, UserX, UserCheck, Mail } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'
import { SkeletonList } from '@/components/SkeletonLoader'

type Role = 'owner' | 'manager' | 'staff'

interface StaffMember {
  staff_id: string
  email: string | null
  full_name: string | null
  role: Role
  is_active: boolean
  status: 'active' | 'invited'
  has_pin: boolean
}

export default function AdminStaffPage() {
  const { selectedTenant } = useTenant()
  const { confirm, confirmState, closeConfirm } = useConfirm()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [pinTarget, setPinTarget] = useState<StaffMember | null>(null)
  const [pinValue, setPinValue] = useState('')
  const [formData, setFormData] = useState<{ email: string; full_name: string; role: Role }>({
    email: '',
    full_name: '',
    role: 'staff',
  })

  const fetchStaffMembers = async () => {
    if (!selectedTenant) return
    try {
      const res = await fetch(`/api/staff?venue_id=${selectedTenant.tenant_id}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Failed to load staff (${res.status})`)
      }
      const { staff } = await res.json()
      setStaffMembers(staff || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load staff')
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await fetchStaffMembers()
      setLoading(false)
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenant])

  const resetForm = () => setFormData({ email: '', full_name: '', role: 'staff' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: selectedTenant.tenant_id,
          email: formData.email,
          full_name: formData.full_name || undefined,
          role: formData.role,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }

      await fetchStaffMembers()
      setModalOpen(false)
      resetForm()
      toast.success('Invite sent — share the invite link with them to finish setup.')
    } catch (error) {
      console.error('Error inviting staff:', error)
      toast.error(
        `Failed to invite staff member: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const toggleActiveStatus = async (staff: StaffMember) => {
    try {
      const res = await fetch(`/api/staff/${staff.staff_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !staff.is_active }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      await fetchStaffMembers()
    } catch (error) {
      console.error('Error toggling status:', error)
      toast.error(
        `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const revokeInvite = async (staff: StaffMember) => {
    const confirmed = await confirm({
      title: 'Revoke Invite',
      message: `Revoke the pending invite for ${staff.email}? They won't be able to join with this link anymore.`,
      confirmText: 'Revoke',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      const res = await fetch(`/api/staff/${staff.staff_id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      await fetchStaffMembers()
      toast.success('Invite revoked.')
    } catch (error) {
      console.error('Error revoking invite:', error)
      toast.error(
        `Failed to revoke invite: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pinTarget) return

    try {
      const res = await fetch(`/api/staff/${pinTarget.staff_id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Request failed (${res.status})`)
      }
      await fetchStaffMembers()
      setPinTarget(null)
      setPinValue('')
      toast.success('Counter PIN set.')
    } catch (error) {
      console.error('Error setting PIN:', error)
      toast.error(`Failed to set PIN: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  if (!selectedTenant) {
    return (
      <div className="text-center py-12">
        <Coffee className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Client Selected</h2>
        <p className="text-gray-600">Please select a client from the dropdown above.</p>
      </div>
    )
  }

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
        <SkeletonList items={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600 mt-1">Manage staff members for this client</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setModalOpen(true)
          }}
          className="bg-coffee-700 hover:bg-coffee-800 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Invite Staff</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Team access</h3>
            <p className="text-sm text-blue-700 mt-1">
              Owner/manager invites sign in like you do. Staff invites are for the counter — after
              accepting, set a counter PIN below so they can log in at <code>/counter</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {staffMembers.map(staff => (
          <div
            key={staff.staff_id}
            className={`bg-white rounded-lg shadow border p-4 ${!staff.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-coffee-100 text-coffee-700 flex items-center justify-center font-bold text-lg">
                  {(staff.full_name || staff.email || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{staff.full_name || 'Unnamed'}</h3>
                  <p className="text-sm text-gray-600">{staff.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {staff.role === 'staff' && (
                  <button
                    onClick={() => {
                      setPinTarget(staff)
                      setPinValue('')
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title={staff.has_pin ? 'Change counter PIN' : 'Set counter PIN'}
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                )}
                {staff.status === 'invited' ? (
                  <button
                    onClick={() => revokeInvite(staff)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Revoke invite"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => toggleActiveStatus(staff)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title={staff.is_active ? 'Deactivate' : 'Reactivate'}
                  >
                    {staff.is_active ? (
                      <UserX className="w-4 h-4" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Role:</span>
                <span className="px-3 py-1 bg-coffee-100 text-coffee-700 rounded-full font-medium capitalize">
                  {staff.role}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    staff.status === 'invited'
                      ? 'bg-blue-100 text-blue-700'
                      : staff.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {staff.status === 'invited' ? 'Invited' : staff.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {staff.role === 'staff' && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Counter PIN:</span>
                  <span className="font-medium text-gray-900">
                    {staff.has_pin ? 'Set' : 'Not set'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {staffMembers.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No staff members yet</p>
            <button
              onClick={() => {
                resetForm()
                setModalOpen(true)
              }}
              className="text-coffee-700 hover:underline mt-2"
            >
              Invite your first staff member
            </button>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invite Staff Member</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
                >
                  <option value="staff">Staff (counter access)</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
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
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set PIN Modal */}
      {pinTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Set Counter PIN</h2>
            <p className="text-sm text-gray-600 mb-4">
              For {pinTarget.full_name || pinTarget.email}
            </p>
            <form onSubmit={handleSetPin} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="4-6 digits"
                value={pinValue}
                onChange={e => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-coffee-500 focus:border-coffee-500"
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setPinTarget(null)
                    setPinValue('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinValue.length < 4}
                  className="px-4 py-2 bg-coffee-700 hover:bg-coffee-800 text-white rounded-lg disabled:opacity-50"
                >
                  Save PIN
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
