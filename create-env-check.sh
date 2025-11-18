#!/bin/bash

# Quick diagnostic: Check if environment variables are accessible in deployed app
# This creates a simple API route to test env vars

cat > /home/user/Caffi.pro/app/api/check-env/route.ts << 'EOF'
import { NextResponse } from 'next/server'

export async function GET() {
  // This endpoint checks if environment variables are loaded
  const envCheck = {
    hasPublicUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasPublicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    publicUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING',
    // Don't expose actual keys, just check if they exist
    publicKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
  }

  return NextResponse.json(envCheck)
}
EOF

echo "Created diagnostic endpoint: /api/check-env"
echo "After deploying, visit: https://your-app.vercel.app/api/check-env"
echo "It should show all 3 environment variables as 'true' with key lengths > 0"
