# 《别点错》6 周开发计划 v1.0

> **前置假设**
> - 1 名全栈开发者，每天有效编码 6~8 小时
> - 全程使用 AI 辅助（Cursor + Claude），代码产出效率按 1.5~2x 估算
> - 不含美术外包周期（首版用极简 UI 风，开发者自行搞定）
> - 第 6 周末上线，不是"完美上线"而是"能跑、能玩、能收数据"

---

## 一、6 周总览

```
Week 1  ██████████  脚手架 + 引擎骨架
Week 2  ██████████  关卡系统跑通 + 前 10 关
Week 3  ██████████  Vue 应用壳 + 第 11~20 关
Week 4  ██████████  第 21~30 关 + 音效 + 本地存档 + PWA
Week 5  ██████████  后端最小闭环 + 埋点 + 部署管线
Week 6  ██████████  测试 + 修 bug + 上线
```

---

## 二、每周详细计划

### Week 1：脚手架 + 引擎骨架

> **目标**：从零到一把 monorepo 跑起来，Phaser 能在浏览器里渲染一个空白关卡。

#### 交付物

| # | 任务 | 产出 | 估时 |
|---|------|------|------|
| 1.1 | 初始化 monorepo | pnpm workspace + turbo + tsconfig + eslint + prettier + husky | 3h |
| 1.2 | `@nicetap/shared` 包 | 全部 TypeScript 类型定义（LevelConfig, Condition, InteractionConfig 等） | 4h |
| 1.3 | `@nicetap/game-core` 骨架 | GameEngine + LevelScene + PreloadScene 空壳，能跑一个 Phaser.Game 实例 | 6h |
| 1.4 | InteractionSystem 实现 | click + multi-click + long-press + drag 四种核心交互 | 8h |
| 1.5 | ConditionEvaluator 实现 | event-fired + event-count + no-action + composite 四种条件 | 4h |
| 1.6 | `@nicetap/web-app` 骨架 | Vue 3 + Vite + Router，GamePage 能挂载 Phaser canvas | 4h |
| 1.7 | 第 1 关能玩 | 手写 level-001.json，点按钮通关，弹出"过关了" | 3h |

**合计：~32h（4 个工作日）**

#### 里程碑验收标准
```
✅ pnpm dev 启动后浏览器能看到游戏画面
✅ 点击"通关"按钮 → 控制台输出 "win"
✅ pnpm turbo build 全包构建成功
✅ pnpm turbo typecheck 无报错
```

#### 先用假数据的部分
- 关卡配置直接 import JSON，不走网络请求
- 通关/失败反馈用 `console.log`，不用正式弹层
- 没有音效、没有动画、没有 i18n

---

### Week 2：关卡系统跑通 + 前 10 关

> **目标**：关卡引擎功能完整，能支撑 PRD 前 10 关的所有玩法类型。这周结束后"加关"只需写 JSON。

#### 交付物

| # | 任务 | 产出 | 估时 |
|---|------|------|------|
| 2.1 | 补齐 InteractionSystem | swipe + wait + pinch + toggle | 6h |
| 2.2 | 补齐 ConditionEvaluator | object-state + timer-expired + sequence | 3h |
| 2.3 | BehaviorRegistry + 内置行为 | run-away, countdown, shake, pulse-scale | 6h |
| 2.4 | FeedbackSystem | 通关/失败视觉反馈（confetti/shake），简单版 | 4h |
| 2.5 | LevelContextImpl | 实现 LevelContext 全部方法，串联 InteractionSystem + ConditionEvaluator | 6h |
| 2.6 | 关卡 1~10 JSON 配置 | 10 个 JSON 文件 + 第 9 关 script | 6h |
| 2.7 | LevelValidator | 校验器基础版：必填检查 + objectId 去重 + 事件可达性 | 4h |
| 2.8 | 单元测试 | ConditionEvaluator + InteractionSystem 核心逻辑测试 | 3h |

**合计：~38h（5 个工作日）**

#### 里程碑验收标准
```
✅ 浏览器中可以连续玩通第 1~10 关
✅ 每种交互类型至少有一关使用
✅ 第 9 关（假失败）custom script 正常工作
✅ pnpm --filter @nicetap/level-validator validate 全部通过
✅ vitest 单元测试 ≥ 20 个 case，全绿
```

#### 先用假数据的部分
- 通关/失败文案硬编码中文，不走 i18n
- 关卡切换用 `console.log("load next")` + 手动刷新
- 没有进度存档，刷新回第 1 关
- 没有关卡选择页

