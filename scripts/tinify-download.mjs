import { get } from 'node:https'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'

export async function downloadImage(url, outputPath) {
  await mkdir(dirname(outputPath), { recursive: true })
  const temporaryPath = `${outputPath}.${randomUUID()}.tmp`
  try {
    await new Promise((resolve, reject) => {
      const req = get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume()
          reject(new Error(`Download failed: HTTP ${res.statusCode}`))
          return
        }
        pipeline(res, createWriteStream(temporaryPath, { flags: 'wx' })).then(resolve, reject)
      })
      req.setTimeout(30000, () => req.destroy(new Error('Download timed out')))
      req.on('error', reject)
    })
    await rename(temporaryPath, outputPath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}
