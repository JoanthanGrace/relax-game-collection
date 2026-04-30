/**
 * 平台适配器接口 - 隔离 game-core 与平台特定 API
 * 详细设计参见 docs/architecture.md 和 docs/miniprogram-migration.md
 */

export interface PlatformAdapter {
  audio: AudioAdapter
  storage: StorageAdapter
  share: ShareAdapter
  vibration: VibrationAdapter
  analytics: AnalyticsAdapter
  device: DeviceAdapter
}

export interface AudioAdapter {
  play(soundId: string): void
  stop(soundId: string): void
  setVolume(volume: number): void
  preload(soundIds: string[]): Promise<void>
}

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

export interface ShareAdapter {
  share(data: ShareData): Promise<boolean>
  canShare(): boolean
}

export interface ShareData {
  title: string
  text?: string
  url?: string
  imageUrl?: string
}

export interface VibrationAdapter {
  vibrate(pattern?: number | number[]): void
  isSupported(): boolean
}

export interface AnalyticsAdapter {
  track(event: string, properties?: Record<string, unknown>): void
  flush(): Promise<void>
}

export interface DeviceAdapter {
  getScreenSize(): { width: number; height: number }
  getPixelRatio(): number
  isMobile(): boolean
  getLocale(): string
}
