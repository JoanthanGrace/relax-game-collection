import type { LevelConfig } from '@nicetap/shared'
import { getAllLevelIds, getLevel } from './levelRegistry'

export type LevelStatus = 'idle' | 'playing' | 'win' | 'fail'

export interface LevelRunnerCallbacks {
  onStatusChange(status: LevelStatus): void
  onLevelLoaded(config: LevelConfig): void
}

/**
 * 关卡运行器 - 管理关卡生命周期和进度
 *
 * 职责：加载关卡配置、跟踪当前关卡、处理进度推进。
 * 不涉及渲染，仅管理数据流。
 */
export class LevelRunner {
  private currentConfig: LevelConfig | null = null
  private currentIndex = 0
  private levelIds: string[] = []
  private status: LevelStatus = 'idle'
  private callbacks: LevelRunnerCallbacks

  constructor(callbacks: LevelRunnerCallbacks) {
    this.callbacks = callbacks
    this.levelIds = getAllLevelIds()
  }

  async loadLevel(levelId: string): Promise<LevelConfig> {
    const config = getLevel(levelId)
    if (!config) {
      throw new Error(`关卡未找到: ${levelId}`)
    }
    this.currentConfig = config
    this.currentIndex = this.levelIds.indexOf(levelId)
    this.setStatus('playing')
    this.callbacks.onLevelLoaded(config)
    return config
  }

  async loadLevelByIndex(index: number): Promise<LevelConfig> {
    if (index < 0 || index >= this.levelIds.length) {
      throw new Error(`关卡索引越界: ${index}`)
    }
    return this.loadLevel(this.levelIds[index])
  }

  async loadFirstLevel(): Promise<LevelConfig> {
    return this.loadLevelByIndex(0)
  }

  async loadNextLevel(): Promise<LevelConfig | null> {
    const nextIndex = this.currentIndex + 1
    if (nextIndex >= this.levelIds.length) {
      return null
    }
    return this.loadLevelByIndex(nextIndex)
  }

  async retryLevel(): Promise<LevelConfig | null> {
    if (!this.currentConfig) return null
    return this.loadLevel(this.currentConfig.id)
  }

  markWin() {
    this.setStatus('win')
  }

  markFail() {
    this.setStatus('fail')
  }

  getStatus(): LevelStatus {
    return this.status
  }

  getCurrentConfig(): LevelConfig | null {
    return this.currentConfig
  }

  getCurrentIndex(): number {
    return this.currentIndex
  }

  getTotalLevels(): number {
    return this.levelIds.length
  }

  hasNextLevel(): boolean {
    return this.currentIndex + 1 < this.levelIds.length
  }

  private setStatus(status: LevelStatus) {
    this.status = status
    this.callbacks.onStatusChange(status)
  }
}
