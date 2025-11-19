/**
 * Smoke Test 3: API Routes
 *
 * Verifies that critical API route files exist
 * Note: For actual HTTP testing, see e2e tests
 */

import * as fs from 'fs'
import * as path from 'path'

describe('API Routes', () => {
  const apiRouteFiles = [
    'app/api/categories/route.ts',
    'app/api/categories/[id]/route.ts',
    'app/api/menu-items/route.ts',
    'app/api/menu-items/[id]/route.ts',
    'app/api/locations/route.ts',
    'app/api/locations/[id]/route.ts',
    'app/api/check-env/route.ts',
  ]

  it.each(apiRouteFiles)('should have API route file: %s', routeFile => {
    const filePath = path.join(process.cwd(), routeFile)
    expect(fs.existsSync(filePath)).toBe(true)
  })

  it('should have at least 7 API route files', () => {
    const appApiDir = path.join(process.cwd(), 'app/api')
    const files = fs.readdirSync(appApiDir, { recursive: true })
    const routeFiles = files.filter(
      (file: any) => typeof file === 'string' && file.endsWith('route.ts')
    )

    expect(routeFiles.length).toBeGreaterThanOrEqual(7)
  })
})
