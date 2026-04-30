# 小程序迁移技术预案 v1.0

> **核心结论**：如果架构护栏守住了，迁移 = 重写 UI 壳 + 实现新 PlatformAdapter + 搞定 Phaser polyfill。
> game-core 和 levels 两个包零改动。
> 如果架构护栏没守住（game-core 里偷偷用了 DOM API），迁移就是灾难。

---

## 1. 代码复用评估

### 1.1 总览

```
packages/
├── shared/          → 100% 复用   纯 TS 类型 + 纯函数
├── game-core/       →  90% 复用   Phaser 逻辑层，需 polyfill 适配
├── levels/          → 100% 复用   纯 JSON + 纯 TS 脚本
├── platform-web/    →   0% 复用   整个被替换为 platform-wechat
├── web-app/         →   0% 复用   Vue 3 壳被替换为小程序页面
├── server/          → 100% 复用   后端不受前端平台影响
└── tools/           → 100% 复用   CLI/validator 是 Node 工具
```

### 1.2 逐包详细分析

#### shared — 100% 复用

```
LevelConfig 类型、Condition 类型、LevelContext 接口、
LevelValidator、工具函数。

纯 TypeScript，零运行时依赖。
小程序的构建工具（微信开发者工具 / Taro）能直接编译 TS。
不需要改一行代码。
```

#### game-core — 90% 复用

```
可直接复用：
  ConditionEvaluator.ts    — 纯逻辑，零平台依赖
  HintSystem.ts            — 纯逻辑
  TelemetryCollector.ts    — 通过 AnalyticsAdapter 抽象，不直接 fetch
  BehaviorRegistry.ts      — 纯逻辑
  所有 Behavior 实现        — 纯 Phaser API
  InteractionSystem.ts     — 纯 Phaser API
  LevelContextImpl.ts      — 通过 Phaser API 操作对象

需要适配的 10%：
  GameEngine.ts            — Phaser.Game 初始化参数需要改
                              Web: 传 DOM element
                              小程序: 传 wx canvas context
  PreloadScene.ts          — 资源 URL 从绝对路径改为小程序本地路径
  AudioBridge.ts           — 通过 PlatformAdapter.audio 抽象
                              但 Phaser 内部的 Sound Manager 需要 polyfill

注意：
  game-core 中的所有模块只 import 'phaser' 和 '@nicetap/shared'。
  只要 Phaser 能在小程序中运行，game-core 就能复用。
  这是架构设计的核心目的。
```

#### levels — 100% 复用

```
JSON 配置文件 + LevelScript 脚本。

JSON 不依赖任何运行时。
LevelScript 只 import '@nicetap/shared' 的 LevelContext 接口。
LevelContext 的实现在 game-core 中，脚本本身不触碰 Phaser。

30 关内容零改动。
以后加到 100 关也零改动。
这就是配置驱动的价值。
```

#### platform-web — 0% 复用，整个替换

```
WebAudioAdapter        → WechatAudioAdapter
WebStorageAdapter      → WechatStorageAdapter
WebShareAdapter        → WechatShareAdapter
WebVibrationAdapter    → WechatVibrationAdapter
WebAnalyticsAdapter    → WechatAnalyticsAdapter
WebDeviceAdapter       → WechatDeviceAdapter

六个类全部重写，但每个类都很薄（~50 行），
因为它们只是把 PlatformAdapter 接口映射到平台原生 API。
```

#### web-app — 0% 复用，整个替换

```
Vue 3 组件、Vue Router、Pinia stores 全部不可用。

需要重写为：
  微信小程序：WXML/WXSS/JS 页面
  或 Taro/UniApp 框架

页面结构不变（首页、游戏页、设置页、关卡选择页），
但模板语法、路由方式、状态管理全部需要重写。

这是迁移的最大工作量。
```

### 1.3 复用率量化

