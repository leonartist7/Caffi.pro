import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(process.cwd()),
      // `server-only` intentionally throws when it reaches a browser bundle.
      // Unit tests execute server boundaries under Node, so this empty module
      // preserves the import boundary without triggering its browser guard.
      'server-only': path.resolve(process.cwd(), 'tests/support/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
})
