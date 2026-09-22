export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
export type OrderingHours = Partial<Record<DayKey, [string, string] | null>>

const DAYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function asMinute(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

export function parseOrderingHours(value: unknown): OrderingHours | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const hours: OrderingHours = {}
  for (const day of DAYS) {
    const range = (value as Record<string, unknown>)[day]
    if (range === null) {
      hours[day] = null
    } else if (
      Array.isArray(range) &&
      range.length === 2 &&
      typeof range[0] === 'string' &&
      typeof range[1] === 'string' &&
      asMinute(range[0]) !== null &&
      asMinute(range[1]) !== null
    ) {
      hours[day] = [range[0], range[1]]
    }
  }
  return Object.keys(hours).length ? hours : null
}

export function isVenueOpenForOrdering(
  hours: OrderingHours | null,
  timezone: string | null | undefined,
  at: Date = new Date()
): boolean {
  // Existing venues have no ordering-hours configuration. Preserve their
  // current behavior until an owner deliberately configures a weekly window.
  if (!hours) return true
  let local: Intl.DateTimeFormatPart[]
  try {
    local = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(at)
  } catch {
    return false
  }
  const pick = (type: Intl.DateTimeFormatPartTypes) => local.find(part => part.type === type)?.value
  const day = pick('weekday')?.toLowerCase().slice(0, 3) as DayKey | undefined
  const hour = Number(pick('hour'))
  const minute = Number(pick('minute'))
  if (!day || !Number.isInteger(hour) || !Number.isInteger(minute)) return false
  const range = hours[day]
  if (!range) return false
  const opens = asMinute(range[0])
  const closes = asMinute(range[1])
  if (opens === null || closes === null || opens === closes) return false
  const now = hour * 60 + minute
  return opens < closes ? now >= opens && now < closes : now >= opens || now < closes
}
