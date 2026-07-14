/** Convert a human-entered decimal amount to integer cents without float drift. */
export function dollarsToCents(
  value: string | number,
  options: { allowNegative?: boolean } = {}
): number {
  const normalized = typeof value === 'number' ? value.toFixed(2) : value.trim()
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(normalized)
  if (!match) throw new Error('Enter a valid amount with at most two decimal places')

  const negative = match[1] === '-'
  if (negative && !options.allowNegative) throw new Error('Amount cannot be negative')
  const whole = Number(match[2])
  const fraction = Number((match[3] ?? '').padEnd(2, '0'))
  const cents = (whole * 100 + fraction) * (negative ? -1 : 1)
  if (!Number.isSafeInteger(cents)) throw new Error('Amount is out of range')
  return cents
}

export function formatCents(cents: number, currency = 'CAD', locale = 'en-CA'): string {
  if (!Number.isSafeInteger(cents)) throw new Error('Cents must be a safe integer')
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}
