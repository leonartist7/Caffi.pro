'use client'

import { memo, useMemo, useCallback } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

function ConfirmDialogComponent({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
}: ConfirmDialogProps) {
  const variantStyles = useMemo(
    () => ({
      danger: {
        icon: AlertTriangle,
        iconColor: 'text-aro-rose',
        iconBg: 'bg-aro-rose/15',
        confirmButton:
          'bg-aro-rose text-aro-ink hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed',
      },
      warning: {
        icon: AlertTriangle,
        iconColor: 'text-aro-honey',
        iconBg: 'bg-aro-honey/20',
        confirmButton:
          'bg-aro-honey text-aro-ink hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed',
      },
      info: {
        icon: Info,
        iconColor: 'text-aro-plum',
        iconBg: 'bg-aro-plum/15',
        confirmButton:
          'bg-aro-plum text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed',
      },
    }),
    []
  )

  const handleConfirm = useCallback(() => {
    onConfirm()
    onClose()
  }, [onConfirm, onClose])

  if (!isOpen) return null

  const style = variantStyles[variant]
  const Icon = style.icon

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-aro-ink/60"
          onClick={isLoading ? undefined : onClose}
        />

        {/* Dialog */}
        <div className="relative inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 p-2 hover:bg-aro-sand/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-aro-muted" />
          </button>

          {/* Icon */}
          <div className="flex items-center justify-center mb-4">
            <div className={`p-3 rounded-full ${style.iconBg}`}>
              <Icon className={`w-8 h-8 ${style.iconColor}`} />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-aro-ink mb-2">{title}</h3>
            <p className="text-aro-ink-soft">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-aro-ink-soft hover:bg-aro-sand/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg transition-colors ${style.confirmButton}`}
            >
              {isLoading ? 'Processing...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ConfirmDialog = memo(ConfirmDialogComponent)
