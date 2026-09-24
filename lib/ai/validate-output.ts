import type { GeneratableDraftKind } from './provider'

/** Deterministic storage gate. Human approval still controls publication. */
export function validateDraftOutput(kind: GeneratableDraftKind, output: string): boolean {
  const trimmed = output.trim()
  if (!trimmed || trimmed.length > (kind === 'digest' ? 1500 : 1000)) return false
  if (/[^\S\r\n]{80,}|[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(trimmed)) return false
  if (/(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i.test(trimmed)) return false
  if (/[$€£]\s*\d|\b(?:free|gratis)\b/i.test(trimmed)) return false
  return true
}