---

### Week 3：Vue 应用壳 + 第 11~20 关

> **目标**：从"能跑的 demo"变成"有完整 UI 的 App"。玩家可以从首页开始，一路玩到第 20 关，带页面转场。

#### 交付物

| # | 任务 | 产出 | 估时 |
|---|------|------|------|
| 3.1 | 首页 (HomePage) | 开始游戏 / 继续游戏 / 设置入口 | 4h |
| 3.2 | 游戏页 (GamePage) | PhaserContainer + 关卡信息栏 + 暂停按钮 | 3h |
| 3.3 | 通关弹层 (PassOverlay) | 搞笑评语 + 下一关按钮，Vue DOM 层覆盖 | 3h |
| 3.4 | 失败弹层 (FailOverlay) | 吐槽文案 + 重试按钮 + 提示入口 | 3h |
| 3.5 | 设置页 (SettingsPage) | 音效开关 + 清除进度 + 关于 | 2h |
| 3.6 | Vue ↔ Phaser EventBus | mitt 双向通信：level-pass / level-fail / load-level / retry | 3h |
| 3.7 | Pinia stores | useGameStore（当前关、进度）+ useSettingsStore（音效开关） | 3h |
| 3.8 | 本地存档 v1 | localStorage 存进度（哪些关已通过），刷新不丢 | 2h |
| 3.9 | i18n 基础接入 | vue-i18n + zh-CN 语言包，所有硬编码文案替换 | 4h |
| 3.10 | 第 11~20 关 JSON | 10 个关卡配置 | 5h |
| 3.11 | 基础 UI 美化 | 极简风格：白底 + 黑线 + 高饱和按钮，统一字体 | 4h |

**合计：~36h（~5 个工作日）**

#### 里程碑验收标准
```
✅ 首页 → 点"开始" → 第1关 → 一路玩到第 20 关
✅ 通关/失败有正式弹层（不是 console.log）
✅ 刷新页面后可以"继续游戏"（从上次通过的关卡开始）
✅ 设置页音效开关可切换（实际音效下周接）
✅ 所有文案走 i18n key
```

#### 先用假数据的部分
- 音效开关 UI 存在但没有真实音频
- 关卡选择页不做（从"继续游戏"入口进入下一关即可）
- 后端不存在，全部本地存储
- 埋点不存在

---

### Week 4：第 21~30 关 + 音效 + PWA

> **目标**：内容齐全（30 关），有声音，能离线玩。这周结束后产品层面已经可以给人试玩。

#### 交付物

| # | 任务 | 产出 | 估时 |
|---|------|------|------|
| 4.1 | 第 21~30 关 JSON | 10 个关卡配置（可能需要 1~2 个新 behavior） | 8h |
| 4.2 | `@nicetap/platform-web` | WebAudioAdapter + WebStorageAdapter + WebVibrationAdapter | 4h |
| 4.3 | 音效接入 | 点击音、通关音、失败音、BGM，用免费音效素材 | 4h |
| 4.4 | HintSystem 接入 | 失败 N 次后弹提示，弱提示 → 强提示递进 | 3h |
| 4.5 | 提示弹层 (HintOverlay) | Vue 层展示提示文案 + 对象高亮 | 2h |
| 4.6 | PWA 配置 | vite-plugin-pwa + manifest.json + icons + SW 注册 | 3h |
| 4.7 | 离线缓存策略 | App Shell: SWR；资源: Cache-First；配置: Network-First fallback | 3h |
| 4.8 | 安装引导 | 通关第 5 关后弹出"添加到主屏幕"引导 | 2h |
| 4.9 | 关卡选择页 | 网格展示 30 关，锁定/已通过/当前状态 | 4h |
| 4.10 | 动效打磨 | 入场动画、按钮弹性、通关 confetti、失败 shake | 3h |

**合计：~36h（~5 个工作日）**

#### 里程碑验收标准
```
✅ 30 关全部可玩通
✅ 有音效（点击、通关、失败各至少 1 种）
✅ 关卡选择页可见 30 关解锁状态
✅ Chrome DevTools → Application → Service Worker 显示已激活
✅ 断网后刷新，游戏仍能加载并玩已缓存的关卡
✅ 移动端浏览器中可安装为 PWA（出现"添加到主屏幕"）
```

