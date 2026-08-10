const CACHE_NAME = 'caffi-pro-v2'
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-maskable-512.svg',
]

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache)
    })
  )
  self.skipWaiting()
})

// Cache and return requests
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Cache hit - return response
      if (response) {
        return response
      }
      return fetch(event.request)
    })
  )
})

// Update service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  event.waitUntil(self.clients.claim())
})

// PLAN-18 — web push. The payload is exactly what
// lib/push/provider.ts's sendPushNotification JSON.stringifies:
// { title, body }. This handler only ever DISPLAYS what the server
// already decided and sent — there is no draw, no randomness, no
// decision made here.
self.addEventListener('push', event => {
  let data = { title: 'aro', body: '' }
  try {
    if (event.data) data = event.data.json()
  } catch {
    // A malformed/empty payload still shows something rather than
    // silently dropping the notification the venue paid attention to send.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})
