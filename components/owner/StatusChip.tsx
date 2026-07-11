const STYLES: Record<string, string> = {
  new: 'bg-aro-sand text-aro-ink',
  regular: 'bg-aro-sage/30 text-aro-ink',
  fading: 'bg-aro-saffron/30 text-aro-ink',
  lost: 'bg-aro-muted/20 text-aro-muted',
}

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STYLES[status] ?? STYLES.new}`}
    >
      {status}
    </span>
  )
}
