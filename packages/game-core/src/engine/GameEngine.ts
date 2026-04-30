import Phaser from 'phaser'
import type { LevelConfig } from '@nicetap/shared'
import { LevelScene, type LevelSceneCallbacks } from './LevelScene'

export interface GameEngineConfig {
  parent: string | HTMLElement
  width: number
  height: number
}

export interface GameEngineCallbacks {
  onWin(): void
  onFail(): void
  onEvent?(eventId: string): void
  onHint?(text: string, highlightObjectId?: string): void
  onDismissHint?(): void
}

/**
 * 游戏引擎入口 - 封装 Phaser.Game 的初始化与生命周期管理
 */
export class GameEngine {
  private game: Phaser.Game | null = null
  private config: GameEngineConfig
  private callbacks: GameEngineCallbacks | null = null
  private pendingLevel: LevelConfig | null = null
  private ready = false

  constructor(config: GameEngineConfig) {
    this.config = config
  }

  start(callbacks: GameEngineCallbacks): void {
    this.callbacks = callbacks
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.config.parent,
      width: this.config.width,
      height: this.config.height,
      backgroundColor: '#ffffff',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [LevelScene],
      callbacks: {
        postBoot: () => {
          this.ready = true
          this.game!.scale.refresh()
          if (this.pendingLevel) {
            this.doLoadLevel(this.pendingLevel)
            this.pendingLevel = null
          }
        },
      },
    })
  }

  loadLevel(config: LevelConfig): void {
    if (!this.game) return

    if (!this.ready) {
      this.pendingLevel = config
      return
    }

    this.doLoadLevel(config)
  }

  private doLoadLevel(config: LevelConfig): void {
    if (!this.game || !this.callbacks) return

    const sceneCallbacks: LevelSceneCallbacks = {
      onWin: () => this.callbacks!.onWin(),
      onFail: () => this.callbacks!.onFail(),
      onEvent: (eventId) => this.callbacks!.onEvent?.(eventId),
      onHint: (text, highlightObjectId) => this.callbacks!.onHint?.(text, highlightObjectId),
      onDismissHint: () => this.callbacks!.onDismissHint?.(),
    }

    const scene = this.game.scene.getScene('LevelScene')
    if (scene && scene.scene.isActive()) {
      scene.scene.restart({ config, callbacks: sceneCallbacks })
    } else {
      this.game.scene.start('LevelScene', { config, callbacks: sceneCallbacks })
    }
  }

  destroy(): void {
    if (this.game) {
      this.game.destroy(true)
      this.game = null
      this.ready = false
    }
  }

  getGame(): Phaser.Game | null {
    return this.game
  }
}
