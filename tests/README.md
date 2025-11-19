# Caffi.pro Testing Strategy

## Overview

This directory contains all tests for the Caffi.pro platform following a comprehensive testing pyramid approach.

## Test Structure

```
tests/
├── smoke/          # Quick smoke tests (5-10 tests, <10s runtime)
├── unit/           # Unit tests for individual functions/components
├── integration/    # Integration tests for feature workflows
└── e2e/            # End-to-end tests with Playwright
```

## Test Commands

```bash
# Run all unit/integration tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run E2E tests with Playwright
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

## Smoke Tests

**Purpose**: Verify that the system is fundamentally functional before running the full test suite.

**Location**: `tests/smoke/`

**Tests**:

1. `01-supabase-connection.test.ts` - Verifies Supabase client configuration
2. `02-database-schema.test.ts` - Verifies all 18 database tables exist
3. `03-api-routes.test.ts` - Verifies critical API routes respond
4. `04-components-render.test.tsx` - Verifies core components render
5. `05-utilities.test.ts` - Verifies core utility functions work

**When to run**: Before every test suite execution, before deployments

## Unit Tests

**Purpose**: Test individual functions, components, and utilities in isolation.

**Location**: `tests/unit/`

**Coverage Target**: >80%

**Guidelines**:

- Mock external dependencies (Supabase, APIs)
- Test pure functions thoroughly
- Test component rendering and user interactions
- Test edge cases and error handling

## Integration Tests

**Purpose**: Test feature workflows that span multiple components and APIs.

**Location**: `tests/integration/`

**Guidelines**:

- Use test database or mocked Supabase
- Test realistic user scenarios
- Verify data flows between components
- Test API route handlers with database

## E2E Tests

**Purpose**: Test complete user journeys in a real browser environment.

**Location**: `tests/e2e/`

**Framework**: Playwright

**Critical Paths to Test**:

1. Tenant creation → Menu setup → Customer order → Staff fulfillment
2. Customer signup → Browse menu → Add to cart → Checkout → Track order
3. Staff login → View orders → Update status → Complete order
4. Loyalty points earning → Tier progression → Reward redemption

## Test Environment

**Environment Variables**: Tests use `.env.test` for configuration

**Test Data**:

- Use factory functions for creating test data
- Clean up test data after each test
- Use transactions to roll back database changes

## Best Practices

1. **Test Naming**: Use descriptive test names following pattern: `should [expected behavior] when [condition]`
2. **AAA Pattern**: Arrange → Act → Assert
3. **Single Assertion**: Each test should verify one behavior
4. **No Test Interdependencies**: Tests should be independent and runnable in any order
5. **Fast Tests**: Keep unit tests under 100ms, integration tests under 1s
6. **Deterministic**: Tests should produce same result every time

## Coverage Goals

| Type        | Target | Priority    |
| ----------- | ------ | ----------- |
| Smoke       | 100%   | 🔴 Critical |
| Unit        | >80%   | 🔴 Critical |
| Integration | >70%   | 🟡 High     |
| E2E         | >50%   | 🟢 Medium   |

## Running Tests in CI/CD

Tests are automatically run on:

- Every push to feature branches
- Pull requests to main
- Before deployments

**CI Pipeline**:

1. Run smoke tests (fail fast if smoke tests fail)
2. Run unit tests
3. Run integration tests
4. Run E2E tests
5. Generate coverage report
6. Block merge if coverage drops below threshold

## Debugging Tests

**For Jest tests**:

```bash
# Run single test file
npm test -- tests/smoke/01-supabase-connection.test.ts

# Run with verbose output
npm test -- --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest tests/smoke/01-supabase-connection.test.ts
```

**For Playwright tests**:

```bash
# Run with UI for debugging
npm run test:e2e:ui

# Run with headed browser
npx playwright test --headed

# Debug specific test
npx playwright test --debug tests/e2e/customer-order.spec.ts
```

## Next Steps

1. ✅ Setup testing infrastructure (Jest + Playwright)
2. ✅ Write 5 smoke tests
3. ⏳ Write unit tests for core utilities
4. ⏳ Write integration tests for API routes
5. ⏳ Write E2E tests for critical paths
6. ⏳ Achieve >80% test coverage

---

**Last Updated**: 2025-11-19
**Maintained By**: Development Team
