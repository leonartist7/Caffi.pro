'use client'

/**
 * Offline visit queue (Plan 3). VISITS ONLY — never redemptions.
 *
 * Why the asymmetry: a visit is append-only and idempotent (client_uuid),
 * so queuing it offline and replaying later is always safe. A redemption
 * needs the TRUE current balance to check against; an offline client can't
 * know that, so queuing it could hand out a redemption the member can't
 * actually afford, or let it happen twice. Redeem is disabled offline —
 * full stop, no queue for it.
 *
 * iPad Safari private-mode note: localStorage writes can throw. Every
 * access here is wrapped; on failure the queue degrades to an in-memory
 * array for the rest of the session with a visible warning from the caller.
 */

export interface QueuedVisit {
  visit_uuid: string
  member_id: string
  member_name: string
  ts: string
}

const STORAGE_KEY = 'aro_counter_offline_visits'
const MAX_QUEUE = 100

let memoryFallback: QueuedVisit[] | null = null
let storageBroken = false

function readRaw(): QueuedVisit[] {
  if (storageBroken) return memoryFallback ?? []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as QueuedVisit[]) : []
  } catch {
    storageBroken = true
    memoryFallback = memoryFallback ?? []
    return memoryFallback
  }
}

function writeRaw(queue: QueuedVisit[]): void {
  if (storageBroken) {
    memoryFallback = queue
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch {
    storageBroken = true
    memoryFallback = queue
  }
}

export function enqueueVisit(visit: QueuedVisit): { queue: QueuedVisit[]; evicted: boolean } {
  const queue = readRaw()
  queue.push(visit)
  let evicted = false
  while (queue.length > MAX_QUEUE) {
    queue.shift()
    evicted = true
  }
  writeRaw(queue)
  return { queue, evicted }
}

export function peekQueue(): QueuedVisit[] {
  return readRaw()
}

export function removeFromQueue(visitUuid: string): QueuedVisit[] {
  const queue = readRaw().filter(v => v.visit_uuid !== visitUuid)
  writeRaw(queue)
  return queue
}

export function isStorageDegraded(): boolean {
  return storageBroken
}

/**
 * Replay the queue against /api/counter/visit. Each entry uses its own
 * visit_uuid, so a re-send after a partial failure (network drop mid-replay)
 * is harmless — the server dedupes.
 */
export async function replayQueue(
  onProgress?: (remaining: number) => void
): Promise<{ synced: number; failed: number }> {
  let synced = 0
  let failed = 0
  const queue = readRaw()

  for (const visit of queue) {
    try {
      const res = await fetch('/api/counter/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: visit.member_id,
          visit_uuid: visit.visit_uuid,
          ts: visit.ts,
        }),
      })
      if (res.ok || res.status === 409) {
        removeFromQueue(visit.visit_uuid)
        synced++
      } else {
        failed++
      }
    } catch {
      failed++
      // Network still down — stop this pass, the next trigger will retry.
      break
    }
    onProgress?.(peekQueue().length)
  }

  return { synced, failed }
}
