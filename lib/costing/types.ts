export type RecipeStatus = 'complete' | 'partial' | 'none'

/**
 * One row from `get_food_costing_report`. cost_cents/margin_cents/
 * margin_pct/margin_contribution_cents are all null unless
 * recipe_status === 'complete' — a partial number that looks like a real
 * cost is worse than an honest gap.
 */
export interface CostingRow {
  item_id: string
  name: string
  price_cents: number
  recipe_status: RecipeStatus
  cost_cents: number | null
  margin_cents: number | null
  margin_pct: number | null
  units_sold: number
  margin_contribution_cents: number | null
}

export interface CostingReport {
  rows: CostingRow[]
  /** Summed from 'complete' rows only — pure integer addition. */
  total_cost_cents: number
  total_margin_cents: number
}
