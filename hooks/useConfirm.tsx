'use client'

import { useState, useCallback, useRef } from 'react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  onConfirm: () => void
}

export function useConfirm() {
  const pendingResolution = useRef<((confirmed: boolean) => void) | null>(null)
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'warning',
    onConfirm: () => {},
  })

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      pendingResolution.current?.(false)
      pendingResolution.current = resolve
      setState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'warning',
        onConfirm: () => {
          resolve(true)
          pendingResolution.current = null
          setState(prev => ({ ...prev, isOpen: false }))
        },
      })
    })
  }, [])

  const handleClose = useCallback(() => {
    pendingResolution.current?.(false)
    pendingResolution.current = null
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    confirm,
    confirmState: state,
    closeConfirm: handleClose,
  }
}
