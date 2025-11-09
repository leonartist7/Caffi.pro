# 🤖 Agent Coordination Guide - Parallel Task Execution

## 🎯 Mission: 3 Agents Working Independently Without Conflicts

This guide ensures all 3 agents work in parallel without interfering with each other.

---

## 🔒 File Isolation Strategy

### **Agent 1 (Authentication) - Files:**
```
ONLY TOUCH THESE FILES:
✅ app/login/page.tsx (NEW)
✅ middleware.ts (NEW)
✅ lib/auth.ts (NEW)
✅ components/Navigation.tsx (MODIFY - add logout only)

DO NOT TOUCH:
❌ app/tenants/* (Agent 3 territory)
❌ app/analytics/* (Agent 2 territory)
❌ app/api/locations/* (Agent 3 territory)
❌ app/api/categories/* (Agent 3 territory)
❌ app/api/menu-items/* (Agent 3 territory)
❌ components/charts/* (Agent 2 territory)
❌ components/*Modal.tsx except your own
```

### **Agent 2 (Analytics) - Files:**
```
ONLY TOUCH THESE FILES:
✅ app/analytics/page.tsx (NEW)
✅ components/charts/RevenueChart.tsx (NEW)
✅ components/charts/OrdersChart.tsx (NEW)
✅ components/charts/UserGrowthChart.tsx (NEW)
✅ components/DateRangeFilter.tsx (NEW)

DO NOT TOUCH:
❌ app/login/* (Agent 1 territory)
❌ middleware.ts (Agent 1 territory)
❌ app/tenants/* (Agent 3 territory)
❌ components/Navigation.tsx (Agent 1 territory)
❌ components/*Modal.tsx (Agent 3 territory)
```

### **Agent 3 (Menu/Locations) - Files:**
```
ONLY TOUCH THESE FILES:
✅ app/tenants/[id]/page.tsx (MODIFY - add buttons and modals)
✅ app/api/locations/route.ts (NEW)
✅ app/api/locations/[id]/route.ts (NEW)
✅ app/api/categories/route.ts (NEW)
✅ app/api/categories/[id]/route.ts (NEW)
✅ app/api/menu-items/route.ts (NEW)
✅ app/api/menu-items/[id]/route.ts (NEW)
✅ components/LocationModal.tsx (NEW)
✅ components/HoursEditor.tsx (NEW)
✅ components/CategoryModal.tsx (NEW)
✅ components/MenuItemModal.tsx (NEW)

DO NOT TOUCH:
❌ app/login/* (Agent 1 territory)
❌ middleware.ts (Agent 1 territory)
❌ app/analytics/* (Agent 2 territory)
❌ components/Navigation.tsx (Agent 1 territory)
❌ components/charts/* (Agent 2 territory)
```

---

## 🛡️ Conflict Prevention Rules

### **Rule 1: Separate Directories**
Each agent works in its own directory:
- Agent 1: `app/login/`, `middleware.ts`, `lib/auth.ts`
- Agent 2: `app/analytics/`, `components/charts/`
- Agent 3: `app/api/locations/`, `app/api/categories/`, `app/api/menu-items/`, `components/*Modal.tsx`

### **Rule 2: No Shared File Modifications**
Only ONE agent can modify a file:
- `components/Navigation.tsx` → Agent 1 only
- `app/tenants/[id]/page.tsx` → Agent 3 only
- All other files → One owner only

### **Rule 3: Use Existing Utilities**
All agents can READ but not MODIFY:
- `lib/utils.ts` - Use existing functions
- `lib/supabase/client.ts` - Use as-is
- `lib/supabase/server.ts` - Use as-is
- `types/database.ts` - Use existing types

### **Rule 4: Independent API Routes**
Each agent creates separate API routes:
- Agent 1: No API routes (uses Supabase auth directly)
- Agent 2: No API routes (reads data directly)
- Agent 3: `/api/locations/*`, `/api/categories/*`, `/api/menu-items/*`

---

## 🔧 Self-Correction Instructions

### **For Each Agent:**

Add this to the end of each task:

