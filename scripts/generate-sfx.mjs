import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const sampleRate = 44100
const outDir = join(process.cwd(), 'apps/web-app/public/audio')

function envelope(t, duration, attack = 0.01, release = 0.08) {
  if (t < attack) return t / attack
  const remaining = duration - t
  if (remaining < release) return Math.max(0, remaining / release)
  return 1
}

function writeWav(name, duration, generator) {
  const frameCount = Math.floor(sampleRate * duration)
  const dataSize = frameCount * 2
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < frameCount; i++) {
    const t = i / sampleRate
    const sample = Math.max(-1, Math.min(1, generator(t, duration)))
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2)
  }

  writeFileSync(join(outDir, `${name}.wav`), buffer)
}

function sine(freq, t) {
  return Math.sin(2 * Math.PI * freq * t)
}

function square(freq, t) {
  return sine(freq, t) >= 0 ? 1 : -1
}

mkdirSync(outDir, { recursive: true })

writeWav('tap', 0.09, (t, d) => {
  const freq = 620 - t * 900
  return sine(freq, t) * envelope(t, d, 0.004, 0.04) * 0.24
})

writeWav('pass', 0.48, (t, d) => {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  const index = Math.min(notes.length - 1, Math.floor(t / 0.11))
  const localT = t - index * 0.11
  const body = sine(notes[index], localT) + sine(notes[index] * 2, localT) * 0.25
  return body * envelope(t, d, 0.01, 0.12) * 0.22
})

writeWav('fail', 0.36, (t, d) => {
  const freq = 260 - t * 360
  const wobble = 1 + Math.sin(2 * Math.PI * 18 * t) * 0.04
  return square(freq * wobble, t) * envelope(t, d, 0.006, 0.14) * 0.13
})

writeWav('unlock', 0.32, (t, d) => {
  const sparkle = sine(988, t) * 0.5 + sine(1318, t + 0.02) * 0.35 + sine(1760, t) * 0.2
  return sparkle * envelope(t, d, 0.006, 0.12) * 0.22
})

console.log(`Generated sound effects in ${outDir}`)
