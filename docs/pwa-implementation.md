# PWA 实施方案 v1.0

> **核心目标**：让玩家在手机桌面看到一个游戏图标，点开后全屏启动、没有浏览器地址栏、
> 首屏 < 2 秒、断网也能玩已缓存的关卡。做到这几点，PWA 的任务就完成了。

---

## 1. Web App Manifest

### 1.1 完整 manifest.json

```jsonc
// packages/web-app/public/manifest.json
{
  "name": "别点错 — 无厘头反套路小游戏",
  "short_name": "别点错",
  "description": "一个让你用最简单的操作，体验最离谱通关方式的无厘头小游戏",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#FAFAFA",
  "background_color": "#FAFAFA",
  "lang": "zh-CN",
  "dir": "ltr",
  "categories": ["games", "entertainment"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/game-1.png",
      "sizes": "390x844",
      "type": "image/png",
      "form_factor": "narrow",
      "label": "游戏画面"
    }
  ]
}
```

### 1.2 关键字段说明

| 字段 | 值 | 为什么 |
|------|---|-------|
| `display` | `standalone` | 去掉浏览器 UI，接近原生 App |
| `orientation` | `portrait` | 竖屏锁定，游戏设计基于竖屏 |
| `start_url` | `/?source=pwa` | 带参数区分从 PWA 打开 vs 浏览器打开，方便埋点 |
| `theme_color` | `#FAFAFA` | 状态栏颜色与 App 背景融合 |
| `background_color` | `#FAFAFA` | 启动画面背景色，和首页背景一致 |
| `scope` | `/` | 限制 PWA 的导航范围 |
| `purpose: maskable` | 单独的图标 | Android 自适应图标需要专用 maskable 图 |

### 1.3 index.html 中的 meta 标签

```html
<!-- packages/web-app/index.html -->
<head>
  <meta charset="UTF-8" />
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />

  <!-- PWA 基础 -->
  <meta name="theme-color" content="#FAFAFA" />
  <link rel="manifest" href="/manifest.json" />

  <!-- iOS 专用 -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="别点错" />
  <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />

  <!-- 启动画面（iOS） -->
  <link rel="apple-touch-startup-image"
    href="/splash/splash-1170x2532.png"
    media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image"
    href="/splash/splash-1125x2436.png"
    media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image"
    href="/splash/splash-1284x2778.png"
    media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />

  <!-- 禁止浏览器翻译（游戏文案是玩法的一部分） -->
  <meta name="google" content="notranslate" />

  <!-- 禁止 iOS 自动检测电话号码 -->
  <meta name="format-detection" content="telephone=no" />
</head>
```

---

## 2. Service Worker 缓存策略

### 2.1 策略总览

```
请求类型                   策略                     原因
────────────────────────  ──────────────────────   ────────────────
App Shell (/, index.html)  Precache + SWR          首屏必须离线可用
JS/CSS bundle              Precache                构建产物带 hash，不变
游戏素材 (png/mp3)          Runtime Cache-First     素材不常变，离线可玩
字体 (woff2)               Runtime Cache-First     几乎不变
关卡配置 JSON              Runtime Network-First    可能热更新新关卡
API 请求 (/api/*)          Network-Only            实时数据不缓存
埋点请求 (/analytics/*)    Network-Only + BG Sync  离线时攒本地，联网后重发
```

### 2.2 详细策略配置