| 包 | 代码量（估） | 复用率 | 迁移工作量 |
|----|------------|--------|-----------|
| shared | ~1500 行 | 100% | 0 |
| game-core | ~3000 行 | 90% | 2~3 天 |
| levels | ~2000 行 | 100% | 0 |
| platform-web | ~400 行 | 0% | 3~4 天（重写为 platform-wechat） |
| web-app | ~3000 行 | 0% | 7~10 天（重写 UI 壳） |
| server | ~2000 行 | 100% | 0 |
| tools | ~500 行 | 100% | 0 |

**总结**：~12500 行代码中，~8000 行（64%）可直接复用。
迁移工作量集中在 UI 壳重写（~10 天）和平台适配层（~4 天）。

---

## 2. 必须重写的部分

### 2.1 UI 壳（最大工作量）

```
Web                              小程序
──────────────────              ──────────────────
Vue 3 SFC                       WXML + WXSS + JS
<template>                      <view>
<script setup>                  Page({}) / Component({})
Vue Router                      wx.navigateTo / wx.switchTab
Pinia store                     getApp().globalData / 小程序 store
v-if / v-for                    wx:if / wx:for
@click                          bindtap
<Transition>                    CSS animation
vue-i18n                        自研 i18n 工具函数
```

需要重写的页面：

| 页面 | Web | 小程序 | 注意事项 |
|------|-----|--------|---------|
| 首页 | HomePage.vue | pages/home/home | 布局结构不变 |
| 游戏页 | GamePage.vue | pages/game/game | Canvas 挂载方式不同 |
| 设置 | SettingsPage.vue | pages/settings/settings | wx.setStorageSync |
| 关卡选择 | LevelSelectPage.vue | pages/levels/levels | scroll-view |
| 通关弹层 | PassOverlay.vue | 组件 overlay | 不能用 DOM overlay，改用小程序组件 |
| 失败弹层 | FailOverlay.vue | 组件 overlay | 同上 |

### 2.2 Phaser 初始化

```typescript
// Web 版
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaser-container',  // DOM element id
  width: 375,
  height: 667,
  scene: [PreloadScene, LevelScene],
})

// 小程序版 — 需要完全不同的初始化方式
// 因为小程序没有 DOM，不能传 parent element
// 需要传一个 canvas context

const canvas = wx.createCanvas()
const game = new Phaser.Game({
  type: Phaser.CANVAS,        // 强制 Canvas 2D，小程序没有完整 WebGL
  canvas: canvas,             // 直接传 canvas 对象
  width: systemInfo.windowWidth,
  height: systemInfo.windowHeight,
  scene: [PreloadScene, LevelScene],
  // 不传 parent — 小程序没有 DOM
})
```

### 2.3 弹层系统

```
Web 版：
  通关/失败弹层是 Vue DOM 组件，absolute 定位在 Canvas 上方。
  Vue 和 Phaser 通过 EventBus 通信。

小程序版问题：
  小程序的 Canvas 是"原生组件"，层级高于普通视图。
  普通 view 无法覆盖在 Canvas 上方。

解决方案：
  方案 A：使用 cover-view / cover-image（微信支持）
         优点：类似 Web 的覆盖效果
         缺点：cover-view 样式能力有限，不支持动画

  方案 B：弹层由 Phaser Canvas 内部绘制
         优点：完全可控
         缺点：弹层逻辑从 Vue 迁移到 Phaser
         
  方案 C：隐藏 Canvas，显示原生弹层页面
         优点：弹层样式自由
         缺点：切换有闪烁

  推荐：方案 B
  理由：通关/失败弹层交互简单（一个文案 + 1~2 个按钮），
       用 Phaser 的 Text + Graphics + NineSlice 就能画出来，
       不需要复杂 CSS 能力。
       这样整个游戏页只有一个 Canvas，不存在层级问题。
```

---

## 3. 平台适配层设计

### 3.1 适配层全景