#### 先用假数据的部分
- 存档仍然纯本地（后端下周接）
- 埋点仍然不存在（下周接）
- 提示文案先写中文占位

---

### Week 5：后端最小闭环 + 埋点 + 部署

> **目标**：从纯前端项目变成完整 Web 服务。能部署到公网，能收集数据。

#### 交付物

| # | 任务 | 产出 | 估时 |
|---|------|------|------|
| 5.1 | `@nicetap/server` 初始化 | NestJS + TypeORM + PostgreSQL 基础结构 | 3h |
| 5.2 | Auth 模块 | 游客登录（生成 JWT token，设备指纹做唯一标识） | 3h |
| 5.3 | Progress 模块 | GET /progress + POST /progress/sync（批量同步） | 4h |
| 5.4 | Analytics 模块 | POST /analytics/batch（批量接收埋点事件，落库） | 3h |
| 5.5 | 前端对接后端 | useUserStore 接入登录、useProgress 接入同步、TelemetryCollector 接入上报 | 5h |
| 5.6 | 离线-在线同步 | 离线时攒本地，联网时批量上报进度 + 埋点 | 3h |
| 5.7 | 前端埋点打点 | 按 telemetry 设计打 12 个关键事件 | 3h |
| 5.8 | Docker 化 | server Dockerfile + docker-compose (server + postgres) | 2h |
| 5.9 | CI pipeline | GitHub Actions: lint + typecheck + test + build + level-validate | 3h |
| 5.10 | 部署 | 前端 → Vercel/Cloudflare Pages；后端 → 云服务器 Docker | 4h |
| 5.11 | 域名 + HTTPS | 买域名 + 配证书 + 配 CDN | 2h |

**合计：~35h（~5 个工作日）**

#### 里程碑验收标准
```
✅ https://nicetap.app（或其他域名）可以公网访问
✅ 新设备打开 → 自动生成游客账号 → 玩几关 → 刷新后进度仍在
✅ 清浏览器缓存后进度仍可从服务端恢复
✅ 后端数据库中能看到用户进度和埋点事件数据
✅ GitHub push → CI 自动运行 → 全绿
✅ push to main → 自动部署
```

#### 假数据替换为真实数据
- 本周把 Week 3~4 的 localStorage 存档升级为"本地 + 服务端双写"
- 埋点从 `console.log` 替换为真实 HTTP 上报
- 游客登录替代之前的无身份模式

---

### Week 6：测试 + 修 bug + 上线

> **目标**：稳定性打磨。确保 30 关每一关都能正常玩过，不白屏、不卡死。月底前上线。

#### 交付物

| # | 任务 | 产出 | 估时 |
|---|------|------|------|
| 6.1 | 全量关卡人工测试 | 30 关逐一手动测试（手机 + PC），记录 bug list | 4h |
| 6.2 | 修 bug | 修复手工测试发现的问题 | 8h |
| 6.3 | E2E 测试 | Playwright：首页→开始→通关前5关→刷新恢复进度 | 4h |
| 6.4 | 关卡校验 CI | level-validator 加入 CI pipeline，所有 JSON 自动校验 | 1h |
| 6.5 | 移动端适配 | 不同机型/尺寸测试 + 修复布局问题 | 4h |
| 6.6 | 性能检查 | Lighthouse 跑分，修复明显性能问题 | 3h |
| 6.7 | 错误监控 | 接入 Sentry（前端 + 后端），配置告警 | 2h |
| 6.8 | 最终部署 + 域名切换 | 正式环境部署 + DNS 生效 | 2h |
| 6.9 | 上线公告准备 | 生成分享图 + 二维码 + 简单落地页 | 2h |

**合计：~30h（4 个工作日，留 1 天 buffer）**

#### 里程碑验收标准（= 上线门槛）
```
✅ 30 关全部可通关，零阻断 bug
✅ iPhone Safari + Android Chrome + 桌面 Chrome 三端正常
✅ Lighthouse Performance ≥ 70，PWA 评分 ≥ 90
✅ E2E 测试全绿
✅ Sentry 已激活，错误会告警
✅ 后端无 500 错误（压测 100 QPS 不崩）
```

---

## 三、必做 / 可延期 矩阵

### 必做（上线前）

