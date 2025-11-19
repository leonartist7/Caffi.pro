/**
 * Run database migrations
 *
 * Usage: npm run migrate
 */

import { runMigrations } from '../lib/db/migrate'

async function main() {
  try {
    console.log('🚀 Running database migrations...\n')
    await runMigrations()
    console.log('\n✓ Migrations completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

main()