```
SELF-CORRECTION CHECKLIST:

Before considering task complete, verify:

1. Code Quality:
   [ ] No TypeScript errors (run: npx tsc --noEmit)
   [ ] No ESLint errors (run: npm run lint)
   [ ] All imports are correct
   [ ] No unused variables
   [ ] Proper error handling

2. Functionality:
   [ ] Page/component loads without errors
   [ ] All buttons work
   [ ] Forms submit correctly
   [ ] Data fetches successfully
   [ ] Loading states show
   [ ] Error states show

3. File Isolation:
   [ ] Only modified assigned files
   [ ] Did not touch other agents' files
   [ ] Did not modify shared utilities
   [ ] Created new files in correct locations

4. Testing:
   [ ] Tested in browser
   [ ] Checked browser console (no errors)
   [ ] Checked terminal (no errors)
   [ ] Tested on mobile view
   [ ] All features work end-to-end

5. Code Style:
   [ ] Follows existing patterns
   [ ] Uses TypeScript properly
   [ ] Tailwind classes consistent
   [ ] Component structure matches existing

If any item fails:
- Fix it before marking task complete
- Re-test after fixing
- Verify no new errors introduced
```

---

## 🚨 Error Detection & Auto-Fix

### **Common Errors & Solutions:**

#### **Error 1: "Cannot find module"**
```
Auto-fix:
1. Check import path is correct
2. Verify file exists
3. Use correct casing (TypeScript is case-sensitive)
4. Add missing import
```

#### **Error 2: "Type error"**
```
Auto-fix:
1. Import types from @/types/database
2. Add proper TypeScript annotations
3. Use existing type definitions
4. Don't create duplicate types
```

#### **Error 3: "RLS policy violation"**
```
Auto-fix:
1. Use service role key for admin operations
2. Pattern:
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!,
     { auth: { autoRefreshToken: false, persistSession: false } }
   )
```

#### **Error 4: "Event handlers in Server Component"**
```
Auto-fix:
1. Add 'use client' directive at top of file
2. Or move handler to separate client component
3. Server components cannot use onClick, onChange, etc.
```

#### **Error 5: "Module not found"**
```
Auto-fix:
1. Check if package is installed
2. If not: npm install [package]
3. Verify import path uses @/ alias
4. Check file extension (.ts, .tsx)
```

---

## 🔍 Self-Testing Protocol

### **Each Agent Should:**

1. **After Creating Each File:**
   ```
   - Save file
   - Check terminal for compilation errors
   - Fix any errors immediately
   - Verify in browser
   ```

2. **After Completing Feature:**
   ```
   - Test all functionality
   - Check browser console
   - Check terminal output
   - Test on mobile view
   - Verify no regressions
   ```

3. **Before Marking Complete:**
   ```
   - Run full test suite
   - Check all pages still work
   - Verify no conflicts with other agents
   - Test end-to-end flow
   ```

---

## 🎯 Agent-Specific Instructions

### **AGENT 1 (Authentication):**

**Your Territory:**
- `app/login/` directory
- `middleware.ts` file
- `lib/auth.ts` file
- Small modification to `components/Navigation.tsx`

**Self-Check:**
```
After completion, verify:
1. Login page loads at /login
2. Can login with test credentials
3. Middleware redirects to /login when not authenticated
4. Logout button in navigation works
5. Session persists on page refresh
6. Did NOT modify any tenant or analytics files
```

**If You See Errors in Other Pages:**
- Ignore them - not your responsibility
- Focus only on authentication
- Other agents will fix their own errors

---

### **AGENT 2 (Analytics):**

**Your Territory:**
- `app/analytics/` directory
- `components/charts/` directory
- `components/DateRangeFilter.tsx`

**Self-Check:**
```
After completion, verify:
1. Analytics page loads at /analytics
2. All 3 charts render correctly
3. Date range filter works
4. Top tenants list shows
5. No errors in browser console
6. Did NOT modify login, middleware, or tenant files
```

