'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Coffee, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { useTenant } from '@/contexts/TenantContext'
import { formatCents } from '@/lib/money'
import type { CostingReport } from '@/lib/costing/types'

const STRINGS = {
  eyebrow: 'Commerce / Costing',
  title: 'What each cup actually costs.',
  subtitle:
    'Theoretical cost from the recipe, margin against menu price, ranked by what it actually earns.',
  totalCost: 'Total theoretical cost (priced items)',
  totalMargin: 'Total margin (priced items)',
  emptyTitle: 'No menu items yet',
  emptyBody: 'Add items and recipes to see costing here.',
  colItem: 'Item',
  colPrice: 'Price',
  colCost: 'Cost',
  colMargin: 'Margin',
  colPct: 'Margin %',
  colSold: 'Units sold',
  colContribution: 'Contribution',
  partialRecipe: 'Partial recipe',
  noRecipe: 'No recipe',
  dash: '—',
}

export default function CostingPage() {
  const { selectedTenant } = useTenant()
  const [report, setReport] = useState<CostingReport | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!selectedTenant) {
      setReport(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`/api/menu/costing?venue_id=${selectedTenant.tenant_id}`)
      if (!response.ok) throw new Error('Failed to load costing report')
      setReport(await response.json())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load costing report')
    } finally {
      setLoading(false)
    }
  }, [selectedTenant])

  useEffect(() => {
    void load()
  }, [load])

  if (!selectedTenant) {
    return (
      <main className="min-h-full bg-aro-cream p-6 text-aro-ink">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-aro-hairline bg-aro-cream-warm p-10 text-center">
          <Coffee className="mx-auto h-10 w-10 text-aro-terra" />
          <h1 className="mt-4 font-display text-3xl text-aro-espresso">Choose a client first</h1>
          <p className="mt-2 text-aro-muted">
            Select a venue from the client switcher to see its costing report.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-full bg-aro-cream px-4 py-6 text-aro-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[32px] bg-aro-espresso px-6 py-7 text-aro-cream shadow-xl sm:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-aro-terracotta">
            {STRINGS.eyebrow}
          </p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">{STRINGS.title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-aro-cream/70 sm:text-base">
            {STRINGS.subtitle}
          </p>
          {report ? (
            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-aro-cream/10 px-4 py-3">
                <p className="text-xs text-aro-cream/60">{STRINGS.totalCost}</p>
                <p className="font-mono text-lg font-bold">
                  {formatCents(report.total_cost_cents)}
                </p>
              </div>
              <div className="rounded-2xl bg-aro-cream/10 px-4 py-3">
                <p className="text-xs text-aro-cream/60">{STRINGS.totalMargin}</p>
                <p className="font-mono text-lg font-bold">
                  {formatCents(report.total_margin_cents)}
                </p>
              </div>
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map(value => (
              <div key={value} className="h-24 animate-pulse rounded-[26px] bg-aro-sand" />
            ))}
          </div>
        ) : !report || report.rows.length === 0 ? (
          <div className="mt-6 rounded-[30px] border border-dashed border-aro-clay bg-aro-cream-warm px-6 py-16 text-center">
            <TrendingUp className="mx-auto h-10 w-10 text-aro-terra" />
            <h2 className="mt-4 font-display text-2xl text-aro-espresso">{STRINGS.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-aro-muted">{STRINGS.emptyBody}</p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[26px] border border-aro-hairline bg-aro-cream-warm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-aro-hairline bg-aro-sand/40 text-xs uppercase tracking-wide text-aro-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">{STRINGS.colItem}</th>
                    <th className="px-5 py-3 font-semibold">{STRINGS.colPrice}</th>
                    <th className="px-5 py-3 font-semibold">{STRINGS.colCost}</th>
                    <th className="px-5 py-3 font-semibold">{STRINGS.colMargin}</th>
                    <th className="px-5 py-3 font-semibold">{STRINGS.colPct}</th>
                    <th className="px-5 py-3 font-semibold">{STRINGS.colSold}</th>
                    <th className="px-5 py-3 font-semibold">{STRINGS.colContribution}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-aro-hairline">
                  {report.rows.map(row => (
                    <tr key={row.item_id}>
                      <td className="px-5 py-4">
                        <p className="font-display text-base text-aro-espresso">{row.name}</p>
                        {row.recipe_status !== 'complete' ? (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-aro-saffron/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-aro-saffron">
                            <AlertTriangle className="h-3 w-3" />
                            {row.recipe_status === 'partial'
                              ? STRINGS.partialRecipe
                              : STRINGS.noRecipe}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 font-mono">{formatCents(row.price_cents)}</td>
                      <td className="px-5 py-4 font-mono">
                        {row.cost_cents != null ? formatCents(row.cost_cents) : STRINGS.dash}
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {row.margin_cents != null ? formatCents(row.margin_cents) : STRINGS.dash}
                      </td>
                      <td className="px-5 py-4 font-mono">
                        {row.margin_pct != null ? `${row.margin_pct}%` : STRINGS.dash}
                      </td>
                      <td className="px-5 py-4 font-mono">{row.units_sold}</td>
                      <td className="px-5 py-4 font-mono font-bold text-aro-terra">
                        {row.margin_contribution_cents != null
                          ? formatCents(row.margin_contribution_cents)
                          : STRINGS.dash}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
