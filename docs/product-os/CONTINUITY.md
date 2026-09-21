---
id: continuity
title: Execution continuity and documentation maintenance
status: accepted-strategy
updated: 2026-09-21
tags: [product-os, execution]
---

# Execution continuity and documentation maintenance

Back to [Product OS](README.md), [five-phase roadmap](ROADMAP.md), [worker protocol](WORKER-PROTOCOL.md) and [execution ledger](EXECUTION-LEDGER.md).

## Start or resume

1. Read root AGENTS.md, this procedure, current state, ledger, founder decisions and the selected spec. Read its linked contracts and latest relevant handoff before changing code.
2. Inspect the working tree, current branch/base, remote PR state and dependency commits. Preserve existing work. The Product OS currently lives in draft PR #83; until merged, use an explicit strategy-branch dependency and record its SHA. A checkout of main alone does not yet contain these instructions.
3. Choose the earliest eligible acceptance slice in the five-phase roadmap. Check dependencies and existing ownership; record active packet, branch, owned modules and intended next deliverable in the ledger/handoff. If assigned a narrower task, stay within that scope.
4. Revalidate time-sensitive environment or provider evidence before relying on it. Old audit results are dated observations, not perpetual operational status.

## Specify, implement and verify

Before coding, give each acceptance criterion a stable identifier within its spec (for example SPEC-03-AC-01). Define the user journey, state transitions, data/API contracts, permissions, failure cases and test method. Expand the existing packet where needed; do not create a competing plan. Review shared contracts before dependent changes. Sensitive auth, money, tenancy and provider changes require the independent review described in the worker protocol.

Implement a bounded slice with meaningful automated regression tests. Map acceptance identifiers to test names or manual evidence in the PR. Run the relevant quality gates; mark unavailable checks as not run with the exact blocker. A spec or passing mock test does not prove a live integration. Preserve failed evidence and append the resolution when fixed.

## Documentation changes in the same PR

| Trigger | Required update |
|---|---|
| Every implementation slice | Ledger row: scope, state, owner, branch/PR, implementation SHA where available, check commands/results, environment, blockers and next action |
| Acceptance criteria or scope change | Owning spec and affected tests; record why, dependencies and any deferred criteria |
| API, schema, lifecycle or integration ownership change | Architecture/delivery contract or integration registry; migration compatibility and rollback in handoff |
| Material product, security or architecture decision | New dated decision record with context, alternatives, decision, consequences and links to affected specs; supersede old decisions explicitly |
| Capability becomes verified or audit finding is resolved | Capability map/current state and dated evidence; retain historical audit files as snapshots |
| Priority, dependency or phase gate changes | Roadmap and ledger; explain the change without silently relaxing acceptance criteria |
| Founder answer or external access changes | Founder decision entry and dependent ledger blockers; record authorization scope without credentials |
| Session ends, work is interrupted or ownership changes | Dated handoff with exact resume point and unresolved checks |

Update frontmatter dates on changed Product OS documents and maintain relative links/backlinks. Never include secrets, customer PII or private environment URLs in public evidence. Reference an existing implementation SHA rather than trying to embed a document commit's own hash in itself.

## Handoff and completion

Use `handoffs/HANDOFF-YYYY-MM-DD-<packet>.md` with the standard Product OS frontmatter. Include objective and acceptance IDs; base/head SHA and PR; owned paths; completed changes; exact checks and results; environment and fixture assumptions; unresolved failures; migration/rollback notes; external effects; blockers and their owners; and the next executable action with its prerequisites.

Run `node docs/product-os/check.mjs` and `git diff --check` before review, plus checks required by the changed code. The document checker validates structure and links, not semantic completeness or application correctness. Reviewers check the acceptance-to-evidence mapping and documentation impact table above.

Mark a packet complete only when its declared scope and required reviews pass. Mark a phase complete only when all its exit criteria have evidence; local, sandbox and live verification remain separate. Failed or unavailable required gates leave the affected scope in review or blocked. Draft PR publication is not merge, deployment or release.

## Autonomy boundaries

Within the authorized task, continue eligible local implementation, tests, documentation and draft PR work without repeatedly asking for routine approval. If a dependency is blocked, record its owner and unblock condition, then advance independent authorized work. Do not silently broaden scope, weaken gates or invent external access.

Production changes, paid dispatches, account activation and customer messaging retain the explicit authorization boundaries in root AGENTS.md. These documents guide an active worker; they do not schedule background execution or ensure every tool loads them automatically. Future tasks must use this repository and read AGENTS.md. Do not claim work continues after the active task stops unless a separately configured automation exists.