**Data Fetching:**
```typescript
// Always use service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

---

### **AGENT 3 (Menu/Locations):**

**Your Territory:**
- `app/api/locations/` directory
- `app/api/categories/` directory
- `app/api/menu-items/` directory
- `components/LocationModal.tsx`
- `components/HoursEditor.tsx`
- `components/CategoryModal.tsx`
- `components/MenuItemModal.tsx`
- Modifications to `app/tenants/[id]/page.tsx`

**Self-Check:**
```
After completion, verify:
1. Can add location on tenant detail page
2. Can edit/delete locations
3. Can add category
4. Can add menu item
5. Can edit/delete menu items
6. All modals work correctly
7. Did NOT modify login or analytics files
```

**Important:**
- Only modify tenant detail page (`app/tenants/[id]/page.tsx`)
- Do NOT modify tenant list page (`app/tenants/page.tsx`)
- Do NOT modify tenant CRUD operations

---

## 🔄 Integration Strategy

### **How Files Will Merge:**

**No Conflicts Expected Because:**
1. Each agent works in separate directories
2. No shared file modifications (except Navigation.tsx - only Agent 1)
3. Each creates new files
4. No overlapping API routes

**Potential Conflict:**
- `components/Navigation.tsx` - Only Agent 1 modifies this
- If conflict occurs, Agent 1's changes take priority

---

## 🧪 Testing Protocol

### **Individual Testing (Each Agent):**
```
1. Test your own features work
2. Verify no errors in your code
3. Check browser console
4. Test on mobile
5. Mark task complete
```

### **Integration Testing (Morning):**
```
1. Check all 3 features work together
2. Navigate between pages
3. Test authentication on all pages
4. Verify analytics shows correct data
5. Test menu/location management
6. Fix any integration issues
```

---

## 🚨 Error Recovery Instructions

### **If Agent Encounters Error:**

**Step 1: Identify Error Type**
- Compilation error? Fix syntax
- Type error? Add proper types
- Runtime error? Add error handling
- Import error? Fix import path

**Step 2: Fix Immediately**
- Don't continue with errors
- Fix before adding more code
- Test fix works
- Then continue

**Step 3: Verify Fix**
- Check terminal (no errors)
- Check browser (no errors)
- Test functionality works
- Move forward

### **If Error Persists:**
```
Document the error:
1. What file has the error
2. What the error message says
3. What you tried to fix it
4. Leave a comment in code

Continue with other parts of the task.
User will fix in the morning.
```

---

## 📊 Progress Tracking

### **Each Agent Should Create:**

A progress file in their directory:

**Agent 1:** `app/login/PROGRESS.txt`
```
✅ Login page created
✅ Form working
✅ Supabase auth integrated
⏳ Middleware in progress
⏳ Logout button pending
```

**Agent 2:** `app/analytics/PROGRESS.txt`
```
✅ Analytics page created
✅ Revenue chart working
⏳ Orders chart in progress
⏳ User growth chart pending
⏳ Date filter pending
```

**Agent 3:** `app/tenants/[id]/PROGRESS.txt`
```
✅ Location modal created
✅ Location API routes created
⏳ Menu item modal in progress
⏳ Category modal pending
⏳ Integration pending
```

---

## 🎯 Success Criteria Per Agent

### **Agent 1 Success:**
- [ ] Login page exists and works
- [ ] Middleware protects routes
- [ ] Logout button in navigation
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Can login and logout successfully

### **Agent 2 Success:**
- [ ] Analytics page exists
- [ ] 3 charts render correctly
- [ ] Date filter works
- [ ] Top tenants list shows
- [ ] No TypeScript errors
- [ ] No runtime errors

### **Agent 3 Success:**
- [ ] Location CRUD works
- [ ] Menu item CRUD works
- [ ] Category CRUD works
- [ ] All modals work
- [ ] API routes functional
- [ ] No TypeScript errors
- [ ] No runtime errors

---

## 🛠️ Intelligent Error Prevention

### **For All Agents:**

#### **1. Use Existing Patterns**
```typescript
// ✅ GOOD: Follow existing modal pattern
// Look at: components/AddTenantModal.tsx
// Copy structure, adapt for your needs

// ❌ BAD: Create completely different structure
// Don't reinvent the wheel
```

#### **2. Always Use Service Role Key**
```typescript
// ✅ GOOD: For admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ❌ BAD: Using anon key (will hit RLS errors)
const supabase = createClient(url, anonKey)
```

#### **3. Import from Correct Locations**
```typescript
// ✅ GOOD: Use @ alias
import { createClient } from '@supabase/supabase-js'
import { formatDate } from '@/lib/utils'
import { Tenant } from '@/types/database'

// ❌ BAD: Relative paths
import { formatDate } from '../../../lib/utils'
```

#### **4. Client vs Server Components**
```typescript
// ✅ GOOD: Client component with 'use client'
'use client'
import { useState } from 'react'
export default function MyComponent() {
  const [state, setState] = useState()
  return <button onClick={() => {}}>Click</button>
}

