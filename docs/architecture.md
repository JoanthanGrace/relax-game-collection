# 《别点错》工程架构设计 v1.0

> **核心判断**：这是一个内容驱动型游戏项目，关卡数量会无限增长，技术架构必须让"加一关"的成本趋近于零。
> 数据结构的核心不是代码，而是关卡配置。一切围绕"关卡配置即产品"来设计。

---

## 1. Monorepo 目录结构

```
relax-game-collection/
├── packages/
│   ├── game-core/              # 游戏引擎核心（纯逻辑，零平台依赖）
│   ├── levels/                 # 关卡配置 + 关卡脚本
│   ├── shared/                 # 跨端共享类型、工具、常量
│   ├── platform-web/           # Web/PWA 平台适配层
│   ├── platform-wechat/        # 微信小程序适配层（预留）
│   ├── platform-douyin/        # 抖音小程序适配层（预留）
│   ├── web-app/                # Vue 3 应用壳（路由、页面、UI）
│   └── server/                 # NestJS 后端服务
├── tools/
│   ├── level-cli/              # 关卡脚手架 CLI
│   └── level-validator/        # 关卡配置校验器
├── e2e/                        # Playwright 端到端测试
├── docs/                       # 文档
│   ├── prd.md
│   └── architecture.md
├── .github/
│   └── workflows/              # CI/CD
├── pnpm-workspace.yaml
├── turbo.json                  # Turborepo 构建编排
├── tsconfig.base.json
├── vitest.workspace.ts
└── package.json
```

### 工具链选型

| 工具        | 选择          | 理由                              |
| ----------- | ------------- | --------------------------------- |
| 包管理      | pnpm          | workspace 原生支持，硬链接省磁盘  |
| 构建编排    | Turborepo     | 增量构建 + 远程缓存，monorepo 标配 |
| 代码规范    | ESLint + Prettier | 统一代码风格                    |
| Git Hooks   | husky + lint-staged | 提交前自动校验                |

---

## 2. 各 Package 职责边界

### 2.1 依赖关系图

```
                    ┌──────────────┐
                    │   shared     │  类型定义、常量、纯工具函数
                    └──────┬───────┘
                           │
              ┌────────────┼─────────────┐
              │            │             │
        ┌─────▼──────┐ ┌──▼───────┐ ┌───▼──────┐
        │  game-core  │ │  levels  │ │  server  │
        │  (Phaser)   │ │ (配置+脚本)│ │ (NestJS) │
        └─────┬───────┘ └──┬───────┘ └──────────┘
              │            │
        ┌─────▼────────────▼──┐
        │   platform-web      │  Web 平台适配（音频、存储、振动…）
        └─────────┬───────────┘
                  │
           ┌──────▼───────┐
           │   web-app    │  Vue 3 应用壳
           └──────────────┘
```

### 2.2 职责矩阵

| Package | 允许依赖 | 职责 | 禁止事项 |
|---------|---------|------|---------|
| **shared** | 无外部依赖 | TS 类型、枚举、常量、纯函数工具 | 禁止依赖任何运行时框架 |
| **game-core** | shared, Phaser | Scene 管理、交互指令系统、通关/失败判定引擎、音效调度接口 | 禁止直接调用 DOM API、禁止直接读写存储 |
| **levels** | shared | 关卡配置 JSON + 关卡行为脚本 | 禁止 import Phaser、禁止引用平台 API |
| **platform-web** | shared | 实现 PlatformAdapter 接口：音频、存储、分享、振动 | 禁止包含游戏逻辑 |
| **platform-wechat** | shared | 实现 PlatformAdapter 接口（wx API） | 同上 |
| **web-app** | 上述所有 | Vue 路由、页面、Pinia 状态、UI 组件、Phaser 挂载 | 禁止在 Vue 组件中写 Phaser Scene 逻辑 |
| **server** | shared | 用户、进度、埋点、关卡配置下发 | 禁止依赖前端包 |

---

## 3. Game-Core / Levels / Platform Adapters 拆分方案

### 3.1 game-core 内部结构

