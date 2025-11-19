# Caffi.pro Project Constitution

**Version**: 1.0
**Established**: 2025-11-19
**Last Reviewed**: 2025-11-19

---

## 🎯 Project Vision

**Caffi.pro empowers independent coffee shop owners to compete with chains by providing a white-label mobile ordering and loyalty platform without technical knowledge or massive upfront investment.**

**Mission**: Make enterprise-grade mobile ordering accessible to every coffee shop, regardless of size or technical expertise.

---

## 💎 Core Principles

### 1. **Multi-Tenant First**

- Every feature must support multiple tenants with complete data isolation
- Tenant-specific branding, configuration, and customization
- No tenant can access another tenant's data (enforced at database level)

### 2. **Type Safety Always**

- Zero TypeScript errors at all times (non-negotiable)
- Strict type checking enabled
- All API responses properly typed
- No `any` types without explicit justification

### 3. **Test-Driven Reliability**

- All features must have tests before deployment
- Minimum 80% code coverage
- Smoke tests must pass before any push
- E2E tests for critical user paths

### 4. **Mobile-First Design**

- All interfaces designed for mobile screens first
- PWA-ready (installable, offline-capable)
- Touch-friendly interactions
- Fast loading (<2s)

### 5. **Security by Default**

- Row-Level Security (RLS) on all database tables
- Authentication required for all sensitive operations
- No hardcoded secrets
- Input validation on all user inputs
- HTTPS only in production

### 6. **Developer Experience**

- Clear error messages
- Consistent code patterns
- Comprehensive documentation
- Fast development feedback loops
- No surprises

---

## 🏗️ Technical Standards

### Architecture

**Current State**: Monolithic Next.js application
**Target State**: Library-first architecture with CLI interfaces (SpecKit-compliant)

**Principles**:

- **Separation of Concerns**: UI, business logic, and data access are separate layers
- **Data Access Layer**: All database operations through centralized data access functions
- **API Routes**: RESTful conventions, proper HTTP methods, consistent error responses
- **Component Structure**: Functional components, React hooks, composition over inheritance

### Database

**Provider**: Supabase PostgreSQL
**Schema Management**: SQL migrations in `supabase/migrations/`

**Standards**:

- Row-Level Security (RLS) on every table
- Foreign keys for all relationships
- Indexes on frequently queried columns
- Proper data types (UUID for IDs, timestamptz for dates)
- Soft deletes where data preservation is important

**Tables** (18 total):

- Multi-tenancy: `tenants`, `locations`, `staff_members`
- Menu: `categories`, `menu_items`, `modifiers`, `menu_item_modifiers`
- Orders: `orders`, `order_items`, `order_item_modifiers`
- Users: `users` (customer accounts)
- Loyalty: `loyalty_tiers`, `loyalty_points`, `loyalty_rewards`, `loyalty_transactions`
- Promotions: `coupons`, `coupon_usages`
- Inventory: `inventory_items`, `inventory_transactions`

### Code Quality

**Linting**: ESLint with Next.js config
**Formatting**: Prettier (enforced via lint-staged)
**Pre-commit**: Husky + lint-staged

**Standards**:

- Zero TypeScript errors
- Zero ESLint errors
- ESLint warnings addressed before merge
- All imports organized (external → internal → relative)
- Consistent naming (camelCase for variables/functions, PascalCase for components)

### Testing

**Framework**: Jest + Testing Library + Playwright

**Coverage Goals**:

- Smoke tests: 100% (critical paths verified)
- Unit tests: >80%
- Integration tests: >70%
- E2E tests: >50%

**Test Structure**:

```
tests/
├── smoke/          # Quick verification tests
├── unit/           # Component and function tests
├── integration/    # Feature workflow tests
└── e2e/            # End-to-end user journey tests
```

**Standards**:

- AAA pattern (Arrange → Act → Assert)
- One assertion per test (or closely related assertions)
- Descriptive test names: `should [behavior] when [condition]`
- No test interdependencies
- Fast tests (<100ms for unit, <1s for integration)

### Performance

**Targets**:

- Page load: <2s (first contentful paint)
- API response: <200ms (p95)
- Real-time latency: <500ms (order updates)
- Bundle size: <500KB initial JavaScript

**Optimization**:

- Use `next/image` for all images (not `<img>`)
- React.memo for list components
- React Query for data fetching (caching, deduplication)
- Code splitting for large features
- Lazy loading for below-the-fold content

### Dependencies

**Philosophy**: Minimize dependencies, maximize value

**Package Management**: npm (lock file committed)

**Upgrade Policy**:

- Security updates: Immediate
- Major versions: Planned, tested thoroughly
- Keep dependencies up to date (review monthly)

**Current Stack**:

- **Framework**: Next.js 14.2.33
- **Language**: TypeScript 5.3.3
- **UI**: React 18.2, Tailwind CSS 3.4
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **State**: React Query 5.90.7
- **Forms**: React Hook Form 7.66.0
- **Charts**: Recharts 2.15.4
- **Icons**: Heroicons 2.2.0, Lucide React 0.553.0
- **Testing**: Jest 30.2.0, Testing Library 16.3.0, Playwright 1.56.1

---

## 🎨 Design Principles

### User Experience

**Customer Experience (Mobile)**:

- Browse menu in <2 taps
- Add to cart in <3 taps
- Checkout in <4 taps
- Clear, real-time order status

**Café Owner Experience (Desktop/Tablet)**:

- Setup new shop in <30 minutes
- Add menu items in <1 minute each
- Process orders in real-time
- Understand business with clear analytics

**Staff Experience (Tablet)**:

- View new orders instantly
- Update order status in 1 tap
- Manage inventory easily
- No training required (intuitive)

### Visual Design

**Branding**: White-label (each café has own logo, colors, name)
**Typography**: System fonts for performance
**Color System**: Tailwind CSS utilities + custom CSS variables for tenant branding
**Spacing**: Tailwind spacing scale (4px base unit)
**Components**: Consistent, reusable, accessible

---

## 📊 Quality Gates

### Before Committing

- [ ] TypeScript compiles (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] Code formatted (`prettier --write`)

### Before Merging

- [ ] All quality gates passed
- [ ] Code reviewed by maintainer
- [ ] Tests added for new features
- [ ] Documentation updated
- [ ] No decrease in test coverage

### Before Deploying

- [ ] Smoke tests pass
- [ ] E2E tests pass in staging
- [ ] Performance metrics acceptable
- [ ] Security scan clean
- [ ] Database migrations applied
- [ ] Environment variables configured

---

## 🔄 Development Workflow

### Feature Development (SpecKit Methodology)

1. **Specify** (`/speckit.specify`): Define the feature
   - User scenarios
   - Requirements
   - Success criteria
   - Output: `.specify/specs/{feature-name}.md`

2. **Plan** (`/speckit.plan`): Design the implementation
   - Technical approach
   - Data model changes
   - API contracts
   - Testing strategy
   - Output: `.specify/plans/{feature-name}.md`

3. **Tasks** (`/speckit.tasks`): Break down into tasks
   - Atomic, testable units
   - Dependencies identified
   - Estimated effort
   - Output: `.specify/tasks/{feature-name}.md`

4. **Implement** (`/speckit.implement`): Execute
   - TDD: Write tests first
   - Implement feature
   - Verify against spec
   - Document as needed

5. **Review**: Code review
   - Ensure spec requirements met
   - Check test coverage
   - Verify code quality
   - Validate performance

6. **Deploy**: Ship to production
   - Staging deployment first
   - Smoke tests in staging
   - Production deployment
   - Monitor for errors

### Git Workflow

**Branch Strategy**:

- `main`: Production-ready code
- `feature/*`: New features
- `fix/*`: Bug fixes
- `refactor/*`: Code improvements

**Commit Messages**:

```
<type>: <short description>

<optional body>

<optional footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Example**:

```
feat: Add loyalty points calculation

Implement points calculation based on order total and tier multiplier.
Supports bronze (1x), silver (1.25x), gold (1.5x), platinum (2x).