```typescript
// packages/shared/src/types/platform.ts
// 这个接口在架构初始就定义好了，迁移时不需要改

export interface PlatformAdapter {
  audio: AudioAdapter
  storage: StorageAdapter
  share: ShareAdapter
  vibration: VibrationAdapter
  analytics: AnalyticsAdapter
  device: DeviceAdapter
}
```

### 3.2 微信小程序适配层实现

```
packages/platform-wechat/
├── src/
│   ├── index.ts                    # 汇总导出
│   ├── WechatPlatformAdapter.ts    # 组装各子适配器
│   ├── WechatAudioAdapter.ts       # wx.createInnerAudioContext
│   ├── WechatStorageAdapter.ts     # wx.getStorageSync / wx.setStorageSync
│   ├── WechatShareAdapter.ts       # wx.shareAppMessage / wx.onShareAppMessage
│   ├── WechatVibrationAdapter.ts   # wx.vibrateShort / wx.vibrateLong
│   ├── WechatAnalyticsAdapter.ts   # wx.reportAnalytics / 自建上报
│   ├── WechatDeviceAdapter.ts      # wx.getSystemInfoSync
│   ├── WechatLoginAdapter.ts       # wx.login + 服务端 code2session
│   └── phaser/
│       ├── phaser-polyfill.ts      # 核心：window/document/Image/Audio polyfill
│       ├── canvas-adapter.ts       # wx.createCanvas → Phaser 兼容
│       └── event-adapter.ts        # 触摸事件映射
└── package.json
```

### 3.3 各子适配器实现要点

#### 存储

```typescript
// packages/platform-wechat/src/WechatStorageAdapter.ts

import type { StorageAdapter } from '@nicetap/shared'

export class WechatStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = wx.getStorageSync(key)
      return value ? JSON.parse(value) : null
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    wx.setStorageSync(key, JSON.stringify(value))
  }

  async remove(key: string): Promise<void> {
    wx.removeStorageSync(key)
  }
}
// 注意：wx storage 上限 10MB，单个 key 上限 1MB
// 进度数据很小，不会有问题
```

#### 音频

```typescript
// packages/platform-wechat/src/WechatAudioAdapter.ts

import type { AudioAdapter } from '@nicetap/shared'

export class WechatAudioAdapter implements AudioAdapter {
  private bgm: WechatMiniprogram.InnerAudioContext | null = null
  private sfxPool = new Map<string, WechatMiniprogram.InnerAudioContext>()
  private muted = false

  playSFX(key: string): void {
    if (this.muted) return
    let ctx = this.sfxPool.get(key)
    if (!ctx) {
      ctx = wx.createInnerAudioContext()
      ctx.src = `audio/${key}.mp3`
      this.sfxPool.set(key, ctx)
    }
    ctx.seek(0)
    ctx.play()
  }

  playBGM(key: string): void {
    if (this.muted) return
    if (this.bgm) this.bgm.destroy()
    this.bgm = wx.createInnerAudioContext()
    this.bgm.src = `audio/${key}.mp3`
    this.bgm.loop = true
    this.bgm.play()
  }

  stopBGM(): void {
    this.bgm?.stop()
  }

  setVolume(volume: number): void {
    if (this.bgm) this.bgm.volume = volume
  }

  isMuted(): boolean { return this.muted }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) this.bgm?.pause()
    else this.bgm?.play()
  }
}
// 注意：小程序同时播放的音频上限 ~10 个
// 游戏音效要复用实例，不能每次 new
```

#### 分享

```typescript
// packages/platform-wechat/src/WechatShareAdapter.ts

import type { ShareAdapter } from '@nicetap/shared'

export class WechatShareAdapter implements ShareAdapter {
  init(): void {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] })
  }

  async shareLevel(levelId: string): Promise<boolean> {
    return new Promise((resolve) => {
      wx.shareAppMessage({
        title: `我在《别点错》被第 ${levelId.replace('level-', '')} 关耍了！`,
        path: `/pages/game/game?level=${levelId}`,
        imageUrl: '/images/share-cover.png',
        success: () => resolve(true),
        fail: () => resolve(false),
      } as any)
    })
  }

  async shareScore(_score: number): Promise<boolean> {
    return false
  }
}
```

