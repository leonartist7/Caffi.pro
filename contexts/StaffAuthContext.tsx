'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'

interface StaffUser {
  staff_id: string
  tenant_id: string
  email: string
  full_name: string
  phone?: string
  role: 'owner' | 'manager' | 'barista' | 'kitchen' | 'cashier'
  assigned_location_id?: string
  can_manage_orders: boolean
  can_manage_inventory: boolean
  can_manage_staff: boolean
  can_view_reports: boolean
  is_active: boolean
}

interface StaffAuthContextType {
  user: User | null
  staffUser: StaffUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshStaffUser: () => Promise<void>
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined)

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Fetch staff user details from staff_users table
  const fetchStaffUser = async (userId: string): Promise<StaffUser | null> => {
    try {
      const { data, error } = await supabase
        .from('staff_users')
        .select('*')
        .eq('staff_id', userId)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error fetching staff user:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Failed to fetch staff user:', err)
      return null
    }
  }

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUser(session.user)
          const staff = await fetchStaffUser(session.user.id)
          setStaffUser(staff)
        }
      } catch (error) {
        console.error('Error loading session:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const staff = await fetchStaffUser(session.user.id)
        setStaffUser(staff)
      } else {
        setStaffUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setStaffUser(null)
  }

  const refreshStaffUser = async () => {
    if (user) {
      const staff = await fetchStaffUser(user.id)
      setStaffUser(staff)
    }
  }

  const value = {
    user,
    staffUser,
    loading,
    signIn,
    signOut,
    refreshStaffUser,
  }

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>
}

export function useStaffAuth() {
  const context = useContext(StaffAuthContext)
  if (context === undefined) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider')
  }
  return context
}
