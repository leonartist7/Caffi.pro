# Priority Matrix - Caffi.pro Project Reset

**Date**: 2025-11-19
**Project**: Caffi.pro Multi-Tenant SaaS
**Purpose**: Prioritized action plan for project stabilization and SpecKit adoption

---

## 🔥 CRITICAL (Fix Immediately - This Week)

### 1. Setup Testing Infrastructure 🔴

**Issue**: Zero test coverage, no testing framework
**Impact**: Cannot verify code correctness, high regression risk
**Effort**: 1-2 days
**Owner**: TBD

**Actions**:

- [ ] Install Jest + Testing Library
- [ ] Install Playwright for E2E tests
- [ ] Create `tests/` directory structure
- [ ] Add test scripts to package.json
- [ ] Add test check to pre-commit hooks
- [ ] Write first 5 smoke tests (critical paths)

**Success Criteria**: `npm test` runs and passes 5+ tests

---

### 2. Bootstrap SpecKit Structure 🔴

**Issue**: No SpecKit directory structure, cannot use SpecKit commands
**Impact**: Cannot follow spec-driven workflow
**Effort**: 30 minutes
**Owner**: TBD

**Actions**:

- [ ] Run `specify init --here --ai claude --force`
- [ ] Verify `.specify/` directory created
- [ ] Verify `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement` commands available
- [ ] Move existing `speckit/` audits to `.specify/docs/` for reference

**Success Criteria**: SpecKit slash commands work in Claude Code

---

### 3. Create Project Constitution 🔴

