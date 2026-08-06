'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useConfirm } from '@/hooks/useConfirm'

interface Reward {
  reward_id: string
  name: string
  description: string | null
  points_required: number
  reward_type: 'coupon' | 'free_item' | 'discount'
  is_active: boolean
}

const STRINGS = {
  title: 'Rewards',
  subtitle: 'What members can redeem their points for.',
  addReward: 'Add reward',
  namePlaceholder: 'Reward name',
  pointsPlaceholder: 'Points required',
  save: 'Save',
  saving: 'Saving…',
  cancel: 'Cancel',
  empty: 'No rewards yet — add the first one your regulars can redeem points for.',
  loadFailed: "Couldn't load rewards — check your connection and try again.",
  createFailed: 'Failed to create reward.',
  updateFailed: 'Failed to update reward.',
  deleteFailed: 'Failed to delete reward.',
  deleteTitle: 'Delete this reward?',
  deleteMessage:
    'This cannot be undone. A reward that has already been redeemed cannot be deleted — deactivate it instead.',
  active: 'Active',
  inactive: 'Inactive',
  pointsSuffix: 'pts',
} as const

export function RewardsAdminClient({ venueId }: { venueId: string }) {
  const { confirm, confirmState, closeConfirm } = useConfirm()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [points, setPoints] = useState('')

  async function fetchRewards() {
    try {
      setLoading(true)
      const res = await fetch(`/api/rewards?venue_id=${venueId}`)
      if (!res.ok) throw new Error('load failed')
      const { rewards: data } = await res.json()
      setRewards(data ?? [])
      setLoadFailed(false)
    } catch (error) {
      console.error('[rewards-admin] load failed:', error)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRewards()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId])

  async function handleCreate() {
    const pointsNum = Number(points)
    if (!name.trim() || !Number.isFinite(pointsNum) || pointsNum <= 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: venueId,
          name: name.trim(),
          points_required: pointsNum,
          reward_type: 'free_item',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'create failed')
      }
      setName('')
      setPoints('')
      setShowForm(false)
      await fetchRewards()
      toast.success('Reward added.')
    } catch (error) {
      console.error('[rewards-admin] create failed:', error)
      toast.error(error instanceof Error ? error.message : STRINGS.createFailed)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(reward: Reward) {
    try {
      const res = await fetch(`/api/rewards/${reward.reward_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !reward.is_active }),
      })
      if (!res.ok) throw new Error('update failed')
      setRewards(prev =>
        prev.map(r => (r.reward_id === reward.reward_id ? { ...r, is_active: !r.is_active } : r))
      )
    } catch (error) {
      console.error('[rewards-admin] toggle failed:', error)
      toast.error(STRINGS.updateFailed)
    }
  }

  async function handleDelete(reward: Reward) {
    const ok = await confirm({
      title: STRINGS.deleteTitle,
      message: STRINGS.deleteMessage,
      confirmText: 'Delete',
      variant: 'danger',
    })
    if (!ok) return
    try {
      const res = await fetch(`/api/rewards/${reward.reward_id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'delete failed')
      }
      setRewards(prev => prev.filter(r => r.reward_id !== reward.reward_id))
      toast.success('Reward deleted.')
    } catch (error) {
      console.error('[rewards-admin] delete failed:', error)
      toast.error(error instanceof Error ? error.message : STRINGS.deleteFailed)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl font-bold text-aro-ink">{STRINGS.title}</h1>
        <button
          type="button"
          onClick={() => setShowForm(open => !open)}
          className="flex items-center gap-1.5 rounded-lg bg-aro-terra px-3 py-2 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {STRINGS.addReward}
        </button>
      </div>
      <p className="text-sm text-aro-muted mb-4">{STRINGS.subtitle}</p>

      {showForm && (
        <div className="rounded-xl bg-white border border-aro-hairline p-4 mb-4 flex flex-col sm:flex-row gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={STRINGS.namePlaceholder}
            className="flex-1 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
          />
          <input
            value={points}
            onChange={e => setPoints(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder={STRINGS.pointsPlaceholder}
            inputMode="numeric"
            className="w-full sm:w-40 rounded-lg border border-aro-hairline px-3 py-2 text-sm bg-white"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || !name.trim() || !points}
              className="rounded-lg bg-aro-terra px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? STRINGS.saving : STRINGS.save}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-aro-hairline px-4 py-2 text-sm font-medium text-aro-ink-soft"
            >
              {STRINGS.cancel}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-aro-muted py-8 text-center">Loading…</p>
      ) : loadFailed ? (
        <p className="text-sm text-aro-rose py-8 text-center">{STRINGS.loadFailed}</p>
      ) : rewards.length === 0 ? (
        <p className="text-sm text-aro-muted py-8 text-center">{STRINGS.empty}</p>
      ) : (
        <div className="space-y-1.5">
          {rewards.map(reward => (
            <div
              key={reward.reward_id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white border border-aro-hairline px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-aro-ink truncate">{reward.name}</p>
                <p className="text-xs text-aro-muted">
                  {reward.points_required} {STRINGS.pointsSuffix}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleActive(reward)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    reward.is_active ? 'bg-aro-sage/30 text-aro-ink' : 'bg-aro-sand text-aro-muted'
                  }`}
                >
                  {reward.is_active ? STRINGS.active : STRINGS.inactive}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(reward)}
                  aria-label={`Delete ${reward.name}`}
                  className="rounded-lg p-2 text-aro-muted hover:bg-aro-rose/10 hover:text-aro-rose"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog {...confirmState} onClose={closeConfirm} />
    </div>
  )
}
