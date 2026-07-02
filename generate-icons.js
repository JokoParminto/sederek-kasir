/**
 * PWA Icon Generator
 *
 * This script generates PWA icons from the logo.webp file.
 *
 * PREREQUISITES:
 * npm install sharp
 *
 * USAGE:
 * node generate-icons.js
 */

import sharp from 'sharp'
import { readFileSync } from 'fs'

const logoBuffer = readFileSync('./public/logo.webp')

const sizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' }
]

async function generateIcons() {
  console.log('Generating PWA icons from logo.webp...\n')

  for (const { size, name } of sizes) {
    try {
      await sharp(logoBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(`./public/${name}`)

      console.log(`✓ Generated ${name} (${size}x${size})`)
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message)
    }
  }

  console.log('\n✓ All icons generated successfully!')
  console.log('\nNext steps:')
  console.log('1. Run: npm run build')
  console.log('2. Test PWA: npm run preview')
  console.log('3. Check manifest at: http://localhost:4173/manifest.webmanifest')
}

generateIcons().catch(console.error)