// ❌ BAD: Server component with onClick
export default function MyComponent() {
  return <button onClick={() => {}}>Click</button> // ERROR!
}
```

#### **5. Error Boundaries**
```typescript
// ✅ GOOD: Wrap risky operations
try {
  const response = await fetch('/api/...')
  if (!response.ok) throw new Error('Failed')
  const data = await response.json()
  return data
} catch (error) {
  console.error('Error:', error)
  return null // or show error message
}

// ❌ BAD: No error handling
const response = await fetch('/api/...')
const data = await response.json() // Might fail!
```

---

## 🔄 Self-Correction Algorithm

### **Each Agent Should Follow:**

```
WHILE task not complete:
  1. Write code
  2. Save file
  3. Check terminal for errors
  4. IF errors:
     - Read error message
     - Identify root cause
     - Apply fix from common errors list
     - Re-test
     - GOTO 3
  5. IF no errors:
     - Test in browser
     - Verify functionality works
     - Check browser console
     - IF browser errors:
        - Fix and GOTO 3
  6. IF all working:
     - Move to next feature
     - GOTO 1
  7. IF task complete:
     - Run full test suite
     - Verify checklist
     - Mark complete
     - DONE
```

---

## 🎯 Quality Gates

### **Before Marking Task Complete:**

**Gate 1: Compilation**
```bash
cd admin-dashboard
npx tsc --noEmit
# Must pass with 0 errors
```

**Gate 2: Linting**
```bash
npm run lint
# Must pass with 0 errors
```

**Gate 3: Runtime**
```
- Open page in browser
- No errors in console
- All features work
- No 404s or 500s
```

**Gate 4: Functionality**
```
- Test all buttons
- Test all forms
- Test all links
- Test error cases
```

**Gate 5: Isolation**
```
- Only modified assigned files
- Did not break other features
- Did not create conflicts
```

---

## 📝 Communication Protocol

### **Each Agent Should Document:**

Create a `COMPLETION_REPORT.md` in your directory:

**Agent 1:** `app/login/COMPLETION_REPORT.md`
```markdown
# Authentication Task - Completion Report

## Status: ✅ COMPLETE

## Files Created:
- app/login/page.tsx
- middleware.ts
- lib/auth.ts

## Files Modified:
- components/Navigation.tsx (added logout button)

## Features Implemented:
- ✅ Login page with email/password
- ✅ Middleware protecting routes
- ✅ Logout functionality
- ✅ Session management

## Testing Results:
- ✅ Can login with credentials
- ✅ Dashboard redirects to login when not authenticated
- ✅ Logout works
- ✅ Session persists on refresh

## Known Issues:
- None