```
packages/game-core/
├── src/
│   ├── engine/
│   │   ├── GameEngine.ts           # 引擎入口：初始化 Phaser、加载关卡、生命周期
│   │   ├── SceneManager.ts         # Scene 切换、预加载、销毁
│   │   └── PhysicsHelper.ts        # 碰撞/拖拽等通用物理辅助
│   ├── scenes/
│   │   ├── LevelScene.ts           # 通用关卡 Scene（由配置驱动）
│   │   ├── TransitionScene.ts      # 关卡切换过渡
│   │   └── PreloadScene.ts         # 资源预加载
│   ├── systems/
│   │   ├── InteractionSystem.ts    # 交互指令：click、drag、longPress、swipe、wait
│   │   ├── ConditionEvaluator.ts   # 通关/失败条件求值器
│   │   ├── HintSystem.ts           # 提示系统
│   │   ├── AudioBridge.ts          # 音效桥接（调用 PlatformAdapter.audio）
│   │   └── FeedbackSystem.ts       # 通关/失败反馈动效
│   ├── objects/
│   │   ├── InteractiveObject.ts    # 可交互游戏对象基类
│   │   ├── TextObject.ts           # 文本对象（支持拖拽、点击等）
│   │   ├── ButtonObject.ts         # 按钮对象
│   │   ├── ImageObject.ts          # 图片对象
│   │   └── ContainerObject.ts      # 容器对象
│   ├── behaviors/
│   │   ├── BehaviorRegistry.ts     # 行为注册表
│   │   ├── RunAwayBehavior.ts      # "按钮会跑"行为
│   │   ├── CountdownBehavior.ts    # 倒计时行为
│   │   ├── FakePopupBehavior.ts    # 假弹窗行为
│   │   └── ...                     # 可持续扩展
│   ├── adapters/
│   │   └── PlatformAdapter.ts      # 平台适配接口定义
│   └── index.ts
├── __tests__/
└── package.json
```

**核心设计思路**：`LevelScene` 是唯一的通用 Scene，所有关卡共享它。关卡差异完全由配置 + 行为脚本驱动，不需要为每个关卡写一个 Scene 子类。

### 3.2 levels 内部结构

```
packages/levels/
├── src/
│   ├── registry.ts                 # 关卡注册表（自动扫描加载）
│   ├── schema.ts                   # 关卡配置 JSON Schema（用于校验）
│   ├── configs/
│   │   ├── level-001.json          # 第 1 关配置
│   │   ├── level-002.json          # 第 2 关配置
│   │   ├── ...
│   │   └── level-030.json
│   └── scripts/
│       ├── level-008.ts            # 第 8 关自定义行为（按钮会跑）
│       ├── level-009.ts            # 第 9 关自定义行为（假失败）
│       └── ...                     # 只有需要自定义逻辑的关卡才有脚本
├── __tests__/
└── package.json
```

### 3.3 PlatformAdapter 接口

```typescript
// packages/game-core/src/adapters/PlatformAdapter.ts

export interface PlatformAdapter {
  audio: AudioAdapter
  storage: StorageAdapter
  share: ShareAdapter
  vibration: VibrationAdapter
  analytics: AnalyticsAdapter
  device: DeviceAdapter
}

export interface AudioAdapter {
  playBGM(key: string): void
  playSFX(key: string): void
  stopBGM(): void
  setVolume(volume: number): void
  isMuted(): boolean
  setMuted(muted: boolean): void
}

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

export interface ShareAdapter {
  shareLevel(levelId: string, screenshot?: Blob): Promise<boolean>
  shareScore(score: number): Promise<boolean>
}

export interface VibrationAdapter {
  light(): void
  medium(): void
  heavy(): void
}

export interface AnalyticsAdapter {
  track(event: string, params?: Record<string, unknown>): void
}

export interface DeviceAdapter {
  getScreenSize(): { width: number; height: number }
  getPixelRatio(): number
  isMobile(): boolean
  getOrientation(): 'portrait' | 'landscape'
}
```

### 3.4 platform-web 实现

