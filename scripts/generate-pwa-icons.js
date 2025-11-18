#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Generates all required PWA icons from a base SVG or creates placeholder icons
 */

const fs = require('fs')
const path = require('path')

// Coffee cup SVG icon (simple, recognizable)
const coffeeSVG = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coffeeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8D4004;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6b3410;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background circle -->
  <circle cx="256" cy="256" r="256" fill="url(#coffeeGradient)"/>

  <!-- Coffee cup -->
  <g transform="translate(256, 256)">
    <!-- Cup body -->
    <path d="M -80 -60 L -60 80 L 60 80 L 80 -60 Z"
          fill="#FED8B1"
          stroke="#8D4004"
          stroke-width="4"/>

    <!-- Coffee liquid -->
    <path d="M -75 -50 L -65 20 L 65 20 L 75 -50 Z"
          fill="#6b3410"
          opacity="0.8"/>

    <!-- Steam -->
    <path d="M -40 -80 Q -35 -100, -40 -120"
          fill="none"
          stroke="#FED8B1"
          stroke-width="3"
          opacity="0.7"/>
    <path d="M 0 -85 Q 5 -105, 0 -125"
          fill="none"
          stroke="#FED8B1"
          stroke-width="3"
          opacity="0.7"/>
    <path d="M 40 -80 Q 45 -100, 40 -120"
          fill="none"
          stroke="#FED8B1"
          stroke-width="3"
          opacity="0.7"/>

    <!-- Handle -->
    <path d="M 85 -30 Q 120 -10, 120 30 Q 120 70, 85 60"
          fill="none"
          stroke="#FED8B1"
          stroke-width="12"
          stroke-linecap="round"/>
  </g>

  <!-- Caffi.pro text -->
  <text x="256" y="450"
        font-family="Arial, sans-serif"
        font-size="48"
        font-weight="bold"
        fill="#FED8B1"
        text-anchor="middle">Caffi.pro</text>
</svg>
`

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

// Write SVG icons
console.log('📝 Generating PWA icons...')

// Icon 192x192 (placeholder - SVG scaled)
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), coffeeSVG)
console.log('✅ Created icon-192.svg')

// Icon 512x512 (placeholder - SVG scaled)
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), coffeeSVG)
console.log('✅ Created icon-512.svg')

// Maskable icon (larger padding for iOS)
const maskableSVG = coffeeSVG.replace('viewBox="0 0 512 512"', 'viewBox="0 0 512 512"')
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.svg'), maskableSVG)
console.log('✅ Created icon-maskable-512.svg')

// Apple touch icon
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.svg'), coffeeSVG)
console.log('✅ Created apple-touch-icon.svg')

// Favicon
const faviconSVG = coffeeSVG.replace('<text', '<!-- <text').replace('</text>', '</text> -->')
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSVG)
console.log('✅ Created favicon.svg')

// Update manifest.json to use SVG icons
const manifestPath = path.join(publicDir, 'manifest.json')
const manifest = {
  name: 'Caffi.pro - Coffee Shop Management',
  short_name: 'Caffi.pro',
  description: 'Multi-tenant coffee shop ordering and management platform',
  start_url: '/',
  display: 'standalone',
  background_color: '#6b3410',
  theme_color: '#8D4004',
  orientation: 'portrait-primary',
  icons: [
    {
      src: '/icon-192.svg',
      sizes: '192x192',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: '/icon-512.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any',
    },
    {
      src: '/icon-maskable-512.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'maskable',
    },
  ],
  shortcuts: [
    {
      name: 'Browse Menu',
      short_name: 'Menu',
      description: 'View our coffee menu',
      url: '/menu',
      icons: [{ src: '/icon-192.svg', sizes: '192x192' }],
    },
    {
      name: 'My Orders',
      short_name: 'Orders',
      description: 'Track your orders',
      url: '/orders',
      icons: [{ src: '/icon-192.svg', sizes: '192x192' }],
    },
    {
      name: 'Rewards',
      short_name: 'Rewards',
      description: 'View your rewards',
      url: '/rewards',
      icons: [{ src: '/icon-192.svg', sizes: '192x192' }],
    },
  ],
  categories: ['food', 'lifestyle', 'shopping'],
  screenshots: [],
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
console.log('✅ Updated manifest.json')

console.log('\n✅ PWA icons generated successfully!')
console.log('\nNext steps:')
console.log('1. For production, convert SVGs to PNG using an online converter')
console.log('2. Upload PNGs and update manifest.json')
console.log('3. Test PWA installation on mobile device')
console.log('\nFiles created:')
console.log('  - public/icon-192.svg')
console.log('  - public/icon-512.svg')
console.log('  - public/icon-maskable-512.svg')
console.log('  - public/apple-touch-icon.svg')
console.log('  - public/favicon.svg')
console.log('  - public/manifest.json (updated)')
