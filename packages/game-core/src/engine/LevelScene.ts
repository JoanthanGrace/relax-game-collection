import Phaser from 'phaser'
import type {
  LevelConfig,
  GameObjectConfig,
  ReactionAction,
  HintConfig,
} from '@nicetap/shared'
import { ConditionEvaluator } from '../level/ConditionEvaluator'
import { HintSystem, type HintCallbacks } from '../level/HintSystem'

export interface LevelSceneCallbacks {
  onWin(): void
  onFail(): void
  onEvent(eventId: string): void
  onHint?(text: string, highlightObjectId?: string): void
  onDismissHint?(): void
}

type SceneGameObject =
  | Phaser.GameObjects.Container
  | Phaser.GameObjects.Text
  | Phaser.GameObjects.Rectangle

interface GameObjectEntry {
  config: GameObjectConfig
  gameObject: SceneGameObject
}

export class LevelScene extends Phaser.Scene {
  private levelConfig!: LevelConfig
  private callbacks!: LevelSceneCallbacks
  private evaluator!: ConditionEvaluator
  private objects = new Map<string, GameObjectEntry>()
  private resolved = false
  private waitTimers: Phaser.Time.TimerEvent[] = []
  private firedReactions = new Set<number>()
  private hintSystem: HintSystem | null = null
  private wrongActionCount = 0
  private behaviorTimers: Phaser.Time.TimerEvent[] = []

  constructor() {
    super({ key: 'LevelScene', active: false })
  }

  init(data?: { config: LevelConfig; callbacks: LevelSceneCallbacks }) {
    if (!data?.config) return

    this.levelConfig = data.config
    this.callbacks = data.callbacks
    this.objects.clear()
    this.resolved = false
    this.waitTimers = []
    this.behaviorTimers = []
    this.firedReactions.clear()
    this.wrongActionCount = 0
    this.evaluator = new ConditionEvaluator((id, key) => this.getObjectState(id, key))
    this.initHintSystem(data.config.hints)
  }

  create() {
    if (!this.levelConfig) return

    const { width, height } = this.scale

    this.applyBackground(width, height)

    for (const objConfig of this.levelConfig.objects) {
      this.createGameObject(objConfig, width, height)
    }

    this.applyZIndex()
    this.playEnterAnimations()
    this.setupWaitInteractions()
    this.setupOnCreateBehaviors()
  }

  // ═══════════════════════════════════════════
  // Hint System
  // ═══════════════════════════════════════════

  private initHintSystem(hints?: HintConfig[]) {
    if (!hints || hints.length === 0) {
      this.hintSystem = null
      return
    }

    const hintCallbacks: HintCallbacks = {
      showHintText: (text: string) => {
        this.callbacks.onHint?.(text)
      },
      highlightObject: (objectId: string) => {
        this.callbacks.onHint?.(
          this.hintSystem ? '' : '',
          objectId,
        )
        this.highlightGameObject(objectId)
      },
      dismissHint: () => {
        this.callbacks.onDismissHint?.()
      },
    }

    this.hintSystem = new HintSystem(hints, hintCallbacks)
  }

  private highlightGameObject(objectId: string) {
    const entry = this.objects.get(objectId)
    if (!entry) return

    const obj = entry.gameObject
    this.tweens.add({
      targets: obj,
      scaleX: { from: obj.scaleX, to: obj.scaleX * 1.15 },
      scaleY: { from: obj.scaleY, to: obj.scaleY * 1.15 },
      duration: 300,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    })
  }

  // ═══════════════════════════════════════════
  // Background
  // ═══════════════════════════════════════════

  private applyBackground(width: number, height: number) {
    const bg = this.levelConfig.background
    if (bg.type === 'color') {
      const color = Phaser.Display.Color.HexStringToColor(bg.value as string)
      this.cameras.main.setBackgroundColor(color.color)
    } else if (bg.type === 'gradient' && Array.isArray(bg.value)) {
      const [top, bottom] = bg.value
      const graphics = this.add.graphics()
      const topColor = Phaser.Display.Color.HexStringToColor(top)
      const bottomColor = Phaser.Display.Color.HexStringToColor(bottom)
      graphics.fillGradientStyle(
        topColor.color, topColor.color,
        bottomColor.color, bottomColor.color,
      )
      graphics.fillRect(0, 0, width, height)
    }
  }