```
packages/platform-web/
├── src/
│   ├── WebPlatformAdapter.ts       # 汇总实现
│   ├── WebAudioAdapter.ts          # Web Audio API / Howler.js
│   ├── WebStorageAdapter.ts        # localStorage + IndexedDB fallback
│   ├── WebShareAdapter.ts          # Web Share API
│   ├── WebVibrationAdapter.ts      # Vibration API
│   ├── WebAnalyticsAdapter.ts      # fetch 上报
│   ├── WebDeviceAdapter.ts         # window/screen API
│   └── index.ts
└── package.json
```

---

## 4. 配置驱动的关卡系统设计

### 4.1 关卡配置 Schema

```typescript
// packages/shared/src/types/level.ts

export interface LevelConfig {
  id: string                        // "level-001"
  chapter: number                   // 所属章节
  order: number                     // 章节内排序
  title: string                     // 关卡标题（i18n key）
  instruction: string               // 玩家看到的指令（i18n key）
  
  /** 场景对象 */
  objects: GameObjectConfig[]

  /** 通关条件（支持组合） */
  winConditions: Condition[]

  /** 失败条件（可选） */
  failConditions?: Condition[]

  /** 关卡级别自定义行为脚本 ID（可选，对应 scripts/ 下的文件） */
  scriptId?: string

  /** 提示 */
  hints?: HintConfig[]

  /** 通关反馈 */
  passFeedback: FeedbackConfig

  /** 失败反馈 */
  failFeedback: FeedbackConfig

  /** 时间限制（秒，0 = 无限制） */
  timeLimit?: number

  /** 关卡标签（用于分类、统计） */
  tags: LevelTag[]

  /** 背景配置 */
  background?: BackgroundConfig
}

export type LevelTag =
  | 'text-trick'       // 文字误导型
  | 'ui-trick'         // UI 欺骗型
  | 'drag-reveal'      // 拖拽反转型
  | 'wait'             // 等待型
  | 'long-press'       // 长按型
  | 'fake-button'      // 假按钮型
  | 'system-meta'      // 系统元素玩梗型
  | 'multi-step'       // 组合操作型

export interface GameObjectConfig {
  id: string
  type: 'text' | 'button' | 'image' | 'container' | 'sprite'
  position: { x: number; y: number }        // 归一化坐标 (0~1)
  size?: { width: number; height: number }   // 归一化尺寸
  content?: string                           // 文案 i18n key 或图片 asset key
  style?: ObjectStyle
  interactions?: InteractionConfig[]          // 绑定的交互
  behaviors?: BehaviorConfig[]               // 绑定的行为
  visible?: boolean                          // 初始是否可见
  zIndex?: number
}

export interface InteractionConfig {
  type: 'click' | 'doubleClick' | 'longPress' | 'drag' | 'swipe' | 'hover'
  /** 拖拽目标区域（归一化） */
  dragTarget?: { x: number; y: number; radius: number }
  /** 长按时长（ms） */
  duration?: number
  /** 滑动方向 */
  direction?: 'up' | 'down' | 'left' | 'right'
  /** 触发的事件 ID */
  emits: string
}

export interface Condition {
  type: 'event-fired' | 'timer-expired' | 'object-state' | 'event-count' | 'composite'
  eventId?: string
  objectId?: string
  state?: Record<string, unknown>
  count?: number
  operator?: 'and' | 'or'
  children?: Condition[]
}

export interface BehaviorConfig {
  type: string                  // 对应 BehaviorRegistry 中注册的行为
  params?: Record<string, unknown>
}

export interface HintConfig {
  level: 'weak' | 'strong'
  text: string                  // i18n key
  showAfterFailCount: number
}

export interface FeedbackConfig {
  texts: string[]               // i18n keys，随机选一个
  animation?: string            // 动效预设名
  sfx?: string                  // 音效 key
}
```

### 4.2 关卡配置示例

