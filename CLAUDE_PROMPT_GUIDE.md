# Claude Prompt Optimization Guide

## Quick Command Keywords

Use these action verbs to start your requests for maximum clarity and efficiency:

### 🔍 **Analysis & Investigation**
- **Analyze** - Deep dive into code, performance, or architecture
- **Investigate** - Research issues, bugs, or unexpected behavior
- **Review** - Code review, security audit, or quality check
- **Explain** - Break down complex code or concepts
- **Trace** - Follow execution flow or data path
- **Profile** - Performance analysis and bottlenecks

### 🐛 **Debugging & Fixing**
- **Debug** - Identify and investigate issues
- **Fix** - Resolve specific bugs or errors
- **Resolve** - Address warnings, conflicts, or issues
- **Patch** - Quick targeted fixes
- **Troubleshoot** - Systematic problem-solving

### ⚡ **Optimization**
- **Optimize** - Improve performance, efficiency, or code quality
- **Refactor** - Restructure code without changing behavior
- **Improve** - Enhance readability, maintainability, or UX
- **Streamline** - Simplify processes or code
- **Reduce** - Cut bundle size, dependencies, or complexity

### ✅ **Verification & Testing**
- **Verify** - Check implementation, functionality, or correctness
- **Test** - Run tests or create test cases
- **Validate** - Ensure data integrity or business rules
- **Check** - Quick status or health check
- **Audit** - Security, performance, or compliance review

### 🛠️ **Implementation**
- **Implement** - Add new features or functionality
- **Create** - Build components, modules, or files
- **Add** - Insert new capabilities
- **Build** - Construct complete features or systems
- **Integrate** - Connect systems or services
- **Setup** - Initialize configuration or infrastructure

### 🔄 **Maintenance**
- **Update** - Modify existing functionality
- **Upgrade** - Version bumps or dependency updates
- **Migrate** - Move to new patterns, frameworks, or databases
- **Sync** - Align code, data, or configurations
- **Clean** - Remove unused code, dependencies, or files

### 📦 **DevOps & Deployment**
- **Deploy** - Push to production or staging
- **Build** - Compile, bundle, or package
- **Release** - Prepare and publish versions
- **Configure** - Setup environment or services
- **Rollback** - Revert to previous state

---

## 🎯 Effective Prompt Patterns

### Pattern 1: **Action + Target + Context**
```
Fix the authentication error in login.tsx that occurs after password reset
```

### Pattern 2: **Action + Target + Constraint**
```
Optimize the database queries in analytics.ts without changing the API
```

### Pattern 3: **Action + Target + Goal**
```
Refactor the menu component to improve loading performance by 50%
```

### Pattern 4: **Verify + Specific + Expected**
```
Verify that all API routes return proper error codes and messages
```

### Pattern 5: **Multi-Step Command**
```
1. Fix TypeScript errors in components/
2. Run tests
3. Commit changes with descriptive message
```

---

## ⚡ Power Commands

### Quick Combinations
- **"Fix and verify"** - Fix issue + confirm it works
- **"Debug and optimize"** - Find issue + improve performance
- **"Implement and test"** - Add feature + create tests
- **"Review and refactor"** - Audit code + improve quality
- **"Analyze and document"** - Understand + create docs
- **"Build and deploy"** - Compile + push to production

### Scope Modifiers
- **"Quick fix"** - Minimal change to resolve issue
- **"Deep dive"** - Comprehensive analysis
- **"Aggressive optimization"** - Maximum improvements
- **"Careful refactor"** - Maintain compatibility
- **"Thorough test"** - Comprehensive test coverage

---

## 📋 Request Structure Templates

### For Bug Fixes
```
Debug [component/file]: [symptom]
Expected: [behavior]
Actual: [behavior]
Context: [relevant info]
```

### For Features
```
Implement [feature name]
Requirements:
- [requirement 1]
- [requirement 2]
Dependencies: [if any]
Testing: [how to verify]
```

### For Optimization
```
Optimize [target]
Current performance: [metrics]
Goal: [target metrics]
Constraints: [limitations]
```

### For Code Review
```
Review [file/component]
Focus areas:
- Security
- Performance
- Best practices
- Type safety
```

---

## 💡 Best Practices

### ✅ DO:
- **Be specific** - Name files, components, or functions
- **Provide context** - Error messages, expected behavior, environment
- **State constraints** - "without breaking existing functionality"
- **Define success** - "until tests pass" or "achieving <50ms response time"
- **Use technical terms** - TypeScript errors, API endpoints, database migrations
- **Batch related tasks** - "Fix all TypeScript errors" vs individual fixes

