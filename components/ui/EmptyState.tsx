/**
 * Empty State Component
 *
 * Reusable empty state displays for when there's no data.
 */

import React from 'react'
import { Inbox, Search, ShoppingBag, Coffee, Users, Package, FileText } from 'lucide-react'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?:
    | 'inbox'
    | 'search'
    | 'orders'
    | 'menu'
    | 'users'
    | 'inventory'
    | 'documents'
    | React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  title,
  description,
  icon = 'inbox',
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  const iconComponent = getIcon(icon)

  return (
    <div className={`flex flex-col items-center justify-center text-center p-12 ${className}`}>
      {/* Icon */}
      <div className="mb-4 text-gray-400">{iconComponent}</div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      {/* Description */}
      {description && <p className="text-sm text-gray-600 mb-6 max-w-sm">{description}</p>}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Empty search results
 */
export function EmptySearchResults({
  query,
  onClearSearch,
  className = '',
}: {
  query: string
  onClearSearch?: () => void
  className?: string
}) {
  return (
    <EmptyState
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search.`}
      icon="search"
      action={onClearSearch ? { label: 'Clear Search', onClick: onClearSearch } : undefined}
      className={className}
    />
  )
}

/**
 * Empty list with create action
 */
export function EmptyList({
  resourceName,
  onCreateNew,
  icon,
  className = '',
}: {
  resourceName: string
  onCreateNew: () => void
  icon?: EmptyStateProps['icon']
  className?: string
}) {
  return (
    <EmptyState
      title={`No ${resourceName} yet`}
      description={`Get started by creating your first ${resourceName.toLowerCase()}.`}
      icon={icon || 'inbox'}
      action={{ label: `Create ${resourceName}`, onClick: onCreateNew }}
      className={className}
    />
  )
}

/**
 * Empty orders state
 */
export function EmptyOrders({ className = '' }: { className?: string }) {
  return (
    <EmptyState
      title="No orders yet"
      description="Orders will appear here when customers place them."
      icon="orders"
      className={className}
    />
  )
}

/**
 * Empty menu state
 */
export function EmptyMenu({
  onAddMenuItem,
  className = '',
}: {
  onAddMenuItem: () => void
  className?: string
}) {
  return (
    <EmptyState
      title="No menu items yet"
      description="Add your first menu item to get started."
      icon="menu"
      action={{ label: 'Add Menu Item', onClick: onAddMenuItem }}
      className={className}
    />
  )
}

/**
 * Empty cart state
 */
export function EmptyCart({
  onBrowseMenu,
  className = '',
}: {
  onBrowseMenu: () => void
  className?: string
}) {
  return (
    <EmptyState
      title="Your cart is empty"
      description="Add items from the menu to get started."
      icon="orders"
      action={{ label: 'Browse Menu', onClick: onBrowseMenu }}
      className={className}
    />
  )
}

// ==================== Helpers ====================

function getIcon(icon: EmptyStateProps['icon']): React.ReactNode {
  if (React.isValidElement(icon)) {
    return icon
  }

  const iconMap = {
    inbox: <Inbox className="h-16 w-16" />,
    search: <Search className="h-16 w-16" />,
    orders: <ShoppingBag className="h-16 w-16" />,
    menu: <Coffee className="h-16 w-16" />,
    users: <Users className="h-16 w-16" />,
    inventory: <Package className="h-16 w-16" />,
    documents: <FileText className="h-16 w-16" />,
  }

  return iconMap[icon as keyof typeof iconMap] || iconMap.inbox
}