```jsonc
// packages/levels/src/configs/level-008.json
// 第 8 关：按钮会跑
{
  "id": "level-008",
  "chapter": 1,
  "order": 8,
  "title": "levels.008.title",
  "instruction": "levels.008.instruction",
  "tags": ["fake-button"],
  "objects": [
    {
      "id": "runaway-btn",
      "type": "button",
      "position": { "x": 0.5, "y": 0.5 },
      "content": "levels.008.btnText",
      "interactions": [
        { "type": "click", "emits": "btn-clicked" }
      ],
      "behaviors": [
        { "type": "run-away", "params": { "speed": 200, "triggerDistance": 80 } }
      ]
    },
    {
      "id": "background-area",
      "type": "container",
      "position": { "x": 0.5, "y": 0.5 },
      "size": { "width": 1, "height": 1 },
      "interactions": [
        { "type": "click", "emits": "bg-clicked" }
      ],
      "zIndex": -1
    }
  ],
  "winConditions": [
    { "type": "event-fired", "eventId": "bg-clicked" }
  ],
  "failConditions": [
    { "type": "event-count", "eventId": "btn-clicked", "count": 5 }
  ],
  "hints": [
    { "level": "weak", "text": "levels.008.hint1", "showAfterFailCount": 3 },
    { "level": "strong", "text": "levels.008.hint2", "showAfterFailCount": 5 }
  ],
  "passFeedback": {
    "texts": ["feedback.pass.clever", "feedback.pass.unexpected"],
    "animation": "confetti",
    "sfx": "pass-1"
  },
  "failFeedback": {
    "texts": ["feedback.fail.honest", "feedback.fail.tryHarder"],
    "animation": "shake",
    "sfx": "fail-1"
  }
}
```

### 4.3 关卡行为脚本（仅复杂关卡需要）

```typescript
// packages/levels/src/scripts/level-009.ts
// 第 9 关：假失败 —— 点击后出现"失败了"，再点失败弹窗的表情反而通关

import type { LevelScript, LevelContext } from '@nicetap/shared'

export const script: LevelScript = {
  id: 'level-009',

  onInit(ctx: LevelContext) {
    // 初始化时无特殊逻辑
  },

  onEvent(ctx: LevelContext, eventId: string) {
    if (eventId === 'main-btn-clicked') {
      ctx.showObject('fake-fail-popup')
      ctx.playAnimation('fake-fail-popup', 'slide-in')
      ctx.playSFX('fail-1')
    }

    if (eventId === 'emoji-clicked') {
      ctx.hideObject('fake-fail-popup')
      ctx.win()
    }
  },

  onDestroy(ctx: LevelContext) {
    // 清理
  }
}
```

### 4.4 LevelContext（脚本的沙箱 API）

```typescript
// packages/shared/src/types/level-context.ts

export interface LevelContext {
  // 对象操作
  showObject(objectId: string): void
  hideObject(objectId: string): void
  moveObject(objectId: string, to: { x: number; y: number }, duration?: number): void
  setObjectProperty(objectId: string, key: string, value: unknown): void

  // 流程控制
  win(): void
  fail(message?: string): void

  // 反馈
  playSFX(key: string): void
  playAnimation(objectId: string, animation: string): void
  showText(text: string, position: { x: number; y: number }, duration?: number): void
  vibrate(intensity: 'light' | 'medium' | 'heavy'): void

  // 状态
  getElapsedTime(): number
  getEventCount(eventId: string): number
  getObjectState(objectId: string): Record<string, unknown>

  // 存储（关卡级别临时状态）
  setState(key: string, value: unknown): void
  getState<T>(key: string): T | undefined
}
```

### 4.5 关卡加载流程

```
新关卡请求
    │
    ▼
LevelRegistry.get(levelId)
    │
    ├─► 加载 level-XXX.json 配置
    │
    ├─► 如有 scriptId → 动态 import 对应脚本
    │
    ▼
LevelScene.init(config, script?)
    │
    ├─► 根据 objects[] 创建 Phaser GameObjects
    ├─► 根据 interactions[] 绑定交互事件
    ├─► 根据 behaviors[] 注册行为
    ├─► 注册 winConditions / failConditions 到 ConditionEvaluator
    │
    ▼
等待玩家交互 ←──► ConditionEvaluator 持续求值
    │
    ├─► 满足 winCondition → FeedbackSystem.showPass() → 下一关
    └─► 满足 failCondition → FeedbackSystem.showFail() → 重试
```

### 4.6 "加一关"的成本分析

