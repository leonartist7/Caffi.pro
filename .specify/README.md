# SpecKit Directory Structure

This directory contains all SpecKit-related files for the Caffi.pro project.

## Directory Structure

```
.specify/
├── memory/           # Persistent context and constitution
│   └── constitution.md
├── specs/            # Feature specifications
├── plans/            # Implementation plans
├── tasks/            # Task breakdowns
└── docs/             # Reference documentation and audits
```

## SpecKit Workflow

1. **Specify** (`/speckit.specify`): Define what to build
   - Output: `.specify/specs/{feature-name}.md`

2. **Plan** (`/speckit.plan`): Design how to build it
   - Output: `.specify/plans/{feature-name}.md`

3. **Tasks** (`/speckit.tasks`): Break down into actionable items
   - Output: `.specify/tasks/{feature-name}.md`

4. **Implement** (`/speckit.implement`): Execute the tasks
   - Uses tasks and plans to guide implementation

## Constitution

The project constitution (`memory/constitution.md`) defines:

- Core principles and values
- Technical standards
- Architectural decisions
- Quality requirements

## Current Status

- **Initialized**: 2025-11-19
- **AI Assistant**: Claude (Sonnet 4.5)
- **Project**: Caffi.pro Multi-Tenant SaaS
- **Phase**: 6 - Project Reset & SpecKit Adoption

## Reference Documents

All audit documents from the project reset are in `.specify/docs/`:

- `EXECUTIVE_SUMMARY.md` - High-level overview
- `ROADMAP.md` - 6-month development timeline
- `PRIORITY_MATRIX.md` - Prioritized action plan
- `MASTER_SPEC.md` - Complete product specification
- `COMPLIANCE_AUDIT.md` - SpecKit alignment analysis
- `HEALTH_CHECK.md` - System functionality audit
- `CODE_AUDIT.md` - Code quality analysis
- `ARCHITECTURE_REVIEW.md` - Architecture assessment

## Usage

Use SpecKit slash commands in Claude Code:

- `/speckit.specify {feature}` - Create specification
- `/speckit.plan {feature}` - Create implementation plan
- `/speckit.tasks {feature}` - Generate task breakdown
- `/speckit.implement {feature}` - Execute implementation

---

**Maintained By**: Development Team
**Last Updated**: 2025-11-19
