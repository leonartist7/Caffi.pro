import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const target = path.join(dir, entry.name)
  return entry.isDirectory() ? walk(target) : target.endsWith('.md') ? [target] : []
})
const files = walk(root)
const errors = []
const ids = new Set()
let links = 0
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const label = path.relative(root, file)
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!frontmatter) errors.push(`${label}: missing frontmatter`)
  for (const key of ['id', 'title', 'status', 'updated', 'tags']) {
    if (!new RegExp(`^${key}: .+`, 'm').test(frontmatter?.[1] ?? '')) errors.push(`${label}: missing ${key}`)
  }
  const id = frontmatter?.[1].match(/^id: (.+)$/m)?.[1]
  if (ids.has(id)) errors.push(`${label}: duplicate id ${id}`)
  ids.add(id)
  // Internal Product OS targets use simple relative paths; external links can contain parentheses.
  for (const match of text.matchAll(/\]\(([^\s)]+)\)/g)) {
    const target = match[1]
    if (/^(https?:|mailto:|#)/.test(target)) continue
    links++
    const resolved = path.resolve(path.dirname(file), decodeURIComponent(target.split('#')[0]))
    if (!fs.existsSync(resolved)) errors.push(`${label}: missing target ${target}`)
  }
  if (/https:\/\/[^\s)]*\.vercel\.app|https:\/\/[^\s)]*\.supabase\.co/.test(text)) errors.push(`${label}: environment URL in public vault`)
  if (/\b(?:sk_live_|sk_test_|sb_secret_)[A-Za-z0-9]{12,}|\beyJ[A-Za-z0-9_-]{20,}\./.test(text)) errors.push(`${label}: potential credential`)
  if (label.startsWith(`specs${path.sep}`)) {
    for (const heading of ['Objective and scope', 'Ownership and constraints', 'Acceptance and test plan', 'Dependencies, risk and release gate', 'Ready-to-paste worker prompt']) {
      if (!text.includes(`## ${heading}`)) errors.push(`${label}: missing packet section ${heading}`)
    }
    if (!text.includes('**Lead:**')) errors.push(`${label}: missing model allocation`)
  }
}
const ledger = fs.readFileSync(path.join(root, 'EXECUTION-LEDGER.md'), 'utf8')
for (let n = 1; n <= 7; n++) {
  const id = `SPEC-${String(n).padStart(2, '0')}`
  if (!ledger.includes(id)) errors.push(`Ledger missing ${id}`)
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`PASS: ${files.length} Markdown files; ${links} relative links; unique frontmatter IDs; seven packet/ledger entries; public-vault secret/URL checks.`)
}