```typescript
// vite.config.ts 中 workbox 配置的逻辑映射

const CACHE_STRATEGIES = {
  // ── Precache：构建时确定，安装时缓存 ──
  precache: {
    what: 'Vite 构建产物（JS/CSS/HTML + 关键图标）',
    how: 'vite-plugin-pwa 的 globPatterns 自动收集',
    patterns: ['**/*.{js,css,html,ico,svg}'],
  },

  // ── Runtime Cache：运行时按需缓存 ──
  gameAssets: {
    what: '游戏素材（PNG 精灵图、音效 MP3）',
    strategy: 'CacheFirst',
    urlPattern: /\.(png|jpg|webp|mp3|ogg|woff2)$/,
    cacheName: 'game-assets-v1',
    maxEntries: 200,
    maxAgeSeconds: 30 * 24 * 3600, // 30 天
  },

  levelConfigs: {
    what: '关卡配置 JSON',
    strategy: 'NetworkFirst',
    urlPattern: /\/levels\/configs\/level-\d{3}\.json$/,
    cacheName: 'level-configs-v1',
    networkTimeoutSeconds: 3, // 3 秒超时 fallback 到缓存
    maxEntries: 200,
  },

  apiRequests: {
    what: '后端 API',
    strategy: 'NetworkOnly',
    urlPattern: /\/api\//,
  },

  analyticsRequests: {
    what: '埋点上报',
    strategy: 'NetworkOnly',
    urlPattern: /\/analytics\//,
    // 配合 Background Sync：离线时 queue，联网后重发
  },
}
```

### 2.3 Precache 与 Runtime Cache 清单

#### Precache（构建时确定）

```
✅ Precache（安装时缓存，保证离线首屏可用）
─────────────────────────────────
/index.html                       App 入口
/assets/*.js                      Vite 构建的 JS bundle（带 content hash）
/assets/*.css                     样式
/favicon.ico                      网站图标
/icons/*.png                      PWA 图标
/fonts/ZCOOLKuaiLe-Regular.woff2  手绘字体（只有一个）
```

#### Runtime Cache（运行时按需缓存）

```
⚡ Runtime CacheFirst（首次访问后缓存，后续从缓存读）
─────────────────────────────────
/game/btn-*.png                   按钮九宫格素材
/game/char-*.png                  角色精灵图
/game/obj-*.png                   关卡物件
/game/ui-*.png                    假 UI 素材
/audio/sfx-*.mp3                  音效
/audio/bgm-*.mp3                  背景音乐

🔄 Runtime NetworkFirst（优先网络，超时 fallback 缓存）
─────────────────────────────────
/levels/configs/level-*.json      关卡配置

🚫 不缓存
─────────────────────────────────
/api/*                            所有后端 API
/analytics/*                      埋点上报
```

---

## 3. 版本更新策略

### 3.1 选择 `prompt` 模式

```
为什么不用 autoUpdate：
  游戏正在玩的时候静默更新 + 自动刷新 = 玩家正在通关突然页面没了
  这是不可接受的。

为什么用 prompt：
  检测到新版本 → 弹一个不打扰的 toast →
  玩家在合适时机（比如回到首页时）手动刷新 →
  新版本激活。
```

### 3.2 更新检测流程

```
┌──────────────────────────────────────────────────┐
│                                                    │
│  用户打开 App                                      │
│       │                                            │
│       ▼                                            │
│  SW 注册 + 检查更新                                 │
│       │                                            │
│       ├── 无更新 → 正常使用                          │
│       │                                            │
│       └── 有更新 → onNeedRefresh() 回调触发          │
│              │                                     │
│              ▼                                     │
│  [不在关卡中？] ── 是 → 显示底部 toast               │
│       │              "发现新版本，点击更新"           │
│       │                     │                      │
│       │                     ▼                      │
│       │              玩家点击 → updateSW()           │
│       │              → 页面刷新，新版本生效            │
│       │                                            │
│       └── 否 → 设置标记 pendingUpdate = true         │
│              → 等玩家回到首页或通关后再提示            │
│                                                    │
└──────────────────────────────────────────────────┘
```

### 3.3 实现代码

```typescript
// packages/web-app/src/pwa/register-sw.ts

import { registerSW } from 'virtual:pwa-register'
import { ref } from 'vue'

export const needRefresh = ref(false)
export const offlineReady = ref(false)

let updateSWFn: (() => Promise<void>) | undefined

export function initPWA(): void {
  updateSWFn = registerSW({
    immediate: true,

    onNeedRefresh() {
      needRefresh.value = true
    },

    onOfflineReady() {
      offlineReady.value = true
    },

    onRegisteredSW(swUrl, registration) {
      // 每 60 分钟检查一次更新
      if (registration) {
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
      }
    },
  })
}

export async function applyUpdate(): Promise<void> {
  if (updateSWFn) {
    await updateSWFn()
  }
}
```