  // ═══════════════════════════════════════════
  // Object Creation
  // ═══════════════════════════════════════════

  private createGameObject(config: GameObjectConfig, sceneW: number, sceneH: number) {
    const x = config.position.x * sceneW
    const y = config.position.y * sceneH

    let gameObject: SceneGameObject

    switch (config.type) {
      case 'button':
        gameObject = this.createButton(config, x, y)
        break
      case 'text':
        gameObject = this.createText(config, x, y)
        break
      case 'shape':
        gameObject = this.createShape(config, x, y, sceneW, sceneH)
        break
      default:
        gameObject = this.createText(config, x, y)
    }

    if (config.visible === false) {
      gameObject.setVisible(false)
      gameObject.setAlpha(0)
    }

    if (config.alpha !== undefined) {
      gameObject.setAlpha(config.alpha)
    }

    if (config.scale !== undefined) {
      gameObject.setScale(config.scale)
    }

    if (config.rotation !== undefined) {
      gameObject.setRotation(Phaser.Math.DegToRad(config.rotation))
    }

    this.objects.set(config.id, { config, gameObject })
  }

  private createButton(config: GameObjectConfig, x: number, y: number) {
    const style = config.style ?? {}
    const padding = style.padding ?? 16
    const fontSize = style.fontSize ?? 20
    const bgColor = style.backgroundColor ?? '#4CAF50'
    const textColor = style.color ?? '#ffffff'
    const radius = style.borderRadius ?? 8

    const text = this.add.text(0, 0, config.content ?? '', {
      fontSize: `${fontSize}px`,
      color: textColor,
      fontFamily: style.fontFamily ?? 'sans-serif',
      fontStyle: style.bold ? 'bold' : 'normal',
    })
    text.setOrigin(0.5)

    const w = text.width + padding * 2
    const h = text.height + padding * 2

    const bg = this.add.graphics()
    const colorNum = Phaser.Display.Color.HexStringToColor(bgColor).color
    bg.fillStyle(colorNum)
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius)

