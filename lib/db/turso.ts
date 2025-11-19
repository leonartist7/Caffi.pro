/**
 * Turso Database Client
 *
 * Centralized connection to Turso (libSQL) database.
 */

import { createClient, type Client } from '@libsql/client'

let tursoClient: Client | null = null

/**
 * Get or create Turso client instance
 */
export function getTursoClient(): Client {
  if (!tursoClient) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url) {
      throw new Error('TURSO_DATABASE_URL environment variable is required')
    }

    // Create client with or without auth token
    tursoClient = createClient({
      url,
      authToken: authToken || undefined,
    })
  }

  return tursoClient
}

/**
 * Execute a query and return results
 */
export async function execute<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const client = getTursoClient()
  const result = await client.execute({
    sql,
    args: params || [],
  })

  return result.rows as T[]
}

/**
 * Execute a query and return first result
 */
export async function executeOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const results = await execute<T>(sql, params)
  return results.length > 0 ? results[0] : null
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction<T>(
  queries: Array<{ sql: string; params?: any[] }>
): Promise<void> {
  const client = getTursoClient()

  await client.batch(
    queries.map(q => ({
      sql: q.sql,
      args: q.params || [],
    })),
    'write'
  )
}

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await execute('SELECT 1')
    return true
  } catch (error) {
    console.error('Turso connection failed:', error)
    return false
  }
}

/**
 * Close database connection
 */
export function closeConnection(): void {
  if (tursoClient) {
    tursoClient.close()
    tursoClient = null
  }
}
