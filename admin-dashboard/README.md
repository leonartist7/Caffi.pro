# Caffi.pro Admin Dashboard

A Next.js 14 admin dashboard for the Caffi.pro multi-tenant coffee shop management platform.

## Features

✅ **Authentication System**
- Email/password login with Supabase Auth
- Protected routes with middleware
- Session management with cookies
- Automatic redirect to login for unauthenticated users
- Logout functionality with session clearing

✅ **Beautiful UI**
- Modern, responsive design with Tailwind CSS
- Dark mode support
- Gradient accents and smooth animations
- Mobile-friendly navigation

✅ **Dashboard**
- Overview stats (tenants, users, orders, revenue)
- Recent activity feed
- Quick action buttons
- System status indicator

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase project (credentials in `.env.local`)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
The `.env.local` file is already configured with your Supabase credentials.

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication Flow

### Login
1. User visits any protected route
2. Middleware checks for valid session
3. If no session, redirects to `/login`
4. User enters email and password
5. Supabase validates credentials
6. On success, redirects to original destination or `/`

### Logout
1. User clicks logout in navigation dropdown
2. Calls `supabase.auth.signOut()`
3. Clears session cookies
4. Redirects to `/login`

### Session Management
- Sessions are stored in HTTP-only cookies
- Middleware refreshes sessions automatically
- Sessions persist across page refreshes
- Expired sessions redirect to login

## Project Structure

```
admin-dashboard/
├── app/
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── page.tsx               # Dashboard home
│   └── layout.tsx             # Root layout
├── components/
│   └── Navigation.tsx         # Nav with logout
├── lib/
│   └── auth.ts                # Auth helper functions
├── utils/
│   └── supabase/
│       ├── client.ts          # Browser client
│       ├── server.ts          # Server client
│       └── middleware.ts      # Middleware client
├── middleware.ts              # Route protection
└── .env.local                 # Supabase config
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Creating a Test User

To create a test admin user, go to your Supabase dashboard:

1. Go to Authentication > Users
2. Click "Add User"
3. Enter email and password
4. Click "Create User"

Or use the Supabase SQL Editor:

```sql
-- Create a super admin user
INSERT INTO auth.users (
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data
)
VALUES (
  'admin@caffi.pro',
  crypt('your-password', gen_salt('bf')),
  now(),
  '{"role": "super_admin"}'::jsonb
);
```

## Testing

### Manual Testing Checklist

- [ ] Login page loads correctly
- [ ] Can login with valid credentials
- [ ] Error shown for invalid credentials
- [ ] Dashboard redirects to login when not authenticated
- [ ] Dashboard shows user email after login
- [ ] Navigation dropdown opens/closes
- [ ] Logout button works
- [ ] Session persists on page refresh
- [ ] Protected routes redirect to login

### Test Credentials

Create a test user in Supabase and use those credentials to test the login flow.

## Deployment

This app can be deployed to Vercel:

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

## License

MIT