**Issue**: No documented project principles
**Impact**: No shared understanding of "how we build"
**Effort**: 2-3 hours
**Owner**: TBD (with Leon's input)

**Actions**:

- [ ] Create `.specify/memory/constitution.md`
- [ ] Document core principles (type safety, testing, multi-tenancy, etc.)
- [ ] Define architectural constraints
- [ ] Set performance requirements
- [ ] Define security requirements
- [ ] Get Leon's review and approval

**Success Criteria**: Constitution exists and team agrees to follow it

---

### 4. Fix ESLint Warnings 🔴

**Issue**: 62 ESLint warnings cluttering output
**Impact**: Hard to spot real issues, code quality degradation
**Effort**: 2-3 hours
**Owner**: TBD

**Actions**:

- [ ] Run `npm run lint -- --fix` (auto-fix unused imports)
- [ ] Fix React hooks dependencies (wrap functions in useCallback)
- [ ] Remove unused variables
- [ ] Add `import React from 'react'` where needed (or configure ESLint to ignore)
- [ ] Run `npm run lint` to verify zero warnings

**Success Criteria**: `npm run lint` shows zero warnings

---

### 5. Remove Dev Mode Auth Bypasses 🔴

**Issue**: Dev mode bypasses authentication (security risk)
**Impact**: Could accidentally deploy in dev mode
**Effort**: 30 minutes
**Owner**: TBD

**Actions**:

- [ ] Remove dev mode bypass from `AuthContext.tsx`
- [ ] Add environment variable validation in CI/CD
- [ ] Add warning if `NODE_ENV !== 'production'` in production
- [ ] Document auth flow in constitution

**Success Criteria**: Cannot bypass auth, even in dev

---

## 🟡 HIGH (Fix This Week)

### 6. Smoke Test Critical Paths 🟡

**Issue**: Haven't verified core flows work end-to-end
**Impact**: Unknown if system is functional
**Effort**: 2-4 hours (manual testing)
**Owner**: TBD

**Actions**:

- [ ] Test: Create tenant → Add location → Add category → Add menu item
- [ ] Test: Access customer shop → Add to cart → Checkout → Place order
- [ ] Test: View order in admin dashboard
- [ ] Test: Update order status in staff portal
- [ ] Test: Verify loyalty points awarded
- [ ] Document any bugs discovered
- [ ] Create GitHub issues for bugs

**Success Criteria**: All 5 smoke tests pass

---

### 7. Create Data Access Layer 🟡

**Issue**: Database queries scattered throughout components
**Impact**: Duplicate code, hard to maintain, no caching
**Effort**: 1 week
**Owner**: TBD

**Actions**:

- [ ] Create `lib/data-access/` directory
- [ ] Extract tenant queries to `tenants.ts`
- [ ] Extract menu queries to `menu-items.ts`, `categories.ts`
- [ ] Extract order queries to `orders.ts`
- [ ] Extract location queries to `locations.ts`
- [ ] Extract user queries to `users.ts`
- [ ] Update components to use data access layer
- [ ] Add TypeScript types for all functions

**Success Criteria**: All DB operations centralized, components cleaner

---

### 8. Add Error Handling Utility 🟡

**Issue**: Inconsistent error handling, errors only logged to console
**Impact**: Poor UX when errors occur
**Effort**: 2 hours
**Owner**: TBD

**Actions**:

- [ ] Create `lib/error-handler.ts`
- [ ] Implement `handleError(error, userMessage)` function
- [ ] Update all try-catch blocks to use utility
- [ ] Add user-friendly toast notifications for errors
- [ ] Log errors to console for debugging
- [ ] (Future) Send errors to Sentry

**Success Criteria**: Errors show user-friendly messages, not just console.error

---

### 9. Standardize on React Query 🟡

**Issue**: Mixed data fetching approaches (useState + useEffect vs React Query)
**Impact**: Inconsistent loading states, no caching, duplicate logic
**Effort**: 1-2 weeks
**Owner**: TBD

**Actions**:

- [ ] Identify all manual `useState` + `useEffect` data fetching
- [ ] Convert to React Query `useQuery` hooks
- [ ] Configure cache times and stale times
- [ ] Add query invalidation on mutations
- [ ] Remove duplicate fetch logic
- [ ] Add loading skeletons consistently

**Success Criteria**: All data fetching uses React Query, better UX

---

### 10. Consolidate Documentation 🟡

**Issue**: 40+ MD files in root, hard to navigate
**Impact**: Can't find information quickly, overwhelming for new devs
**Effort**: 4-6 hours
**Owner**: TBD

**Actions**:

- [ ] Create `/docs` directory structure
- [ ] Move architecture docs to `/docs/architecture/`
- [ ] Move setup guides to `/docs/setup/`
- [ ] Move troubleshooting to `/docs/troubleshooting/`
- [ ] Archive old fix/diagnostic files to `/docs/archive/`
- [ ] Update README.md with links to organized docs
- [ ] Delete duplicate/obsolete documentation

**Success Criteria**: Clean root directory, organized `/docs` structure

---

## 🟢 MEDIUM (Fix This Month)

### 11. Extract Core Logic to Libraries 🟢

**Issue**: Not library-first architecture (SpecKit requirement)
**Impact**: Cannot test independently, tight coupling
**Effort**: 3-4 weeks
**Owner**: TBD

**Actions**:

- [ ] Extract tenant management to `libs/tenant-management/`
- [ ] Extract order management to `libs/order-management/`
- [ ] Extract menu management to `libs/menu-management/`
- [ ] Extract auth management to `libs/auth-management/`
- [ ] Add CLI interfaces to each library (SpecKit requirement)
- [ ] Write contract tests for each library
- [ ] Update app to use libraries

**Success Criteria**: Core logic in libraries, CLI commands work

---

### 12. Add Input Validation (Zod) 🟢

**Issue**: No input validation layer
**Impact**: Data quality issues, potential injection risks
**Effort**: 1 week
**Owner**: TBD

**Actions**:

- [ ] Install Zod
- [ ] Create validation schemas for all API routes
- [ ] Create validation schemas for forms
- [ ] Validate inputs before database operations
- [ ] Return validation errors to user
- [ ] Add TypeScript types from Zod schemas

**Success Criteria**: All inputs validated, better data quality

---

### 13. Replace <img> with next/image 🟢

**Issue**: Using <img> tags instead of next/image
**Impact**: No image optimization, slower page loads
**Effort**: 1 day
**Owner**: TBD

**Actions**:

- [ ] Find all <img> tags in codebase
- [ ] Replace with next/image component
- [ ] Add width and height attributes
- [ ] Configure domains in next.config.js
- [ ] Test image loading

**Success Criteria**: All images use next/image, faster loads

---

### 14. Add Performance Monitoring 🟢

**Issue**: No performance tracking
**Impact**: Can't identify bottlenecks or regressions
**Effort**: 2 days
**Owner**: TBD

**Actions**:

- [ ] Setup Vercel Analytics
- [ ] Setup Sentry Performance Monitoring
- [ ] Add Core Web Vitals tracking
- [ ] Setup Lighthouse CI
- [ ] Monitor bundle size
- [ ] Create performance dashboard

**Success Criteria**: Can track and monitor performance

---

### 15. Add Error Boundaries 🟢

**Issue**: No error boundary components
**Impact**: Component crashes crash entire app
**Effort**: 1 day
**Owner**: TBD

**Actions**:

- [ ] Install react-error-boundary
- [ ] Create ErrorFallback component
- [ ] Wrap app in ErrorBoundary
- [ ] Add error boundaries to critical components
- [ ] Test error handling

**Success Criteria**: App gracefully handles component errors

---

### 16. Create Feature Specifications 🟢

**Issue**: No specs for existing features
**Impact**: Can't use SpecKit workflow for future changes
**Effort**: 2 weeks
**Owner**: TBD

**Actions**:

- [ ] Use `/speckit.specify` to document tenant management
- [ ] Specify customer shop experience
- [ ] Specify staff operations portal
- [ ] Specify order management
- [ ] Specify loyalty rewards
- [ ] Specify menu management
- [ ] Specify inventory tracking

**Success Criteria**: All major features have specifications

---

## 🔵 LOW (Backlog - This Quarter)

### 17. Payment Integration (Stripe) 🔵

**Feature**: Process credit card payments
**Impact**: Required for production launch
**Effort**: 2-3 weeks
**Owner**: TBD

**Actions**:

- [ ] Setup Stripe account
- [ ] Install Stripe SDK
- [ ] Create payment intent API route
- [ ] Add payment form to checkout
- [ ] Handle webhooks (payment confirmed)
- [ ] Handle refunds
- [ ] Add payment status to orders table
- [ ] Test with Stripe test mode

**Success Criteria**: Can process payments end-to-end

---

### 18. Email Notifications 🔵

**Feature**: Send order confirmations via email
**Impact**: Better customer communication
**Effort**: 1 week
**Owner**: TBD

**Actions**:

- [ ] Setup SendGrid or Resend account
- [ ] Create email templates (order confirmation, receipt)
- [ ] Send email on order placement
- [ ] Send email on order ready
- [ ] Add email preferences to user profile

**Success Criteria**: Emails sent reliably

---

### 19. PWA Icon Generation 🔵

**Feature**: Generate PWA icons for installability
**Impact**: PWA can be installed to home screen
**Effort**: 1 hour
**Owner**: TBD

**Actions**:

- [ ] Generate 192x192 icon
- [ ] Generate 512x512 icon
- [ ] Generate favicon.ico
- [ ] Update manifest.json with icon paths
- [ ] Test PWA installation

**Success Criteria**: PWA installable on iOS and Android

---

### 20. Caching Strategy 🔵

**Feature**: Implement caching for performance
**Impact**: Faster page loads, reduced DB load
**Effort**: 1 week
**Owner**: TBD

**Actions**:

- [ ] Configure React Query cache times
- [ ] Add Next.js data cache for static data
- [ ] Configure Supabase query caching
- [ ] Add CDN caching headers
- [ ] Test cache invalidation

**Success Criteria**: Reduced DB queries, faster loads

---

## ⏸️ DEFERRED (Not Now)

### 21. Mobile App (React Native) ⏸️

**Feature**: Native iOS and Android apps
**Impact**: Better mobile UX (but PWA sufficient for now)
**Effort**: 2-3 months
**Owner**: TBD

**Reason for Deferral**: PWA provides 80% of native app benefits at 20% of the cost. Focus on core web experience first.

**Revisit When**: >50 tenants requesting native app

---

### 22. Advanced Analytics Dashboard ⏸️

**Feature**: Deep analytics (cohorts, LTV, churn)
**Impact**: Better business insights (but basic reports sufficient for now)
**Effort**: 1 month
**Owner**: TBD

**Reason for Deferral**: Basic reports meet current needs. Advanced analytics can wait until more data volume.

**Revisit When**: >10 tenants with >1000 orders each

---

### 23. Multi-Language Support ⏸️

**Feature**: Support for multiple languages
**Impact**: Expand to non-English markets
**Effort**: 2-3 weeks
**Owner**: TBD

**Reason for Deferral**: Focus on English-speaking markets first (US, UK, Australia)

**Revisit When**: Demand from non-English markets

---

### 24. API for Third-Party Integrations ⏸️

**Feature**: Public API for external systems
**Impact**: Integrate with POS, accounting, etc.
**Effort**: 1-2 months
**Owner**: TBD

**Reason for Deferral**: No demand yet, focus on core features

**Revisit When**: Multiple tenants request integration capabilities

---

## 📊 Priority Summary

| Priority     | Tasks | Total Effort | Blocking?    |
| ------------ | ----- | ------------ | ------------ |
| **CRITICAL** | 5     | 1 week       | 🔴 Yes       |
| **HIGH**     | 5     | 3-4 weeks    | 🟡 Partially |
| **MEDIUM**   | 6     | 2-3 months   | 🟢 No        |
| **LOW**      | 4     | 1-2 months   | 🔵 No        |
| **DEFERRED** | 4     | 6+ months    | ⏸️ No        |

---

## 🗓️ Execution Timeline

### Week 1 (CRITICAL + HIGH Priority)

**Focus**: Stabilize and test

- Day 1-2: Setup testing infrastructure + Bootstrap SpecKit
- Day 3: Create constitution + Fix ESLint warnings
- Day 4: Remove dev mode bypasses + Smoke test
- Day 5: Create data access layer (start)

**Deliverables**:

- ✅ Tests running
- ✅ SpecKit working
- ✅ Constitution documented
- ✅ Zero ESLint warnings
- ✅ Core flows verified

---

### Week 2-4 (HIGH Priority Completion)

**Focus**: Code quality and consistency

- Week 2: Data access layer + Error handling utility
- Week 3: Standardize on React Query
- Week 4: Consolidate documentation

**Deliverables**:

- ✅ Centralized DB operations
- ✅ Better error handling
- ✅ Consistent data fetching
- ✅ Organized documentation

---

### Month 2-3 (MEDIUM Priority)

**Focus**: SpecKit alignment and architecture

- Month 2: Extract libraries (tenant, order, menu, auth)
- Month 3: Add validation, optimize images, add monitoring

**Deliverables**:

- ✅ Library-first architecture
- ✅ Input validation
- ✅ Performance monitoring
- ✅ Feature specifications

---

### Month 4-6 (LOW Priority + New Features)

**Focus**: Production readiness

- Payments integration
- Email notifications
- PWA finalization
- Caching strategy

**Deliverables**:

- ✅ Payment processing
- ✅ Email notifications
- ✅ Optimized performance

---

## 🎯 Success Criteria for Project Reset

The project reset will be **complete** when:

1. ✅ All CRITICAL tasks done (testing, SpecKit, constitution, warnings fixed)
2. ✅ All HIGH tasks done (smoke tests pass, clean architecture)
3. ✅ All MEDIUM tasks done (library-first, specs created)
4. ✅ Code quality score >90% (currently 63%)
5. ✅ SpecKit compliance >90% (currently 40%)
6. ✅ Test coverage >80% (currently 0%)
7. ✅ Zero TypeScript errors (already achieved ✅)
8. ✅ Zero ESLint warnings (currently 62)
9. ✅ Documentation organized and complete
10. ✅ Leon approves final state

---

**Last Updated**: 2025-11-19
**Maintained By**: Project Team
**Review Cadence**: Weekly
