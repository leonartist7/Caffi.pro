import { ComingSoon } from '@/components/ComingSoon'

/**
 * Marketing sends (email/SMS campaigns) are blocked on a vendor decision
 * (v2R §8: Resend/Twilio accounts, CASL/CAN-SPAM sign-off) and belong to
 * Lane A when that gate opens. This page keeps the owner nav's "Campaigns"
 * entry honest in the meantime — a real page, not a 404 or a fake feature.
 */
export default function OwnerCampaignsPage() {
  return (
    <ComingSoon
      title="Campaigns"
      description="Email and SMS campaigns are on the way — your loyalty data is already set up for it."
    />
  )
}
