const { chromium } = require('playwright-core')
const fs = require('fs')
const OUT = process.argv[2] || '/home/user/Caffi.pro/docs/audit/before'
fs.mkdirSync(OUT, { recursive: true })
const routes = [
  '/',
  '/login',
  '/dashboard',
  '/clients',
  '/cafes',
  '/menu',
  '/orders',
  '/coupons',
  '/rewards',
  '/notifications',
  '/analytics',
  '/activity',
  '/staff',
  '/settings',
  '/diagnostics',
  '/staff/login',
  '/staff/dashboard',
  '/staff/orders',
  '/staff/inventory',
  '/staff/reports',
  '/staff/team',
  '/shop/demo-cafe',
  '/shop/demo-cafe/menu',
  '/shop/demo-cafe/login',
  '/shop/demo-cafe/signup',
  '/shop/demo-cafe/rewards',
  '/shop/demo-cafe/checkout',
]
;(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox'],
  })
  const results = []
  for (const r of routes) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    const errs = []
    page.on('console', m => {
      if (m.type() === 'error') errs.push(m.text().slice(0, 200))
    })
    page.on('pageerror', e => errs.push('PAGEERROR: ' + String(e).slice(0, 200)))
    let status = 'ok'
    try {
      const resp = await page.goto('http://localhost:3000' + r, {
        waitUntil: 'networkidle',
        timeout: 25000,
      })
      status = resp ? String(resp.status()) : 'no-response'
    } catch (e) {
      status = 'nav-fail: ' + String(e).slice(0, 120)
      try {
      } catch {}
    }
    await page.waitForTimeout(1500)
    const name = r === '/' ? 'root' : r.slice(1).replace(/\//g, '_')
    try {
      await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
    } catch (e) {
      status += ' shot-fail'
    }
    results.push({ route: r, status, consoleErrors: errs.slice(0, 4) })
    await page.close()
  }
  await browser.close()
  fs.writeFileSync(`${OUT}/capture-log.json`, JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
})()