#### 登录

```typescript
// packages/platform-wechat/src/WechatLoginAdapter.ts
// 这是 Web 版没有的，小程序新增

export class WechatLoginAdapter {
  async login(): Promise<{ openId: string; sessionKey: string }> {
    const { code } = await wx.login()

    const res = await new Promise<any>((resolve, reject) => {
      wx.request({
        url: 'https://api.nicetap.app/api/v1/auth/wechat',
        method: 'POST',
        data: { code },
        success: (r) => resolve(r.data),
        fail: reject,
      })
    })

    return { openId: res.openId, sessionKey: res.sessionKey }
  }
}
```

---

## 4. Phaser 在小程序容器中的问题

这是迁移中**技术风险最高**的部分。

### 4.1 核心问题：Phaser 假设浏览器环境

```
Phaser 内部大量使用：
  document.createElement('canvas')
  document.createElement('img')
  window.requestAnimationFrame
  window.innerWidth / window.innerHeight
  window.addEventListener
  new Image()
  new Audio()
  HTMLCanvasElement.getContext()
  CanvasRenderingContext2D
  WebGLRenderingContext
  ...

小程序环境：
  没有 document
  没有 window（有 wx 全局对象）
  没有 DOM
  Canvas 是原生组件，API 与浏览器有差异
  Image 需要用 wx.createImage()
  没有 Audio 构造函数
```

### 4.2 Polyfill 方案

```typescript
// packages/platform-wechat/src/phaser/phaser-polyfill.ts

// 在 Phaser 加载之前执行，模拟浏览器全局对象

const systemInfo = wx.getSystemInfoSync()

// 模拟 window
;(GameGlobal as any).window = {
  innerWidth: systemInfo.windowWidth,
  innerHeight: systemInfo.windowHeight,
  devicePixelRatio: systemInfo.pixelRatio,
  requestAnimationFrame: (cb: Function) => {
    return requestAnimationFrame(cb as FrameRequestCallback)
  },
  cancelAnimationFrame: cancelAnimationFrame,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { href: '', protocol: 'https:', hostname: 'localhost' },
  navigator: { userAgent: 'miniprogram' },
  performance: {
    now: () => Date.now(),
  },
}

// 模拟 document
;(GameGlobal as any).document = {
  createElement(tag: string) {
    if (tag === 'canvas') return wx.createCanvas()
    if (tag === 'img') return wx.createImage()
    return {}
  },
  createElementNS(_ns: string, tag: string) {
    return this.createElement(tag)
  },
  body: {
    appendChild: () => {},
    removeChild: () => {},
    style: {},
  },
  head: {
    appendChild: () => {},
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  getElementById: () => null,
  querySelector: () => null,
}

// 模拟 HTMLCanvasElement
;(GameGlobal as any).HTMLCanvasElement = wx.createCanvas().constructor

// 模拟 Image
;(GameGlobal as any).Image = function() {
  return wx.createImage()
}

// 模拟 XMLHttpRequest（用于 Phaser 的 Loader）
;(GameGlobal as any).XMLHttpRequest = class {
  // ... 映射到 wx.request
}

// 模拟 navigator
;(GameGlobal as any).navigator = {
  userAgent: 'miniprogram',
  language: 'zh-CN',
}
```

### 4.3 已知兼容性问题

