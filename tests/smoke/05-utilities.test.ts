/**
 * Smoke Test 5: Core Utilities
 *
 * Verifies that core utility functions are working correctly
 */

import { supabase } from '@/lib/supabase'

describe('Core Utilities', () => {
  it('should export supabase client from lib/supabase', () => {
    expect(supabase).toBeDefined()
    expect(supabase.from).toBeDefined()
    expect(supabase.auth).toBeDefined()
    expect(supabase.storage).toBeDefined()
  })

  it('should have auth methods available', () => {
    expect(typeof supabase.auth.signInWithPassword).toBe('function')
    expect(typeof supabase.auth.signOut).toBe('function')
    expect(typeof supabase.auth.getSession).toBe('function')
  })

  it('should have database query methods', () => {
    const query = supabase.from('tenants')

    expect(query).toBeDefined()
    expect(typeof query.select).toBe('function')
    expect(typeof query.insert).toBe('function')
    expect(typeof query.update).toBe('function')
    expect(typeof query.delete).toBe('function')
  })

  it('should have storage methods available', () => {
    const bucket = supabase.storage.from('menu-images')

    expect(bucket).toBeDefined()
    expect(typeof bucket.upload).toBe('function')
    expect(typeof bucket.download).toBe('function')
    expect(typeof bucket.remove).toBe('function')
    expect(typeof bucket.getPublicUrl).toBe('function')
  })
})
