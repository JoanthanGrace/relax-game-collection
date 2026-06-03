#!/usr/bin/env node

import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { request } from 'node:https'
import { pipeline } from 'node:stream/promises'

const apiKey = process.env.TINIFY_API_KEY
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif'])

function usage() {
  console.log(`Usage:
  TINIFY_API_KEY=<key> pnpm compress:tinypng -- <file-or-dir> [more files or dirs]

Options:
  --out-dir <dir>   Write compressed files to a separate directory.
  --in-place        Replace source files with compressed output.

Examples:
  TINIFY_API_KEY=xxx pnpm compress:tinypng -- apps/web-app/public/icon-512.png --in-place
  TINIFY_API_KEY=xxx pnpm compress:tinypng -- docs/assets/icon-concepts --out-dir /tmp/nicetap-compressed
`)
}

if (!apiKey) {
  console.error('TINIFY_API_KEY is required. Get one from https://tinypng.com/developers')
  usage()
  process.exit(1)
}

const args = process.argv.slice(2)
let outDir = ''
let inPlace = false
const inputs = []

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i]
  if (arg === '--out-dir') {
    outDir = args[i + 1] ?? ''
    i += 1
  } else if (arg === '--in-place') {
    inPlace = true
  } else {
    inputs.push(arg)
  }
}

if (!inputs.length || (!outDir && !inPlace)) {
  usage()
  process.exit(1)
}

function walk(inputPath) {
  const fullPath = resolve(inputPath)
  if (!existsSync(fullPath)) {
    throw new Error(`Path does not exist: ${inputPath}`)
  }

  const stats = statSync(fullPath)
  if (stats.isDirectory()) {
    return readdirSync(fullPath, { withFileTypes: true }).flatMap((entry) => walk(join(fullPath, entry.name)))
  }

  if (!stats.isFile()) return []
  return imageExtensions.has(extname(fullPath).toLowerCase()) ? [fullPath] : []
}

function shrink(filePath) {
  const auth = Buffer.from(`api:${apiKey}`).toString('base64')
  const size = statSync(filePath).size

  return new Promise((resolvePromise, rejectPromise) => {
    const req = request(
      {
        method: 'POST',
        hostname: 'api.tinify.com',
        path: '/shrink',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': size,
        },
      },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          if (res.statusCode !== 201 || !res.headers.location) {
            rejectPromise(new Error(`Tinify failed for ${filePath}: HTTP ${res.statusCode} ${body}`))
            return
          }
          resolvePromise({
            outputUrl: res.headers.location,
            compressionCount: res.headers['compression-count'],
          })
        })
      },
    )

    req.on('error', rejectPromise)
    createReadStream(filePath).pipe(req)
  })
}

function download(url, outputPath) {
  return new Promise((resolvePromise, rejectPromise) => {
    request(url, (res) => {
      if (res.statusCode !== 200) {
        rejectPromise(new Error(`Download failed for ${url}: HTTP ${res.statusCode}`))
        return
      }

      mkdirSync(dirname(outputPath), { recursive: true })
      pipeline(res, createWriteStream(outputPath)).then(resolvePromise, rejectPromise)
    }).on('error', rejectPromise)
  })
}

const files = inputs.flatMap((input) => walk(input))

if (!files.length) {
  console.log('No supported image files found.')
  process.exit(0)
}

console.log(`Compressing ${files.length} image(s) with Tinify...`)

for (const file of files) {
  const before = statSync(file).size
  const target = inPlace ? file : resolve(outDir, basename(file))
  const { outputUrl, compressionCount } = await shrink(file)
  await download(outputUrl, target)
  const after = statSync(target).size
  const saved = before - after
  const pct = before > 0 ? ((saved / before) * 100).toFixed(1) : '0.0'
  const countText = compressionCount ? `, monthly count ${compressionCount}` : ''

  console.log(`${file} -> ${target}: ${before} B to ${after} B, saved ${pct}%${countText}`)
}

console.log('Tinify compression complete.')