| 问题 | 严重程度 | 解决方案 |
|------|---------|---------|
| Phaser 的 WebGL renderer 依赖浏览器 WebGL API | 高 | 强制使用 `Phaser.CANVAS` 模式（2D），小程序的 WebGL 兼容性不稳定 |
| Phaser 的 BitmapText 使用 `document.createElement('canvas')` 离屏渲染 | 中 | polyfill 中返回 `wx.createOffscreenCanvas()` |
| Phaser 的 Input 系统监听 DOM 事件（mousedown/touchstart） | 高 | event-adapter 把小程序触摸事件转发为 Phaser 格式 |
| Phaser 的 Sound Manager 使用 Web Audio API | 高 | 完全禁用 Phaser 内置 Sound，音频全部走 PlatformAdapter.audio |
| Phaser 的 ScaleManager 读取 window.innerWidth | 中 | polyfill 返回 wx.getSystemInfoSync 的值 |
| Phaser 的 Loader 使用 XMLHttpRequest | 高 | polyfill XMLHttpRequest → wx.request 或 wx.getFileSystemManager |
| 多点触控（pinch）事件格式不同 | 中 | event-adapter 转换 wx.onTouchStart 的 touches 格式 |
| requestAnimationFrame 精度/频率 | 低 | 小程序的 raf 与浏览器一致，无需特殊处理 |

### 4.4 降级策略

```
如果 Phaser polyfill 搞不定：

Plan B：用 Canvas 2D API 自己画
  对于"别点错"这个游戏，画面极其简单（文字、按钮、简笔图标），
  不需要 Phaser 的物理引擎、粒子系统等重型功能。
  
  自己用 wx Canvas 2D API 实现一个轻量渲染层（~500 行），
  InteractionSystem 从 Phaser event 改为 wx touch event，
  ConditionEvaluator / HintSystem / TelemetryCollector 完全不变。

  工作量估增：+5 天
  复杂度增加：中
  稳定性提升：高（去掉 Phaser 就去掉了最大的兼容性风险）
```

---

## 5. 资源加载与包体策略

### 5.1 小程序包体限制

| 平台 | 主包上限 | 分包上限 | 总大小上限 |
|------|---------|---------|-----------|
| 微信小游戏 | 4MB | 4MB/个 | 20MB |
| 抖音小游戏 | 4MB | 4MB/个 | 20MB |

### 5.2 当前项目资源估算

| 资源类型 | 估算大小 | 策略 |
|---------|---------|------|
| 代码（JS 压缩后） | ~800KB | 主包 |
| Phaser 库 | ~600KB (min+gzip) | 主包 |
| 30 关 JSON 配置 | ~50KB | 主包 |
| 图标/UI 素材 | ~500KB | 主包 |
| 关卡专属素材 | ~1.5MB | 分包按章节 |
| 音效 | ~2MB | CDN 远程加载 |
| BGM | ~3MB | CDN 远程加载 |
| 手绘字体 | ~300KB | CDN 远程加载 |
| **主包合计** | **~2MB** | ✅ 在 4MB 限制内 |
| **总计** | **~8.7MB** | ✅ 在 20MB 限制内 |

### 5.3 分包策略

```
主包（≤ 4MB）：
├── Phaser 运行时
├── game-core 核心代码
├── 前 10 关配置 + 基础素材
├── 首页 + 游戏页
└── 平台适配层

分包 1 — chapter-2（≤ 4MB）：
├── 第 11~20 关配置
└── 第 11~20 关专属素材

分包 2 — chapter-3（≤ 4MB）：
├── 第 21~30 关配置
└── 第 21~30 关专属素材

远程资源（CDN，按需下载）：
├── 音效 MP3
├── BGM
└── 字体文件
```

### 5.4 资源加载方式对比

| 加载方式 | Web | 小程序 |
|---------|-----|--------|
| JS bundle | `<script>` 或 dynamic import | require() 或分包异步加载 |
| 图片 | HTTP fetch → Canvas drawImage | wx.createImage() + src |
| 音频 | Web Audio API / `<audio>` | wx.createInnerAudioContext() |
| JSON 配置 | HTTP fetch | require() 内置 或 wx.request() 远程 |
| 字体 | @font-face CSS | wx.loadFontFace() |

---

## 6. 为什么必须避免 DOM 依赖