### ❌ DON'T:
- Be vague - "make it better" or "fix the app"
- Assume context - Always mention relevant files or components
- Mix unrelated tasks - Keep requests focused
- Skip verification needs - Always specify if you want testing
- Use ambiguous pronouns - Say "the login component" not "that thing"

---

## 🚀 Advanced Patterns

### Conditional Logic
```
If build fails: fix errors
Else: proceed with deployment
```

### Iterative Improvement
```
Optimize API performance:
1. Profile current bottlenecks
2. Implement caching
3. Verify <100ms response
4. If not achieved, optimize queries
```

### Parallel Tasks
```
In parallel:
- Run tests in watch mode
- Fix linting errors
- Update dependencies
```

---

## 📊 Example Transformations

### ❌ Ineffective → ✅ Effective

**Vague:**
> "The app isn't working"

**Clear:**
> "Debug the blank screen issue on the dashboard page after login"

---

**Too Broad:**
> "Make it faster"

**Specific:**
> "Optimize menu-items API to load under 200ms by adding indexes and caching"

---

**Missing Context:**
> "Fix the error"

**With Context:**
> "Fix the TypeScript error in app/api/menu-items/route.ts:45 - 'body' property missing"

---

**No Success Criteria:**
> "Improve the code"

**With Criteria:**
> "Refactor authentication logic to follow React best practices and achieve 90%+ test coverage"

---

## 🎓 Quick Reference Cheat Sheet

```bash
# Immediate Actions
Fix [specific issue]
Debug [component] showing [symptom]
Optimize [feature] for [metric]
Verify [functionality] works correctly
Test [feature] with [scenarios]

# Development Workflow
Implement [feature] with [requirements]
Refactor [component] to [improvement]
Update [dependency] to [version]
Migrate [old pattern] to [new pattern]

# Quality & Deployment
Review [code] for [security/performance/quality]
Test [feature] covering [edge cases]
Build and fix any errors
Deploy to [environment] after verification

# Investigation
Analyze why [unexpected behavior]
Investigate [performance issue] in [component]
Trace [data flow] from [source] to [destination]
Profile [feature] to identify bottlenecks
```

---

## 🔥 Pro Tips

1. **Chain commands with "then"**
   ```
   Fix build errors, then run tests, then commit
   ```

2. **Use priorities**
   ```
   Fix critical security issues first, then address performance
   ```

3. **Specify depth**
   ```
   Quick scan vs Deep analysis vs Comprehensive audit
   ```

4. **Request documentation**
   ```
   Implement OAuth and document the flow
   ```

5. **Ask for options**
   ```
   Analyze performance and suggest 3 optimization strategies
   ```

---

## 🎯 Context Boosters

Add these for even better results:

- **Impact:** "This affects 1000+ users"
- **Urgency:** "Blocking deployment"
- **Environment:** "In production" vs "In development"
- **Scope:** "Across entire codebase" vs "In auth module only"
- **Success metric:** "Until bundle size < 500KB"

---

## 📖 Real-World Examples

### Example 1: Full Feature Implementation
```
Implement user profile editing:
- Create /api/profile PATCH endpoint
- Add form validation for email, name, bio
- Handle avatar upload to storage
- Update Supabase auth metadata
- Add loading states and error handling
- Test with invalid data and edge cases
- Verify changes persist after logout/login
```

### Example 2: Performance Issue
```
Debug slow page load on /dashboard:
Current: 5-8 seconds
Goal: <2 seconds
Profile the component tree and API calls
Implement fixes (lazy loading, caching, etc.)
Verify with Lighthouse score >90
```

### Example 3: Code Quality
```
Review and refactor app/api/ folder:
- Apply consistent error handling
- Add TypeScript types
- Extract shared utilities
- Add JSDoc comments
- Ensure RESTful patterns
- Fix all linting warnings
```

---

## 🤖 Smart Automation Keywords

- **"Run tests continuously"** - Watch mode
- **"Fix all"** - Batch operations
- **"Scan entire codebase"** - Full project analysis
- **"Generate"** - Auto-create boilerplate
- **"Migrate all"** - Bulk updates

---

## ⚙️ Integration Commands

```bash
# Git Operations
Commit these changes with message: [message]
Create PR with summary of changes
Push to [branch]
Merge [branch] into [target]

# Package Management
Install [package] and configure
Update all dependencies
Remove unused dependencies

# Database Operations
Apply pending migrations
Seed test data
Backup before changes
Verify RLS policies
```

---

**Remember:** Clear, specific, actionable requests = Fast, accurate, quality results!

**Quick Start:** Copy any pattern above, fill in your specifics, and get optimal assistance!