| 关卡类型 | 需要做的事 | 预计耗时 |
|---------|-----------|---------|
| 纯配置关（如第1~5关） | 写一个 JSON | 10 分钟 |
| 需要新行为的关（如"按钮会跑"） | JSON + 注册一个 Behavior | 30 分钟 |
| 需要自定义脚本的关（如"假失败"） | JSON + 写一个 LevelScript | 1 小时 |
| 需要新交互类型 | 扩展 InteractionSystem | 半天 |

---

## 5. PWA 架构建议

### 5.1 Service Worker 策略

```
packages/web-app/
├── public/
│   ├── manifest.json
│   ├── icons/                    # 各尺寸图标
│   └── sw.js                     # 由 vite-plugin-pwa 自动生成
├── src/
│   ├── pwa/
│   │   ├── register-sw.ts        # SW 注册 + 更新提示
│   │   └── cache-strategy.ts     # 缓存策略配置
```

### 5.2 缓存策略

| 资源类型 | 策略 | 理由 |
|---------|------|------|
| App Shell (HTML/CSS/JS) | Stale-While-Revalidate | 优先离线可用，后台静默更新 |
| 游戏资源 (sprites/audio) | Cache-First | 资源不常变，优先缓存命中 |
| 关卡配置 JSON | Network-First | 可能热更新新关卡，需要拿最新 |
| API 请求 | Network-Only | 实时数据不缓存 |
| 字体 | Cache-First + 长过期 | 几乎不变 |

### 5.3 离线策略

```typescript
// 核心原则：游戏必须在无网络时也能玩已下载的关卡

// 1. 首次加载时，预缓存前 30 关配置 + 资源
// 2. 进度数据存 IndexedDB，联网时同步到服务端
// 3. 新关卡包以 "章节" 为单位下载，下载完整章节才标记可用
// 4. 离线时隐藏需要联网的功能（分享、排行榜）
```

### 5.4 安装体验

- 使用 `beforeinstallprompt` 事件在合适时机引导安装
- 通关第 5 关后首次弹出安装引导（用户已产生粘性）
- manifest.json 配置 `display: standalone`，`orientation: portrait`

---

## 6. 后端 API 模块划分

### 6.1 NestJS 模块结构

```
packages/server/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── guards/               # 鉴权守卫
│   │   ├── interceptors/         # 响应转换、日志
│   │   ├── filters/              # 全局异常过滤
│   │   ├── decorators/           # 自定义装饰器
│   │   └── pipes/                # 参数校验
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── strategies/       # JWT / 微信登录 / 游客登录
│   │   ├── user/
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── user.entity.ts
│   │   ├── progress/
│   │   │   ├── progress.module.ts
│   │   │   ├── progress.controller.ts    # 关卡进度 CRUD
│   │   │   ├── progress.service.ts
│   │   │   └── progress.entity.ts
│   │   ├── level/
│   │   │   ├── level.module.ts
│   │   │   ├── level.controller.ts       # 关卡列表、配置下发
│   │   │   └── level.service.ts
│   │   ├── analytics/
│   │   │   ├── analytics.module.ts
│   │   │   ├── analytics.controller.ts   # 埋点上报
│   │   │   ├── analytics.service.ts
│   │   │   └── analytics.entity.ts
│   │   └── config/
│   │       ├── config.module.ts
│   │       └── config.service.ts         # 远程配置（活动、公告）
│   └── database/
│       ├── database.module.ts
│       └── migrations/
├── test/
└── package.json
```

### 6.2 API 设计

```yaml
# Auth
POST   /api/v1/auth/guest          # 游客登录（生成临时 token）
POST   /api/v1/auth/wechat         # 微信登录（预留）
POST   /api/v1/auth/refresh        # 刷新 token

# User
GET    /api/v1/user/profile        # 获取用户信息
PATCH  /api/v1/user/profile        # 更新用户信息

# Level
GET    /api/v1/levels              # 关卡列表（含解锁状态）
GET    /api/v1/levels/:id/config   # 单关配置（支持热更新）

# Progress
GET    /api/v1/progress            # 获取全量进度
POST   /api/v1/progress/sync       # 批量同步进度（离线攒的一起上报）
POST   /api/v1/progress/pass       # 上报通关
POST   /api/v1/progress/fail       # 上报失败

# Analytics
POST   /api/v1/analytics/batch     # 批量上报事件（客户端攒一波再发）

# Config
GET    /api/v1/config/app          # 应用配置（公告、活动、强更版本号）
```

