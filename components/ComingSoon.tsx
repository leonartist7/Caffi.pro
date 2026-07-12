import { Sparkles } from 'lucide-react'

/**
 * Warm placeholder for a module that isn't wired to live data yet — never
 * fake numbers or interactive-looking controls that silently do nothing.
 * Used both for whole parked pages (menu/orders/coupons/...) and for
 * individual tabs within a page that's otherwise real (Settings).
 */
export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-coffee flex items-center justify-center mx-auto mb-4 opacity-80">
        <Sparkles className="w-8 h-8 text-cream-100" />
      </div>
      <h3 className="text-xl font-bold text-coffee-900 dark:text-cream-100 mb-2">{title}</h3>
      <p className="text-coffee-600 dark:text-cream-400 max-w-md mx-auto">
        {description ?? 'This is part of an upcoming module — your data model is ready for it.'}
      </p>
    </div>
  )
}