```vue
<!-- packages/web-app/src/components/ui/UpdateToast.vue -->

<template>
  <Transition name="slide-up">
    <div v-if="needRefresh && !isPlaying" class="update-toast">
      <span>发现新版本</span>
      <button @click="handleUpdate">立即更新</button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { needRefresh, applyUpdate } from '@/pwa/register-sw'
import { useGameStore } from '@/stores/useGameStore'
import { computed } from 'vue'

const gameStore = useGameStore()
const isPlaying = computed(() => gameStore.isInLevel)

async function handleUpdate() {
  await applyUpdate()
}
</script>

<style scoped>
.update-toast {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: 8px 12px 8px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-card);
  z-index: 9999;
  font-size: 14px;
}

.update-toast button {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateX(-50%) translateY(20px);
  opacity: 0;
}
</style>
```

---

## 4. 安装提示 UX

### 4.1 触发时机

```
不要在首次访问就弹安装提示（玩家还不知道这游戏好不好玩）。

触发条件：
  1. 通关第 5 关（玩家已产生粘性）
  2. 且未安装过 PWA
  3. 且本次会话未展示过安装提示
  4. 且不在关卡进行中

展示方式：
  在通关第 5 关的 PassOverlay 弹层中，
  "下一关"按钮下方增加一行小字 + 按钮：
  "添加到桌面，下次直接玩 [安装]"
```

### 4.2 安装提示实现

```typescript
// packages/web-app/src/composables/useInstallPrompt.ts

import { ref, onMounted } from 'vue'

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isInstalled = ref(false)
const hasShownPrompt = ref(false)

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {

  onMounted(() => {
    // 检测是否已安装
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled.value = true
      return
    }

    // 拦截安装提示事件
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt.value = e as BeforeInstallPromptEvent
    })

    // 检测安装完成
    window.addEventListener('appinstalled', () => {
      isInstalled.value = true
      deferredPrompt.value = null
    })
  })

  async function showInstallPrompt(): Promise<boolean> {
    if (!deferredPrompt.value) return false
    hasShownPrompt.value = true

    await deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice

    deferredPrompt.value = null
    return outcome === 'accepted'
  }

  function shouldShowInstall(passedLevelCount: number): boolean {
    return (
      passedLevelCount >= 5 &&
      !isInstalled.value &&
      !hasShownPrompt.value &&
      deferredPrompt.value !== null
    )
  }

  return {
    isInstalled,
    canInstall: deferredPrompt,
    shouldShowInstall,
    showInstallPrompt,
  }
}
```

### 4.3 iOS 专用安装引导

iOS Safari 不支持 `beforeinstallprompt`，需要手动引导：

```vue
<!-- packages/web-app/src/components/ui/IOSInstallGuide.vue -->

<template>
  <div v-if="showIOSGuide" class="ios-guide">
    <div class="ios-guide-content">
      <p>添加到主屏幕，下次直接玩：</p>
      <ol>
        <li>点击底部 <span class="icon-share">⬆</span> 分享按钮</li>
        <li>选择「添加到主屏幕」</li>
      </ol>
      <button @click="dismiss">知道了</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const dismissed = ref(false)

const isIOS = computed(() => {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
})

const isStandalone = computed(() =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true
)

const props = defineProps<{ passedLevelCount: number }>()

const showIOSGuide = computed(() =>
  isIOS.value &&
  !isStandalone.value &&
  props.passedLevelCount >= 5 &&
  !dismissed.value &&
  !localStorage.getItem('ios-install-dismissed')
)

function dismiss() {
  dismissed.value = true
  localStorage.setItem('ios-install-dismissed', '1')
}
</script>
```

