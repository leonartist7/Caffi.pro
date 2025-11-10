import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'

export interface CustomerProfile {
  user_id: string
  email: string
  phone?: string
  full_name?: string
  created_at?: string
}

/**
 * Sign up a new customer with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string
): Promise<{ user: User | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { user: null, error }
  }

  return { user: data.user, error: null }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { user: null, error }
  }

  return { user: data.user, error: null }
}

/**
 * Sign in with phone OTP
 */
export async function signInWithPhone(phone: string): Promise<{ error: any }> {
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithOtp({
    phone,
  })

  return { error }
}

/**
 * Verify phone OTP
 */
export async function verifyPhoneOtp(
  phone: string,
  token: string
): Promise<{ user: User | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })

  if (error) {
    return { user: null, error }
  }

  return { user: data.user, error: null }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ error: any }> {
  const supabase = createClient()

  const { error } = await supabase.auth.signOut()

  return { error }
}

/**
 * Get the current user session
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

/**
 * Get the current session
 */
export async function getSession() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}

/**
 * Reset password - Send reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<{ error: any }> {
  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  return { error }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<{ error: any }> {
  const supabase = createClient()

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  return { error }
}

/**
 * Update user profile
 */
export async function updateProfile(updates: {
  full_name?: string
  phone?: string
}): Promise<{ error: any }> {
  const supabase = createClient()

  const { error } = await supabase.auth.updateUser({
    data: updates,
  })

  return { error }
}