### 6.3 数据库选型

| 第一版 | 后续可升级 |
|--------|-----------|
| SQLite (开发) + PostgreSQL (生产) | 同 |
| TypeORM 作为 ORM | 同 |
| Redis 做 session + 排行榜缓存 | 同 |

---

## 7. 测试体系设计

### 7.1 测试金字塔

```
          ╱  E2E (Playwright)  ╲        ← 核心用户流程
         ╱   ≤ 20 个关键场景    ╲
        ╱─────────────────────────╲
       ╱  Integration (Vitest)     ╲    ← 模块间协作
      ╱   关卡加载+求值 / API 集成  ╲
     ╱─────────────────────────────────╲
    ╱  Unit (Vitest)                    ╲  ← 大量，快速
   ╱   条件求值器 / 行为 / 工具函数      ╲
  ╱─────────────────────────────────────────╲
```

### 7.2 各层测试职责

| 层 | 框架 | 测什么 | 运行频率 |
|----|------|--------|---------|
| **Unit** | Vitest | ConditionEvaluator、BehaviorRegistry、LevelConfig 校验、工具函数 | 每次提交 |
| **Integration** | Vitest | 关卡配置加载→Scene 初始化→交互模拟→通关判定的完整链路 | 每次提交 |
| **E2E** | Playwright | 首页→开始→通关前 5 关→进度保存→刷新恢复 | 每次 PR merge |
| **关卡校验** | level-validator | 所有 JSON 配置格式校验 + 引用完整性检查 | 每次提交 |

### 7.3 关卡专项测试

```typescript
// packages/levels/__tests__/level-validator.test.ts
// 自动扫描所有 level-*.json，校验：

describe('Level Config Validation', () => {
  const configs = loadAllLevelConfigs()
  
  for (const config of configs) {
    describe(`Level ${config.id}`, () => {
      it('符合 JSON Schema', () => { /* ... */ })
      it('所有引用的 objectId 存在', () => { /* ... */ })
      it('winCondition 引用的 eventId 可被触发', () => { /* ... */ })
      it('所有 i18n key 在语言包中存在', () => { /* ... */ })
      it('所有 asset key 在资源清单中存在', () => { /* ... */ })
      it('behaviors 引用的 type 已注册', () => { /* ... */ })
    })
  }
})
```

### 7.4 后端测试

| 类型 | 工具 | 覆盖 |
|------|------|------|
| 单元测试 | Vitest + NestJS Testing Module | Service 层逻辑 |
| API 测试 | Supertest | Controller 层接口 |
| 数据库测试 | TestContainers (PostgreSQL) | Repository 层 |

---

## 8. CI/CD 设计

### 8.1 Pipeline 总览

```yaml
# .github/workflows/ci.yml

name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo typecheck

  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test:unit -- --coverage

  level-validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @nicetap/level-validator validate

  e2e:
    needs: [lint, typecheck, unit-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=@nicetap/web-app
      - run: pnpm exec playwright install --with-deps
      - run: pnpm turbo test:e2e

  deploy-preview:
    needs: [e2e]
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - # Deploy to preview (Vercel / Cloudflare Pages)

  deploy-production:
    needs: [e2e]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - # Deploy web-app to CDN
      - # Deploy server to cloud (Docker)
```

### 8.2 部署策略

| 环境 | 触发 | 目标 |
|------|------|------|
| Preview | PR 创建/更新 | Vercel Preview URL |
| Staging | merge 到 develop | staging.nicetap.app |
| Production | merge 到 main + tag | nicetap.app |

### 8.3 关卡热更新

```
关卡配置不走完整发版，而是走"资源更新"：

1. levels/ 包构建产物为 JSON bundle + asset manifest
2. 上传到 CDN（带版本号）
3. 服务端 GET /api/v1/config/app 返回最新关卡包版本号
4. 客户端对比本地版本，差量下载新关卡
5. 无需重新发布 Web App 即可上新关
```

