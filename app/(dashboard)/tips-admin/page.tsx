'use client'

import { useTenant } from '@/contexts/TenantContext'
import { TipsReportClient } from '@/components/tips/TipsReportClient'

export default function TipsPage() {
  const { selectedTenant } = useTenant()

  if (!selectedTenant) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-display font-bold text-aro-ink mb-2">No client selected</h2>
        <p className="text-aro-ink-soft">Please select a client from the dropdown above.</p>
      </div>
    )
  }

  return <TipsReportClient venueId={selectedTenant.tenant_id} />
}