Closes #42
```

### Code Review Checklist

- [ ] Meets specification requirements
- [ ] Follows code quality standards
- [ ] Tests added and passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Performance acceptable
- [ ] Security considerations addressed
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)

---

## 🚨 Non-Negotiables

These principles are **NEVER** compromised:

1. **Zero TypeScript Errors**: Build must succeed with no errors
2. **Data Isolation**: Tenants must never access each other's data
3. **Security First**: Authentication and authorization always enforced
4. **Test Before Deploy**: No deployment without passing tests
5. **No Hardcoded Secrets**: All secrets in environment variables
6. **Accessibility**: WCAG 2.1 AA compliance minimum
7. **Mobile-First**: All features work on mobile devices

---

## 📈 Success Metrics

### Technical Health

| Metric            | Target | Current | Status |
| ----------------- | ------ | ------- | ------ |
| TypeScript Errors | 0      | 0       | ✅     |
| ESLint Errors     | 0      | 0       | ✅     |
| ESLint Warnings   | 0      | 62      | 🔴     |
| Test Coverage     | >80%   | 0%      | 🔴     |
| Build Time        | <2min  | ~1min   | ✅     |
| Page Load         | <2s    | Unknown | ⏳     |
| API Response      | <200ms | Unknown | ⏳     |

### Business Metrics (Post-Launch)

| Metric          | Target (Year 1) |
| --------------- | --------------- |
| Active Cafés    | 50              |
| Orders/Day      | 500             |
| Monthly Revenue | $50k            |
| Customer NPS    | >50             |
| System Uptime   | 99.9%           |

---

## 🔧 Technical Debt Management

**Policy**: Address technical debt systematically, not reactively

**Classification**:

- **Critical**: Blocks features or causes bugs → Fix immediately
- **High**: Impacts velocity or quality → Fix this sprint
- **Medium**: Causes inconvenience → Fix this month
- **Low**: Nice to have → Backlog

**Current Technical Debt** (from audits):

1. **CRITICAL**: No test coverage (0% → 80%)
2. **CRITICAL**: Not SpecKit-compliant (40% → 90%)
3. **HIGH**: 62 ESLint warnings (62 → 0)
4. **HIGH**: No data access layer (direct Supabase calls everywhere)
5. **MEDIUM**: Inconsistent error handling
6. **MEDIUM**: No input validation layer
7. **MEDIUM**: Documentation fragmented
8. **LOW**: Not using next/image for all images

**Commitment**: Allocate 20% of sprint capacity to technical debt reduction

---

## 🎓 Learning & Growth

**Documentation**: Required for all features
**Knowledge Sharing**: Code reviews are learning opportunities
**Continuous Improvement**: Weekly retrospectives
**Skill Development**: Invest in learning new technologies/patterns

---

## 🔄 Constitution Review

**Cadence**: Quarterly (or when major architectural decisions needed)
**Process**:

1. Review current principles
2. Assess adherence
3. Propose changes
4. Discuss with team
5. Update constitution
6. Communicate changes

**Last Review**: 2025-11-19
**Next Review**: 2026-02-19

---

## 📝 Amendment Process

**Who Can Propose**: Any team member
**How to Propose**:

1. Create GitHub issue with `constitution` label
2. Describe rationale for change
3. Show impact analysis
4. Propose specific wording

**Approval**: Requires consensus (Leon as final decider)

---

## 🎯 Current Phase: Project Reset & SpecKit Adoption

**Goal**: Stabilize codebase and establish SpecKit-compliant workflow

**Week 1 Priorities** (CRITICAL):

1. ✅ Setup testing infrastructure
2. ✅ Bootstrap SpecKit structure
3. ✅ Create constitution
4. ⏳ Fix ESLint warnings
5. ⏳ Remove dev mode bypasses

**Success Criteria**:

- Tests running and passing
- SpecKit commands working
- Zero ESLint warnings
- Constitution approved by Leon
- Team aligned on principles

---

**Maintained By**: Leon (Project Owner) & Development Team
**Enforced By**: Code reviews, CI/CD pipeline, and team commitment
**Living Document**: Updated as project evolves

---

_"Quality is not an act, it is a habit." - Aristotle_