---

## 9. 小程序迁移适配层方案

### 9.1 核心策略：依赖倒置

```
所有业务逻辑只依赖 PlatformAdapter 接口，
不依赖任何具体平台实现。

迁移到小程序 = 实现一个新的 PlatformAdapter，
而非改动任何业务代码。
```

### 9.2 适配层覆盖范围

| 能力 | Web | 微信小程序 | 抖音小程序 |
|------|-----|-----------|-----------|
| 渲染 | Phaser (Canvas) | Phaser + 小游戏适配 (wx canvas) | Phaser + 小游戏适配 |
| 存储 | localStorage / IDB | wx.getStorage | tt.getStorage |
| 音频 | Web Audio API | wx.createInnerAudioContext | tt.createInnerAudioContext |
| 分享 | Web Share API | wx.shareAppMessage | tt.shareAppMessage |
| 振动 | Vibration API | wx.vibrateShort | tt.vibrateShort |
| 登录 | JWT (游客/手机号) | wx.login → 服务端换 session | tt.login |
| 支付 | — | wx.requestPayment | tt.pay |
| 广告 | — | wx.createRewardedVideoAd | tt.createRewardedVideoAd |
| 埋点 | fetch 上报 | wx.reportAnalytics | — |

### 9.3 Phaser 小程序适配

Phaser 官方不直接支持小程序，但社区有成熟方案：

```
方案：使用 phaser-wx / 自研适配层

原理：
1. 小程序提供 Canvas 2D / WebGL context
2. 将 Phaser 的 document/window 依赖替换为小程序的 polyfill
3. 事件系统从 DOM Event 映射到小程序触摸事件

关键文件：
packages/platform-wechat/
├── src/
│   ├── WechatPlatformAdapter.ts
│   ├── phaser-polyfill.ts          # document/window/Image/Audio polyfill
│   ├── canvas-adapter.ts           # wx.createCanvas → HTMLCanvasElement
│   └── event-adapter.ts            # touchstart/touchmove → Phaser input
```

### 9.4 迁移检查清单

```markdown
迁移到微信小程序时的工作清单：

- [ ] 实现 WechatPlatformAdapter（各子 adapter）
- [ ] 编写 Phaser polyfill（canvas/event/audio）
- [ ] game-core 无需改动（验证零平台依赖）
- [ ] levels 无需改动（验证纯配置+脚本）
- [ ] 构建产物适配小程序目录结构
- [ ] 替换路由方案（Vue Router → 小程序原生页面）
- [ ] 替换 UI 层（Vue → 小程序 WXML/WXSS 或 Taro）
- [ ] 接入小程序登录、分享、广告
- [ ] 联调测试
```

### 9.5 架构护栏规则

为确保迁移可行性，在 CI 中加入依赖检查：

```typescript
// tools/dep-checker.ts
// 在 CI 中运行，扫描 import 语句

const RULES = {
  'packages/game-core': {
    forbidden: ['window', 'document', 'localStorage', 'fetch', 'navigator'],
    allowed: ['phaser', '@nicetap/shared']
  },
  'packages/levels': {
    forbidden: ['phaser', 'window', 'document', 'vue', 'pinia'],
    allowed: ['@nicetap/shared']
  }
}
```

---

## 10. web-app 应用壳（Vue 3）

### 10.1 目录结构

