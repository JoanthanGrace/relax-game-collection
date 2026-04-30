# NiceTap - 无厘头反套路关卡小游戏

轻量级、关卡制、解压小游戏。Web App + PWA 优先，保留小程序迁移能力。

## 技术栈

- **前端**: Vue 3 + Vite + TypeScript + Phaser + Pinia
- **后端**: NestJS + TypeORM + PostgreSQL
- **测试**: Vitest + Playwright
- **工程**: pnpm workspace + Turborepo

## 项目结构

```
├── apps/
│   ├── web-app/       # Vue 3 前端应用壳
│   └── server/        # NestJS 后端服务
├── packages/
│   ├── shared/        # 跨端共享类型、常量
│   ├── game-core/     # Phaser 游戏引擎核心
│   └── levels/        # 关卡配置与脚本
└── docs/              # 项目设计文档
```

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动前端开发服务
pnpm dev:web

# 启动后端开发服务
pnpm dev:server

# 全量构建
pnpm build

# 类型检查
pnpm typecheck

# 代码格式化
pnpm format
```

## 开发规范

- 包间依赖方向: `shared` ← `game-core` ← `levels`，`shared` ← `platform-*` ← `web-app`
- `game-core` 和 `levels` 禁止直接使用浏览器 API（window/document/localStorage 等）
- 关卡配置优先使用 JSON 声明式，复杂逻辑才使用 TypeScript 脚本
- 所有坐标使用归一化值 (0~1)

## TODO

- [ ] Phaser 场景实现
- [ ] 关卡交互系统
- [ ] 30 关配置
- [ ] PWA 支持
- [ ] 后端业务接口
- [ ] 埋点系统
- [ ] E2E 测试
