---
id: verification-2026-09-20
title: Verification report
status: observed
updated: 2026-09-20
tags: [product-os, evidence]
---

# Verification report

Back to [evidence](../EVIDENCE.md), [quality strategy](../QUALITY-STRATEGY.md) and [handoff](../handoffs/HANDOFF-2026-09-20.md).

Application baseline: 05022ffd797bea8149a44bcac3959c648158b594. Product OS changes are documentation, root worker instructions, a dependency-free documentation checker, and comments in .env.example. No application runtime or dependency changes.

| Check | Result | Meaning |
|---|---|---|
| Fresh Git clone and main recheck | PASS; same baseline SHA | Current source and history available |
| Dependency install | PASS: npm ci --ignore-scripts --no-audit --no-fund, 696 packages | Lockfile installation only; no lifecycle scripts or vulnerability audit |
| Initial offline install | BLOCKED by npm-cache filesystem permissions | Retried successfully with authorized access |
| npm run type-check | PASS, exit 0 | TypeScript baseline passes |
| npm run lint:strict | FAIL, exit 1 | Existing components/owner/CreativeStudio.tsx:248 aria-disabled unsupported on section/region; zero-warning policy correctly rejects it |
| npm run build, restricted network | FAIL | Google Font fetches denied by sandbox |
| npm run build, authorized network | FAIL, exit 1 | Compiled with warnings and reached page-data/static generation, then Node process exhausted memory; no local successful build claim |
| Existing SQL suites | NOT RUN | No disposable database/CLI environment established; live projects inactive |
| Browser journeys | NOT RUN | No isolated running fixture environment established |
| Courier/POS/AI paid calls | NOT RUN | No credentials, spend or live activation assumed |
| node --check docs/product-os/check.mjs | PASS | Checker syntax |
| Pinned source-reference validation | PASS: 132 baseline file/directory references resolved | Checked against git ls-tree at baseline |
| Product OS structure/link/secret-pattern checker | PASS: 32 Markdown files and 129 relative links | Checks local documentation integrity, not business behavior |
| git diff --check | PASS before commit | No whitespace-error finding |

Build warnings include Supabase dependency use of process.version in an Edge import chain, Sentry deprecations and transient font TLS retries. These warrant follow-up; they are not silently fixed by the strategy PR.

## Reproduce documentation validation

```sh
node docs/product-os/check.mjs
git diff --check
```

The checker validates required frontmatter, unique document IDs, existing internal link targets, seven complete worker packet sections, ledger coverage, obvious key/JWT patterns and environment URLs. It is a focused guard, not a comprehensive secret scanner.

## Release interpretation
Documentation validation can pass while the application has a failing baseline lint check and unverified build/runtime. SPEC-01 owns the application check repairs and test infrastructure. Do not mark historical functionality locally journey-verified from the type-check result.
