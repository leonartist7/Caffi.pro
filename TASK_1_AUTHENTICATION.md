# 🔐 TASK 1: Authentication System (HIGH PRIORITY)

## 📋 Task Overview
**Estimated Time:** 4-6 hours  
**Difficulty:** Medium  
**Priority:** 🔴 CRITICAL

---

## 🎯 What to Build

Create a complete authentication system to secure the admin dashboard.

### **Features:**
1. Login page with email/password
2. Middleware to protect all routes
3. Session management
4. Logout functionality
5. Redirect logic

---

## 📝 Detailed Requirements

### **1. Login Page**
**File:** `admin-dashboard/app/login/page.tsx`

**Requirements:**
- Email input field
- Password input field
- "Sign In" button
- Loading state during authentication
- Error message display
- Remember me checkbox (optional)
- Forgot password link (optional)

**Design:**
- Centered card layout
- Caffi.pro logo/branding
- Clean, professional design
- Responsive (mobile-friendly)

**Code Structure:**
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  // Form state
  // Handle submit
  // Error handling
  // Redirect after success
}
```

---

### **2. Middleware**
**File:** `admin-dashboard/middleware.ts`

**Requirements:**
- Check if user is authenticated
- Redirect to /login if not authenticated
- Allow access to /login without auth
- Refresh session if needed
- Handle expired tokens

**Protected Routes:**
- `/` (dashboard)
- `/tenants`
- `/tenants/*`
- `/analytics`
- `/users`
- `/settings`

**Public Routes:**
- `/login`

**Code Structure:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Create Supabase client
  // Check authentication
  // Redirect logic
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

### **3. Logout Functionality**
**File:** `admin-dashboard/components/Navigation.tsx` (MODIFY)

**Requirements:**
- Add logout button to navigation
- Sign out from Supabase
- Clear session
- Redirect to /login
- Show confirmation (optional)

**Code to Add:**
```typescript
const handleLogout = async () => {
  const supabase = createClient()
  await supabase.auth.signOut()
  router.push('/login')
}
```

---

### **4. Session Management**
**File:** `admin-dashboard/lib/auth.ts` (NEW)

**Requirements:**
- Get current user
- Check if authenticated
- Refresh session
- Helper functions

**Code Structure:**
```typescript
import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function isAuthenticated() {
  const user = await getCurrentUser()
  return !!user
}
```

---

## 🔧 Technical Implementation

### **Step 1: Create Login Page**

```bash
# Create the file
admin-dashboard/app/login/page.tsx
```

**Key Points:**
- Use `'use client'` directive
- Use `createClient()` from `@/lib/supabase/client`
- Call `supabase.auth.signInWithPassword()`
- Handle errors gracefully
- Redirect to `/` on success

---

### **Step 2: Create Middleware**

```bash
# Create the file
admin-dashboard/middleware.ts
```

**Key Points:**
- Check `request.cookies` for session
- Use `createServerClient` from `@supabase/ssr`
- Redirect to `/login` if no session
- Allow `/login` route without auth

---

### **Step 3: Add Logout to Navigation**

**Modify:** `admin-dashboard/components/Navigation.tsx`

**Add:**
- Import `createClient`
- Add logout handler
- Add logout button/dropdown
- Use router to redirect

---

### **Step 4: Test Everything**

1. Go to http://localhost:3000
2. Should redirect to /login
3. Try logging in with wrong credentials - see error
4. Log in with correct credentials - redirect to dashboard
5. Click logout - redirect to login
6. Try accessing /tenants without login - redirect to login

---

## 🧪 Testing Checklist

- [ ] Login page loads correctly
- [ ] Can login with valid credentials
- [ ] Error shown for invalid credentials
- [ ] Redirects to dashboard after login
- [ ] Cannot access protected routes without login
- [ ] Logout button works
- [ ] Session persists on page refresh
- [ ] Expired session redirects to login

---

## 📚 Resources

### **Supabase Auth:**
- [Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Sign In with Password](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Sign Out](https://supabase.com/docs/reference/javascript/auth-signout)

### **Next.js:**
- [Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Authentication Patterns](https://nextjs.org/docs/app/building-your-application/authentication)

---

## 🎨 UI Design Reference

### **Login Page Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│         [Caffi.pro Logo]            │
│                                     │
│     Super Admin Dashboard           │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Email                        │ │
│  │  [________________]           │ │
│  │                               │ │
│  │  Password                     │ │
│  │  [________________]           │ │
│  │                               │ │
│  │  [ ] Remember me              │ │
│  │                               │ │
│  │  [     Sign In     ]          │ │
│  │                               │ │
│  │  Forgot password?             │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

---

## ⚠️ Important Notes

### **Security:**
- Never expose service role key to client
- Use anon key for auth operations
- Validate on both client and server
- Use HTTPS in production

### **Super Admin Credentials:**
You'll need to create a super admin user first:
1. Go to Supabase Dashboard → Authentication → Users
2. Add new user with email/password
3. Add to `super_admins` table
4. Set role in user metadata

---

## ✅ Definition of Done

Task is complete when:
- [ ] Login page exists and works
- [ ] Middleware protects all routes
- [ ] Can login with super admin credentials
- [ ] Cannot access dashboard without login
- [ ] Logout button works
- [ ] Session persists correctly
- [ ] All TypeScript types correct
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Error messages are user-friendly

---

## 🚀 Quick Start

**Copy this into Cursor Composer:**

```
I'm working on the Caffi.pro admin dashboard (Next.js 14, TypeScript, Supabase).

Current setup:
- Dashboard home working
- Tenant CRUD complete
- Navigation system in place
- Service role key configured

TASK: Create authentication system

Requirements:
1. Build login page at app/login/page.tsx
   - Email + password form
   - Use Supabase auth.signInWithPassword()
   - Show errors if login fails
   - Redirect to / on success

2. Create middleware.ts
   - Protect all routes except /login
   - Check for valid session
   - Redirect to /login if not authenticated
   - Use @supabase/ssr for server-side auth

3. Add logout to Navigation component
   - Add logout button
   - Call supabase.auth.signOut()
   - Redirect to /login

4. Test everything works

Please implement this following the existing code style.
```

---

**Status:** 📋 Ready to assign  
**Priority:** 🔴 HIGH  
**Dependencies:** None  
**Estimated Completion:** 4-6 hours

