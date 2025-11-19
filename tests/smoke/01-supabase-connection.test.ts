/**
 * Smoke Test 1: Supabase Connection
 *
 * Verifies that Supabase client is properly configured and can connect
 */

import { createClient } from '@supabase/supabase-js'

describe('Supabase Connection', () => {
  it('should have valid Supabase environment variables', () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(supabaseUrl).toBeDefined()
    expect(supabaseAnonKey).toBeDefined()
    expect(supabaseUrl).toMatch(/^https:\/\/.*\.supabase\.co$/)
  })

  it('should create Supabase client successfully', () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    expect(supabase).toBeDefined()
    expect(supabase.auth).toBeDefined()
    expect(supabase.from).toBeDefined()
    expect(supabase.storage).toBeDefined()
  })
})