---

## 5. iOS / Android 注意事项

### 5.1 iOS Safari 陷阱清单

| 问题 | 影响 | 解决方案 |
|------|------|---------|
| 不支持 `beforeinstallprompt` | 无法弹原生安装提示 | 自定义引导弹窗教用户手动添加 |
| standalone 模式下无"返回"手势 | 玩家可能出不去 | App 内实现所有导航，不依赖浏览器返回 |
| 音频需要用户手势触发 | 首次加载没声音 | 首页"开始游戏"按钮的 click 事件中调用 `AudioContext.resume()` |
| SW 缓存上限 ~50MB | 游戏资源超限会被清理 | 控制总缓存大小，按章节按需缓存 |
| `viewport-fit=cover` 需要 safe area | 刘海/灵动岛遮挡内容 | 使用 `env(safe-area-inset-*)` |
| WKWebView 内存限制 ~512MB | Phaser 大场景可能 OOM | 关卡切换时 `scene.destroy()` 释放 |
| 不支持 Background Sync API | 离线埋点无法后台重发 | 用 IndexedDB + 应用恢复时手动重发 |
| `prefers-color-scheme` 不跟随系统 | standalone 模式始终浅色 | `theme_color` 固定浅色，不做暗色模式 |

### 5.2 Android Chrome 注意事项

| 问题 | 影响 | 解决方案 |
|------|------|---------|
| `maskable` 图标被裁切 | 图标边缘被切掉 | 核心内容控制在安全区（圆形，内切于 512×512） |
| TWA (Trusted Web Activity) | 可发布到 Google Play | 暂不考虑，后续可用 `bubblewrap` 打包 |
| `display-override: ["window-controls-overlay"]` | 自定义标题栏 | 本项目不需要，保持默认 |
| 系统返回键 | 退出 PWA | 监听 `popstate`，在首页时提示"再按一次退出" |
| 安装后图标延迟出现 | 用户找不到 | 提示"已添加到桌面，请在桌面查找" |

### 5.3 跨平台通用注意事项

```
1. HTTPS 是必须的
   SW 注册要求 HTTPS（localhost 除外）

2. sw.js 不要被 CDN 长缓存
   部署时确保 sw.js 的 Cache-Control: no-cache
   否则浏览器检测不到新版本

3. 不要缓存 index.html 超过 1 天
   SWR 策略会先返回缓存版本，后台拉新的
   但如果 CDN 把 HTML 缓存 7 天，SW 更新检测就废了

4. 首屏白屏时间
   Precache 只在安装时生效，首次访问仍需网络
   用 Vite 的 chunk splitting 保证首屏 JS ≤ 150KB
```

---

## 6. Phaser 资源加载协同

### 6.1 问题

Phaser 有自己的资源加载系统（`this.load.image()` / `this.load.audio()`），
它不知道 Service Worker 的存在，也不走 SW 的缓存策略——
但实际上 Phaser 的 `load` 底层就是 `fetch` / `XMLHttpRequest`，
SW 会自动拦截这些请求。

所以**不需要特殊处理**，只需要：

```
1. Phaser 的 PreloadScene 正常用 this.load.image/audio
2. SW 的 runtime cache 规则匹配这些 URL
3. 二者自动协同

Phaser 请求素材 → 浏览器发 fetch → SW 拦截 →
  ├── 缓存中有 → 直接返回（CacheFirst）
  └── 缓存中无 → 网络请求 → 缓存一份 → 返回
```

### 6.2 PreloadScene 配合 SW 的设计