```
packages/web-app/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts              # Vue Router 配置
│   ├── pages/
│   │   ├── HomePage.vue          # 首页
│   │   ├── GamePage.vue          # 游戏页（Phaser 挂载点）
│   │   ├── LevelSelectPage.vue   # 关卡选择
│   │   └── SettingsPage.vue      # 设置
│   ├── components/
│   │   ├── ui/                   # 通用 UI 组件
│   │   ├── game/
│   │   │   ├── PhaserContainer.vue   # Phaser Canvas 挂载容器
│   │   │   ├── PassOverlay.vue       # 通关弹层（Vue DOM 覆盖在 Canvas 上）
│   │   │   ├── FailOverlay.vue       # 失败弹层
│   │   │   └── HintOverlay.vue       # 提示弹层
│   │   └── layout/
│   ├── stores/
│   │   ├── useGameStore.ts       # 游戏状态（当前关、进度）
│   │   ├── useSettingsStore.ts   # 设置（音效、语言）
│   │   └── useUserStore.ts       # 用户信息
│   ├── composables/
│   │   ├── usePhaser.ts          # Phaser 实例管理
│   │   ├── useProgress.ts        # 进度读写（调 PlatformAdapter.storage）
│   │   └── useAnalytics.ts       # 埋点
│   ├── i18n/
│   │   ├── index.ts
│   │   ├── zh-CN.json
│   │   ├── en.json
│   │   └── ja.json
│   ├── assets/
│   ├── styles/
│   └── pwa/
├── public/
├── index.html
├── vite.config.ts
└── package.json
```

### 10.2 Vue 与 Phaser 的通信

```
┌─────────────────────────────────────────────┐
│  Vue Layer (DOM)                            │
│  ┌─────────┐ ┌──────────┐ ┌─────────────┐  │
│  │ Overlay  │ │  HUD     │ │  Navigation │  │
│  └────┬─────┘ └────┬─────┘ └──────┬──────┘  │
│       │             │              │         │
│  ─────┼─────────────┼──────────────┼─────── │
│       │      EventBus (mitt)       │         │
│  ─────┼─────────────┼──────────────┼─────── │
│       │             │              │         │
│  ┌────▼─────────────▼──────────────▼──────┐  │
│  │  Phaser Canvas (game-core)             │  │
│  │  LevelScene ←── 配置驱动                │  │
│  └────────────────────────────────────────┘  │
└─────────────────────────────────────────────┘

通信规则：
- Phaser → Vue：通过 EventBus 发事件（level-pass, level-fail, hint-trigger）
- Vue → Phaser：通过 GameEngine 暴露的方法（loadLevel, retry, pause）
- 禁止 Phaser Scene 直接操作 DOM
- 禁止 Vue 组件直接操作 Phaser Game Objects
```

---

## 11. 开发约定

### 11.1 新增关卡 SOP

```bash
# 1. 使用 CLI 创建关卡骨架
pnpm --filter @nicetap/level-cli create --id 031 --tags text-trick

# 2. 编辑生成的 JSON 配置
# packages/levels/src/configs/level-031.json

# 3. 如需自定义逻辑，创建脚本
# packages/levels/src/scripts/level-031.ts

# 4. 添加 i18n 词条
# packages/web-app/src/i18n/zh-CN.json

# 5. 运行关卡校验
pnpm --filter @nicetap/level-validator validate

# 6. 本地测试
pnpm dev

# 7. 提交
git add . && git commit -m "feat(levels): add level 031 - xxx"
```

### 11.2 命名规范

| 范围 | 规范 | 示例 |
|------|------|------|
| npm scope | `@nicetap/` | `@nicetap/game-core` |
| 关卡 ID | `level-XXX` (3 位补零) | `level-008` |
| 行为名 | kebab-case | `run-away`, `countdown` |
| 事件 ID | kebab-case | `btn-clicked`, `bg-tapped` |
| i18n key | dot-separated | `levels.008.title` |
| 分支名 | `feat/level-XXX` 或 `fix/xxx` | `feat/level-031-fake-ad` |

---

## 12. 总结：这套架构的核心价值

| 问题 | 解法 |
|------|------|
| 100+ 关卡如何维护？ | 配置驱动 + 行为注册表，纯 JSON 加关 |
| 关卡逻辑和平台怎么解耦？ | PlatformAdapter 接口隔离 |
| DOM 和 Canvas 怎么不打架？ | Vue 管 DOM、Phaser 管 Canvas、EventBus 通信 |
| 怎么迁移小程序？ | 实现新的 PlatformAdapter + Phaser polyfill |
| 怎么保证配置不出错？ | JSON Schema 校验 + CI 关卡自动化测试 |
| 怎么上新关不发版？ | 关卡配置走 CDN 热更新 |
| 怎么保证长期可维护？ | 严格的包边界 + CI 依赖检查 + 测试金字塔 |
