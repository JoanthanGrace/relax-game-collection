/**
 * 关卡配置系统 - 核心数据结构
 *
 * 设计哲学：关卡配置是产品本身，代码只是播放器。
 * 策划只写 JSON 就能出关，程序员只在发明全新交互类型时才写代码。
 */

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

  /** 关卡标题 i18n key */
  title: string

  /** 玩家进入关卡后看到的指令文案 i18n key */
  instruction: string

  /** 关卡分类标签 */
  tags: LevelTag[]

  /** 场景背景 */
  background: BackgroundConfig

  /** 场景中所有可交互/可见对象 */
  objects: GameObjectConfig[]

  /** 通关条件（至少一个） */
  winConditions: Condition[]

  /** 通关条件的组合方式，默认 'and' */
  winLogic?: 'and' | 'or'

  /** 失败条件（无则不会主动判定失败） */
  failConditions?: Condition[]

  /** 时间限制（秒）。0 或不填 = 无限时 */
  timeLimit?: number

  /** 自定义脚本 ID，对应 packages/levels/src/scripts/{scriptId}.ts */
  scriptId?: string

  /** 提示配置 */
  hints?: HintConfig[]

  /** 通关反馈 */
  passFeedback: FeedbackConfig

  /** 失败反馈 */
  failFeedback: FeedbackConfig

  /** 事件驱动的场景变化 - 支撑 hidden target / fake fail / modal 等机制 */
  reactions?: EventReaction[]

  /** 预加载的额外资源 key 列表 */
  preloadAssets?: string[]
}

// ─────────────────────────────────────────────
// 关卡标签
// ─────────────────────────────────────────────

export type LevelTag =
  | 'text-trick'
  | 'ui-trick'
  | 'drag-reveal'
  | 'wait'
  | 'long-press'
  | 'fake-button'
  | 'system-meta'
  | 'multi-step'
  | 'resize'
  | 'hidden-target'
  | 'modal'
  | 'fake-fail'
  | 'sequence-trick'

// ─────────────────────────────────────────────
// 背景配置
// ─────────────────────────────────────────────

export interface BackgroundConfig {
  type: 'color' | 'image' | 'gradient'
  /** 纯色: '#ffffff'; 渐变: ['#fff', '#000']; 图片: asset key */
  value: string | string[]
}

// ─────────────────────────────────────────────
// 游戏对象配置
// ─────────────────────────────────────────────

export interface GameObjectConfig {
  id: string
  type: GameObjectType
  /** 归一化坐标 (0~1)，(0,0) = 左上 */
  position: Vec2
  /** 归一化尺寸 */
  size?: Vec2
  /** 文案 i18n key 或 asset key */
  content?: string
  style?: ObjectStyle
  /** 绑定的交互列表 */
  interactions?: InteractionConfig[]
  /** 绑定的行为列表 */
  behaviors?: BehaviorConfig[]
  visible?: boolean
  interactive?: boolean
  zIndex?: number
  rotation?: number
  scale?: number
  alpha?: number
  origin?: Vec2
  enterAnimation?: AnimationConfig
  /** 子对象（container 类型） */
  children?: GameObjectConfig[]
}

export type GameObjectType =
  | 'text'
  | 'button'
  | 'image'
  | 'sprite'
  | 'container'
  | 'shape'
  | 'toggle'

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
  textAlign?: 'left' | 'center' | 'right'
  shapeType?: 'rect' | 'circle' | 'ellipse'
  fill?: string
}

export interface AnimationConfig {
  type: 'fade-in' | 'slide-in' | 'scale-in' | 'bounce-in' | 'none'
  duration?: number
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

// ─────────────────────────────────────────────
// 交互配置
// ─────────────────────────────────────────────

export interface InteractionConfig {
  type: InteractionType
  /** 触发后发射的事件 ID */
  emits: string

  /** multi-click: 需要连续点击的次数 */
  clickCount?: number
  /** multi-click: 连击间隔上限 (ms) */
  clickInterval?: number

  /** long-press: 判定时长 (ms) */
  duration?: number

  /** drag: 约束 */
  dragConstraint?: DragConstraint
  /** drag: 成功判定目标 */
  dragTarget?: DragTarget
  /** drag: 边界 */
  dragBounds?: 'screen' | 'none'