```typescript
// packages/game-core/src/scenes/PreloadScene.ts

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload(): void {
    // 通用素材 — 这些 URL 会被 SW 的 CacheFirst 策略缓存
    this.load.image('btn_green', '/game/btn-green.png')
    this.load.image('btn_red', '/game/btn-red.png')
    this.load.image('btn_blue', '/game/btn-blue.png')

    this.load.audio('sfx_click', '/audio/sfx-click.mp3')
    this.load.audio('sfx_pass', '/audio/sfx-pass-1.mp3')
    this.load.audio('sfx_fail', '/audio/sfx-fail-1.mp3')

    // 进度条
    this.createProgressBar()
  }

  create(): void {
    this.scene.start('LevelScene')
  }

  private createProgressBar(): void {
    const { width, height } = this.scale
    const bar = this.add.graphics()
    const box = this.add.graphics()

    box.fillStyle(0xe5e7eb, 1)
    box.fillRoundedRect(width / 2 - 120, height / 2 - 8, 240, 16, 8)

    this.load.on('progress', (value: number) => {
      bar.clear()
      bar.fillStyle(0x3b82f6, 1)
      bar.fillRoundedRect(width / 2 - 118, height / 2 - 6, 236 * value, 12, 6)
    })

    this.load.on('complete', () => {
      bar.destroy()
      box.destroy()
    })
  }
}
```

### 6.3 关卡素材懒加载

```typescript
// packages/game-core/src/engine/LevelAssetLoader.ts

/**
 * 关卡切换时按需加载该关卡的专属素材。
 * 这些素材的 URL 在 LevelConfig.preloadAssets 中声明。
 * SW 会缓存它们，下次进入该关卡时秒加载。
 */
export class LevelAssetLoader {
  constructor(private scene: Phaser.Scene) {}

  async loadLevelAssets(assetKeys: string[]): Promise<void> {
    if (assetKeys.length === 0) return

    return new Promise((resolve) => {
      let hasNew = false
      for (const key of assetKeys) {
        if (this.scene.textures.exists(key)) continue
        hasNew = true
        const url = this.resolveAssetUrl(key)
        if (key.startsWith('sfx_') || key.startsWith('bgm_')) {
          this.scene.load.audio(key, url)
        } else {
          this.scene.load.image(key, url)
        }
      }

      if (!hasNew) {
        resolve()
        return
      }

      this.scene.load.once('complete', () => resolve())
      this.scene.load.start()
    })
  }

  private resolveAssetUrl(key: string): string {
    const filename = key.replace(/_/g, '-')
    if (key.startsWith('sfx_') || key.startsWith('bgm_')) {
      return `/audio/${filename}.mp3`
    }
    return `/game/${filename}.png`
  }
}
```

### 6.4 缓存大小控制

```
问题：30 关素材 + 音效可能占 15~30MB，
     100+ 关可能超 iOS 的 50MB 限制。

策略：按章节管理缓存

1. 当前章节 + 下一章节：保持缓存
2. 更早的章节：允许被 SW 的 maxEntries 淘汰
3. 玩家重新进入旧章节时，SW 会自动重新缓存

workbox 配置：
  maxEntries: 200           → 最多缓存 200 个素材文件
  maxAgeSeconds: 30 天       → 超过 30 天自动清理
  purgeOnQuotaError: true   → 存储满了自动清理旧缓存
```

---

## 7. Vite 落地配置

### 7.1 完整 vite.config.ts

