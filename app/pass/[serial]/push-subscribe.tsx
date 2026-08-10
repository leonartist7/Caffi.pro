'use client'

import { useEffect, useState } from 'react'

const STRINGS = {
  title: 'Get notified',
  subtitle: 'Turn on notifications for offers and rewards — no account, no app store.',
  enable: 'Turn on notifications',
  enabling: 'Turning on…',
  enabled: "You're subscribed",
  disable: 'Turn off',
  unsupported: "This browser doesn't support notifications.",
  iosNeedsInstall:
    'On iPhone, add this page to your Home Screen first (Share → Add to Home Screen), then open it from there to turn on notifications.',
  permissionDenied: 'Notifications are blocked in your browser settings.',
  failed: "Couldn't turn on notifications — try again.",
  stubbed: 'Notifications aren’t set up for this café yet.',
} as const

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent
  return /iP(hone|od|ad)/.test(ua) && /WebKit/.test(ua) && !/CriOS|FxiOS/.test(ua)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own non-standard flag — no matchMedia equivalent.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64Safe)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

type Status = 'idle' | 'busy' | 'subscribed' | 'ios-needs-install' | 'unsupported' | 'denied'

export function PushSubscribe({
  serial,
  vapidPublicKey,
}: {
  serial: string
  vapidPublicKey: string | null
}) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (isIosSafari() && !isStandalone()) {
      setStatus('ios-needs-install')
      return
    }
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => {
        if (sub) setStatus('subscribed')
      })
      .catch(() => {
        // No registration yet is fine — subscribe() below will register.
      })
  }, [])

  async function subscribe() {
    if (!vapidPublicKey) return
    setError(null)
    setStatus('busy')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      })
      const json = sub.toJSON()
      const res = await fetch(`/api/pass/${serial}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
      if (!res.ok) throw new Error('subscribe failed')
      setStatus('subscribed')
    } catch {
      setError(STRINGS.failed)
      setStatus('idle')
    }
  }

  async function unsubscribe() {
    setStatus('busy')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch(`/api/pass/${serial}/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('idle')
    } catch {
      setError(STRINGS.failed)
      setStatus('subscribed')
    }
  }

  if (!vapidPublicKey) {
    return (
      <div className="mt-6 pt-5 border-t border-aro-hairline text-left">
        <p className="text-xs text-aro-muted">{STRINGS.stubbed}</p>
      </div>
    )
  }

  return (
    <div className="mt-6 pt-5 border-t border-aro-hairline text-left">
      <p className="text-sm font-semibold text-aro-ink mb-1">{STRINGS.title}</p>
      {status === 'unsupported' && <p className="text-xs text-aro-muted">{STRINGS.unsupported}</p>}
      {status === 'ios-needs-install' && (
        <p className="text-xs text-aro-muted">{STRINGS.iosNeedsInstall}</p>
      )}
      {status === 'denied' && <p className="text-xs text-aro-rose">{STRINGS.permissionDenied}</p>}
      {(status === 'idle' || status === 'busy') && (
        <>
          <p className="text-xs text-aro-muted mb-3">{STRINGS.subtitle}</p>
          <button
            type="button"
            onClick={subscribe}
            disabled={status === 'busy'}
            className="w-full rounded-lg border border-aro-hairline px-4 py-2.5 text-sm font-medium text-aro-terra hover:bg-aro-sand/40 disabled:opacity-60"
          >
            {status === 'busy' ? STRINGS.enabling : STRINGS.enable}
          </button>
        </>
      )}
      {status === 'subscribed' && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-aro-sage font-medium">{STRINGS.enabled}</p>
          <button type="button" onClick={unsubscribe} className="text-xs text-aro-muted underline">
            {STRINGS.disable}
          </button>
        </div>
      )}
      {error && <p className="text-xs text-aro-rose mt-2">{error}</p>}
    </div>
  )
}