### 6.1 根本原因

```
小程序运行时有两个线程：

┌──────────────┐     ┌──────────────┐
│  逻辑层       │     │  渲染层       │
│  (JSCore)     │ ←→  │  (WebView/   │
│  无 DOM API   │     │   Native)    │
│  无 window    │     │              │
│  无 document  │     │              │
└──────────────┘     └──────────────┘

逻辑层是一个纯 JS 环境，没有浏览器 API。
所有 DOM 操作都是通过 setData 通信到渲染层的。
如果代码里直接 document.querySelector('xxx')，
在小程序中会直接 crash。
```

### 6.2 项目中的 DOM 依赖风险点

| 模块 | 风险项 | 当前状态 | 处置 |
|------|--------|---------|------|
| game-core | Phaser 内部用 DOM | 不可避免 | 通过 polyfill 桥接 |
| game-core | 自己写的代码用 DOM | CI 护栏禁止 | ✅ 安全 |
| levels | 脚本用 DOM | CI 护栏禁止 | ✅ 安全 |
| platform-web | 直接用浏览器 API | 按设计如此 | 整个包替换，不影响 |
| web-app | Vue 操作 DOM | 按设计如此 | 整个包替换，不影响 |

### 6.3 CI 护栏的价值

```typescript
// tools/dep-checker.ts — 迁移前的安全网

// 这个脚本在 CI 中扫描 import 和全局变量引用
// 确保 game-core 和 levels 始终保持平台无关

const FORBIDDEN_GLOBALS = [
  'window', 'document', 'navigator', 'location',
  'localStorage', 'sessionStorage', 'indexedDB',
  'fetch', 'XMLHttpRequest', 'WebSocket',
  'Audio', 'Image',
  'alert', 'confirm', 'prompt',
]

// 如果某天有人在 ConditionEvaluator.ts 里偷偷写了 localStorage.getItem()
// CI 会立刻报错，不允许合并。
// 这条护栏从项目第一天就开始守护迁移可行性。
```

---

## 7. 迁移风险清单

### 7.1 高风险

| # | 风险 | 概率 | 影响 | 应对 |
|---|------|------|------|------|
| R1 | **Phaser polyfill 不完整**——某个 Phaser 内部模块用了没覆盖到的浏览器 API，导致运行时 crash | 高 | 致命 | 预研阶段（迁移启动后第 1 周）必须先跑通 Phaser 在小程序中初始化 + 渲染一个空 Scene。跑不通就启动 Plan B（自研轻量渲染层）。 |
| R2 | **Canvas 性能不足**——小程序 Canvas 2D 渲染性能比浏览器低，复杂关卡（粒子 confetti、多对象同时动画）掉帧 | 中 | 高 | 本游戏画面极简，瓶颈概率低。预研时在低端机（红米 Note）跑 benchmark。严重则裁剪粒子效果。 |
| R3 | **多点触控（pinch）兼容性差**——部分安卓机型小程序的多指触摸事件丢失/错位 | 中 | 中 | 第 15 关（双指缩放）在微信小程序中降级为滑动条 UI。只影响 1 关，不影响架构。 |
| R4 | **音频并发限制**——小程序同时播放音频上限 ~10，快速连点时音效叠加超限 | 中 | 中 | 音效复用实例（对象池），同一音效不叠加播放。TelemetryCollector 记录音频错误。 |

### 7.2 中风险

| # | 风险 | 概率 | 影响 | 应对 |
|---|------|------|------|------|
| R5 | **弹层层级问题**——Canvas 原生组件层级高于普通 view，通关/失败弹层被遮挡 | 高 | 中 | 弹层改为 Phaser Canvas 内绘制（方案 B），不用小程序原生组件叠加。 |
| R6 | **包体超限**——Phaser + 游戏资源超过 4MB 主包限制 | 中 | 中 | Phaser 按需 tree-shake 或用 phaser-core（体积减半）。素材分包。 |
| R7 | **微信审核不通过**——游戏内容被判定为"诱导点击" | 低 | 高 | 提前准备类目资质，游戏描述说明"这是解谜游戏不是广告"。假 UI 关卡（假广告、假 loading）可能需要加文字说明"这是游戏内容"。 |
| R8 | **wx.login 换 session 的时序问题**——用户打开就开始玩，但登录接口还没返回 | 中 | 低 | 游客模式先玩先存本地，登录成功后再同步。与 Web 版离线策略一致。 |