## Notes:
- Used Supabase auth.signInWithPassword()
- Middleware checks all routes except /login
- Logout button added to Navigation component
```

---

## 🔒 Dependency Management

### **Shared Dependencies (All Agents):**
```
These are already installed, just use them:
- @supabase/supabase-js
- @supabase/ssr
- recharts
- lucide-react
- date-fns
- clsx
- tailwind-merge
```

### **Don't Install New Packages:**
- Use what's already installed
- If you think you need something, document it
- User will install if needed

---

## 🎨 Style Consistency

### **All Agents Must Follow:**

**Colors:**
```
Primary: blue-600
Success: green-600
Warning: yellow-600
Error: red-600
Gray: gray-600
```

**Spacing:**
```
Padding: p-4, p-6, p-8
Margin: mb-4, mb-6, mb-8
Gap: gap-4, gap-6
```

**Borders:**
```
Border: border border-gray-200
Rounded: rounded-lg
Shadow: shadow-sm
```

**Typography:**
```
Heading: text-2xl font-bold text-gray-900
Subheading: text-lg font-semibold text-gray-900
Body: text-sm text-gray-600
Label: text-sm font-medium text-gray-700
```

**Buttons:**
```
Primary: bg-blue-600 text-white hover:bg-blue-700
Secondary: border border-gray-300 text-gray-700 hover:bg-gray-50
Danger: bg-red-600 text-white hover:bg-red-700
```

---

## 🚀 Optimization Tips

### **For Faster Completion:**

1. **Copy Existing Patterns:**
   - Look at `AddTenantModal.tsx` for modal structure
   - Look at `app/tenants/page.tsx` for table structure
   - Look at `app/page.tsx` for stats cards

2. **Reuse Components:**
   - Don't create new button styles
   - Use existing form input classes
   - Copy modal structure

3. **Focus on Functionality First:**
   - Get it working
   - Then make it pretty
   - Don't over-engineer

4. **Test Incrementally:**
   - Test after each feature
   - Don't wait until end
   - Fix errors immediately

---

## 📊 Expected Timeline

### **Agent 1 (Auth):**
```
Hour 1: Login page structure
Hour 2: Supabase auth integration
Hour 3: Middleware implementation
Hour 4: Testing and fixes
Hour 5: Logout functionality
Hour 6: Final testing
DONE: 4-6 hours
```

### **Agent 2 (Analytics):**
```
Hour 1-2: Analytics page structure + data fetching
Hour 3-4: Revenue chart
Hour 4-5: Orders chart
Hour 5-6: User growth chart
Hour 6-7: Date filter
Hour 7-8: Testing and polish
DONE: 6-8 hours
```

### **Agent 3 (Menu/Locations):**
```
Hour 1-2: Location modal + API routes
Hour 3-4: Location integration + testing
Hour 4-5: Category modal + API routes
Hour 5-6: Menu item modal + API routes
Hour 6-8: Integration with tenant detail page
Hour 8-10: Testing and fixes
DONE: 8-10 hours
```

---

## 🎉 Success Indicators

### **By Morning, You Should See:**

**Terminal Output:**
```
✓ Compiled successfully
GET /login 200
GET /analytics 200
GET /tenants/[id] 200
POST /api/locations 201
POST /api/menu-items 201
```

**Browser:**
```
✅ http://localhost:3000/login - Login page works
✅ http://localhost:3000/analytics - Charts display
✅ http://localhost:3000/tenants/[id] - Can add locations/menu
✅ No console errors
✅ All features functional
```

**File Structure:**
```
admin-dashboard/
├── app/
│   ├── login/page.tsx          ✅ NEW
│   ├── analytics/page.tsx      ✅ NEW
│   └── api/
│       ├── locations/          ✅ NEW
│       ├── categories/         ✅ NEW
│       └── menu-items/         ✅ NEW
├── middleware.ts               ✅ NEW
├── lib/auth.ts                 ✅ NEW
└── components/
    ├── charts/                 ✅ NEW (3 files)
    ├── LocationModal.tsx       ✅ NEW
    ├── CategoryModal.tsx       ✅ NEW
    └── MenuItemModal.tsx       ✅ NEW
```

---

## 🆘 Emergency Rollback

### **If Everything Breaks:**

Each agent should commit their changes:
```bash
git add app/login app/analytics app/api/locations
git commit -m "WIP: [Agent X] - [Feature Name]"
```

This allows easy rollback if needed:
```bash
git log --oneline
git reset --hard [commit-hash]
```

---

## 🎊 Final Checklist for Each Agent

```
Before going to sleep (agent completes):

[ ] All assigned files created
[ ] No TypeScript errors
[ ] No runtime errors
[ ] Tested in browser
[ ] All features work
[ ] Followed file isolation rules
[ ] Did not modify other agents' files
[ ] Created COMPLETION_REPORT.md
[ ] Committed changes (optional)
[ ] Ready for integration
```

---

## 🌟 Key Principles

1. **Isolation:** Stay in your lane
2. **Quality:** Test everything
3. **Patterns:** Follow existing code
4. **Errors:** Fix immediately
5. **Documentation:** Leave notes
6. **Testing:** Verify thoroughly
7. **Communication:** Document what you did

---

## 🎯 Summary

**3 Agents Working in Parallel:**
- Agent 1: Authentication (4-6 hours)
- Agent 2: Analytics (6-8 hours)
- Agent 3: Menu/Locations (8-10 hours)

**Conflict Prevention:**
- Separate directories
- No shared file modifications
- Independent API routes
- Clear boundaries

**Quality Assurance:**
- Self-testing protocol
- Error detection and auto-fix
- Quality gates
- Completion reports

**By Morning:**
- 85% complete admin dashboard
- All features working
- No conflicts
- Ready for integration testing

---

**🌙 Good night! Your agents are well-coordinated and will work smoothly! 🚀**

**See you in the morning with an amazing dashboard! 🎊**

