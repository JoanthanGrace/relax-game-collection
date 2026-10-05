import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

vi.mock('node:https', () => ({ get: vi.fn() }))
import { get } from 'node:https'
import { downloadImage } from '../tinify-download.mjs'

let directory
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }); vi.resetAllMocks() })

function respond(status, stream) {
  get.mockImplementation((_url, callback) => {
    const request = new EventEmitter()
    request.setTimeout = vi.fn()
    stream.statusCode = status
    queueMicrotask(() => callback(stream))
    return request
  })
}

describe('atomic image downloads', () => {
  it('downloads and replaces the source only after completion', async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinify-test-'))
    const target = join(directory, 'image.png')
    await writeFile(target, 'original')
    respond(200, Readable.from(['compressed']))
    await downloadImage('https://example.invalid/image', target)
    expect(await readFile(target, 'utf8')).toBe('compressed')
    expect(await readdir(directory)).toEqual(['image.png'])
  })
  it('preserves the original and removes temporary files on a broken response', async () => {
    directory = await mkdtemp(join(tmpdir(), 'tinify-test-'))
    const target = join(directory, 'image.png')
    await writeFile(target, 'original')
    respond(200, new Readable({ read() { this.destroy(new Error('connection lost')) } }))
    await expect(downloadImage('https://example.invalid/image', target)).rejects.toThrow('connection lost')
    expect(await readFile(target, 'utf8')).toBe('original')
    expect(await readdir(directory)).toEqual(['image.png'])
  })
})
