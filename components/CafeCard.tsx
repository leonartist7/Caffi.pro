import React from 'react'
import Link from 'next/link'
import Badge, { BadgeVariant } from './Badge'

interface CafeCardProps {
  slug: string
  businessName: string
  ownerEmail: string
  ownerPhone?: string | null
  logoUrl?: string | null
  setupStatus?: string
  subscriptionTier?: string
  lastActivityAt?: string | null
  stats?: {
    orders?: number | string
    revenue?: number | string
  }
}

const CafeCard: React.FC<CafeCardProps> = ({
  slug,
  businessName,
  ownerEmail,
  ownerPhone,
  logoUrl,
  setupStatus,
  subscriptionTier,
  lastActivityAt,
  stats = {}
}) => {
  const getStatusBadge = (status?: string): { variant: BadgeVariant; label: string } => {
    const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
      pending: { variant: 'warning', label: 'Pending' },
      in_progress: { variant: 'info', label: 'In Progress' },
      launched: { variant: 'success', label: 'Launched' },
      paused: { variant: 'default', label: 'Paused' },
    }
    return statusMap[status || ''] || { variant: 'default', label: 'N/A' }
  }

  const getTierBadge = (tier?: string): { variant: BadgeVariant; label: string } => {
    const tierMap: Record<string, { variant: BadgeVariant; label: string }> = {
      free: { variant: 'default', label: 'FREE' },
      starter: { variant: 'info', label: 'STARTER' },
      pro: { variant: 'primary', label: 'PRO' },
      enterprise: { variant: 'accent', label: 'ENTERPRISE' },
    }
    return tierMap[tier || ''] || { variant: 'default', label: 'N/A' }
  }

  const statusBadge = getStatusBadge(setupStatus)
  const tierBadge = getTierBadge(subscriptionTier)

  return (
    <Link
      href={`/cafes/${slug}`}
      className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:shadow-xl hover:scale-105 transition-all cursor-pointer group"
    >
      {/* Logo */}
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={businessName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-3xl">☕</span>
        )}
      </div>

      {/* Cafe Name */}
      <h3 className="text-xl font-serif italic text-gray-900 mb-2">
        {businessName}
      </h3>

      {/* Contact */}
      <p className="text-sm text-gray-600 mb-1">{ownerEmail}</p>
      {ownerPhone && (
        <p className="text-sm text-gray-600 mb-4">{ownerPhone}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-surface-alt rounded-xl">
        <div>
          <p className="text-xs text-gray-600">Orders</p>
          <p className="text-lg font-bold text-gray-900">
            {stats.orders ?? '--'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Revenue</p>
          <p className="text-lg font-bold text-gray-900 font-mono">
            {stats.revenue ?? '--'}
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        <Badge variant={tierBadge.variant}>{tierBadge.label}</Badge>
      </div>

      {/* Last Activity */}
      {lastActivityAt && (
        <p className="text-xs text-gray-500 mt-4">
          Last active: {new Date(lastActivityAt).toLocaleDateString()}
        </p>
      )}
    </Link>
  )
}

export default CafeCard
