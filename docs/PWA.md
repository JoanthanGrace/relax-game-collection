# PWA 接入文档

## 新增文件一览

| 文件 | 用途 |
|------|------|
| `apps/web-app/public/icon-192.svg` | PWA 图标 192x192 |
| `apps/web-app/public/icon-512.svg` | PWA 图标 512x512 |
| `apps/web-app/public/apple-touch-icon.svg` | iOS 桌面图标 |
| `apps/web-app/env.d.ts` | TS 类型声明（PWA virtual module） |
| `apps/web-app/src/pwa.ts` | SW 注册 + 版本更新提示逻辑 |

## 修改文件

| 文件 | 变更 |
|------|------|
| `apps/web-app/vite.config.ts` | 集成 `vite-plugin-pwa` 及缓存策略 |
| `apps/web-app/index.html` | 添加 PWA meta 标签、apple-touch-icon |
| `apps/web-app/src/main.ts` | 引入 `initPWA()` |
| `apps/web-app/package.json` | 新增 `vite-plugin-pwa` 依赖 |

---

## 安装方式（添加到桌面）

### Android (Chrome)
1. 访问站点
2. 浏览器会自动弹出「添加到主屏幕」横幅
3. 或手动：Chrome 菜单 → 「添加到主屏幕」

### iOS (Safari)
1. 在 Safari 中访问站点
2. 点击底部分享按钮（方框+箭头）
3. 选择「添加到主屏幕」
4. 确认名称后点击「添加」

### Desktop (Chrome/Edge)
- 地址栏右侧会出现安装图标，点击即可安装

---

## 缓存策略

### Precache（预缓存）

构建时自动收集并缓存以下静态资源：

```
**/*.{js,css,html,svg,png,woff2}
```

这意味着 Phaser 引擎代码、Vue 组件、CSS 样式、图标字体等**首次加载后即可离线访问**。

关卡配置（JSON）由于通过 `import` 静态引入并被 Vite 打包进 JS bundle，**会被 precache 自动覆盖**，无需额外配置。

### Runtime Cache（运行时缓存）

| 策略 | 匹配规则 | 说明 |
|------|----------|------|
| **CacheFirst** | `/assets/**.(js\|css\|svg\|png\|woff2)` | 静态构建产物，hash 变化即为新版本 |
| **CacheFirst** | `*.(mp3\|ogg\|wav\|webm)` | 音频资源，不频繁变化 |
| **NetworkOnly** | `/api/**` | API 请求不缓存 |
| **NetworkOnly** | `/(analytics\|track\|collect\|log)` | 埋点请求不缓存 |

### 不缓存的内容

- `/api/` 开头的所有请求
- 埋点/分析相关请求（analytics, track, collect, log）
- 如果未来关卡配置改为远程加载，需要在 `runtimeCaching` 中对应路径设置 `NetworkFirst` 或 `NetworkOnly`

---

## 更新策略

采用 **prompt** 模式（非自动刷新），流程如下：

1. 用户打开应用 → SW 在后台检查更新
2. 每小时轮询一次 `registration.update()`
3. 发现新版本 → 弹出 `confirm` 对话框提示用户
4. 用户确认 → 新 SW 激活，页面自动刷新
5. 用户拒绝 → 继续使用旧版本，下次访问再提示

### 为什么选 prompt 而非 autoUpdate

- 游戏场景下自动刷新可能打断正在进行的关卡
- prompt 让用户自主决定更新时机
- 配合 `skipWaiting` 由用户触发，避免 SW 争抢

---

## iOS 限制与注意事项

| 限制 | 说明 |
|------|------|
| **无后台 SW 更新** | iOS Safari 不支持后台 sync/push，SW 更新仅在用户打开应用时触发 |
| **50MB 缓存上限** | iOS WebKit 对每个 origin 的 Cache Storage 限制约 50MB |
| **无安装横幅** | iOS 不会自动弹出安装提示，需要用户手动从 Safari 分享菜单添加 |
| **独立进程** | PWA 在 iOS 上运行在独立 WebKit 进程，不与 Safari 共享登录状态 |
| **全屏音频** | 需用户首次交互后才能播放音频（Phaser 已内置处理） |
| **apple-touch-icon** | 必须通过 `<link rel="apple-touch-icon">` 提供图标，manifest icons 在 iOS 上不生效 |
| **status-bar-style** | 使用 `black-translucent` 实现沉浸式全屏体验 |

### iOS 最佳实践

- `viewport-fit=cover` 已添加，确保安全区域适配
- `apple-mobile-web-app-capable=yes` 启用全屏模式
- 图标使用 SVG 格式，iOS 15+ 支持良好；如需兼容更旧版本可补充 PNG

---

## Phaser 资源加载兼容性

Phaser 通过 `<script>` 引入后被 Vite 打包为 JS chunk，属于 precache 范围，离线可用。

运行时 Phaser 如果通过 `this.load.image()` 等方式加载图片/音频：
- 已打包的资源（import 引入）→ 自动被 precache
- 远程 CDN 资源 → 需要额外配置 runtime cache 规则
- 当前项目所有关卡资源均为编译时静态引入，无额外配置需求

---

## 本地验证 PWA

```bash
# 构建生产版本
pnpm build

# 本地预览
cd apps/web-app && pnpm preview

# 打开 Chrome DevTools → Application → Service Workers 查看状态
# Lighthouse → PWA 审计
```
