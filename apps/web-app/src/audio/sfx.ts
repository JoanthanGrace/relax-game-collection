export type SfxKey = 'tap' | 'pass' | 'fail' | 'unlock'

const SOURCES: Record<SfxKey, string> = {
  tap: '/audio/tap.wav',
  pass: '/audio/pass.wav',
  fail: '/audio/fail.wav',
  unlock: '/audio/unlock.wav',
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