    const container = this.add.container(x, y, [bg, text])
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    )

    if (config.interactive === false) {
      container.disableInteractive()
    }

    this.bindInteractions(container, config)
    return container
  }

  private createText(config: GameObjectConfig, x: number, y: number) {
    const style = config.style ?? {}
    const text = this.add.text(x, y, config.content ?? '', {
      fontSize: `${style.fontSize ?? 18}px`,
      color: style.color ?? '#333333',
      fontFamily: style.fontFamily ?? 'sans-serif',
      fontStyle: style.bold ? 'bold' : 'normal',
      align: style.textAlign ?? 'center',
    })
    text.setOrigin(0.5)

    if (config.interactive !== false && config.interactions?.length) {
      text.setInteractive()
      this.bindInteractions(text, config)
    }

    return text
  }

  private createShape(
    config: GameObjectConfig,
    x: number,
    y: number,
    sceneW: number,
    sceneH: number,
  ) {
    const w = (config.size?.x ?? 0.1) * sceneW
    const h = (config.size?.y ?? 0.1) * sceneH
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h)
    rect.setAlpha(0)
    if (config.interactive !== false) {
      rect.setInteractive()
    }
    this.bindInteractions(rect, config)
    return rect
  }

  // ═══════════════════════════════════════════
  // zIndex
  // ═══════════════════════════════════════════

  private applyZIndex() {
    for (const [, entry] of this.objects) {
      const z = entry.config.zIndex ?? 0
      entry.gameObject.setDepth(z)
    }
  }

  // ═══════════════════════════════════════════
  // Enter Animations
  // ═══════════════════════════════════════════

  private playEnterAnimations() {
    for (const [, entry] of this.objects) {
      const anim = entry.config.enterAnimation
      if (!anim || anim.type === 'none') continue
      if (entry.config.visible === false) continue

      const obj = entry.gameObject
      const duration = anim.duration ?? 400
      const delay = anim.delay ?? 0

      switch (anim.type) {
        case 'fade-in': {
          const targetAlpha = obj.alpha
          obj.setAlpha(0)
          this.tweens.add({ targets: obj, alpha: targetAlpha, duration, delay, ease: 'Power2' })
          break
        }
        case 'scale-in': {
          const targetScaleX = obj.scaleX
          const targetScaleY = obj.scaleY
          obj.setScale(0)
          this.tweens.add({
            targets: obj,
            scaleX: targetScaleX,
            scaleY: targetScaleY,
            duration, delay, ease: 'Back.easeOut',
          })
          break
        }
        case 'bounce-in': {
          const targetScaleX = obj.scaleX
          const targetScaleY = obj.scaleY
          obj.setScale(0)
          this.tweens.add({
            targets: obj,
            scaleX: targetScaleX,
            scaleY: targetScaleY,
            duration, delay, ease: 'Bounce.easeOut',
          })
          break
        }
        case 'slide-in': {
          const dir = anim.direction ?? 'up'
          const offset = 80
          const origX = obj.x
          const origY = obj.y
          if (dir === 'up') obj.y += offset
          else if (dir === 'down') obj.y -= offset
          else if (dir === 'left') obj.x += offset
          else if (dir === 'right') obj.x -= offset
          this.tweens.add({ targets: obj, x: origX, y: origY, duration, delay, ease: 'Power2' })
          break
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // Behaviors (on-create)
  // ═══════════════════════════════════════════

  private setupOnCreateBehaviors() {
    for (const [, entry] of this.objects) {
      if (!entry.config.behaviors) continue
      for (const behavior of entry.config.behaviors) {
        if (behavior.trigger === 'on-event') continue
        this.executeBehavior(entry, behavior.type, behavior.params ?? {})
      }
    }
  }

  private executeBehavior(
    entry: GameObjectEntry,
    type: string,
    params: Record<string, unknown>,
  ) {
    const obj = entry.gameObject

    switch (type) {
      case 'countdown': {
        const seconds = (params.seconds as number) ?? 3
        const displayId = (params.displayObjectId as string) ?? entry.config.id
        let remaining = seconds
        const timer = this.time.addEvent({
          delay: 1000,
          repeat: seconds - 1,
          callback: () => {
            remaining--
            const displayEntry = this.objects.get(displayId)
            if (displayEntry?.gameObject instanceof Phaser.GameObjects.Text) {
              displayEntry.gameObject.setText(String(remaining))
            }
          },
        })
        this.behaviorTimers.push(timer)
        break
      }
      case 'shake': {
        const intensity = (params.intensity as number) ?? 2
        const duration = (params.duration as number) ?? 99999
        const origX = obj.x
        const origY = obj.y
        this.tweens.add({
          targets: obj,
          x: { from: origX - intensity, to: origX + intensity },
          y: { from: origY - intensity * 0.5, to: origY + intensity * 0.5 },
          duration: 80,
          yoyo: true,
          repeat: Math.floor(duration / 160),
          ease: 'Sine.easeInOut',
        })
        break
      }
      case 'pulse': {
        const scale = (params.scale as number) ?? 1.1
        this.tweens.add({
          targets: obj,
          scaleX: obj.scaleX * scale,
          scaleY: obj.scaleY * scale,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
        break
      }
    }
  }

  // ═══════════════════════════════════════════
  // Interaction Binding
  // ═══════════════════════════════════════════

  private bindInteractions(
    obj: Phaser.GameObjects.GameObject,
    config: GameObjectConfig,
  ) {
    if (!config.interactions) return

    for (const interaction of config.interactions) {
      switch (interaction.type) {
        case 'click':
          obj.on('pointerdown', () => {
            this.emitGameEvent(interaction.emits)
          })
          break

        case 'multi-click': {
          let clickCount = 0
          let lastClickTime = 0
          const required = interaction.clickCount ?? 2
          const interval = interaction.clickInterval ?? 600
          obj.on('pointerdown', () => {
            const now = Date.now()
            if (now - lastClickTime > interval) {
              clickCount = 0
            }
            clickCount++
            lastClickTime = now
            if (clickCount >= required) {
              this.emitGameEvent(interaction.emits)
              clickCount = 0
            }
          })
          break
        }

        case 'long-press': {
          const duration = interaction.duration ?? 1000
          let pressTimer: ReturnType<typeof setTimeout> | null = null
          obj.on('pointerdown', () => {
            pressTimer = setTimeout(() => {
              this.emitGameEvent(interaction.emits)
              pressTimer = null
            }, duration)
          })
          obj.on('pointerup', () => {
            if (pressTimer) {
              clearTimeout(pressTimer)
              pressTimer = null
            }
          })
          obj.on('pointerout', () => {
            if (pressTimer) {
              clearTimeout(pressTimer)
              pressTimer = null
            }
          })
          break
        }

        case 'drag': {
          const draggable = obj as SceneGameObject
          this.input.setDraggable(draggable)

          const constraint = interaction.dragConstraint?.axis

          const checkDragTarget = () => {
            const { width, height } = this.scale
            if (interaction.dragTarget?.offScreen) {
              const threshold = 40
              if (
                draggable.x < threshold || draggable.x > width - threshold ||
                draggable.y < threshold || draggable.y > height - threshold
              ) {
                this.emitGameEvent(interaction.emits)
              }
            } else if (interaction.dragTarget?.position) {
              const tp = interaction.dragTarget.position
              const radius = (interaction.dragTarget.radius ?? 0.05) * Math.min(width, height)
              const dx = draggable.x - tp.x * width
              const dy = draggable.y - tp.y * height
              if (Math.sqrt(dx * dx + dy * dy) <= radius) {
                this.emitGameEvent(interaction.emits)
              }
            }
          }

          draggable.on('drag', (_p: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (constraint === 'x') {
              draggable.x = dragX
            } else if (constraint === 'y') {
              draggable.y = dragY
            } else {
              draggable.x = dragX
              draggable.y = dragY
            }
            checkDragTarget()
          })

          draggable.on('dragend', () => {
            checkDragTarget()
          })
          break
        }

        default:
          break
      }
    }
  }

  // ═══════════════════════════════════════════
  // Wait Interactions
  // ═══════════════════════════════════════════

  private setupWaitInteractions() {
    for (const objConfig of this.levelConfig.objects) {
      if (!objConfig.interactions) continue
      for (const interaction of objConfig.interactions) {
        if (interaction.type === 'wait' && interaction.waitDuration) {
          const timer = this.time.delayedCall(interaction.waitDuration, () => {
            this.emitGameEvent(interaction.emits)
          })
          this.waitTimers.push(timer)
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // EventReaction Engine
  // ═══════════════════════════════════════════

  private processReactions(eventId: string) {
    const reactions = this.levelConfig.reactions
    if (!reactions) return

    for (let i = 0; i < reactions.length; i++) {
      const reaction = reactions[i]
      if (reaction.trigger !== eventId) continue

      const once = reaction.once !== false
      if (once && this.firedReactions.has(i)) continue
      this.firedReactions.add(i)

      if (reaction.delay && reaction.delay > 0) {
        this.time.delayedCall(reaction.delay, () => {
          this.executeActions(reaction.actions)
        })
      } else {
        this.executeActions(reaction.actions)
      }
    }
  }

  private executeActions(actions: ReactionAction[]) {
    for (const action of actions) {
      this.executeAction(action)
    }
  }

  private executeAction(action: ReactionAction) {
    const entry = action.objectId ? this.objects.get(action.objectId) : null
    const obj = entry?.gameObject
    const duration = action.duration ?? 0

    switch (action.type) {
      case 'show': {
        if (!obj) break
        obj.setVisible(true)
        if (duration > 0) {
          obj.setAlpha(0)
          this.tweens.add({ targets: obj, alpha: 1, duration, ease: 'Power2' })
        } else {
          obj.setAlpha(1)
        }
        break
      }

      case 'hide': {
        if (!obj) break
        if (duration > 0) {
          this.tweens.add({
            targets: obj, alpha: 0, duration, ease: 'Power2',
            onComplete: () => obj.setVisible(false),
          })
        } else {
          obj.setVisible(false)
          obj.setAlpha(0)
        }
        break
      }

      case 'set-text': {
        if (!obj) break
        const newText = action.value as string
        if (obj instanceof Phaser.GameObjects.Text) {
          obj.setText(newText)
        } else if (obj instanceof Phaser.GameObjects.Container) {
          const child = obj.getAt(1)
          if (child instanceof Phaser.GameObjects.Text) {
            child.setText(newText)
          }
        }
        break
      }

      case 'move': {
        if (!obj) break
        const pos = action.value as { x: number; y: number }
        const { width, height } = this.scale
        const targetX = pos.x * width
        const targetY = pos.y * height
        if (duration > 0) {
          this.tweens.add({ targets: obj, x: targetX, y: targetY, duration, ease: 'Power2' })
        } else {
          obj.x = targetX
          obj.y = targetY
        }
        break
      }

      case 'set-interactive': {
        if (!obj) break
        if (action.value) {
          obj.setInteractive()
        } else {
          obj.disableInteractive()
        }
        break
      }

      case 'emit-event': {
        const eid = action.eventId ?? (action.value as string)
        if (eid) {
          if (duration > 0) {
            this.time.delayedCall(duration, () => this.emitGameEvent(eid))
          } else {
            this.emitGameEvent(eid)
          }
        }
        break
      }

      case 'destroy': {
        if (!obj) break
        if (duration > 0) {
          this.tweens.add({
            targets: obj, alpha: 0, scaleX: 0, scaleY: 0, duration, ease: 'Power2',
            onComplete: () => {
              obj.destroy()
              if (action.objectId) this.objects.delete(action.objectId)
            },
          })
        } else {
          obj.destroy()
          if (action.objectId) this.objects.delete(action.objectId)
        }
        break
      }

      case 'shake': {
        if (!obj) break
        const intensity = (action.value as number) ?? 4
        const shakeDuration = duration || 300
        const origX = obj.x
        const origY = obj.y
        this.tweens.add({
          targets: obj,
          x: { from: origX - intensity, to: origX + intensity },
          duration: 50,
          yoyo: true,
          repeat: Math.floor(shakeDuration / 100),
          ease: 'Sine.easeInOut',
          onComplete: () => { obj.x = origX; obj.y = origY },
        })
        break
      }

      case 'flash': {
        if (!obj) break
        const flashDuration = duration || 400
        this.tweens.add({
          targets: obj,
          alpha: { from: 0, to: 1 },
          duration: flashDuration / 4,
          yoyo: true,
          repeat: 1,
        })
        break
      }

      case 'set-style': {
        if (!obj) break
        const style = action.value as Record<string, unknown>
        if (obj instanceof Phaser.GameObjects.Text && style) {
          if (style.color) obj.setColor(style.color as string)
          if (style.fontSize) obj.setFontSize(style.fontSize as number)
        }
        break
      }
    }
  }

  // ═══════════════════════════════════════════
  // Event System
  // ═══════════════════════════════════════════

  private emitGameEvent(eventId: string) {
    if (this.resolved) return

    this.evaluator.recordEvent(eventId)
    this.callbacks.onEvent(eventId)
    this.processReactions(eventId)
    this.processEventBehaviors(eventId)
    this.checkConditions()

    if (!this.resolved) {
      this.wrongActionCount++
      this.hintSystem?.onFail()
    }
  }

  private processEventBehaviors(eventId: string) {
    for (const [, entry] of this.objects) {
      if (!entry.config.behaviors) continue
      for (const behavior of entry.config.behaviors) {
        if (behavior.trigger === 'on-event' && behavior.triggerEventId === eventId) {
          this.executeBehavior(entry, behavior.type, behavior.params ?? {})
        }
      }
    }
  }

  private checkConditions() {
    if (this.resolved) return

    const winConditions = this.levelConfig.winConditions
    const winLogic = this.levelConfig.winLogic ?? 'and'
    if (this.evaluator.evaluateAll(winConditions, winLogic)) {
      this.resolved = true
      this.callbacks.onWin()
      return
    }

    const failConditions = this.levelConfig.failConditions
    if (failConditions && failConditions.length > 0) {
      if (this.evaluator.evaluateAll(failConditions, 'or')) {
        this.resolved = true
        this.callbacks.onFail()
      }
    }
  }

  // ═══════════════════════════════════════════
  // Object State Query
  // ═══════════════════════════════════════════

  private getObjectState(objectId: string, key: string): unknown {
    const entry = this.objects.get(objectId)
    if (!entry) return undefined

    const obj = entry.gameObject
    switch (key) {
      case 'visible':
        return obj.visible
      case 'position.x':
        return obj.x
      case 'position.y':
        return obj.y
      case 'scale':
        return obj.scaleX
      case 'alpha':
        return obj.alpha
      case 'rotation':
        return obj.rotation
      default:
        return undefined
    }
  }

  // ═══════════════════════════════════════════
  // Lifecycle
  // ═══════════════════════════════════════════

  shutdown() {
    for (const timer of this.waitTimers) {
      timer.destroy()
    }
    for (const timer of this.behaviorTimers) {
      timer.destroy()
    }
    this.waitTimers = []
    this.behaviorTimers = []
    this.objects.clear()
    this.firedReactions.clear()
    this.hintSystem = null
  }
}
