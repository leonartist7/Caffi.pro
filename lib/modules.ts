import type { ElementType } from 'react'
import {
  LayoutDashboard,
  Users,
  Inbox,
  Shield,
  Gift,
  BarChart3,
  Activity,
  Settings,
  MapPin,
  Menu as MenuIcon,
  ShoppingCart,
  Tag,
  Bell,
} from 'lucide-react'

/**
 * Single source of truth for HQ nav: which client-scoped modules exist,
 * which are actually wired to live data vs still parked, and (later) which
 * a given venue has turned on. No supabase import here on purpose — this
 * file is imported from client components (Sidebar/MobileNav).
 *
 * `status: 'coming_soon'` = parked platform-wide regardless of any
 * venue's features_enabled — flip a module to 'live' here once it has a
 * real API + data source, the same way staff/rewards/analytics/activity
 * were flipped on in this build.
 */
export type ModuleKey =
  | 'loyalty'
  | 'staff'
  | 'analytics'
  | 'activity'
  | 'rewards'
  | 'settings'
  | 'menu'
  | 'orders'
  | 'coupons'
  | 'notifications'
  | 'locations'

export interface ModuleDef {
  key: ModuleKey
  label: string
  href: string
  icon: ElementType
  status: 'live' | 'coming_soon'
}

/**
 * `loyalty` isn't listed here — it's the always-on core (visits, points,
 * counter, join flow) with no standalone settings page of its own, not a
 * toggleable nav item.
 */
export const MODULES: ModuleDef[] = [
  { key: 'staff', label: 'Staff', href: '/staff', icon: Shield, status: 'live' },
  { key: 'rewards', label: 'Rewards', href: '/rewards', icon: Gift, status: 'live' },
  { key: 'analytics', label: 'Analytics', href: '/analytics', icon: BarChart3, status: 'live' },
  { key: 'activity', label: 'Activity', href: '/activity', icon: Activity, status: 'live' },
  { key: 'settings', label: 'Settings', href: '/settings', icon: Settings, status: 'live' },
  { key: 'menu', label: 'Menu', href: '/menu', icon: MenuIcon, status: 'coming_soon' },
  { key: 'orders', label: 'Orders', href: '/orders', icon: ShoppingCart, status: 'coming_soon' },
  { key: 'coupons', label: 'Coupons', href: '/coupons', icon: Tag, status: 'coming_soon' },
  {
    key: 'notifications',
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
    status: 'coming_soon',
  },
  { key: 'locations', label: 'Locations', href: '/cafes', icon: MapPin, status: 'coming_soon' },
]

/** HQ-level nav — visible only to aro_admin, never client-scoped. */
export const HQ_ITEMS: { label: string; href: string; icon: ElementType }[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Leads', href: '/leads', icon: Inbox },
]

/**
 * Modules to render in the client-scoped nav for a given venue. All
 * `live` modules are on by default; a venue's `features_enabled` can
 * later turn one off (explicit `false`) — the evolution path for
 * eventually activating modules per client rather than platform-wide.
 * `coming_soon` modules always render (with a "soon" badge in the UI) so
 * clients can see what's ahead — they're never hidden, just not linked
 * to a working page yet.
 */
export function enabledModules(venue?: {
  features_enabled?: Record<string, boolean>
}): ModuleDef[] {
  return MODULES.filter(m => {
    if (m.status === 'coming_soon') return true
    return venue?.features_enabled?.[m.key] !== false
  })
}
