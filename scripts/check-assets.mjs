#!/usr/bin/env node

import { readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const rootDir = resolve(import.meta.dirname, '..')
const publicDir = resolve(rootDir, 'apps/web-app/public')

const MAX_PUBLIC_ASSET_BYTES = 1024 * 1024
const MAX_PUBLIC_TOTAL_BYTES = 5 * 1024 * 1024
const MAX_AUDIO_BYTES = 200 * 1024

let exitCode = 0
const errors = []
const warnings = []

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(fullPath))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }

  return files
}

function fail(message) {
  errors.push(message)
  exitCode = 1
}

function warn(message) {
  warnings.push(message)
}

const files = walk(publicDir)
let totalBytes = 0

for (const file of files) {
  const stats = statSync(file)
  const size = stats.size
  const relPath = relative(rootDir, file)
  const ext = extname(file).toLowerCase()

  totalBytes += size

  if (size > MAX_PUBLIC_ASSET_BYTES) {
    fail(`${relPath} is ${formatBytes(size)}, above the per-file runtime asset limit ${formatBytes(MAX_PUBLIC_ASSET_BYTES)}`)
  }

  if (relPath.includes('/audio/') && size > MAX_AUDIO_BYTES) {
    fail(`${relPath} is ${formatBytes(size)}, above the audio asset limit ${formatBytes(MAX_AUDIO_BYTES)}`)
  }

  if (['.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(ext) && size > 300 * 1024) {
    warn(`${relPath} is ${formatBytes(size)}; consider compression or moving source-only art to docs/assets`)
  }
}

if (totalBytes > MAX_PUBLIC_TOTAL_BYTES) {
  fail(`public runtime assets total ${formatBytes(totalBytes)}, above limit ${formatBytes(MAX_PUBLIC_TOTAL_BYTES)}`)
}

console.log(`Checked ${files.length} public runtime asset(s), total ${formatBytes(totalBytes)}.`)

if (warnings.length) {
  console.log('\nWarnings:')
  for (const message of warnings) console.log(`- ${message}`)
}

if (errors.length) {
  console.log('\nErrors:')
  for (const message of errors) console.log(`- ${message}`)
  console.log('\nAsset check failed.')
} else {
  console.log('Asset check passed.')
}

process.exit(exitCode)
