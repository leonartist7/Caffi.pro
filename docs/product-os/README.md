---
id: readme
title: ARO Product OS
status: accepted-strategy
updated: 2026-09-21
baseline: 05022ffd797bea8149a44bcac3959c648158b594
tags: [product-os]
---

# ARO Product OS

The canonical product strategy and execution entry point for Caffi.pro. The first commercial release combines branded direct ordering, white-label delivery, existing POS connections and repeat-guest growth. The founder has no clients yet; optimize for a convincing working sales journey followed by supervised client onboarding.

**Maturity: substantial pre-production implementation; live readiness not established.** Delivery zones are implemented, courier dispatch is not. The database projects currently report INACTIVE. See [current state](CURRENT-STATE.md) before planning a demo.

## Read in order
1. [Current state and ten priority findings](CURRENT-STATE.md)
2. [Vision](VISION.md), [competitive benchmark](COMPETITIVE-BENCHMARK.md), [capability map](CAPABILITY-MAP.md)
3. [Architecture](ARCHITECTURE.md), [delivery contract](DELIVERY-ARCHITECTURE.md), [integration registry](INTEGRATION-REGISTRY.md)
4. [Security](SECURITY-AND-COMPLIANCE.md), [quality](QUALITY-STRATEGY.md), [design](DESIGN-SYSTEM-STRATEGY.md)
5. [Roadmap](ROADMAP.md), [execution ledger](EXECUTION-LEDGER.md), [worker protocol](WORKER-PROTOCOL.md)
6. [Founder decisions](FOUNDER-DECISIONS.md), [evidence](EVIDENCE.md), [handoff](handoffs/HANDOFF-2026-09-20.md)

For every new or resumed implementation session, follow [continuity and documentation maintenance](CONTINUITY.md). The [roadmap](ROADMAP.md) groups the seven packets into five gated phases. The ledger records actual progress; phase numbering is not evidence of completion.

## Authority and maintenance
This package implements the founder-approved strategy as documentation. Runtime features described in specs are future work, not delivered by this PR. Earlier plans and build logs remain historical evidence; this package supersedes their sequencing, not the code they describe.

Every implementation PR updates EXECUTION-LEDGER.md with the changed capability, exact commit/test evidence, environment, remaining gaps and next owner. A completed spec is not a completed feature. Git remains canonical; Obsidian can open this folder as a vault using relative Markdown links and backlinks. Graph tools are optional.

No production merge/deploy, account activation, billing change, database mutation, live configuration change or customer communication is authorized by these documents. Founder approval is required for those gates. Safe local work, tests, documentation and draft PRs may proceed.

This audit found no root AGENTS.md. This PR adds a new explicit root instruction file; it does not claim one existed historically.


## Validate this package
Run `node docs/product-os/check.mjs` from the repository root. It checks frontmatter, local links, packet/ledger coverage and obvious credential/environment-URL leakage. It does not prove application or external integration readiness.