### 7.3 低风险

| # | 风险 | 概率 | 影响 | 应对 |
|---|------|------|------|------|
| R9 | **字体加载失败**——wx.loadFontFace 在部分机型失败 | 低 | 低 | fallback 到系统字体。手绘字体是锦上添花不是必须。 |
| R10 | **抖音小程序 API 差异**——部分 wx.* API 在 tt.* 没有对应 | 低 | 中 | 微信先行，抖音后跟。PlatformAdapter 隔离，不影响核心。 |

---

## 8. 迁移优先级建议

### 8.1 先微信，后抖音

```
理由：
  1. 微信小游戏生态最成熟，文档完善
  2. 社区有更多 Phaser 小程序适配经验
  3. 分享裂变能力最强（这个游戏靠传播）
  4. 搞定微信之后，抖音只需要替换 wx.* → tt.*，工作量 < 3 天
```

### 8.2 迁移时间线

```
前提：Web App 已上线运行，数据验证了核心玩法

Week 0（预研）：
  ├── 搞定 Phaser 在微信小程序中运行
  ├── 如果搞不定 → 评估 Plan B（自研渲染层）
  └── 产出：能在微信开发者工具中渲染一个空 Scene

Week 1~2（核心）：
  ├── 实现 WechatPlatformAdapter 全部子适配器
  ├── 搞定触摸事件映射
  ├── 让第 1~3 关能在微信小程序中玩过
  └── 产出：微信开发者工具中可以通关前 3 关

Week 3（UI 壳）：
  ├── 重写首页、游戏页、关卡选择页、设置页
  ├── 用 cover-view 或 Canvas 内绘制实现弹层
  └── 产出：完整的小程序页面流程

Week 4（打磨）：
  ├── 30 关全量测试
  ├── 接入微信登录、分享
  ├── 包体优化（分包、远程资源）
  ├── 真机测试（至少 5 款不同机型）
  └── 产出：可提审的完整小程序

Week 5：
  ├── 提交微信审核
  ├── 修复审核反馈
  └── 上线
```

### 8.3 迁移启动条件

```
不要过早迁移。满足以下全部条件后再启动：

  ✅ Web App 已上线至少 2 周
  ✅ 核心数据指标已验证（用户留存、单次游玩关卡数）
  ✅ 关卡内容已稳定（不再频繁大改关卡系统设计）
  ✅ CI 护栏一直保持绿色（game-core / levels 无平台依赖）
  ✅ 30 关内容可以稳定工作
```

---

## 9. 总结

```
迁移的本质是什么？

┌─────────────────────────────────────────────────────┐
│                                                       │
│  不变的：                                              │
│    关卡配置（levels）                                   │
│    游戏逻辑（game-core）                               │
│    后端服务（server）                                   │
│    → 这三个占了 64% 的代码量                            │
│                                                       │
│  变的：                                                │
│    UI 壳 → 从 Vue 3 改写为小程序页面                    │
│    平台层 → 从浏览器 API 改为 wx.* API                  │
│    渲染桥接 → Phaser polyfill                          │
│    → 这三个是 36% 的代码量，也是 100% 的迁移工作量       │
│                                                       │
│  最大的变数：                                           │
│    Phaser polyfill 能不能搞定                           │
│    → 搞定了迁移 5 周完成                                │
│    → 搞不定启动 Plan B，多花 1 周                       │
│                                                       │
└─────────────────────────────────────────────────────┘
```