```typescript
// packages/web-app/vite.config.ts

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [
    vue(),

    VitePWA({
      // ── 注册模式 ──
      registerType: 'prompt',

      // ── 额外纳入 precache 的静态资源 ──
      includeAssets: [
        'favicon.ico',
        'icons/*.png',
        'fonts/*.woff2',
      ],

      // ── Manifest ──
      manifest: {
        name: '别点错 — 无厘头反套路小游戏',
        short_name: '别点错',
        description: '一个让你用最简单的操作，体验最离谱通关方式的无厘头小游戏',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#FAFAFA',
        background_color: '#FAFAFA',
        lang: 'zh-CN',
        categories: ['games', 'entertainment'],
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      // ── Workbox 配置 ──
      workbox: {
        // Precache：Vite 构建产物
        globPatterns: [
          '**/*.{js,css,html,ico,svg,woff2}',
        ],

        // 不要 precache 游戏素材（太大，runtime cache 更合适）
        globIgnores: [
          'game/**',
          'audio/**',
          'levels/**',
        ],

        // 清理旧版本缓存
        cleanupOutdatedCaches: true,

        // 客户端声明控制权
        clientsClaim: true,

        // Runtime caching 规则
        runtimeCaching: [
          // 游戏素材：CacheFirst
          {
            urlPattern: /\.(png|jpg|webp|mp3|ogg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-assets-v1',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 3600,
                purgeOnQuotaError: true,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // 字体：CacheFirst
          {
            urlPattern: /\.woff2$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-v1',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 3600,
              },
            },
          },

          // 关卡配置 JSON：NetworkFirst（3秒超时 fallback 缓存）
          {
            urlPattern: /\/levels\/configs\/level-\d{3}\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'level-configs-v1',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 200,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },

          // API 请求：NetworkOnly
          {
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          },

          // 埋点请求：NetworkOnly
          {
            urlPattern: /\/analytics\//,
            handler: 'NetworkOnly',
          },
        ],
      },

      // ── 开发模式 ──
      devOptions: {
        enabled: false, // 开发时默认关闭，需要调试 PWA 时手动开启
      },
    }),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          vue: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
})
```

### 7.2 TypeScript 类型声明

```typescript
// packages/web-app/src/env.d.ts

/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />
```

### 7.3 App.vue 中初始化

```vue
<!-- packages/web-app/src/App.vue -->

<template>
  <RouterView />
  <UpdateToast />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { initPWA } from '@/pwa/register-sw'
import UpdateToast from '@/components/ui/UpdateToast.vue'

onMounted(() => {
  initPWA()
})
</script>
```

---

## 8. 图标生产流程

### 8.1 需要的图标尺寸

```
必须：
  icons/icon-192x192.png          Android 标准
  icons/icon-512x512.png          Android 启动画面
  icons/icon-maskable-192x192.png Android 自适应
  icons/icon-maskable-512x512.png Android 自适应
  icons/icon-180x180.png          iOS apple-touch-icon
  favicon.ico                     浏览器标签

可选但推荐：
  icons/icon-72x72.png
  icons/icon-96x96.png
  icons/icon-128x128.png
  icons/icon-144x144.png
  icons/icon-152x152.png
  icons/icon-384x384.png
```

### 8.2 生成方式

```bash
# 方案 1：使用 pwa-asset-generator（推荐）
npx pwa-asset-generator ./src/assets/logo.svg ./public/icons \
  --background "#FAFAFA" \
  --padding "20%" \
  --type png \
  --manifest ./public/manifest.json

# 方案 2：使用 sharp-cli 从 512x512 批量缩放
for size in 72 96 128 144 152 180 192 384 512; do
  npx sharp -i logo-512.png -o "icon-${size}x${size}.png" \
    resize $size $size
done

# maskable 图标需要在安全区内（中心 80%），周围留白
# 用 https://maskable.app/editor 在线生成
```

---

## 9. 验收清单

```
上线前 PWA 检查清单：

[ ] manifest.json 字段完整，Chrome DevTools → Application 显示绿色
[ ] SW 注册成功，DevTools → Application → Service Workers 显示 activated
[ ] 断网后刷新页面，App 仍能加载首页
[ ] 断网后能玩已缓存的关卡
[ ] Android Chrome 弹出"添加到主屏幕"原生提示
[ ] 安装后桌面图标正确显示
[ ] 从桌面图标打开无浏览器地址栏（standalone 模式）
[ ] iOS Safari"添加到主屏幕"后图标和名称正确
[ ] iOS standalone 模式下状态栏颜色与 App 融合
[ ] Lighthouse PWA 评分 ≥ 90
[ ] 部署新版本后，旧版本用户看到更新 toast
[ ] 点击"立即更新"后页面刷新，新版本生效
[ ] sw.js 的 HTTP 响应头包含 Cache-Control: no-cache
[ ] 总缓存大小 < 40MB（留 margin 给 iOS 50MB 限制）
```
