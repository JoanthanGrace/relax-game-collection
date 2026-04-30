# 配置驱动关卡系统 — 详细设计 v1.0

> **设计哲学**：关卡配置是产品本身，代码只是播放器。
> 一个好的关卡系统应该让策划（甚至 AI）只写 JSON 就能出关，
> 让程序员只在发明全新交互类型时才写代码。

---

## 目录

1. [LevelConfig 完整类型定义](#1-levelconfig-完整类型定义)
2. [通用交互机制 (Interaction Mechanics)](#2-通用交互机制)
3. [通关 / 失败条件抽象](#3-通关--失败条件抽象)
4. [提示系统 (Hint System)](#4-提示系统)
5. [埋点事件结构 (Telemetry)](#5-埋点事件结构)
6. [Scene Runtime Context](#6-scene-runtime-context)
7. [Level Loader / Validator](#7-level-loader--validator)
8. [新增关卡的最小开发步骤](#8-新增关卡的最小开发步骤)
9. [Custom Script 边界判定](#9-custom-script-边界判定)
10. [附录：PRD 前 20 关配置示例](#10-附录prd-前-20-关配置示例)

---

## 1. LevelConfig 完整类型定义

以下类型从 PRD 中全部 20 个关卡设计反推得出。每个字段旁标注了它覆盖的关卡案例。

```typescript
// packages/shared/src/types/level.ts

// ─────────────────────────────────────────────
// 顶层关卡配置
// ─────────────────────────────────────────────

export interface LevelConfig {
  /** 全局唯一 ID，格式 "level-XXX"（3 位补零） */
  id: string

  /** 所属章节，用于分组展示 + 按章节下载资源包 */
  chapter: number

  /** 章节内排序 */
  order: number

  /** 关卡标题 i18n key（显示在关卡选择页） */
  title: string

  /** 玩家进入关卡后看到的指令文案 i18n key
   *  这条文案本身经常就是谜题的一部分（如"快点击！！！"） */
  instruction: string

  /** 关卡分类标签，用于统计分析 + 内容运营 */
  tags: LevelTag[]

  /** 场景背景 */
  background: BackgroundConfig

  /** 场景中所有可交互 / 可见对象 */
  objects: GameObjectConfig[]

  /** 通关条件（必填，至少一个） */
  winConditions: Condition[]

  /** 通关条件的组合方式，默认 'and' */
  winLogic?: 'and' | 'or'

  /** 失败条件（可选，无则不会主动判定失败） */
  failConditions?: Condition[]

  /** 时间限制（秒）。0 或不填 = 无限时。
   *  到时间后触发 __timer_expired 内部事件 */
  timeLimit?: number

  /** 自定义脚本 ID。对应 packages/levels/src/scripts/{scriptId}.ts
   *  仅在配置无法表达的复杂逻辑时使用 */
  scriptId?: string

  /** 提示配置 */
  hints?: HintConfig[]

  /** 通关反馈 */
  passFeedback: FeedbackConfig

  /** 失败反馈 */
  failFeedback: FeedbackConfig

  /** 关卡预加载的额外资源 key 列表 */
  preloadAssets?: string[]
}

// ─────────────────────────────────────────────
// 关卡标签（对应 PRD §18.1 内容模板化分类）
// ─────────────────────────────────────────────

export type LevelTag =
  | 'text-trick'      // 文字误导型：第2、3、4关
  | 'ui-trick'        // UI 欺骗型：第16、17、18、19、20关
  | 'drag-reveal'     // 拖拽反转型：第6、10、11、14、19关
  | 'wait'            // 等待型：第5关
  | 'long-press'      // 长按型：第7关
  | 'fake-button'     // 假按钮型：第8、16关
  | 'system-meta'     // 系统元素玩梗型：第17、18关
  | 'multi-step'      // 组合操作型：第9、12关
  | 'resize'          // 缩放型：第15关

// ─────────────────────────────────────────────
// 背景配置
// ─────────────────────────────────────────────

export interface BackgroundConfig {
  type: 'color' | 'image' | 'gradient'
  /** 纯色：'#ffffff'；渐变：['#fff', '#000']；图片：asset key */
  value: string | string[]
}

// ─────────────────────────────────────────────
// 游戏对象配置
// ─────────────────────────────────────────────

export interface GameObjectConfig {
  /** 对象唯一 ID，在 condition/script 中用来引用 */
  id: string

  /** 对象类型 */
  type: GameObjectType

  /** 归一化坐标 (0~1)，(0,0) = 左上，(0.5,0.5) = 正中
   *  运行时乘以实际屏幕尺寸转为像素 */
  position: Vec2

  /** 归一化尺寸（可选，不同 type 有默认值） */
  size?: Vec2

  /** 文案 i18n key 或 asset key，取决于 type */
  content?: string

  /** 样式 */
  style?: ObjectStyle

  /** 绑定的交互列表 */
  interactions?: InteractionConfig[]

  /** 绑定的行为列表（持续运行的自动逻辑） */
  behaviors?: BehaviorConfig[]

  /** 初始是否可见，默认 true */
  visible?: boolean

  /** 初始是否可交互，默认 true（false = 看得见但点不动） */
  interactive?: boolean

  /** 渲染层级，默认 0，数字越大越靠前 */
  zIndex?: number

  /** 初始旋转角度（度） */
  rotation?: number

  /** 初始缩放，默认 1 */
  scale?: number

  /** 初始透明度 0~1，默认 1 */
  alpha?: number

  /** 锚点，默认 (0.5, 0.5) = 中心 */
  origin?: Vec2

  /** 入场动画 */
  enterAnimation?: AnimationConfig

  /** 子对象（用于 container 类型） */
  children?: GameObjectConfig[]
}

export type GameObjectType =
  | 'text'        // 文本
  | 'button'      // 按钮（带背景 + 文字）
  | 'image'       // 静态图片
  | 'sprite'      // 精灵（支持帧动画）
  | 'container'   // 容器（可装子对象，自身可交互）
  | 'shape'       // 几何形状（矩形、圆形等，用于不可见点击区域）
  | 'toggle'      // 开关组件（第17关"设置"用）

export interface Vec2 {
  x: number
  y: number
}

export interface ObjectStyle {
  fontSize?: number
  fontFamily?: string
  color?: string
  backgroundColor?: string
  borderRadius?: number
  borderColor?: string
  borderWidth?: number
  padding?: number
  shadow?: boolean
  bold?: boolean
  /** 文字对齐 */
  textAlign?: 'left' | 'center' | 'right'
  /** 形状类型（仅 shape 类型使用） */
  shapeType?: 'rect' | 'circle' | 'ellipse'
  /** 形状填充色 */
  fill?: string
}

export interface AnimationConfig {
  type: 'fade-in' | 'slide-in' | 'scale-in' | 'bounce-in' | 'none'
  duration?: number      // ms, 默认 300
  delay?: number         // ms, 默认 0
  direction?: 'up' | 'down' | 'left' | 'right'
}

// ─────────────────────────────────────────────
// 交互配置（详见第 2 节）
// ─────────────────────────────────────────────

export interface InteractionConfig {
  /** 交互类型 */
  type: InteractionType

  /** 触发后发射的事件 ID。
   *  ConditionEvaluator 通过事件 ID 判断通关/失败 */
  emits: string

  /** === click 专用 === */
  // 无额外参数

  /** === multi-click 专用 === */
  /** 需要连续点击的次数 */
  clickCount?: number
  /** 连击间隔上限 (ms)，超过则重置计数，默认 500 */
  clickInterval?: number

  /** === long-press 专用 === */
  /** 长按判定时长 (ms)，默认 1000 */
  duration?: number

  /** === drag 专用 === */
  /** 拖拽约束 */
  dragConstraint?: DragConstraint
  /** 拖拽成功判定：到达目标区域 */
  dragTarget?: DragTarget
  /** 拖拽边界：'screen' = 屏幕内 | 'none' = 可拖出屏幕（第11关太阳） */
  dragBounds?: 'screen' | 'none'

  /** === swipe 专用 === */
  /** 滑动方向 */
  direction?: SwipeDirection
  /** 最小滑动距离（归一化），默认 0.1 */
  minDistance?: number

  /** === wait 专用 === */
  /** 等待时长 (ms)。玩家在此期间不做任何操作则触发 */
  waitDuration?: number

  /** === pinch/resize 专用 === */
  /** 目标缩放范围。对象缩放到此范围内触发事件 */
  targetScale?: { min: number; max: number }

  /** === toggle 专用 === */
  /** 目标状态 */
  targetState?: boolean
}

export type InteractionType =
  | 'click'         // 单击            → 第1、2、4、8、16、18、20关
  | 'multi-click'   // 连续点击 N 次   → 第3关
  | 'long-press'    // 长按            → 第7关
  | 'drag'          // 拖拽            → 第6、10、11、12、13、14、19关
  | 'swipe'         // 滑动            → 第10关（备选方案）
  | 'wait'          // 等待/不操作      → 第5关
  | 'pinch'         // 双指缩放        → 第15关
  | 'toggle'        // 开关切换        → 第17关

export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'any'

export interface DragConstraint {
  /** 轴向约束：'x' = 只能水平拖 | 'y' = 只能垂直拖 | 'free' = 自由拖 */
  axis?: 'x' | 'y' | 'free'
}

export interface DragTarget {
  /** 方式一：拖到某个归一化坐标区域 */
  position?: Vec2
  radius?: number           // 归一化半径，默认 0.05

  /** 方式二：拖到另一个对象上（第14关"把文字拖到门上"） */
  objectId?: string

  /** 方式三：拖出屏幕（第11关"把太阳拖走"） */
  offScreen?: boolean

  /** 方式四：达到某个相对位移（第13关"拖下来坐下"） */
  relativeOffset?: Vec2
}

// ─────────────────────────────────────────────
// 行为配置（持续运行的自动逻辑）
// ─────────────────────────────────────────────

export interface BehaviorConfig {
  /** 已注册的行为类型名 */
  type: string

  /** 行为参数（每种行为有自己的参数 schema） */
  params?: Record<string, unknown>

  /** 触发条件：什么时候开始执行此行为，默认 'on-create' */
  trigger?: 'on-create' | 'on-event'

  /** 当 trigger = 'on-event' 时，监听哪个事件 */
  triggerEventId?: string
}

/**
 * 内置行为类型及其参数签名（BehaviorRegistry 中注册）
 *
 * 'run-away'      → { speed: number, triggerDistance: number }
 *                    鼠标/手指靠近时逃跑（第8关）
 *
 * 'countdown'     → { seconds: number, displayObjectId: string }
 *                    倒计时显示（第5关）
 *
 * 'blink'         → { interval: number, minAlpha: number }
 *                    闪烁效果
 *
 * 'float'         → { amplitude: number, speed: number }
 *                    上下浮动
 *
 * 'shake'         → { intensity: number, duration: number }
 *                    抖动
 *
 * 'typewriter'    → { text: string, charDelay: number }
 *                    打字机效果（第12关角色说话）
 *
 * 'pulse-scale'   → { minScale: number, maxScale: number, speed: number }
 *                    脉冲缩放（第15关按钮）
 */

// ─────────────────────────────────────────────
// 条件系统（详见第 3 节）
// ─────────────────────────────────────────────

export interface Condition {
  type: ConditionType

  /** 'event-fired' | 'event-count'：要监听的事件 ID */
  eventId?: string

  /** 'event-count'：需要达到的次数 */
  count?: number

  /** 'event-count'：比较方式，默认 'gte' */
  comparator?: 'eq' | 'gte' | 'lte'

  /** 'object-state'：目标对象 ID */
  objectId?: string

  /** 'object-state'：要检查的属性和期望值 */
  property?: ObjectStateProperty

  /** 'timer-expired'：从关卡开始经过的秒数 */
  seconds?: number

  /** 'no-action'：玩家持续不操作的秒数 */
  idleDuration?: number

  /** 'sequence'：事件 ID 必须按此顺序触发 */
  eventSequence?: string[]

  /** 'composite'：子条件列表 */
  children?: Condition[]

  /** 'composite'：组合逻辑 */
  operator?: 'and' | 'or'

  /** 对结果取反（如"没有点击某按钮"） */
  negate?: boolean
}

export type ConditionType =
  | 'event-fired'      // 某事件触发过至少一次
  | 'event-count'      // 某事件触发次数达标
  | 'object-state'     // 对象属性满足条件
  | 'timer-expired'    // 经过了 N 秒
  | 'no-action'        // 玩家持续 N 秒没操作（第5关）
  | 'sequence'         // 事件按顺序触发
  | 'composite'        // 复合条件

export interface ObjectStateProperty {
  key: 'visible' | 'position.x' | 'position.y' | 'scale' | 'alpha' | 'rotation' | 'toggleState'
  value: unknown
  comparator?: 'eq' | 'gte' | 'lte' | 'lt' | 'gt'
}

// ─────────────────────────────────────────────
// 提示系统（详见第 4 节）
// ─────────────────────────────────────────────

export interface HintConfig {
  /** 提示级别。递进式：先弱后强 */
  level: 'weak' | 'medium' | 'strong'

  /** 提示文案 i18n key */
  text: string

  /** 玩家失败多少次后展示此提示 */
  showAfterFailCount: number

  /** 可选：除了文字，还高亮某个对象（描边闪烁） */
  highlightObjectId?: string

  /** 可选：提示出现后的自动消失时间 (ms)，0 = 不消失 */
  autoDismissMs?: number
}

// ─────────────────────────────────────────────
// 反馈配置
// ─────────────────────────────────────────────

export interface FeedbackConfig {
  /** 随机从中选一条展示的文案 i18n key 列表 */
  texts: string[]

  /** 视觉动效预设 */
  animation?: 'confetti' | 'shake' | 'explode' | 'bounce' | 'none'

  /** 音效 key */
  sfx?: string

  /** 振动反馈 */
  vibration?: 'light' | 'medium' | 'heavy'
}

// ─────────────────────────────────────────────
// 关卡脚本接口（仅复杂关卡使用）
// ─────────────────────────────────────────────

export interface LevelScript {
  id: string

  /** 关卡初始化后调用 */
  onInit?(ctx: LevelContext): void

  /** 每帧调用（慎用，只有确实需要帧级逻辑时才实现） */
  onUpdate?(ctx: LevelContext, delta: number): void

  /** 任何交互事件触发时调用 */
  onEvent?(ctx: LevelContext, eventId: string, payload?: EventPayload): void

  /** 关卡销毁时调用，用于清理 */
  onDestroy?(ctx: LevelContext): void
}

export interface EventPayload {
  objectId: string
  interactionType: InteractionType
  position?: Vec2
  /** drag 事件附带 */
  dragDelta?: Vec2
  /** multi-click 附带当前计数 */
  currentCount?: number
  timestamp: number
}
```

---

## 2. 通用交互机制

### 2.1 设计原则

从 PRD 的 20 个关卡中提取出 8 种原子交互类型。所有关卡的玩法都是这些原子交互的参数化组合，**不是**新的交互代码。

### 2.2 交互类型完整矩阵

| 交互类型 | Phaser 实现基础 | 参数 | PRD 覆盖关卡 |
|---------|----------------|------|-------------|
| `click` | `pointerdown` + `pointerup`（同一对象） | 无 | 1, 2, 4, 8, 16, 18, 20 |
| `multi-click` | 连续 click 计数 + 间隔超时重置 | `clickCount`, `clickInterval` | 3 |
| `long-press` | `pointerdown` 持续 → `setTimeout` | `duration` | 7 |
| `drag` | Phaser `drag` 事件 | `dragConstraint`, `dragTarget`, `dragBounds` | 6, 10, 11, 12, 13, 14, 19 |
| `swipe` | `pointerdown` → `pointerup` 距离+方向判定 | `direction`, `minDistance` | 10 (备选) |
| `wait` | 无操作检测 (idle timer) | `waitDuration` | 5 |
| `pinch` | 双指距离变化 → 对象 scale | `targetScale` | 15 |
| `toggle` | 状态切换（布尔值翻转） | `targetState` | 17 |

### 2.3 InteractionSystem 核心实现

```typescript
// packages/game-core/src/systems/InteractionSystem.ts

import type {
  InteractionConfig, InteractionType, GameObjectConfig, EventPayload, Vec2
} from '@nicetap/shared'

type EventCallback = (eventId: string, payload: EventPayload) => void

/**
 * 将声明式 InteractionConfig 绑定到 Phaser GameObject 上。
 * 每种交互类型对应一个 attach 方法，返回 detach 函数用于清理。
 */
export class InteractionSystem {
  private detachFns: Array<() => void> = []

  constructor(
    private scene: Phaser.Scene,
    private onEvent: EventCallback
  ) {}

  /** 为一个游戏对象绑定其所有交互 */
  attachAll(
    gameObject: Phaser.GameObjects.GameObject,
    objectConfig: GameObjectConfig,
    interactions: InteractionConfig[]
  ): void {
    for (const interaction of interactions) {
      const detach = this.attach(gameObject, objectConfig, interaction)
      this.detachFns.push(detach)
    }
  }

  private attach(
    go: Phaser.GameObjects.GameObject,
    config: GameObjectConfig,
    interaction: InteractionConfig
  ): () => void {
    switch (interaction.type) {
      case 'click':       return this.attachClick(go, config, interaction)
      case 'multi-click': return this.attachMultiClick(go, config, interaction)
      case 'long-press':  return this.attachLongPress(go, config, interaction)
      case 'drag':        return this.attachDrag(go, config, interaction)
      case 'swipe':       return this.attachSwipe(go, config, interaction)
      case 'wait':        return this.attachWait(interaction)
      case 'pinch':       return this.attachPinch(go, config, interaction)
      case 'toggle':      return this.attachToggle(go, config, interaction)
      default:
        throw new Error(
          `TODO: 未知交互类型 "${interaction.type}"，需要人工确认是否需要新增`
        )
    }
  }

  /** 单击：pointerdown + pointerup 在同一对象上 */
  private attachClick(
    go: Phaser.GameObjects.GameObject,
    config: GameObjectConfig,
    interaction: InteractionConfig
  ): () => void {
    const handler = (pointer: Phaser.Input.Pointer) => {
      this.emit(interaction.emits, {
        objectId: config.id,
        interactionType: 'click',
        position: { x: pointer.x, y: pointer.y },
        timestamp: Date.now()
      })
    }

    go.setInteractive()
    go.on('pointerup', handler)
    return () => go.off('pointerup', handler)
  }

  /** 连击：在 clickInterval 内连续点击 clickCount 次 */
  private attachMultiClick(
    go: Phaser.GameObjects.GameObject,
    config: GameObjectConfig,
    interaction: InteractionConfig
  ): () => void {
    const requiredCount = interaction.clickCount ?? 2
    const interval = interaction.clickInterval ?? 500
    let count = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    const handler = () => {
      count++
      if (timer) clearTimeout(timer)

      if (count >= requiredCount) {
        count = 0
        this.emit(interaction.emits, {
          objectId: config.id,
          interactionType: 'multi-click',
          currentCount: requiredCount,
          timestamp: Date.now()
        })
      } else {
        timer = setTimeout(() => { count = 0 }, interval)
      }
    }

    go.setInteractive()
    go.on('pointerup', handler)
    return () => {
      go.off('pointerup', handler)
      if (timer) clearTimeout(timer)
    }
  }

  /** 长按：pointerdown 后持续 duration 不放 */
  private attachLongPress(
    go: Phaser.GameObjects.GameObject,
    config: GameObjectConfig,
    interaction: InteractionConfig
  ): () => void {
    const duration = interaction.duration ?? 1000
    let timer: ReturnType<typeof setTimeout> | null = null

    const downHandler = () => {
      timer = setTimeout(() => {
        this.emit(interaction.emits, {
          objectId: config.id,
          interactionType: 'long-press',
          timestamp: Date.now()
        })
      }, duration)
    }

    const upHandler = () => {
      if (timer) { clearTimeout(timer); timer = null }
    }

    go.setInteractive()
    go.on('pointerdown', downHandler)
    go.on('pointerup', upHandler)
    go.on('pointerout', upHandler)

    return () => {
      go.off('pointerdown', downHandler)
      go.off('pointerup', upHandler)
      go.off('pointerout', upHandler)
      if (timer) clearTimeout(timer)
    }
  }

  /** 拖拽：Phaser 内置 drag 系统 + 目标判定 */
  private attachDrag(
    go: Phaser.GameObjects.GameObject,
    config: GameObjectConfig,
    interaction: InteractionConfig
  ): () => void {
    go.setInteractive({ draggable: true })
    const { width, height } = this.scene.scale

    const dragHandler = (
      _pointer: Phaser.Input.Pointer,
      dragX: number,
      dragY: number
    ) => {
      const obj = go as Phaser.GameObjects.Components.Transform
          & Phaser.GameObjects.GameObject

      if (interaction.dragConstraint?.axis === 'x') {
        obj.x = dragX
      } else if (interaction.dragConstraint?.axis === 'y') {
        obj.y = dragY
      } else {
        obj.x = dragX
        obj.y = dragY
      }

      if (this.checkDragTarget(obj, interaction, width, height)) {
        this.emit(interaction.emits, {
          objectId: config.id,
          interactionType: 'drag',
          position: { x: dragX / width, y: dragY / height },
          timestamp: Date.now()
        })
      }
    }

    go.on('drag', dragHandler)
    return () => go.off('drag', dragHandler)
  }

  private checkDragTarget(
    obj: Phaser.GameObjects.Components.Transform,
    interaction: InteractionConfig,
    screenW: number,
    screenH: number
  ): boolean {
    const target = interaction.dragTarget
    if (!target) return false

    if (target.offScreen) {
      const margin = 20
      return obj.x < -margin || obj.x > screenW + margin
          || obj.y < -margin || obj.y > screenH + margin
    }

    if (target.position) {
      const tx = target.position.x * screenW
      const ty = target.position.y * screenH
      const r = (target.radius ?? 0.05) * Math.min(screenW, screenH)
      const dist = Math.hypot(obj.x - tx, obj.y - ty)
      return dist <= r
    }

    if (target.objectId) {
      const targetObj = this.scene.children.getByName(target.objectId)
        as Phaser.GameObjects.Components.Transform | null
      if (!targetObj) return false
      const r = (target.radius ?? 0.05) * Math.min(screenW, screenH)
      return Math.hypot(obj.x - targetObj.x, obj.y - targetObj.y) <= r
    }

    return false
  }

  /** 等待：检测玩家持续 N 秒没有任何操作 */
  private attachWait(interaction: InteractionConfig): () => void {
    const duration = interaction.waitDuration ?? 3000
    let timer: ReturnType<typeof setTimeout> | null = null
    let fired = false

    const resetTimer = () => {
      if (fired) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        fired = true
        this.emit(interaction.emits, {
          objectId: '__scene',
          interactionType: 'wait',
          timestamp: Date.now()
        })
      }, duration)
    }

    const activityHandler = () => resetTimer()

    resetTimer()
    this.scene.input.on('pointerdown', activityHandler)

    return () => {
      this.scene.input.off('pointerdown', activityHandler)
      if (timer) clearTimeout(timer)
    }
  }

  /** 缩放：双指 pinch 改变对象 scale */
  private attachPinch(
    go: Phaser.GameObjects.GameObject,
    config: GameObjectConfig,
    interaction: InteractionConfig
  ): () => void {
    let initialDistance = 0
    let initialScale = 1
    const obj = go as Phaser.GameObjects.Components.Transform
        & Phaser.GameObjects.GameObject

    const moveHandler = (_pointer: Phaser.Input.Pointer) => {
      const pointers = this.scene.input.manager.pointers.filter(p => p.isDown)
      if (pointers.length < 2) return

      const [p1, p2] = pointers
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)

      if (initialDistance === 0) {
        initialDistance = dist
        initialScale = obj.scaleX
        return
      }

      const ratio = dist / initialDistance
      const newScale = initialScale * ratio
      obj.setScale(newScale)

      const target = interaction.targetScale
      if (target && newScale >= target.min && newScale <= target.max) {
        this.emit(interaction.emits, {
          objectId: config.id,
          interactionType: 'pinch',
          timestamp: Date.now()
        })
      }
    }

    const upHandler = () => { initialDistance = 0 }

    this.scene.input.on('pointermove', moveHandler)
    this.scene.input.on('pointerup', upHandler)

    return () => {
      this.scene.input.off('pointermove', moveHandler)
      this.scene.input.off('pointerup', upHandler)
    }
  }

  /** 滑动：pointerdown → pointerup 距离+方向 */
  private attachSwipe(
    go: Phaser.GameObjects.GameObject,
    config: GameObjectConfig,
    interaction: InteractionConfig
  ): () => void {
    let startX = 0, startY = 0
    const minDist = (interaction.minDistance ?? 0.1) *
      Math.min(this.scene.scale.width, this.scene.scale.height)

    const downHandler = (pointer: Phaser.Input.Pointer) => {
      startX = pointer.x; startY = pointer.y
    }

    const upHandler = (pointer: Phaser.Input.Pointer) => {
      const dx = pointer.x - startX
      const dy = pointer.y - startY
      const dist = Math.hypot(dx, dy)
      if (dist < minDist) return

      const angle = Math.atan2(dy, dx) * 180 / Math.PI
      const detected = this.angleToDirection(angle)
      const required = interaction.direction ?? 'any'

      if (required === 'any' || required === detected) {
        this.emit(interaction.emits, {
          objectId: config.id,
          interactionType: 'swipe',
          timestamp: Date.now()
        })
      }
    }

    go.setInteractive()
    go.on('pointerdown', downHandler)
    go.on('pointerup', upHandler)
    return () => {
      go.off('pointerdown', downHandler)
      go.off('pointerup', upHandler)
    }
  }

  /** 开关：点击切换布尔状态 */
  private attachToggle(
    go: Phaser.GameObjects.GameObject,
    config: GameObjectConfig,
    interaction: InteractionConfig
  ): () => void {
    let state = false

    const handler = () => {
      state = !state
      if (state === interaction.targetState) {
        this.emit(interaction.emits, {
          objectId: config.id,
          interactionType: 'toggle',
          timestamp: Date.now()
        })
      }
    }

    go.setInteractive()
    go.on('pointerup', handler)
    return () => go.off('pointerup', handler)
  }

  private angleToDirection(angle: number): SwipeDirection {
    if (angle > -45 && angle <= 45) return 'right'
    if (angle > 45 && angle <= 135) return 'down'
    if (angle > -135 && angle <= -45) return 'up'
    return 'left'
  }

  private emit(eventId: string, payload: EventPayload): void {
    this.onEvent(eventId, payload)
  }

  /** 关卡销毁时调用，解除所有绑定 */
  destroyAll(): void {
    for (const detach of this.detachFns) detach()
    this.detachFns = []
  }
}
```

### 2.4 交互组合模式

单个对象可以绑定多个交互。引擎不关心"这个对象该怎么用"，它只关心"当某交互发生时，发射某事件"。几个组合例子：

```jsonc
// 第10关：按钮可以"滑掉"
// 同一个对象同时支持 click（无效果，给玩家"试了但没反应"的反馈）和 swipe（真正触发通关）
{
  "id": "fake-btn",
  "type": "button",
  "interactions": [
    { "type": "click",  "emits": "fake-btn-clicked" },
    { "type": "swipe",  "emits": "fake-btn-swiped", "direction": "right" }
  ]
}
// winConditions: [{ "type": "event-fired", "eventId": "fake-btn-swiped" }]
// failConditions: [{ "type": "event-count", "eventId": "fake-btn-clicked", "count": 5 }]
```

---

## 3. 通关 / 失败条件抽象

### 3.1 设计原则

条件系统本质是一个**响应式求值器**：每次事件触发或定时 tick 时，重新求值所有条件树，判断是否满足通关/失败。

### 3.2 条件类型速查表

| 条件类型 | 语义 | 关键参数 | PRD 关卡示例 |
|---------|------|---------|-------------|
| `event-fired` | 事件 X 至少触发过一次 | `eventId` | 第1关点按钮 |
| `event-count` | 事件 X 触发了 N 次 | `eventId`, `count`, `comparator` | 第3关连点2次 |
| `no-action` | 玩家持续 N 秒没操作 | `idleDuration` | 第5关等待 |
| `timer-expired` | 从关卡开始经过了 N 秒 | `seconds` | 倒计时关 |
| `object-state` | 对象 X 的属性满足条件 | `objectId`, `property` | 第15关按钮缩小 |
| `sequence` | 事件按指定顺序触发 | `eventSequence` | 多步骤关 |
| `composite` | 子条件的 AND/OR 组合 | `children`, `operator` | 复合条件 |

所有条件支持 `negate: true` 取反。

### 3.3 ConditionEvaluator 实现

```typescript
// packages/game-core/src/systems/ConditionEvaluator.ts

import type { Condition, ObjectStateProperty } from '@nicetap/shared'

export interface EvaluatorState {
  firedEvents: Set<string>
  eventCounts: Map<string, number>
  eventTimeline: string[]
  lastActionTime: number
  levelStartTime: number
  getObjectState: (objectId: string, key: string) => unknown
}

export class ConditionEvaluator {
  private state: EvaluatorState

  constructor(getObjectState: (id: string, key: string) => unknown) {
    const now = Date.now()
    this.state = {
      firedEvents: new Set(),
      eventCounts: new Map(),
      eventTimeline: [],
      lastActionTime: now,
      levelStartTime: now,
      getObjectState,
    }
  }

  /** 记录一个事件触发 */
  recordEvent(eventId: string): void {
    this.state.firedEvents.add(eventId)
    this.state.eventCounts.set(
      eventId,
      (this.state.eventCounts.get(eventId) ?? 0) + 1
    )
    this.state.eventTimeline.push(eventId)
    this.state.lastActionTime = Date.now()
  }

  /** 求值单个条件 */
  evaluate(condition: Condition): boolean {
    const raw = this.evaluateRaw(condition)
    return condition.negate ? !raw : raw
  }

  /** 求值一组条件 */
  evaluateAll(conditions: Condition[], logic: 'and' | 'or' = 'and'): boolean {
    if (conditions.length === 0) return false
    return logic === 'and'
      ? conditions.every(c => this.evaluate(c))
      : conditions.some(c => this.evaluate(c))
  }

  private evaluateRaw(condition: Condition): boolean {
    switch (condition.type) {
      case 'event-fired':
        return this.state.firedEvents.has(condition.eventId!)

      case 'event-count': {
        const actual = this.state.eventCounts.get(condition.eventId!) ?? 0
        return this.compare(actual, condition.count ?? 1, condition.comparator ?? 'gte')
      }

      case 'no-action': {
        const idleMs = Date.now() - this.state.lastActionTime
        return idleMs >= (condition.idleDuration ?? 3) * 1000
      }

      case 'timer-expired': {
        const elapsed = (Date.now() - this.state.levelStartTime) / 1000
        return elapsed >= (condition.seconds ?? 0)
      }

      case 'object-state': {
        const prop = condition.property!
        const actual = this.state.getObjectState(condition.objectId!, prop.key)
        return this.compare(
          actual as number,
          prop.value as number,
          prop.comparator ?? 'eq'
        )
      }

      case 'sequence': {
        const seq = condition.eventSequence!
        if (this.state.eventTimeline.length < seq.length) return false
        const recent = this.state.eventTimeline.slice(-seq.length)
        return seq.every((e, i) => recent[i] === e)
      }

      case 'composite':
        return this.evaluateAll(
          condition.children ?? [],
          condition.operator ?? 'and'
        )

      default:
        return false
    }
  }

  private compare(actual: number, expected: number, op: string): boolean {
    switch (op) {
      case 'eq':  return actual === expected
      case 'gte': return actual >= expected
      case 'lte': return actual <= expected
      case 'gt':  return actual > expected
      case 'lt':  return actual < expected
      default:    return actual === expected
    }
  }

  /** 重置状态（重试关卡时调用） */
  reset(): void {
    const now = Date.now()
    this.state.firedEvents.clear()
    this.state.eventCounts.clear()
    this.state.eventTimeline = []
    this.state.lastActionTime = now
    this.state.levelStartTime = now
  }
}
```

### 3.4 条件配置示例

```jsonc
// ═══ 简单：单事件 ═══
// 第1关：点击即过
{ "type": "event-fired", "eventId": "pass-btn-clicked" }

// ═══ 计数 ═══
// 第3关：连点 2 次
{ "type": "event-count", "eventId": "btn-clicked", "count": 2, "comparator": "gte" }

// ═══ 无操作 ═══
// 第5关：3 秒不操作
{ "type": "no-action", "idleDuration": 3 }

// ═══ 对象状态 ═══
// 第15关：按钮缩小到 0.3 以下
{
  "type": "object-state",
  "objectId": "big-btn",
  "property": { "key": "scale", "value": 0.3, "comparator": "lte" }
}

// ═══ 复合 ═══
// 多步骤：先拖走嘴巴，再点确认
{
  "type": "composite",
  "operator": "and",
  "children": [
    { "type": "event-fired", "eventId": "mouth-dragged-off" },
    { "type": "event-fired", "eventId": "confirm-clicked" }
  ]
}

// ═══ 顺序 ═══
// 必须先点 A 再点 B 再点 C
{
  "type": "sequence",
  "eventSequence": ["a-clicked", "b-clicked", "c-clicked"]
}

// ═══ 取反 ═══
// 失败条件：玩家在 3 秒内点击了任何东西（第5关反向用法）
{
  "type": "no-action",
  "idleDuration": 3,
  "negate": true
}
```

---

## 4. 提示系统

### 4.1 设计哲学

> "提示不能直接把答案全说完，否则笑点就没了。" — PRD §10.2

提示是分层递进的，核心思路：**越往后越直白，但永远不直接说答案**。

### 4.2 HintSystem 实现

```typescript
// packages/game-core/src/systems/HintSystem.ts

import type { HintConfig } from '@nicetap/shared'

export interface HintCallbacks {
  showHintText(text: string): void
  highlightObject(objectId: string): void
  dismissHint(): void
}

export class HintSystem {
  private hints: HintConfig[]
  private failCount = 0
  private shownHintIndices = new Set<number>()
  private dismissTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    hints: HintConfig[],
    private callbacks: HintCallbacks
  ) {
    this.hints = [...hints].sort(
      (a, b) => a.showAfterFailCount - b.showAfterFailCount
    )
  }

  /** 每次失败时调用 */
  onFail(): void {
    this.failCount++
    this.tryShowNextHint()
  }

  private tryShowNextHint(): void {
    for (let i = 0; i < this.hints.length; i++) {
      if (this.shownHintIndices.has(i)) continue
      if (this.failCount >= this.hints[i].showAfterFailCount) {
        this.showHint(i)
        return
      }
    }
  }

  private showHint(index: number): void {
    this.shownHintIndices.add(index)
    const hint = this.hints[index]

    this.callbacks.showHintText(hint.text)

    if (hint.highlightObjectId) {
      this.callbacks.highlightObject(hint.highlightObjectId)
    }

    if (hint.autoDismissMs && hint.autoDismissMs > 0) {
      if (this.dismissTimer) clearTimeout(this.dismissTimer)
      this.dismissTimer = setTimeout(() => {
        this.callbacks.dismissHint()
      }, hint.autoDismissMs)
    }
  }

  /** 重试时不重置 failCount，只在完全重开关卡时重置 */
  reset(): void {
    this.failCount = 0
    this.shownHintIndices.clear()
    if (this.dismissTimer) clearTimeout(this.dismissTimer)
  }

  getFailCount(): number {
    return this.failCount
  }
}
```

### 4.3 提示配置示例

```jsonc
// 第 8 关：按钮会跑
"hints": [
  {
    "level": "weak",
    "text": "levels.008.hint1",       // "它太滑了，别追它了"
    "showAfterFailCount": 3
  },
  {
    "level": "medium",
    "text": "levels.008.hint2",       // "注意看看按钮以外的地方"
    "showAfterFailCount": 5,
    "highlightObjectId": "background-area"
  },
  {
    "level": "strong",
    "text": "levels.008.hint3",       // "试试点空白处"
    "showAfterFailCount": 8,
    "highlightObjectId": "background-area",
    "autoDismissMs": 5000
  }
]
```

---

## 5. 埋点事件结构

### 5.1 设计原则

- 所有事件使用 `<domain>:<action>` 命名
- 客户端缓冲，批量上报（减少网络请求）
- 每个事件携带足够的上下文，在后端可以重建完整会话

### 5.2 事件类型定义

```typescript
// packages/shared/src/types/telemetry.ts

export interface TelemetryEvent {
  /** 事件名 */
  name: TelemetryEventName

  /** 毫秒时间戳 */
  timestamp: number

  /** 关联的会话 ID（一次打开 App 到关闭为一个会话） */
  sessionId: string

  /** 事件附加数据 */
  data: Record<string, unknown>
}

export type TelemetryEventName =
  // ── 应用级 ──
  | 'app:launch'                 // 应用启动
  | 'app:resume'                 // 从后台恢复
  | 'app:suspend'                // 进入后台

  // ── 关卡级 ──
  | 'level:enter'                // 进入关卡
  | 'level:pass'                 // 通关
  | 'level:fail'                 // 失败
  | 'level:retry'                // 重试
  | 'level:skip'                 // 跳过（如果有此功能）
  | 'level:quit'                 // 中途退出
  | 'level:hint-shown'           // 展示了提示
  | 'level:hint-used'            // 玩家主动请求提示

  // ── 交互级 ──
  | 'interaction:fired'          // 任何交互事件触发

  // ── 导航级 ──
  | 'nav:page-view'              // 页面浏览
  | 'nav:share'                  // 分享

// ── 各事件的 data 字段规范 ──

export interface LevelEnterData {
  levelId: string
  chapter: number
  isRetry: boolean
  attemptNumber: number
}

export interface LevelPassData {
  levelId: string
  chapter: number
  attemptNumber: number
  /** 本次尝试耗时（秒） */
  durationSec: number
  /** 触发的关键事件 ID（用于分析玩家的过关路径） */
  winEventId: string
  /** 本关累计失败次数 */
  totalFailCount: number
  /** 是否使用了提示 */
  hintUsed: boolean
}

export interface LevelFailData {
  levelId: string
  chapter: number
  attemptNumber: number
  durationSec: number
  /** 导致失败的事件 ID */
  failEventId?: string
  /** 本关连续失败次数 */
  consecutiveFailCount: number
}

export interface InteractionFiredData {
  levelId: string
  objectId: string
  interactionType: string
  eventId: string
}
```

### 5.3 埋点收集器

```typescript
// packages/game-core/src/systems/TelemetryCollector.ts

import type { TelemetryEvent, TelemetryEventName } from '@nicetap/shared'
import type { AnalyticsAdapter } from './adapters/PlatformAdapter'

export class TelemetryCollector {
  private buffer: TelemetryEvent[] = []
  private sessionId: string
  private flushTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    private adapter: AnalyticsAdapter,
    private flushIntervalMs = 10_000,
    private maxBufferSize = 50
  ) {
    this.sessionId = this.generateSessionId()
    this.startAutoFlush()
  }

  track(name: TelemetryEventName, data: Record<string, unknown> = {}): void {
    this.buffer.push({
      name,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      data,
    })

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return
    const batch = [...this.buffer]
    this.buffer = []

    for (const event of batch) {
      this.adapter.track(event.name, {
        ...event.data,
        sessionId: event.sessionId,
        timestamp: event.timestamp,
      })
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs)
  }

  destroy(): void {
    this.flush()
    if (this.flushTimer) clearInterval(this.flushTimer)
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}
```

---

## 6. Scene Runtime Context

### 6.1 LevelContext：脚本的沙箱 API

脚本通过 `LevelContext` 与引擎交互，**永远不直接操作 Phaser API**。
这保证了脚本可以被测试（用 mock context）、可以跨平台。

```typescript
// packages/shared/src/types/level-context.ts

import type { Vec2, InteractionType } from './level'

/**
 * 关卡脚本唯一可用的 API 表面。
 * 引擎在 game-core 中实现此接口，脚本在 levels 包中消费它。
 * 二者通过这个接口解耦，脚本永远不 import Phaser。
 */
export interface LevelContext {
  // ═══ 对象操作 ═══

  showObject(objectId: string): void
  hideObject(objectId: string): void
  setObjectInteractive(objectId: string, interactive: boolean): void
  moveObject(objectId: string, to: Vec2, durationMs?: number): Promise<void>
  scaleObject(objectId: string, scale: number, durationMs?: number): Promise<void>
  rotateObject(objectId: string, degrees: number, durationMs?: number): Promise<void>
  fadeObject(objectId: string, alpha: number, durationMs?: number): Promise<void>
  setObjectText(objectId: string, text: string): void
  setObjectProperty(objectId: string, key: string, value: unknown): void

  /** 运行时动态创建对象（高级用法） */
  spawnObject(config: import('./level').GameObjectConfig): void
  destroyObject(objectId: string): void

  // ═══ 对象查询 ═══

  getObjectPosition(objectId: string): Vec2
  getObjectScale(objectId: string): number
  getObjectAlpha(objectId: string): number
  isObjectVisible(objectId: string): boolean

  // ═══ 流程控制 ═══

  /** 触发通关。调用后引擎执行 passFeedback 流程 */
  win(): void

  /** 触发失败。如果传 message 则覆盖 failFeedback 文案 */
  fail(message?: string): void

  /** 手动触发一个事件（与玩家交互触发的事件走同一管道） */
  emitEvent(eventId: string): void

  // ═══ 反馈 ═══

  playSFX(key: string): void
  stopSFX(key: string): void
  vibrate(intensity: 'light' | 'medium' | 'heavy'): void
  playAnimation(objectId: string, animation: string): void
  showFloatingText(
    text: string,
    position: Vec2,
    durationMs?: number,
    style?: Partial<import('./level').ObjectStyle>
  ): void

  // ═══ 时间 ═══

  /** 关卡开始至今的毫秒数 */
  getElapsedMs(): number

  /** 延迟执行（返回可取消的 handle） */
  delay(ms: number, callback: () => void): { cancel: () => void }

  /** 循环执行（返回可取消的 handle） */
  interval(ms: number, callback: () => void): { cancel: () => void }

  // ═══ 状态 ═══

  /** 获取某事件的触发次数 */
  getEventCount(eventId: string): number

  /** 检查某事件是否触发过 */
  hasEventFired(eventId: string): boolean

  /** 关卡级临时 KV 存储（重试后清空） */
  setState(key: string, value: unknown): void
  getState<T>(key: string): T | undefined

  // ═══ 屏幕信息 ═══

  getScreenSize(): { width: number; height: number }
  getPixelRatio(): number
}
```

### 6.2 LevelContext 在 game-core 中的实现骨架

```typescript
// packages/game-core/src/engine/LevelContextImpl.ts

import type { LevelContext, Vec2, GameObjectConfig, ObjectStyle } from '@nicetap/shared'

export class LevelContextImpl implements LevelContext {
  private state = new Map<string, unknown>()
  private timers: Array<{ cancel: () => void }> = []

  constructor(
    private scene: Phaser.Scene,
    private objectMap: Map<string, Phaser.GameObjects.GameObject>,
    private eventCallback: (eventId: string) => void,
    private winCallback: () => void,
    private failCallback: (message?: string) => void,
    private levelStartTime: number
  ) {}

  showObject(objectId: string): void {
    this.getObject(objectId).setVisible(true)
  }

  hideObject(objectId: string): void {
    this.getObject(objectId).setVisible(false)
  }

  setObjectInteractive(objectId: string, interactive: boolean): void {
    const obj = this.getObject(objectId)
    if (interactive) {
      obj.setInteractive()
    } else {
      obj.disableInteractive()
    }
  }

  async moveObject(objectId: string, to: Vec2, durationMs = 300): Promise<void> {
    const obj = this.getObject(objectId) as Phaser.GameObjects.Components.Transform
      & Phaser.GameObjects.GameObject
    const { width, height } = this.scene.scale

    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: obj,
        x: to.x * width,
        y: to.y * height,
        duration: durationMs,
        onComplete: () => resolve()
      })
    })
  }

  async scaleObject(objectId: string, scale: number, durationMs = 300): Promise<void> {
    const obj = this.getObject(objectId)
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: obj,
        scaleX: scale,
        scaleY: scale,
        duration: durationMs,
        onComplete: () => resolve()
      })
    })
  }

  async rotateObject(objectId: string, degrees: number, durationMs = 300): Promise<void> {
    const obj = this.getObject(objectId)
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: obj,
        angle: degrees,
        duration: durationMs,
        onComplete: () => resolve()
      })
    })
  }

  async fadeObject(objectId: string, alpha: number, durationMs = 300): Promise<void> {
    const obj = this.getObject(objectId)
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: obj,
        alpha,
        duration: durationMs,
        onComplete: () => resolve()
      })
    })
  }

  setObjectText(objectId: string, text: string): void {
    const obj = this.getObject(objectId) as Phaser.GameObjects.Text
    obj.setText(text)
  }

  setObjectProperty(objectId: string, key: string, value: unknown): void {
    (this.getObject(objectId) as Record<string, unknown>)[key] = value
  }

  spawnObject(_config: GameObjectConfig): void {
    throw new Error('TODO: 需要人工实现 spawnObject')
  }

  destroyObject(objectId: string): void {
    const obj = this.objectMap.get(objectId)
    if (obj) {
      obj.destroy()
      this.objectMap.delete(objectId)
    }
  }

  getObjectPosition(objectId: string): Vec2 {
    const obj = this.getObject(objectId) as Phaser.GameObjects.Components.Transform
    const { width, height } = this.scene.scale
    return { x: obj.x / width, y: obj.y / height }
  }

  getObjectScale(objectId: string): number {
    return (this.getObject(objectId) as Phaser.GameObjects.Components.Transform).scaleX
  }

  getObjectAlpha(objectId: string): number {
    return (this.getObject(objectId) as Phaser.GameObjects.Components.Alpha).alpha
  }

  isObjectVisible(objectId: string): boolean {
    return (this.getObject(objectId) as Phaser.GameObjects.Components.Visible).visible
  }

  win(): void { this.winCallback() }
  fail(message?: string): void { this.failCallback(message) }
  emitEvent(eventId: string): void { this.eventCallback(eventId) }

  playSFX(_key: string): void { /* 委托给 AudioBridge */ }
  stopSFX(_key: string): void { /* 委托给 AudioBridge */ }
  vibrate(_intensity: 'light' | 'medium' | 'heavy'): void { /* 委托给 PlatformAdapter */ }
  playAnimation(_objectId: string, _animation: string): void { /* 委托给 AnimationSystem */ }

  showFloatingText(
    text: string,
    position: Vec2,
    durationMs = 2000,
    _style?: Partial<ObjectStyle>
  ): void {
    const { width, height } = this.scene.scale
    const textObj = this.scene.add.text(
      position.x * width,
      position.y * height,
      text,
      { fontSize: '24px', color: '#fff' }
    )
    this.scene.tweens.add({
      targets: textObj,
      alpha: 0, y: textObj.y - 50,
      duration: durationMs,
      onComplete: () => textObj.destroy()
    })
  }

  getElapsedMs(): number {
    return Date.now() - this.levelStartTime
  }

  delay(ms: number, callback: () => void): { cancel: () => void } {
    const timer = this.scene.time.delayedCall(ms, callback)
    const handle = { cancel: () => timer.remove() }
    this.timers.push(handle)
    return handle
  }

  interval(ms: number, callback: () => void): { cancel: () => void } {
    const timer = this.scene.time.addEvent({ delay: ms, callback, loop: true })
    const handle = { cancel: () => timer.remove() }
    this.timers.push(handle)
    return handle
  }

  getEventCount(eventId: string): number { return 0 /* 委托给 ConditionEvaluator */ }
  hasEventFired(eventId: string): boolean { return false /* 委托给 ConditionEvaluator */ }

  setState(key: string, value: unknown): void { this.state.set(key, value) }
  getState<T>(key: string): T | undefined { return this.state.get(key) as T | undefined }

  getScreenSize(): { width: number; height: number } {
    return { width: this.scene.scale.width, height: this.scene.scale.height }
  }
  getPixelRatio(): number { return window.devicePixelRatio ?? 1 }

  /** 关卡销毁时清理所有定时器 */
  destroy(): void {
    for (const t of this.timers) t.cancel()
    this.timers = []
    this.state.clear()
  }

  private getObject(id: string): Phaser.GameObjects.GameObject {
    const obj = this.objectMap.get(id)
    if (!obj) throw new Error(`对象 "${id}" 不存在，检查关卡配置中的 objectId`)
    return obj
  }
}
```

---

## 7. Level Loader / Validator

### 7.1 LevelLoader

```typescript
// packages/game-core/src/engine/LevelLoader.ts

import type { LevelConfig, LevelScript } from '@nicetap/shared'

export class LevelLoader {
  private configCache = new Map<string, LevelConfig>()
  private scriptCache = new Map<string, LevelScript>()

  /** 从注册表中加载关卡配置（支持远程/本地） */
  async loadConfig(levelId: string): Promise<LevelConfig> {
    const cached = this.configCache.get(levelId)
    if (cached) return cached

    const config = await this.fetchConfig(levelId)
    this.configCache.set(levelId, config)
    return config
  }

  /** 加载自定义脚本（仅在配置中有 scriptId 时调用） */
  async loadScript(scriptId: string): Promise<LevelScript | null> {
    if (!scriptId) return null

    const cached = this.scriptCache.get(scriptId)
    if (cached) return cached

    const module = await import(
      /* webpackChunkName: "level-script-[request]" */
      `@nicetap/levels/scripts/${scriptId}`
    )
    const script: LevelScript = module.script ?? module.default
    this.scriptCache.set(scriptId, script)
    return script
  }

  /** 预加载某章节的所有关卡配置 */
  async preloadChapter(chapter: number): Promise<void> {
    const manifest = await this.fetchChapterManifest(chapter)
    await Promise.all(
      manifest.levelIds.map(id => this.loadConfig(id))
    )
  }

  private async fetchConfig(levelId: string): Promise<LevelConfig> {
    const response = await fetch(`/levels/configs/${levelId}.json`)
    if (!response.ok) {
      throw new Error(`关卡配置加载失败: ${levelId} (HTTP ${response.status})`)
    }
    return response.json()
  }

  private async fetchChapterManifest(
    chapter: number
  ): Promise<{ levelIds: string[] }> {
    const response = await fetch(`/levels/manifests/chapter-${chapter}.json`)
    return response.json()
  }

  clearCache(): void {
    this.configCache.clear()
    this.scriptCache.clear()
  }
}
```

### 7.2 LevelValidator

在 CI 和 runtime 都可以运行的纯函数校验器，零平台依赖。

```typescript
// packages/shared/src/validation/LevelValidator.ts

import type {
  LevelConfig, GameObjectConfig, Condition, InteractionConfig
} from '../types/level'

export interface ValidationError {
  path: string
  message: string
  severity: 'error' | 'warning'
}

const KNOWN_INTERACTION_TYPES = new Set([
  'click', 'multi-click', 'long-press', 'drag', 'swipe', 'wait', 'pinch', 'toggle'
])

const KNOWN_CONDITION_TYPES = new Set([
  'event-fired', 'event-count', 'no-action', 'timer-expired',
  'object-state', 'sequence', 'composite'
])

export class LevelValidator {

  validate(config: LevelConfig): ValidationError[] {
    const errors: ValidationError[] = []

    this.checkRequired(config, errors)
    this.checkObjectIds(config, errors)
    this.checkInteractions(config, errors)
    this.checkConditions(config, errors)
    this.checkEventReachability(config, errors)
    this.checkHints(config, errors)

    return errors
  }

  /** 批量校验多个关卡 */
  validateAll(configs: LevelConfig[]): Map<string, ValidationError[]> {
    const results = new Map<string, ValidationError[]>()

    const ids = new Set<string>()
    for (const config of configs) {
      if (ids.has(config.id)) {
        results.set(config.id, [{
          path: 'id',
          message: `关卡 ID "${config.id}" 重复`,
          severity: 'error'
        }])
      }
      ids.add(config.id)
      results.set(config.id, this.validate(config))
    }

    return results
  }

  private checkRequired(config: LevelConfig, errors: ValidationError[]): void {
    if (!config.id) {
      errors.push({ path: 'id', message: '缺少 id', severity: 'error' })
    }
    if (!config.title) {
      errors.push({ path: 'title', message: '缺少 title', severity: 'error' })
    }
    if (!config.instruction) {
      errors.push({ path: 'instruction', message: '缺少 instruction', severity: 'error' })
    }
    if (!config.objects || config.objects.length === 0) {
      errors.push({ path: 'objects', message: '至少需要一个 object', severity: 'error' })
    }
    if (!config.winConditions || config.winConditions.length === 0) {
      errors.push({ path: 'winConditions', message: '至少需要一个通关条件', severity: 'error' })
    }
    if (!config.passFeedback?.texts?.length) {
      errors.push({ path: 'passFeedback.texts', message: '缺少通关反馈文案', severity: 'error' })
    }
    if (!config.failFeedback?.texts?.length) {
      errors.push({ path: 'failFeedback.texts', message: '缺少失败反馈文案', severity: 'warning' })
    }
  }

  private checkObjectIds(config: LevelConfig, errors: ValidationError[]): void {
    const ids = new Set<string>()
    const checkDuplicates = (objects: GameObjectConfig[], prefix: string) => {
      for (const obj of objects) {
        if (ids.has(obj.id)) {
          errors.push({
            path: `${prefix}.${obj.id}`,
            message: `对象 ID "${obj.id}" 重复`,
            severity: 'error'
          })
        }
        ids.add(obj.id)
        if (obj.children) {
          checkDuplicates(obj.children, `${prefix}.${obj.id}.children`)
        }
      }
    }
    checkDuplicates(config.objects, 'objects')
  }

  private checkInteractions(config: LevelConfig, errors: ValidationError[]): void {
    for (const obj of config.objects) {
      if (!obj.interactions) continue
      for (const interaction of obj.interactions) {
        if (!KNOWN_INTERACTION_TYPES.has(interaction.type)) {
          errors.push({
            path: `objects.${obj.id}.interactions`,
            message: `未知交互类型 "${interaction.type}"`,
            severity: 'error'
          })
        }
        if (!interaction.emits) {
          errors.push({
            path: `objects.${obj.id}.interactions`,
            message: `交互缺少 emits 字段`,
            severity: 'error'
          })
        }
        this.checkInteractionParams(obj.id, interaction, errors)
      }
    }
  }

  private checkInteractionParams(
    objectId: string,
    interaction: InteractionConfig,
    errors: ValidationError[]
  ): void {
    const path = `objects.${objectId}.interactions[${interaction.type}]`

    if (interaction.type === 'multi-click' && (!interaction.clickCount || interaction.clickCount < 2)) {
      errors.push({ path, message: 'multi-click 的 clickCount 应 >= 2', severity: 'error' })
    }
    if (interaction.type === 'long-press' && interaction.duration !== undefined && interaction.duration < 100) {
      errors.push({ path, message: 'long-press 的 duration 太短 (< 100ms)', severity: 'warning' })
    }
    if (interaction.type === 'drag' && !interaction.dragTarget) {
      errors.push({ path, message: 'drag 交互缺少 dragTarget', severity: 'warning' })
    }
    if (interaction.type === 'pinch' && !interaction.targetScale) {
      errors.push({ path, message: 'pinch 交互缺少 targetScale', severity: 'error' })
    }
    if (interaction.type === 'wait' && !interaction.waitDuration) {
      errors.push({ path, message: 'wait 交互缺少 waitDuration', severity: 'error' })
    }
  }

  private checkConditions(config: LevelConfig, errors: ValidationError[]): void {
    const check = (conditions: Condition[], prefix: string) => {
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i]
        if (!KNOWN_CONDITION_TYPES.has(c.type)) {
          errors.push({
            path: `${prefix}[${i}]`,
            message: `未知条件类型 "${c.type}"`,
            severity: 'error'
          })
        }
        if (c.type === 'composite' && (!c.children || c.children.length === 0)) {
          errors.push({
            path: `${prefix}[${i}]`,
            message: 'composite 条件缺少 children',
            severity: 'error'
          })
        }
        if (c.children) {
          check(c.children, `${prefix}[${i}].children`)
        }
      }
    }

    check(config.winConditions, 'winConditions')
    if (config.failConditions) {
      check(config.failConditions, 'failConditions')
    }
  }

  /** 检查通关/失败条件引用的 eventId 是否能被某个交互触发 */
  private checkEventReachability(config: LevelConfig, errors: ValidationError[]): void {
    const emittableEvents = new Set<string>()

    for (const obj of config.objects) {
      if (!obj.interactions) continue
      for (const interaction of obj.interactions) {
        emittableEvents.add(interaction.emits)
      }
    }

    // 有 scriptId 的关卡，脚本可以 emitEvent 任意事件，跳过检查
    if (config.scriptId) return

    const checkConditionEvents = (conditions: Condition[], prefix: string) => {
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i]
        if ((c.type === 'event-fired' || c.type === 'event-count') && c.eventId) {
          if (!emittableEvents.has(c.eventId)) {
            errors.push({
              path: `${prefix}[${i}]`,
              message: `事件 "${c.eventId}" 没有任何交互能触发它（也没有 scriptId）`,
              severity: 'error'
            })
          }
        }
        if (c.type === 'sequence' && c.eventSequence) {
          for (const eventId of c.eventSequence) {
            if (!emittableEvents.has(eventId)) {
              errors.push({
                path: `${prefix}[${i}].eventSequence`,
                message: `序列中的事件 "${eventId}" 没有任何交互能触发它`,
                severity: 'error'
              })
            }
          }
        }
        if (c.children) {
          checkConditionEvents(c.children, `${prefix}[${i}].children`)
        }
      }
    }

    checkConditionEvents(config.winConditions, 'winConditions')
    if (config.failConditions) {
      checkConditionEvents(config.failConditions, 'failConditions')
    }
  }

  private checkHints(config: LevelConfig, errors: ValidationError[]): void {
    if (!config.hints) return

    const objectIds = new Set(config.objects.map(o => o.id))
    for (let i = 0; i < config.hints.length; i++) {
      const hint = config.hints[i]
      if (hint.highlightObjectId && !objectIds.has(hint.highlightObjectId)) {
        errors.push({
          path: `hints[${i}].highlightObjectId`,
          message: `引用了不存在的对象 "${hint.highlightObjectId}"`,
          severity: 'error'
        })
      }
    }

    const sorted = [...config.hints].sort(
      (a, b) => a.showAfterFailCount - b.showAfterFailCount
    )
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].showAfterFailCount === sorted[i - 1].showAfterFailCount) {
        errors.push({
          path: `hints`,
          message: `两个提示的 showAfterFailCount 相同 (${sorted[i].showAfterFailCount})，可能不是预期行为`,
          severity: 'warning'
        })
      }
    }
  }
}
```

### 7.3 CI 中的校验脚本

```typescript
// tools/level-validator/src/index.ts

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { LevelValidator } from '@nicetap/shared'
import type { LevelConfig } from '@nicetap/shared'

async function main(): Promise<void> {
  const configDir = join(__dirname, '../../packages/levels/src/configs')
  const files = (await readdir(configDir)).filter(f => f.endsWith('.json'))
  const configs: LevelConfig[] = []

  for (const file of files) {
    const raw = await readFile(join(configDir, file), 'utf-8')
    try {
      configs.push(JSON.parse(raw))
    } catch {
      console.error(`❌ ${file}: JSON 解析失败`)
      process.exit(1)
    }
  }

  const validator = new LevelValidator()
  const results = validator.validateAll(configs)

  let hasError = false
  for (const [levelId, errors] of results) {
    const errs = errors.filter(e => e.severity === 'error')
    const warns = errors.filter(e => e.severity === 'warning')

    if (errs.length > 0) {
      hasError = true
      console.error(`\n❌ ${levelId}:`)
      for (const e of errs) console.error(`  ERROR ${e.path}: ${e.message}`)
    }
    if (warns.length > 0) {
      console.warn(`\n⚠️  ${levelId}:`)
      for (const w of warns) console.warn(`  WARN  ${w.path}: ${w.message}`)
    }
  }

  if (hasError) {
    console.error(`\n校验失败，请修复上述 ERROR。`)
    process.exit(1)
  }

  console.log(`\n✅ 全部 ${configs.length} 个关卡校验通过。`)
}

main()
```

---

## 8. 新增关卡的最小开发步骤

### 8.1 情况 A：纯配置关（占所有关卡的 ~70%）

```bash
# 1. 创建配置文件
touch packages/levels/src/configs/level-031.json

# 2. 编辑 JSON（参考已有关卡配置或下方模板）

# 3. 添加 i18n 词条
#    packages/web-app/src/i18n/zh-CN.json → 添加 levels.031.*
#    packages/web-app/src/i18n/en.json    → 添加 levels.031.*

# 4. 校验
pnpm --filter @nicetap/level-validator validate

# 5. 本地跑一遍
pnpm dev
# 打开浏览器进入第 31 关，手动验证

# 6. 提交
git add . && git commit -m "feat(levels): add level 031 - 关卡名称"
```

**纯配置关的最小 JSON 模板**：

```jsonc
{
  "id": "level-031",
  "chapter": 2,
  "order": 1,
  "title": "levels.031.title",
  "instruction": "levels.031.instruction",
  "tags": ["text-trick"],
  "background": { "type": "color", "value": "#ffffff" },
  "objects": [
    {
      "id": "main-btn",
      "type": "button",
      "position": { "x": 0.5, "y": 0.5 },
      "content": "levels.031.btnText",
      "interactions": [
        { "type": "click", "emits": "main-btn-clicked" }
      ]
    }
  ],
  "winConditions": [
    { "type": "event-fired", "eventId": "main-btn-clicked" }
  ],
  "passFeedback": {
    "texts": ["feedback.pass.easy"],
    "animation": "confetti",
    "sfx": "pass-1"
  },
  "failFeedback": {
    "texts": ["feedback.fail.generic"],
    "animation": "shake",
    "sfx": "fail-1"
  }
}
```

**涉及文件数：2 个**（1 JSON + 1 i18n 更新）

### 8.2 情况 B：需要新 Behavior 的关卡（~20%）

在情况 A 的基础上多一步：

```bash
# 额外：注册新行为
# 1. 创建 packages/game-core/src/behaviors/NewBehavior.ts
# 2. 在 BehaviorRegistry.ts 中注册
# 3. 在 JSON 中的 behaviors 中引用

# 涉及文件数：4 个（1 JSON + 1 i18n + 1 Behavior + 1 Registry 更新）
```

### 8.3 情况 C：需要 Custom Script 的关卡（~10%）

在情况 A 的基础上多一步：

```bash
# 额外：创建脚本
# 1. 创建 packages/levels/src/scripts/level-031.ts
# 2. 在 JSON 中添加 "scriptId": "level-031"

# 涉及文件数：3 个（1 JSON + 1 i18n + 1 Script）
```

---

## 9. Custom Script 边界判定

### 9.1 判定决策树

```
这个关卡能用 objects + interactions + conditions + behaviors 配出来吗？
│
├─ 能 → 纯配置。禁止写 script。
│
└─ 不能 → 哪部分不能？
   │
   ├─ 需要一个通用的新行为（如"跟随鼠标"）
   │  → 写一个 Behavior 注册到 game-core，不写 script。
   │    因为这个行为以后其他关卡也可能用。
   │
   ├─ 需要多步骤状态机（A 发生后 B 出现，点 B 后 C 变化…）
   │  → 如果步骤 ≤ 3 且每步只是 show/hide，用 composite condition 尝试。
   │  → 如果步骤 > 3 或涉及条件分支，写 script。
   │
   ├─ 需要动态创建/销毁对象（不是初始化时就存在的）
   │  → 写 script（ctx.spawnObject / ctx.destroyObject）。
   │
   └─ 需要帧级持续逻辑（如实时跟踪手指轨迹）
      → 写 script（onUpdate）。但这是最后手段，优先看能否用 behavior 替代。
```

### 9.2 允许 Custom Script 的场景

| 场景 | 典型关卡 | 理由 |
|------|---------|------|
| 多步骤状态机（> 3 步） | 第9关：假失败 | 点击→弹窗→点表情→通关，配置难以表达中间状态转换 |
| 动态生成对象 | 无限生成障碍物 | 运行时数量不确定，无法在 JSON 中穷举 |
| 帧级持续逻辑 | 画线、手势追踪 | 需要 onUpdate 每帧检测 |
| 跨对象联动逻辑 | 对象 A 变化导致 B 变化 | 配置中的 condition 是被动检测，不是主动触发 |
| 使用平台特殊能力 | 摇一摇（加速度计） | 需要通过 ctx 访问设备 API |

### 9.3 禁止 Custom Script 的场景

| 场景 | 正确做法 |
|------|---------|
| "点击某按钮通关" | 纯配置：click interaction + event-fired condition |
| "长按 2 秒通关" | 纯配置：long-press interaction (duration: 2000) |
| "按钮会跑" | 配置中使用 `run-away` behavior |
| "拖到某个位置" | 配置中使用 drag interaction + dragTarget |
| "N 秒不操作通关" | 纯配置：wait interaction 或 no-action condition |
| "连点 N 次" | 纯配置：multi-click interaction |
| "对象缩小到某尺寸" | 纯配置：pinch interaction + object-state condition |

### 9.4 Script 质量红线

```
1. 禁止 import Phaser            → 用 LevelContext API
2. 禁止 import 平台 API          → 用 LevelContext.playSFX / vibrate 等
3. 禁止 DOM 操作                  → 所有视觉操作走 LevelContext
4. onUpdate 必须在 onDestroy 中清理  → 防止内存泄漏
5. 所有 delay/interval 必须保存 handle → onDestroy 中 cancel
6. 脚本文件不超过 100 行          → 超过说明应该拆 behavior
```

---

## 10. 附录：PRD 前 20 关配置示例

以下展示 5 个代表性关卡的完整配置，覆盖所有交互类型。

### 第 1 关：通关（最简单 — 点击即过）

```jsonc
{
  "id": "level-001",
  "chapter": 1,
  "order": 1,
  "title": "levels.001.title",
  "instruction": "levels.001.instruction",
  "tags": ["text-trick"],
  "background": { "type": "color", "value": "#f5f5f5" },
  "objects": [
    {
      "id": "pass-btn",
      "type": "button",
      "position": { "x": 0.5, "y": 0.5 },
      "content": "levels.001.btnText",
      "style": {
        "fontSize": 28,
        "color": "#ffffff",
        "backgroundColor": "#4CAF50",
        "borderRadius": 12,
        "padding": 20
      },
      "interactions": [
        { "type": "click", "emits": "pass-btn-clicked" }
      ],
      "enterAnimation": { "type": "scale-in", "duration": 400 }
    }
  ],
  "winConditions": [
    { "type": "event-fired", "eventId": "pass-btn-clicked" }
  ],
  "passFeedback": {
    "texts": ["feedback.pass.justThis", "feedback.pass.tooEasy"],
    "animation": "confetti",
    "sfx": "pass-cheerful"
  },
  "failFeedback": {
    "texts": ["feedback.fail.generic"],
    "animation": "shake",
    "sfx": "fail-buzz"
  }
}
```

### 第 5 关：别急（等待 — 什么都不做）

```jsonc
{
  "id": "level-005",
  "chapter": 1,
  "order": 5,
  "title": "levels.005.title",
  "instruction": "levels.005.instruction",
  "tags": ["wait"],
  "background": { "type": "color", "value": "#fff3e0" },
  "objects": [
    {
      "id": "countdown-text",
      "type": "text",
      "position": { "x": 0.5, "y": 0.35 },
      "content": "3",
      "style": { "fontSize": 72, "color": "#f44336", "bold": true },
      "behaviors": [
        { "type": "countdown", "params": { "seconds": 3, "displayObjectId": "countdown-text" } }
      ]
    },
    {
      "id": "instruction-text",
      "type": "text",
      "position": { "x": 0.5, "y": 0.55 },
      "content": "levels.005.rushText",
      "style": { "fontSize": 24, "color": "#d32f2f", "bold": true },
      "behaviors": [
        { "type": "shake", "params": { "intensity": 2, "duration": 99999 } }
      ]
    },
    {
      "id": "trap-btn",
      "type": "button",
      "position": { "x": 0.5, "y": 0.75 },
      "content": "levels.005.trapBtnText",
      "style": {
        "fontSize": 20, "color": "#fff",
        "backgroundColor": "#f44336", "borderRadius": 8
      },
      "interactions": [
        { "type": "click", "emits": "trap-clicked" }
      ]
    },
    {
      "id": "idle-detector",
      "type": "shape",
      "position": { "x": 0, "y": 0 },
      "size": { "width": 1, "height": 1 },
      "visible": false,
      "interactions": [
        { "type": "wait", "waitDuration": 3500, "emits": "player-waited" }
      ]
    }
  ],
  "winConditions": [
    { "type": "event-fired", "eventId": "player-waited" }
  ],
  "failConditions": [
    { "type": "event-count", "eventId": "trap-clicked", "count": 3 }
  ],
  "hints": [
    { "level": "weak", "text": "levels.005.hint1", "showAfterFailCount": 2 },
    { "level": "strong", "text": "levels.005.hint2", "showAfterFailCount": 4 }
  ],
  "passFeedback": {
    "texts": ["feedback.pass.patient", "feedback.pass.zen"],
    "animation": "confetti",
    "sfx": "pass-gentle"
  },
  "failFeedback": {
    "texts": ["feedback.fail.tooHonest", "feedback.fail.cantResist"],
    "animation": "shake",
    "sfx": "fail-buzz"
  }
}
```

### 第 11 关：太亮了（拖拽出屏幕）

```jsonc
{
  "id": "level-011",
  "chapter": 2,
  "order": 1,
  "title": "levels.011.title",
  "instruction": "levels.011.instruction",
  "tags": ["drag-reveal"],
  "background": { "type": "gradient", "value": ["#fff9c4", "#ffffff"] },
  "objects": [
    {
      "id": "sun",
      "type": "image",
      "position": { "x": 0.5, "y": 0.3 },
      "content": "asset:sun",
      "size": { "width": 0.3, "height": 0.3 },
      "interactions": [
        {
          "type": "drag",
          "emits": "sun-off-screen",
          "dragBounds": "none",
          "dragTarget": { "offScreen": true }
        }
      ],
      "behaviors": [
        { "type": "pulse-scale", "params": { "minScale": 0.95, "maxScale": 1.05, "speed": 1.5 } }
      ]
    },
    {
      "id": "squinting-face",
      "type": "sprite",
      "position": { "x": 0.5, "y": 0.7 },
      "content": "asset:squinting-face",
      "size": { "width": 0.2, "height": 0.2 }
    }
  ],
  "winConditions": [
    { "type": "event-fired", "eventId": "sun-off-screen" }
  ],
  "hints": [
    { "level": "weak", "text": "levels.011.hint1", "showAfterFailCount": 3 },
    { "level": "strong", "text": "levels.011.hint2", "showAfterFailCount": 5, "highlightObjectId": "sun" }
  ],
  "passFeedback": {
    "texts": ["feedback.pass.bright", "feedback.pass.sunGone"],
    "animation": "confetti",
    "sfx": "pass-relieved"
  },
  "failFeedback": {
    "texts": ["feedback.fail.stillBright"],
    "animation": "shake",
    "sfx": "fail-buzz"
  }
}
```

### 第 15 关：请低调一点（双指缩放）

```jsonc
{
  "id": "level-015",
  "chapter": 2,
  "order": 5,
  "title": "levels.015.title",
  "instruction": "levels.015.instruction",
  "tags": ["resize"],
  "background": { "type": "color", "value": "#e8eaf6" },
  "objects": [
    {
      "id": "loud-btn",
      "type": "button",
      "position": { "x": 0.5, "y": 0.5 },
      "content": "levels.015.btnText",
      "scale": 2.5,
      "style": {
        "fontSize": 36, "color": "#fff", "bold": true,
        "backgroundColor": "#e91e63", "borderRadius": 16, "padding": 30,
        "shadow": true
      },
      "interactions": [
        { "type": "click", "emits": "loud-btn-clicked" },
        {
          "type": "pinch",
          "emits": "btn-shrunk",
          "targetScale": { "min": 0, "max": 0.5 }
        }
      ],
      "behaviors": [
        { "type": "pulse-scale", "params": { "minScale": 2.3, "maxScale": 2.7, "speed": 2 } }
      ]
    }
  ],
  "winConditions": [
    { "type": "event-fired", "eventId": "btn-shrunk" }
  ],
  "failConditions": [
    { "type": "event-count", "eventId": "loud-btn-clicked", "count": 5 }
  ],
  "hints": [
    { "level": "weak", "text": "levels.015.hint1", "showAfterFailCount": 3 },
    { "level": "medium", "text": "levels.015.hint2", "showAfterFailCount": 5 },
    { "level": "strong", "text": "levels.015.hint3", "showAfterFailCount": 8 }
  ],
  "passFeedback": {
    "texts": ["feedback.pass.lowKey", "feedback.pass.humble"],
    "animation": "confetti",
    "sfx": "pass-quiet"
  },
  "failFeedback": {
    "texts": ["feedback.fail.tooLoud", "feedback.fail.clickWontHelp"],
    "animation": "shake",
    "sfx": "fail-buzz"
  }
}
```

### 第 9 关：假失败（需要 Custom Script）

```jsonc
{
  "id": "level-009",
  "chapter": 1,
  "order": 9,
  "title": "levels.009.title",
  "instruction": "levels.009.instruction",
  "tags": ["multi-step", "ui-trick"],
  "scriptId": "level-009",
  "background": { "type": "color", "value": "#fafafa" },
  "objects": [
    {
      "id": "main-btn",
      "type": "button",
      "position": { "x": 0.5, "y": 0.5 },
      "content": "levels.009.btnText",
      "style": {
        "fontSize": 22, "color": "#fff",
        "backgroundColor": "#2196F3", "borderRadius": 10
      },
      "interactions": [
        { "type": "click", "emits": "main-btn-clicked" }
      ]
    },
    {
      "id": "fake-fail-popup",
      "type": "container",
      "position": { "x": 0.5, "y": 0.45 },
      "size": { "width": 0.7, "height": 0.35 },
      "visible": false,
      "style": { "backgroundColor": "#ffffff", "borderRadius": 16, "shadow": true },
      "children": [
        {
          "id": "fail-text",
          "type": "text",
          "position": { "x": 0.5, "y": 0.3 },
          "content": "levels.009.fakeFailText",
          "style": { "fontSize": 24, "color": "#f44336", "bold": true }
        },
        {
          "id": "fail-emoji",
          "type": "text",
          "position": { "x": 0.5, "y": 0.65 },
          "content": "levels.009.emoji",
          "style": { "fontSize": 48 },
          "interactions": [
            { "type": "click", "emits": "emoji-clicked" }
          ]
        }
      ]
    }
  ],
  "winConditions": [
    { "type": "event-fired", "eventId": "emoji-clicked" }
  ],
  "hints": [
    { "level": "weak", "text": "levels.009.hint1", "showAfterFailCount": 3 },
    { "level": "strong", "text": "levels.009.hint2", "showAfterFailCount": 5, "highlightObjectId": "fail-emoji" }
  ],
  "passFeedback": {
    "texts": ["feedback.pass.fakeOut"],
    "animation": "explode",
    "sfx": "pass-surprise"
  },
  "failFeedback": {
    "texts": ["feedback.fail.believedIt"],
    "animation": "shake",
    "sfx": "fail-buzz"
  }
}
```

对应脚本：

```typescript
// packages/levels/src/scripts/level-009.ts

import type { LevelScript, LevelContext } from '@nicetap/shared'

export const script: LevelScript = {
  id: 'level-009',

  onEvent(ctx: LevelContext, eventId: string) {
    if (eventId === 'main-btn-clicked') {
      ctx.showObject('fake-fail-popup')
      ctx.playAnimation('fake-fail-popup', 'slide-in')
      ctx.playSFX('fail-dramatic')
      ctx.vibrate('medium')
    }
  }
}
```

注意这个脚本只有 13 行。它只负责"点击主按钮后弹出假失败弹窗"这一步状态转换。通关判定（点击 emoji）仍然由配置中的 `winConditions` 驱动，脚本不需要手动调用 `ctx.win()`。

**这就是脚本的正确用法：只处理配置无法表达的中间状态转换，通关/失败判定仍然交给引擎。**

---

## 11. 设计总结

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  70% 关卡：纯 JSON 配置                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  objects + interactions + conditions + behaviors │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  20% 关卡：JSON + 注册新 Behavior                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  新行为是可复用的，注册后所有关卡都能用            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  10% 关卡：JSON + Custom Script                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  脚本 ≤ 100 行，只通过 LevelContext 操作          │   │
│  │  通关/失败判定仍然由 winConditions 驱动            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  加一关的成本：10 分钟（纯配置）~ 1 小时（含脚本）       │
│  校验保障：LevelValidator 在 CI 中自动运行               │
│  可测试性：所有核心系统纯逻辑，零 Phaser 依赖可 mock     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
