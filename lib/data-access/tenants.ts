/**
 * Data Access Layer: Tenants
 *
 * All database operations for tenants.
 */

import { execute, executeOne, transaction } from '../db/turso'
import type { ResultSet } from '@libsql/client'

export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone?: string
  logo_url?: string
  primary_color: string
  accent_color: string
  created_at: string
  updated_at: string
}

export interface CreateTenantInput {
  name: string
  slug: string
  email: string
  phone?: string
  logo_url?: string
  primary_color?: string
  accent_color?: string
}

export interface UpdateTenantInput {
  name?: string
  email?: string
  phone?: string
  logo_url?: string
  primary_color?: string
  accent_color?: string
}

/**
 * Get all tenants
 */
export async function getAllTenants(): Promise<Tenant[]> {
  return execute<Tenant>(`
    SELECT * FROM tenants
    ORDER BY created_at DESC
  `)
}

/**
 * Get tenant by ID
 */
export async function getTenantById(id: string): Promise<Tenant | null> {
  return executeOne<Tenant>('SELECT * FROM tenants WHERE id = ?', [id])
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  return executeOne<Tenant>('SELECT * FROM tenants WHERE slug = ?', [slug])
}

/**
 * Create a new tenant
 */
export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const id = generateId()

  await execute(
    `INSERT INTO tenants (
      id, name, slug, email, phone, logo_url, primary_color, accent_color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.slug,
      input.email,
      input.phone || null,
      input.logo_url || null,
      input.primary_color || '#8B4513',
      input.accent_color || '#D2691E',
    ]
  )

  const tenant = await getTenantById(id)
  if (!tenant) throw new Error('Failed to create tenant')

  return tenant
}

/**
 * Update a tenant
 */
export async function updateTenant(id: string, input: UpdateTenantInput): Promise<Tenant> {
  const updates: string[] = []
  const params: any[] = []

  if (input.name !== undefined) {
    updates.push('name = ?')
    params.push(input.name)
  }
  if (input.email !== undefined) {
    updates.push('email = ?')
    params.push(input.email)
  }
  if (input.phone !== undefined) {
    updates.push('phone = ?')
    params.push(input.phone)
  }
  if (input.logo_url !== undefined) {
    updates.push('logo_url = ?')
    params.push(input.logo_url)
  }
  if (input.primary_color !== undefined) {
    updates.push('primary_color = ?')
    params.push(input.primary_color)
  }
  if (input.accent_color !== undefined) {
    updates.push('accent_color = ?')
    params.push(input.accent_color)
  }

  if (updates.length === 0) {
    throw new Error('No fields to update')
  }

  updates.push('updated_at = datetime("now")')
  params.push(id)

  await execute(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, params)

  const tenant = await getTenantById(id)
  if (!tenant) throw new Error('Tenant not found')

  return tenant
}

/**
 * Delete a tenant
 */
export async function deleteTenant(id: string): Promise<void> {
  await execute('DELETE FROM tenants WHERE id = ?', [id])
}

/**
 * Check if slug is available
 */
export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const query = excludeId
    ? 'SELECT COUNT(*) as count FROM tenants WHERE slug = ? AND id != ?'
    : 'SELECT COUNT(*) as count FROM tenants WHERE slug = ?'

  const params = excludeId ? [slug, excludeId] : [slug]
  const result = await executeOne<{ count: number }>(query, params)

  return result ? result.count === 0 : true
}

// ==================== Helpers ====================

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}