  /** swipe: 方向 */
  direction?: SwipeDirection
  /** swipe: 最小滑动距离（归一化） */
  minDistance?: number

  /** wait: 等待时长 (ms) */
  waitDuration?: number

  /** pinch: 目标缩放范围 */
  targetScale?: { min: number; max: number }

  /** toggle: 目标状态 */
  targetState?: boolean
}

export type InteractionType =
  | 'click'
  | 'multi-click'
  | 'long-press'
  | 'drag'
  | 'swipe'
  | 'wait'
  | 'pinch'
  | 'toggle'

export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'any'

export interface DragConstraint {
  axis?: 'x' | 'y' | 'free'
}

export interface DragTarget {
  position?: Vec2
  radius?: number
  objectId?: string
  offScreen?: boolean
  relativeOffset?: Vec2
}

// ─────────────────────────────────────────────
// 行为配置
// ─────────────────────────────────────────────

export interface BehaviorConfig {
  type: string
  params?: Record<string, unknown>
  trigger?: 'on-create' | 'on-event'
  triggerEventId?: string
}

// ─────────────────────────────────────────────
// 事件反应系统 - 场景动态变化的唯一机制
// ─────────────────────────────────────────────

export interface EventReaction {
  /** 触发此反应的事件 ID */
  trigger: string
  /** 延迟执行 (ms) */
  delay?: number
  /** 是否只触发一次，默认 true */
  once?: boolean
  /** 要执行的动作序列 */
  actions: ReactionAction[]
}

export interface ReactionAction {
  type: ReactionActionType
  /** 目标对象 ID */
  objectId?: string
  /** 动作参数值 */
  value?: unknown
  /** 动画时长 (ms) */
  duration?: number
  /** emit-event 专用：要发射的事件 ID */
  eventId?: string
}

export type ReactionActionType =
  | 'show'
  | 'hide'
  | 'set-text'
  | 'move'
  | 'set-interactive'
  | 'emit-event'
  | 'destroy'
  | 'shake'
  | 'flash'
  | 'set-style'

// ─────────────────────────────────────────────
// 条件系统
// ─────────────────────────────────────────────

export interface Condition {
  type: ConditionType
  eventId?: string
  count?: number
  comparator?: 'eq' | 'gte' | 'lte' | 'lt' | 'gt'
  objectId?: string
  property?: ObjectStateProperty
  seconds?: number
  idleDuration?: number
  eventSequence?: string[]
  children?: Condition[]
  operator?: 'and' | 'or'
  negate?: boolean
}

export type ConditionType =
  | 'event-fired'
  | 'event-count'
  | 'object-state'
  | 'timer-expired'
  | 'no-action'
  | 'sequence'
  | 'composite'

export interface ObjectStateProperty {
  key: 'visible' | 'position.x' | 'position.y' | 'scale' | 'alpha' | 'rotation' | 'toggleState'
  value: unknown
  comparator?: 'eq' | 'gte' | 'lte' | 'lt' | 'gt'
}

// ─────────────────────────────────────────────
// 提示系统
// ─────────────────────────────────────────────

export interface HintConfig {
  level: 'weak' | 'medium' | 'strong'
  text: string
  showAfterFailCount: number
  highlightObjectId?: string
  autoDismissMs?: number
}

// ─────────────────────────────────────────────
// 反馈配置
// ─────────────────────────────────────────────

export interface FeedbackConfig {
  texts: string[]
  animation?: 'confetti' | 'shake' | 'explode' | 'bounce' | 'none'
  sfx?: string
  vibration?: 'light' | 'medium' | 'heavy'
}

// ─────────────────────────────────────────────
// 关卡脚本接口
// ─────────────────────────────────────────────

export interface LevelScript {
  id: string
  onInit?(ctx: import('./level-context').LevelContext): void
  onUpdate?(ctx: import('./level-context').LevelContext, delta: number): void
  onEvent?(ctx: import('./level-context').LevelContext, eventId: string, payload?: EventPayload): void
  onDestroy?(ctx: import('./level-context').LevelContext): void
}

export interface EventPayload {
  objectId: string
  interactionType: InteractionType
  position?: Vec2
  dragDelta?: Vec2
  currentCount?: number
  timestamp: number
}