| 功能 | 所属周 | 理由 |
|------|--------|------|
| Monorepo + 类型系统 | W1 | 地基 |
| InteractionSystem（8 种交互） | W1~W2 | 没有交互就没有游戏 |
| ConditionEvaluator | W1~W2 | 没有条件就不能通关 |
| 30 关完整配置 | W2~W4 | 产品核心内容 |
| Vue 应用壳（首页/游戏页/弹层） | W3 | 不是 demo，是产品 |
| 本地存档 | W3 | 刷新丢进度 = 用户流失 |
| 音效 | W4 | 体验关键，无声游戏没灵魂 |
| PWA 基础配置 | W4 | 移动端留存依赖 |
| 后端游客登录 + 进度同步 | W5 | 换设备不丢数据 |
| 基础埋点（12 个事件） | W5 | 无数据 = 瞎迭代 |
| CI/CD + 自动部署 | W5 | 手动部署不可持续 |
| 全量手测 + 修 bug | W6 | 质量底线 |

### 可延期（上线后 2 周内补）

| 功能 | 原计划周 | 延期理由 |
|------|----------|---------|
| 关卡选择页网格视图 | W4 | 首版用"继续游戏"就够了，线性流程 |
| 提示系统 | W4 | 首版 30 关难度低，卡关概率小 |
| i18n 多语言 | W3 | 首发只做中文 |
| E2E Playwright 测试 | W6 | 人工测试覆盖首发，E2E 可后补 |
| 安装引导弹窗 | W4 | 浏览器自带安装提示够用 |
| LevelValidator 高级校验 | W2 | 只做必填 + objectId 去重，其余后补 |
| 错误监控 Sentry | W6 | 首周用户量小，可先看日志 |

### 砍掉（首版不做）

| 功能 | 砍掉理由 |
|------|---------|
| 分享指定关卡 | 社交功能 v0.2 |
| 排行榜 | v0.2 |
| 每日挑战 | v0.2 |
| 皮肤 / 主题 | v0.3 |
| 用户自创关卡 | v0.3 |
| 微信小程序适配 | v0.4 |
| 关卡热更新 CDN | 首发 30 关内置就够 |
| Redis 缓存 | 首发用户量 PostgreSQL 裸扛 |

---

## 四、风险清单

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|---------|
| **Phaser 学习曲线** | 中 | 高 | W1 前先花半天跑 Phaser 官方 example，确认拖拽/多点触控 API 可用 |
| **双指缩放在移动端 Safari 触发页面缩放** | 高 | 中 | 用 `touch-action: none` + `user-scalable=no` + Phaser input 接管，W2 就验证 |
| **关卡设计灵感枯竭** | 中 | 高 | PRD 已有 20 关设计方向，第 21~30 关用 AI 辅助生成创意，按模板批量出关 |
| **PWA Service Worker 缓存更新坑** | 中 | 中 | 用 vite-plugin-pwa 的 `prompt` 模式，不用 `autoUpdate`，更新后提示用户刷新 |
| **单人开发进度失控** | 中 | 高 | 严格按周验收，每周五自查。第 4 周末如果关卡没做完 30 关，W5 砍后端砍到 20 关先上线 |
| **后端部署环境问题** | 低 | 中 | W5 初就部署，不要 W6 才搞。Docker 化减少环境差异 |
| **关卡 JSON 配错导致白屏** | 中 | 中 | LevelValidator 在 CI 中拦截，游戏运行时加 try-catch 降级到上一关 |

### 最大风险的应急预案

```
如果第 5 周末仍然没完成后端对接：
→ 砍掉服务端进度同步
→ 纯前端 + localStorage 上线
→ 埋点改用第三方 SaaS（友盟/Google Analytics）
→ 上线后第 1 周补后端

这样上线时间不变，只是存档不跨设备。
可接受：首版目标是验证玩法，不是验证多端同步。
```

---

## 五、首发上线门槛（Go / No-Go Checklist）

```
    功能完整性
    ──────────
    [必须] 30 关全部可正常通关
    [必须] 首页 → 开始 → 玩 → 通关 → 下一关 流程完整
    [必须] 刷新页面后进度不丢失
    [必须] 有音效（可以只有 3 种：点击/通关/失败）
    [应该] 有进度同步到服务端

    质量
    ────
    [必须] iPhone Safari 14+ 正常
    [必须] Android Chrome 90+ 正常
    [必须] 桌面 Chrome / Edge 正常
    [必须] 无阻断 bug（白屏、卡死、关卡不可通关）
    [应该] Lighthouse Performance ≥ 70

    运维
    ────
    [必须] 有公网可访问的域名 + HTTPS
    [必须] CI 自动构建 + 自动部署
    [应该] 有错误监控（Sentry 或至少有服务端日志）
    [应该] 有基础埋点数据

    标记：
    [必须] = 不满足就不上线
    [应该] = 尽量满足，不满足不阻塞上线
```

