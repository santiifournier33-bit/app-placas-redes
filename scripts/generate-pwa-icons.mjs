#!/usr/bin/env node
// Generate PWA icon variants from public/logo-blanco-oficial.png.
// Composition: navy #002548 square canvas + horizontal white logo
// centered. Logo scaled to ~70% canvas width on standard icons, ~55%
// on maskable icons (so Android adaptive masks don't crop it).
//
// Run: node scripts/generate-pwa-icons.mjs
// Requires: sharp (already a Next.js peer dep on most installs).

import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import path from "node:path"

const PUBLIC = path.resolve("public")
const SOURCE = path.join(PUBLIC, "logo-blanco-oficial.png")
const BG = { r: 0, g: 37, b: 72, alpha: 1 } // navy #002548

const variants = [
  { name: "icon-192.png",          size: 192, logoRatio: 0.70 },
  { name: "icon-512.png",          size: 512, logoRatio: 0.70 },
  { name: "icon-maskable-192.png", size: 192, logoRatio: 0.55 },
  { name: "icon-maskable-512.png", size: 512, logoRatio: 0.55 },
  { name: "apple-touch-icon.png",  size: 180, logoRatio: 0.78 },
  { name: "favicon-32.png",        size: 32,  logoRatio: 0.86 },
]

async function buildVariant({ name, size, logoRatio }) {
  const logoWidth = Math.round(size * logoRatio)
  // Resize source maintaining aspect, fit inside logoWidth × (size * 0.5) box
  const resizedLogo = await sharp(SOURCE)
    .resize({ width: logoWidth, height: Math.round(size * 0.5), fit: "inside", withoutEnlargement: false })
    .toBuffer()
  const meta = await sharp(resizedLogo).metadata()
  const top  = Math.round((size - (meta.height ?? 0)) / 2)
  const left = Math.round((size - (meta.width ?? 0)) / 2)

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: resizedLogo, top, left }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC, name))

  console.log(`✓ ${name} (${size}×${size}, logo ${meta.width}×${meta.height})`)
}

await mkdir(PUBLIC, { recursive: true })
for (const v of variants) {
  await buildVariant(v)
}

console.log("\nDone. Don't forget to update public/manifest.json + src/app/layout.tsx metadata.icons.")
