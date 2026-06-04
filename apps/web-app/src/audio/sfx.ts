export type SfxKey = 'tap' | 'pass' | 'fail' | 'unlock'

const baseUrl = import.meta.env.BASE_URL

const SOURCES: Record<SfxKey, string> = {
  tap: `${baseUrl}audio/tap.wav`,
  pass: `${baseUrl}audio/pass.wav`,
  fail: `${baseUrl}audio/fail.wav`,
  unlock: `${baseUrl}audio/unlock.wav`,
}

const pool = new Map<SfxKey, HTMLAudioElement>()

export function playSfx(key: SfxKey, enabled: boolean) {
  if (!enabled || typeof Audio === 'undefined') return

  const audio = pool.get(key) ?? new Audio(SOURCES[key])
  audio.volume = key === 'tap' ? 0.42 : 0.58
  audio.currentTime = 0
  pool.set(key, audio)

  void audio.play().catch(() => {
    // Browsers can reject audio before the first user gesture.
  })
}