---

## 六、上线后两周迭代节奏

### 上线后第 1 周：数据 + 修 bug

| 日 | 任务 |
|----|------|
| 周一 | 看数据：哪关流失最高、哪关重试最多、平均玩几关 |
| 周二 | 修线上 bug（Sentry 告警 + 用户反馈） |
| 周三 | 补上线时延期的功能：关卡选择页、提示系统 |
| 周四 | 补提示系统 + 对流失高的关卡加提示 |
| 周五 | 补 E2E 测试 + 完善 CI |

### 上线后第 2 周：内容 + 小迭代

| 日 | 任务 |
|----|------|
| 周一 | 根据数据分析，设计第 31~40 关（重点：流失高的类型少做，留存好的类型多做） |
| 周二~三 | 编写第 31~40 关 JSON 配置 + 测试 |
| 周四 | 加分享功能（Web Share API，分享某一关） |
| 周五 | 发版 v0.2：40 关 + 分享 + 提示 |

### 后续节奏固化

```
每两周一个小版本：
- 新增 10 关（纯配置，2 天）
- 1~2 个功能迭代（根据数据决定做什么）
- bug 修复
- 依据数据调整关卡难度曲线

每月一个大版本：
- v0.3：50 关 + 每日挑战
- v0.4：70 关 + 排行榜
- v0.5：100 关 + 章节包 + 考虑小程序
```

---

## 七、假数据清单 & 替换时间表

| 假数据 | 引入时间 | 替换时间 | 替换方式 |
|--------|---------|---------|---------|
| 关卡配置直接 import JSON | W1 | W4 | 改为 LevelLoader 统一加载，支持本地/网络 |
| 通关/失败用 console.log | W1 | W3 | Vue PassOverlay / FailOverlay 弹层 |
| 进度存 localStorage | W3 | W5 | 本地 + 服务端双写（本地作为缓存保留） |
| 埋点 console.log | W3 | W5 | TelemetryCollector → POST /analytics/batch |
| 用户身份不存在 | W1~W4 | W5 | 游客登录（设备指纹 + JWT） |
| 音效无声 | W1~W3 | W4 | platform-web WebAudioAdapter |
| i18n key 直接写中文 | W1~W2 | W3 | vue-i18n + zh-CN.json |
| 关卡切换手动刷新 | W1 | W2 | LevelScene 自动加载下一关 |
| 提示系统不存在 | W1~W3 | W4 | HintSystem + HintOverlay |

### 假数据策略原则

```
1. 假数据用接口隔离：
   所有"假实现"都在 PlatformAdapter 的 mock 版本里，
   真假切换只需替换 adapter，不改业务代码。

2. 假数据要渐进替换：
   不要在某一天突然"全量替换"，
   每周替换一批，每次替换后立刻回归测试。

3. localStorage 永远保留：
   即使接了后端，localStorage 仍作为离线缓存。
   不是"替换"而是"增加一层"。
```

---

## 八、每周自查问题

在每周五下班前，问自己这三个问题：

```
1. "本周的里程碑验收标准，每一条都满足了吗？"
   → 没满足的挪到下周一第一件事。

2. "下周一开始干活的第一件事是什么？"
   → 想不清楚就说明下周计划还没 ready。

3. "现在让用户玩，最会被骂的是什么？"
   → 那就是下周最优先修的东西。
```

---

## 九、总结：这份计划的核心取舍

| 我们选择了 | 我们放弃了 | 理由 |
|-----------|-----------|------|
| 30 关上线 | 完美的 100 关 | 先验证，30 关够了 |
| 纯 Web + PWA | 同时做小程序 | 一个人做不了两端 |
| 游客登录 | 手机号/微信登录 | 降低首次使用门槛 |
| localStorage + 后端双写 | 纯服务端存档 | 离线可玩是 PWA 的命 |
| 极简 UI 风 | 精美美术 | 1 人团队，美术是瓶颈 |
| 第三方音效素材 | 原创音效 | 首版先跑通 |
| W5 才做后端 | W1 就搭后端 | 前端先跑通全流程再接后端，降低联调风险 |
| 人工测试为主 | 全量自动化测试 | 30 关人工测 2 小时，写自动化测试 2 天 |
