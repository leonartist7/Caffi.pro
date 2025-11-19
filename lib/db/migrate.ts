/**
 * Database Migration Runner for Turso
 *
 * Simple migration system for applying schema changes.
 */

import { getTursoClient } from './turso'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  const client = getTursoClient()

  // Create migrations table if it doesn't exist
  await client.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Get list of applied migrations
  const appliedResult = await client.execute('SELECT name FROM migrations ORDER BY id')
  const appliedMigrations = new Set(appliedResult.rows.map(row => row.name as string))

  // Get list of migration files
  const migrationsDir = path.join(process.cwd(), 'lib/db/migrations')

  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found')
    return
  }

  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()

  // Apply pending migrations
  for (const file of migrationFiles) {
    if (appliedMigrations.has(file)) {
      console.log(`✓ Migration ${file} already applied`)
      continue
    }

    console.log(`⏳ Applying migration ${file}...`)

    const migrationPath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      try {
        await client.execute(statement)
      } catch (error) {
        console.error(`Error executing statement:`, statement.substring(0, 100))
        throw error
      }
    }

    // Record migration as applied
    await client.execute({
      sql: 'INSERT INTO migrations (name) VALUES (?)',
      args: [file],
    })

    console.log(`✓ Migration ${file} applied successfully`)
  }

  console.log('✓ All migrations applied')
}

/**
 * Rollback last migration (use with caution!)
 */
export async function rollbackLastMigration(): Promise<void> {
  const client = getTursoClient()

  const result = await client.execute('SELECT name FROM migrations ORDER BY id DESC LIMIT 1')

  if (result.rows.length === 0) {
    console.log('No migrations to rollback')
    return
  }

  const lastMigration = result.rows[0].name as string
  console.log(`Rolling back migration: ${lastMigration}`)

  // Delete migration record
  await client.execute({
    sql: 'DELETE FROM migrations WHERE name = ?',
    args: [lastMigration],
  })

  console.log(`✓ Migration ${lastMigration} rolled back`)
  console.log(
    '⚠️  Note: Schema changes were NOT reverted. You need to manually revert schema changes.'
  )
}
