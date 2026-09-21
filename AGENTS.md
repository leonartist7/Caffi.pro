# Caffi.pro worker instructions

These instructions were introduced with the Product OS on 2026-09-20. No root AGENTS.md existed at the audited baseline.

- Start with [Product OS](docs/product-os/README.md), [current state](docs/product-os/CURRENT-STATE.md), and [execution ledger](docs/product-os/EXECUTION-LEDGER.md).
- Use the assigned spec and [worker protocol](docs/product-os/WORKER-PROTOCOL.md). Historical plans are evidence, not current priorities or permission to run live SQL.
- Follow the [five-phase roadmap](docs/product-os/ROADMAP.md) and [continuity procedure](docs/product-os/CONTINUITY.md): select eligible work, specify before coding, verify acceptance criteria, update affected documents in the same PR, and leave an exact resume point.
- Every implementation PR updates the execution ledger with exact changes, checks, environment, blockers and next owner.
- Separate code presence, local verification, sandbox verification and live verification. Do not claim production readiness from build success.
- Preserve tenant/row authorization, money idempotency and server-only secrets. Sensitive changes require independent architecture/security review.
- Work on a codex/ branch. Coordinate shared files and migrations before parallel edits; do not overwrite another worker's changes.
- Use synthetic local/staging fixtures. Never silently substitute production credentials or data for missing test infrastructure.
- Do not merge/deploy production, mutate live databases/RLS/configuration, activate accounts, spend money or send customer messages without explicit founder authorization.
- The nested spec-kit-main/AGENTS.md governs the vendored toolkit only. Do not edit that toolkit as part of ordinary product work.
