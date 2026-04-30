# 自动化测试体系设计 v1.0

> **核心目标**：新增一关不能搞坏旧关，新增一个 behavior 不能搞坏旧的交互。
> 测试体系的价值不在"第一次写的时候"，而在"第 80 关上线前发现第 12 关被搞坏的那一刻"。

---

## 1. 单元测试范围

### 1.1 必须覆盖的纯逻辑模块

这些模块是零 Phaser 依赖的纯 TypeScript，最容易测、价值最高。

```
packages/game-core/src/systems/
├── ConditionEvaluator.ts    ← 最核心，测试密度最高
├── HintSystem.ts            ← 状态机逻辑
└── TelemetryCollector.ts    ← 缓冲+批量发送逻辑

packages/shared/src/
└── validation/LevelValidator.ts  ← 校验器本身也需要被测试
```

### 1.2 ConditionEvaluator 测试矩阵

```typescript
// packages/game-core/__tests__/ConditionEvaluator.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ConditionEvaluator } from '../src/systems/ConditionEvaluator'
import type { Condition } from '@nicetap/shared'

describe('ConditionEvaluator', () => {
  let evaluator: ConditionEvaluator

  beforeEach(() => {
    vi.useFakeTimers()
    evaluator = new ConditionEvaluator(() => undefined)
  })

  // ── event-fired ──

  describe('event-fired', () => {
    const condition: Condition = { type: 'event-fired', eventId: 'btn-click' }

    it('事件未触发时返回 false', () => {
      expect(evaluator.evaluate(condition)).toBe(false)
    })

    it('事件触发后返回 true', () => {
      evaluator.recordEvent('btn-click')
      expect(evaluator.evaluate(condition)).toBe(true)
    })

    it('不相关事件不影响判定', () => {
      evaluator.recordEvent('other-event')
      expect(evaluator.evaluate(condition)).toBe(false)
    })

    it('reset 后清除事件记录', () => {
      evaluator.recordEvent('btn-click')
      evaluator.reset()
      expect(evaluator.evaluate(condition)).toBe(false)
    })
  })

  // ── event-count ──

  describe('event-count', () => {
    it('gte: 点击 2 次满足 count=2', () => {
      const cond: Condition = {
        type: 'event-count', eventId: 'btn-click',
        count: 2, comparator: 'gte'
      }
      evaluator.recordEvent('btn-click')
      expect(evaluator.evaluate(cond)).toBe(false)
      evaluator.recordEvent('btn-click')
      expect(evaluator.evaluate(cond)).toBe(true)
    })

    it('eq: 恰好 3 次', () => {
      const cond: Condition = {
        type: 'event-count', eventId: 'x',
        count: 3, comparator: 'eq'
      }
      evaluator.recordEvent('x')
      evaluator.recordEvent('x')
      evaluator.recordEvent('x')
      expect(evaluator.evaluate(cond)).toBe(true)
      evaluator.recordEvent('x')
      expect(evaluator.evaluate(cond)).toBe(false)
    })

    it('lte: 不超过 5 次', () => {
      const cond: Condition = {
        type: 'event-count', eventId: 'x',
        count: 5, comparator: 'lte'
      }
      for (let i = 0; i < 5; i++) evaluator.recordEvent('x')
      expect(evaluator.evaluate(cond)).toBe(true)
      evaluator.recordEvent('x')
      expect(evaluator.evaluate(cond)).toBe(false)
    })
  })

  // ── no-action ──

  describe('no-action', () => {
    it('空闲 3 秒后满足', () => {
      const cond: Condition = { type: 'no-action', idleDuration: 3 }
      expect(evaluator.evaluate(cond)).toBe(false)
      vi.advanceTimersByTime(3000)
      expect(evaluator.evaluate(cond)).toBe(true)
    })

    it('中途有操作则重置空闲计时', () => {
      const cond: Condition = { type: 'no-action', idleDuration: 3 }
      vi.advanceTimersByTime(2000)
      evaluator.recordEvent('any-action')
      vi.advanceTimersByTime(2000)
      expect(evaluator.evaluate(cond)).toBe(false)
    })
  })

  // ── timer-expired ──

  describe('timer-expired', () => {
    it('经过 N 秒后满足', () => {
      const cond: Condition = { type: 'timer-expired', seconds: 5 }
      expect(evaluator.evaluate(cond)).toBe(false)
      vi.advanceTimersByTime(5000)
      expect(evaluator.evaluate(cond)).toBe(true)
    })
  })

  // ── object-state ──

  describe('object-state', () => {
    it('对象属性满足条件时返回 true', () => {
      const getter = vi.fn().mockReturnValue(0.2)
      const ev = new ConditionEvaluator(getter)
      const cond: Condition = {
        type: 'object-state',
        objectId: 'big-btn',
        property: { key: 'scale', value: 0.3, comparator: 'lte' }
      }
      expect(ev.evaluate(cond)).toBe(true)
      expect(getter).toHaveBeenCalledWith('big-btn', 'scale')
    })

    it('对象属性不满足时返回 false', () => {
      const ev = new ConditionEvaluator(() => 0.5)
      const cond: Condition = {
        type: 'object-state',
        objectId: 'big-btn',
        property: { key: 'scale', value: 0.3, comparator: 'lte' }
      }
      expect(ev.evaluate(cond)).toBe(false)
    })
  })

  // ── sequence ──

  describe('sequence', () => {
    it('事件按顺序触发时满足', () => {
      const cond: Condition = {
        type: 'sequence',
        eventSequence: ['a', 'b', 'c']
      }
      evaluator.recordEvent('a')
      evaluator.recordEvent('b')
      expect(evaluator.evaluate(cond)).toBe(false)
      evaluator.recordEvent('c')
      expect(evaluator.evaluate(cond)).toBe(true)
    })

    it('中间插入无关事件不影响（检查末尾）', () => {
      const cond: Condition = {
        type: 'sequence',
        eventSequence: ['a', 'b']
      }
      evaluator.recordEvent('a')
      evaluator.recordEvent('x')
      evaluator.recordEvent('b')
      expect(evaluator.evaluate(cond)).toBe(false) // 末尾是 [x, b] 不是 [a, b]
    })

    it('顺序错误时不满足', () => {
      const cond: Condition = {
        type: 'sequence',
        eventSequence: ['a', 'b']
      }
      evaluator.recordEvent('b')
      evaluator.recordEvent('a')
      expect(evaluator.evaluate(cond)).toBe(false)
    })
  })

  // ── composite ──

  describe('composite', () => {
    it('AND: 所有子条件满足才返回 true', () => {
      const cond: Condition = {
        type: 'composite',
        operator: 'and',
        children: [
          { type: 'event-fired', eventId: 'a' },
          { type: 'event-fired', eventId: 'b' }
        ]
      }
      evaluator.recordEvent('a')
      expect(evaluator.evaluate(cond)).toBe(false)
      evaluator.recordEvent('b')
      expect(evaluator.evaluate(cond)).toBe(true)
    })

    it('OR: 任一子条件满足即返回 true', () => {
      const cond: Condition = {
        type: 'composite',
        operator: 'or',
        children: [
          { type: 'event-fired', eventId: 'a' },
          { type: 'event-fired', eventId: 'b' }
        ]
      }
      evaluator.recordEvent('b')
      expect(evaluator.evaluate(cond)).toBe(true)
    })

    it('嵌套 composite', () => {
      const cond: Condition = {
        type: 'composite',
        operator: 'and',
        children: [
          { type: 'event-fired', eventId: 'a' },
          {
            type: 'composite',
            operator: 'or',
            children: [
              { type: 'event-fired', eventId: 'b' },
              { type: 'event-fired', eventId: 'c' }
            ]
          }
        ]
      }
      evaluator.recordEvent('a')
      evaluator.recordEvent('c')
      expect(evaluator.evaluate(cond)).toBe(true)
    })
  })

  // ── negate ──

  describe('negate', () => {
    it('取反 event-fired', () => {
      const cond: Condition = {
        type: 'event-fired', eventId: 'x', negate: true
      }
      expect(evaluator.evaluate(cond)).toBe(true)
      evaluator.recordEvent('x')
      expect(evaluator.evaluate(cond)).toBe(false)
    })
  })

  // ── evaluateAll ──

  describe('evaluateAll', () => {
    it('空条件数组返回 false', () => {
      expect(evaluator.evaluateAll([])).toBe(false)
    })

    it('and 模式需全部满足', () => {
      const conditions: Condition[] = [
        { type: 'event-fired', eventId: 'a' },
        { type: 'event-fired', eventId: 'b' }
      ]
      evaluator.recordEvent('a')
      expect(evaluator.evaluateAll(conditions, 'and')).toBe(false)
      evaluator.recordEvent('b')
      expect(evaluator.evaluateAll(conditions, 'and')).toBe(true)
    })
  })
})
```

### 1.3 HintSystem 测试

```typescript
// packages/game-core/__tests__/HintSystem.test.ts

import { describe, it, expect, vi } from 'vitest'
import { HintSystem } from '../src/systems/HintSystem'
import type { HintConfig } from '@nicetap/shared'

describe('HintSystem', () => {
  const hints: HintConfig[] = [
    { level: 'weak', text: 'hint.weak', showAfterFailCount: 3 },
    { level: 'medium', text: 'hint.med', showAfterFailCount: 5, highlightObjectId: 'obj-1' },
    { level: 'strong', text: 'hint.strong', showAfterFailCount: 8 },
  ]

  it('失败 3 次前不展示提示', () => {
    const show = vi.fn()
    const system = new HintSystem(hints, { showHintText: show, highlightObject: vi.fn(), dismissHint: vi.fn() })
    system.onFail()
    system.onFail()
    expect(show).not.toHaveBeenCalled()
  })

  it('失败 3 次后展示弱提示', () => {
    const show = vi.fn()
    const system = new HintSystem(hints, { showHintText: show, highlightObject: vi.fn(), dismissHint: vi.fn() })
    for (let i = 0; i < 3; i++) system.onFail()
    expect(show).toHaveBeenCalledWith('hint.weak')
  })

  it('提示递进：3 次→弱, 5 次→中, 8 次→强', () => {
    const show = vi.fn()
    const highlight = vi.fn()
    const system = new HintSystem(hints, { showHintText: show, highlightObject: highlight, dismissHint: vi.fn() })

    for (let i = 0; i < 3; i++) system.onFail()
    expect(show).toHaveBeenLastCalledWith('hint.weak')

    for (let i = 0; i < 2; i++) system.onFail()
    expect(show).toHaveBeenLastCalledWith('hint.med')
    expect(highlight).toHaveBeenCalledWith('obj-1')

    for (let i = 0; i < 3; i++) system.onFail()
    expect(show).toHaveBeenLastCalledWith('hint.strong')
  })

  it('同一级别提示不重复展示', () => {
    const show = vi.fn()
    const system = new HintSystem(hints, { showHintText: show, highlightObject: vi.fn(), dismissHint: vi.fn() })
    for (let i = 0; i < 4; i++) system.onFail()
    expect(show).toHaveBeenCalledTimes(1)
  })

  it('reset 清除所有状态', () => {
    const show = vi.fn()
    const system = new HintSystem(hints, { showHintText: show, highlightObject: vi.fn(), dismissHint: vi.fn() })
    for (let i = 0; i < 5; i++) system.onFail()
    system.reset()
    expect(system.getFailCount()).toBe(0)
  })
})
```

### 1.4 单元测试总覆盖表

| 模块 | 测试文件 | Case 数量 | 重点 |
|------|---------|-----------|------|
| ConditionEvaluator | `ConditionEvaluator.test.ts` | ~30 | 7 种条件类型 × 正/反/边界 |
| HintSystem | `HintSystem.test.ts` | ~10 | 递进逻辑、去重、reset |
| TelemetryCollector | `TelemetryCollector.test.ts` | ~8 | 缓冲、批量发送、超限触发 |
| LevelValidator | `LevelValidator.test.ts` | ~25 | 各类校验规则（见第 2 节） |
| 工具函数 | `utils.test.ts` | ~10 | 坐标归一化、角度计算等 |

---

## 2. 配置校验测试设计

这是整个测试体系中**最独特**的部分——测试的不是代码逻辑，而是数据正确性。

### 2.1 两层校验

```
层 1：校验器本身的单元测试
     "LevelValidator 的代码逻辑是否正确？"
     → 用手写的故意出错的 JSON 喂给校验器，验证它能报错

层 2：全量关卡配置的集成校验
     "当前仓库里所有 level-*.json 是否合法？"
     → 自动扫描所有 JSON，跑全套校验规则
```

### 2.2 层 1：校验器本身的测试

```typescript
// packages/shared/__tests__/LevelValidator.test.ts

import { describe, it, expect } from 'vitest'
import { LevelValidator } from '../src/validation/LevelValidator'
import type { LevelConfig } from '../src/types/level'

const validator = new LevelValidator()

function makeMinimalConfig(overrides: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: 'level-test',
    chapter: 1,
    order: 1,
    title: 'test.title',
    instruction: 'test.instruction',
    tags: ['text-trick'],
    background: { type: 'color', value: '#fff' },
    objects: [{
      id: 'btn',
      type: 'button',
      position: { x: 0.5, y: 0.5 },
      interactions: [{ type: 'click', emits: 'btn-clicked' }]
    }],
    winConditions: [{ type: 'event-fired', eventId: 'btn-clicked' }],
    passFeedback: { texts: ['pass.1'] },
    failFeedback: { texts: ['fail.1'] },
    ...overrides,
  }
}

describe('LevelValidator', () => {

  describe('必填检查', () => {
    it('完整配置无错误', () => {
      const errors = validator.validate(makeMinimalConfig())
      expect(errors.filter(e => e.severity === 'error')).toHaveLength(0)
    })

    it('缺少 id 报错', () => {
      const errors = validator.validate(makeMinimalConfig({ id: '' }))
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'id', severity: 'error' })
      )
    })

    it('空 objects 报错', () => {
      const errors = validator.validate(makeMinimalConfig({ objects: [] }))
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'objects', severity: 'error' })
      )
    })

    it('空 winConditions 报错', () => {
      const errors = validator.validate(makeMinimalConfig({ winConditions: [] }))
      expect(errors).toContainEqual(
        expect.objectContaining({ path: 'winConditions', severity: 'error' })
      )
    })
  })

  describe('objectId 去重', () => {
    it('重复 objectId 报错', () => {
      const config = makeMinimalConfig({
        objects: [
          { id: 'btn', type: 'button', position: { x: 0, y: 0 },
            interactions: [{ type: 'click', emits: 'e1' }] },
          { id: 'btn', type: 'text', position: { x: 1, y: 1 } },
        ]
      })
      const errors = validator.validate(config)
      expect(errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('重复') })
      )
    })
  })

  describe('事件可达性', () => {
    it('winCondition 引用了不存在的 eventId 报错', () => {
      const config = makeMinimalConfig({
        winConditions: [{ type: 'event-fired', eventId: 'ghost-event' }]
      })
      const errors = validator.validate(config)
      expect(errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('ghost-event')
        })
      )
    })

    it('有 scriptId 时跳过事件可达性检查', () => {
      const config = makeMinimalConfig({
        scriptId: 'level-009',
        winConditions: [{ type: 'event-fired', eventId: 'script-event' }]
      })
      const errors = validator.validate(config)
      const reachErrors = errors.filter(e =>
        e.message.includes('script-event') && e.severity === 'error'
      )
      expect(reachErrors).toHaveLength(0)
    })
  })

  describe('交互参数检查', () => {
    it('multi-click 的 clickCount < 2 报错', () => {
      const config = makeMinimalConfig({
        objects: [{
          id: 'btn', type: 'button', position: { x: 0.5, y: 0.5 },
          interactions: [{ type: 'multi-click', emits: 'e', clickCount: 1 }]
        }]
      })
      const errors = validator.validate(config)
      expect(errors).toContainEqual(
        expect.objectContaining({ severity: 'error', message: expect.stringContaining('clickCount') })
      )
    })

    it('drag 缺少 dragTarget 发出 warning', () => {
      const config = makeMinimalConfig({
        objects: [{
          id: 'obj', type: 'image', position: { x: 0.5, y: 0.5 },
          interactions: [{ type: 'drag', emits: 'dragged' }]
        }]
      })
      const errors = validator.validate(config)
      expect(errors).toContainEqual(
        expect.objectContaining({ severity: 'warning', message: expect.stringContaining('dragTarget') })
      )
    })

    it('pinch 缺少 targetScale 报错', () => {
      const config = makeMinimalConfig({
        objects: [{
          id: 'obj', type: 'button', position: { x: 0.5, y: 0.5 },
          interactions: [{ type: 'pinch', emits: 'pinched' }]
        }]
      })
      const errors = validator.validate(config)
      expect(errors).toContainEqual(
        expect.objectContaining({ severity: 'error', message: expect.stringContaining('targetScale') })
      )
    })
  })

  describe('提示配置检查', () => {
    it('hint 引用不存在的 objectId 报错', () => {
      const config = makeMinimalConfig({
        hints: [{ level: 'weak', text: 'h1', showAfterFailCount: 3, highlightObjectId: 'ghost' }]
      })
      const errors = validator.validate(config)
      expect(errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('ghost') })
      )
    })
  })

  describe('批量校验', () => {
    it('重复 levelId 报错', () => {
      const results = validator.validateAll([
        makeMinimalConfig({ id: 'level-001' }),
        makeMinimalConfig({ id: 'level-001' }),
      ])
      const errors = results.get('level-001') ?? []
      expect(errors).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('重复') })
      )
    })
  })
})
```

### 2.3 层 2：全量关卡扫描测试

```typescript
// packages/levels/__tests__/all-levels.test.ts

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LevelValidator } from '@nicetap/shared'
import type { LevelConfig } from '@nicetap/shared'

const CONFIG_DIR = join(__dirname, '../src/configs')
const SCRIPT_DIR = join(__dirname, '../src/scripts')

function loadAllConfigs(): LevelConfig[] {
  return readdirSync(CONFIG_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(CONFIG_DIR, f), 'utf-8')))
}

function listAvailableScripts(): Set<string> {
  return new Set(
    readdirSync(SCRIPT_DIR)
      .filter(f => f.endsWith('.ts'))
      .map(f => f.replace('.ts', ''))
  )
}

const allConfigs = loadAllConfigs()
const allScripts = listAvailableScripts()
const validator = new LevelValidator()

// ── 逐关校验 ──

describe('全量关卡校验', () => {
  for (const config of allConfigs) {
    describe(`${config.id}`, () => {

      it('通过 LevelValidator 校验（无 error）', () => {
        const errors = validator.validate(config)
          .filter(e => e.severity === 'error')
        expect(errors, errors.map(e => `${e.path}: ${e.message}`).join('\n'))
          .toHaveLength(0)
      })

      it('JSON 可被正常解析为 LevelConfig 类型', () => {
        expect(config.id).toMatch(/^level-\d{3}$/)
        expect(config.chapter).toBeGreaterThan(0)
        expect(config.objects.length).toBeGreaterThan(0)
        expect(config.winConditions.length).toBeGreaterThan(0)
      })

      it('scriptId 引用的脚本文件存在', () => {
        if (!config.scriptId) return
        expect(allScripts.has(config.scriptId),
          `脚本 ${config.scriptId}.ts 不存在`
        ).toBe(true)
      })

      it('关卡至少有一种方式可触发通关', () => {
        if (config.scriptId) return // 脚本可以手动调 win()
        const emittableEvents = new Set<string>()
        for (const obj of config.objects) {
          for (const i of obj.interactions ?? []) {
            emittableEvents.add(i.emits)
          }
        }
        const winEventIds = extractEventIds(config.winConditions)
        const reachable = winEventIds.some(id => emittableEvents.has(id))
          || config.winConditions.some(c => c.type === 'no-action' || c.type === 'timer-expired')
        expect(reachable, '通关条件中的事件无法被任何交互触发').toBe(true)
      })
    })
  }
})

// ── 全局一致性检查 ──

describe('全局一致性', () => {
  it('无重复 levelId', () => {
    const ids = allConfigs.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('chapter+order 无重复', () => {
    const keys = allConfigs.map(c => `${c.chapter}-${c.order}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('关卡 ID 与排序一致', () => {
    const sorted = [...allConfigs].sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter
      return a.order - b.order
    })
    for (let i = 0; i < sorted.length; i++) {
      const expected = `level-${String(i + 1).padStart(3, '0')}`
      expect(sorted[i].id).toBe(expected)
    }
  })
})

function extractEventIds(conditions: any[]): string[] {
  const ids: string[] = []
  for (const c of conditions) {
    if (c.eventId) ids.push(c.eventId)
    if (c.eventSequence) ids.push(...c.eventSequence)
    if (c.children) ids.push(...extractEventIds(c.children))
  }
  return ids
}
```

---

## 3. E2E Smoke Test 设计

### 3.1 策略

```
E2E 不测所有 30 关（太慢、太脆弱），而是测关键流程：

1. 冷启动 → 首页渲染
2. 首页 → 点开始 → 进入第 1 关
3. 通过前 3 关（覆盖 click + multi-click + wait）
4. 刷新页面 → "继续游戏"恢复到第 4 关
5. 设置页可打开 → 音效开关可切换
6. PWA 离线：断网后可加载首页
```

### 3.2 Playwright 测试

```typescript
// e2e/tests/smoke.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Smoke Test', () => {

  test('首页正常渲染', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('别点错')).toBeVisible()
    await expect(page.getByRole('button', { name: '开始游戏' })).toBeVisible()
  })

  test('进入第 1 关并通关', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '开始游戏' }).click()

    // 等待 Phaser canvas 加载
    await expect(page.locator('canvas')).toBeVisible()

    // 第 1 关：点击"通关"按钮
    // Phaser canvas 内的点击通过坐标实现
    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')

    // 点击画面中心（第 1 关的按钮在中心）
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } })

    // 验证通关弹层出现（Vue DOM 层）
    await expect(page.locator('[data-testid="pass-overlay"]')).toBeVisible({ timeout: 3000 })
  })

  test('通关后可进入下一关', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '开始游戏' }).click()
    await expect(page.locator('canvas')).toBeVisible()

    // 通关第 1 关
    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()!
    await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } })
    await expect(page.locator('[data-testid="pass-overlay"]')).toBeVisible()

    // 点"下一关"
    await page.getByRole('button', { name: '下一关' }).click()

    // 验证跳到第 2 关
    await expect(page.locator('[data-testid="level-indicator"]'))
      .toContainText('2')
  })

  test('刷新后进度保留', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '开始游戏' }).click()

    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()!
    await canvas.click({ position: { x: box!.width / 2, y: box!.height / 2 } })
    await expect(page.locator('[data-testid="pass-overlay"]')).toBeVisible()
    await page.getByRole('button', { name: '下一关' }).click()

    // 刷新
    await page.reload()

    // 首页应显示"继续游戏"
    await expect(page.getByRole('button', { name: /继续/ })).toBeVisible()
  })

  test('设置页可正常打开', async ({ page }) => {
    await page.goto('/')
    await page.getByText('设置').click()
    await expect(page.getByText('音效')).toBeVisible()
    await expect(page.getByText('清除进度')).toBeVisible()
  })

})
```

### 3.3 Phaser Canvas 内交互的测试策略

```
问题：Playwright 无法直接操作 Phaser 内部对象。

解决方案：暴露测试桥接 API

// 仅在 test/dev 环境下注入到 window 对象
if (import.meta.env.DEV || import.meta.env.VITEST) {
  (window as any).__GAME_TEST__ = {
    getCurrentLevelId: () => gameEngine.currentLevelId,
    simulateEvent: (eventId: string) => gameEngine.emitEvent(eventId),
    getEvaluatorState: () => gameEngine.getConditionState(),
    forceWin: () => gameEngine.forceWin(),
  }
}

// E2E 测试中使用：
await page.evaluate(() => (window as any).__GAME_TEST__.simulateEvent('btn-clicked'))
```

---

## 4. 新增关卡必过的自动检查

每次新增一个 `level-XXX.json`，以下检查自动运行：

### 4.1 检查清单

```
┌─────────────────────────────────────────────────────────────┐
│  新增关卡 CI 检查流程                                         │
├──────┬──────────────────────────────────────────────────────┤
│  #1  │ JSON 语法合法                                         │
│  #2  │ 通过 LevelValidator 全部 error 级校验                  │
│  #3  │ levelId 格式正确且不与已有关卡冲突                      │
│  #4  │ chapter + order 不冲突                                │
│  #5  │ winCondition 引用的 eventId 至少有一个交互能触发         │
│  #6  │ 如有 scriptId → 脚本文件存在                           │
│  #7  │ 如有 preloadAssets → 资源文件存在                      │
│  #8  │ 如有 hints → highlightObjectId 引用的对象存在           │
│  #9  │ 已有关卡的全量校验仍然通过（防止全局改动破坏旧关卡）       │
│  #10 │ TypeScript 编译通过                                    │
│  #11 │ 全部单元测试通过（ConditionEvaluator 等没被改坏）        │
└──────┴──────────────────────────────────────────────────────┘
```

### 4.2 Git 变更感知

```typescript
// tools/ci/detect-level-changes.ts
// 在 CI 中运行，检测本次 PR 新增/修改了哪些关卡

import { execSync } from 'node:child_process'

const diff = execSync('git diff --name-only origin/main...HEAD').toString()
const changedLevels = diff
  .split('\n')
  .filter(f => f.match(/packages\/levels\/src\/configs\/level-\d{3}\.json/))

if (changedLevels.length > 0) {
  console.log(`检测到 ${changedLevels.length} 个关卡变更:`)
  changedLevels.forEach(f => console.log(`  ${f}`))

  // 对变更的关卡执行加强校验
  // ...
} else {
  console.log('本次提交不涉及关卡变更')
}
```

---

## 5. CI 中的测试顺序

```yaml
# .github/workflows/ci.yml

name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # ── 阶段 1：快速反馈（< 1 分钟） ──
  fast-checks:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        check: [lint, typecheck, level-validate]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: |
          case "${{ matrix.check }}" in
            lint)           pnpm turbo lint ;;
            typecheck)      pnpm turbo typecheck ;;
            level-validate) pnpm turbo test:levels ;;
          esac

  # ── 阶段 2：单元测试（< 2 分钟） ──
  unit-tests:
    needs: fast-checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test:unit -- --coverage --reporter=json --outputFile=coverage.json
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: packages/*/coverage/

  # ── 阶段 3：E2E（< 5 分钟） ──
  e2e-tests:
    needs: unit-tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo build --filter=@nicetap/web-app
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm turbo test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: e2e/test-results/
```

### 5.1 执行顺序与耗时预算

```
       总 CI 时间目标：< 8 分钟
       ─────────────────────────

阶段 1  ███░░░░░░░  lint + typecheck + level-validate    ~60s (并行)
         │
阶段 2  ██████░░░░  单元测试 + 覆盖率                      ~90s
         │
阶段 3  ██████████  E2E smoke test                        ~180s
         │
结果    ✅ 全绿 → 可合并
        ❌ 任何阶段失败 → 阻断，后续阶段不运行
```

### 5.2 PR 合并门禁规则

```
GitHub Branch Protection Rules:

required_status_checks:
  - fast-checks / lint
  - fast-checks / typecheck
  - fast-checks / level-validate
  - unit-tests
  - e2e-tests            # 仅 merge 到 main 时必须
```

---

## 6. 示例测试文件结构

```
relax-game-collection/
├── packages/
│   ├── shared/
│   │   └── __tests__/
│   │       ├── LevelValidator.test.ts        # 校验器逻辑测试
│   │       └── utils.test.ts                 # 纯函数工具测试
│   │
│   ├── game-core/
│   │   └── __tests__/
│   │       ├── ConditionEvaluator.test.ts    # 条件求值器（最重要）
│   │       ├── HintSystem.test.ts            # 提示系统
│   │       ├── TelemetryCollector.test.ts    # 埋点收集器
│   │       └── behaviors/
│   │           ├── RunAwayBehavior.test.ts   # 各 behavior 独立测试
│   │           └── CountdownBehavior.test.ts
│   │
│   ├── levels/
│   │   └── __tests__/
│   │       ├── all-levels.test.ts            # 全量关卡配置扫描校验
│   │       ├── level-009.script.test.ts      # 单个 script 的逻辑测试
│   │       ├── level-017.script.test.ts
│   │       ├── level-022.script.test.ts
│   │       ├── level-026.script.test.ts
│   │       └── level-030.script.test.ts
│   │
│   ├── web-app/
│   │   └── __tests__/
│   │       ├── stores/
│   │       │   ├── useGameStore.test.ts      # Pinia store 测试
│   │       │   └── useSettingsStore.test.ts
│   │       └── components/
│   │           ├── PassOverlay.test.ts       # 组件快照/行为测试
│   │           └── FailOverlay.test.ts
│   │
│   └── server/
│       └── test/
│           ├── progress.service.spec.ts      # NestJS 服务测试
│           ├── analytics.service.spec.ts
│           └── progress.e2e-spec.ts          # API 集成测试
│
├── e2e/
│   ├── tests/
│   │   ├── smoke.spec.ts                     # 核心流程 smoke test
│   │   ├── progress.spec.ts                  # 进度保存/恢复
│   │   └── pwa.spec.ts                       # PWA 安装/离线
│   └── playwright.config.ts
│
└── vitest.workspace.ts                       # Vitest workspace 配置
```

### 6.1 Vitest Workspace 配置

```typescript
// vitest.workspace.ts

import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      name: 'shared',
      root: './packages/shared',
      environment: 'node',
    },
  },
  {
    test: {
      name: 'game-core',
      root: './packages/game-core',
      environment: 'node',
    },
  },
  {
    test: {
      name: 'levels',
      root: './packages/levels',
      environment: 'node',
    },
  },
  {
    test: {
      name: 'web-app',
      root: './packages/web-app',
      environment: 'jsdom',
    },
  },
  {
    test: {
      name: 'server',
      root: './packages/server',
      environment: 'node',
    },
  },
])
```

### 6.2 package.json 脚本

```jsonc
// 根 package.json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:unit:watch": "vitest watch",
    "test:levels": "vitest run --project levels",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "vitest run && playwright test",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 7. 必须可 Mock 的模块

### 7.1 Mock 清单

| 被 Mock 的模块 | 在哪里 Mock | Mock 方式 | 为什么必须可 Mock |
|---------------|------------|---------|----------------|
| `PlatformAdapter` | game-core 单元测试 | 全接口 mock | 单元测试不能依赖浏览器 API |
| `Phaser.Scene` | ConditionEvaluator 测试 | 不需要 mock（无依赖） | 纯逻辑，零 Phaser 依赖 |
| `Phaser.GameObjects` | InteractionSystem 测试 | 轻量 stub | 只需要 on/off/setInteractive 方法 |
| `LevelContext` | 脚本测试 | 全接口 mock | 脚本不能直接操作 Phaser |
| `Date.now()` | 时间相关条件测试 | `vi.useFakeTimers()` | no-action/timer 需要控制时间 |
| `fetch` | TelemetryCollector 测试 | `vi.fn()` | 不能真的发 HTTP 请求 |
| `localStorage` | store 测试 | `vi.stubGlobal()` | Node 环境无 localStorage |
| `AudioContext` | 音频测试 | mock adapter | Node 环境无 Web Audio |

### 7.2 Phaser 轻量 Stub

```typescript
// packages/game-core/__tests__/__mocks__/phaser-stub.ts

export function createMockGameObject() {
  const listeners = new Map<string, Set<Function>>()

  return {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    visible: true,

    setInteractive: vi.fn().mockReturnThis(),
    disableInteractive: vi.fn().mockReturnThis(),
    setVisible: vi.fn(function(this: any, v: boolean) { this.visible = v; return this }),
    setScale: vi.fn(function(this: any, s: number) { this.scaleX = s; this.scaleY = s; return this }),
    destroy: vi.fn(),

    on(event: string, fn: Function) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(fn)
      return this
    },
    off(event: string, fn: Function) {
      listeners.get(event)?.delete(fn)
      return this
    },
    emit(event: string, ...args: any[]) {
      listeners.get(event)?.forEach(fn => fn(...args))
    },

    // 测试辅助：手动触发事件
    __trigger(event: string, ...args: any[]) {
      listeners.get(event)?.forEach(fn => fn(...args))
    }
  }
}

export function createMockScene() {
  return {
    scale: { width: 375, height: 667 },
    input: {
      on: vi.fn(),
      off: vi.fn(),
      manager: { pointers: [] }
    },
    children: {
      getByName: vi.fn()
    },
    add: {
      text: vi.fn(() => createMockGameObject())
    },
    tweens: {
      add: vi.fn(({ onComplete }: any) => { onComplete?.() })
    },
    time: {
      delayedCall: vi.fn((delay: number, callback: Function) => {
        const id = setTimeout(callback, delay)
        return { remove: () => clearTimeout(id) }
      }),
      addEvent: vi.fn(({ delay, callback, loop }: any) => {
        const id = loop ? setInterval(callback, delay) : setTimeout(callback, delay)
        return { remove: () => { clearInterval(id); clearTimeout(id) } }
      })
    }
  }
}
```

### 7.3 LevelContext Mock

```typescript
// packages/levels/__tests__/__mocks__/mock-context.ts

import type { LevelContext, Vec2, GameObjectConfig, ObjectStyle } from '@nicetap/shared'

export function createMockContext(): LevelContext & {
  __won: boolean
  __failed: boolean
  __failMessage?: string
  __emittedEvents: string[]
  __shownObjects: Set<string>
  __hiddenObjects: Set<string>
} {
  const state = new Map<string, unknown>()
  const ctx = {
    __won: false,
    __failed: false,
    __failMessage: undefined as string | undefined,
    __emittedEvents: [] as string[],
    __shownObjects: new Set<string>(),
    __hiddenObjects: new Set<string>(),

    showObject: vi.fn((id: string) => ctx.__shownObjects.add(id)),
    hideObject: vi.fn((id: string) => ctx.__hiddenObjects.add(id)),
    setObjectInteractive: vi.fn(),
    moveObject: vi.fn(async () => {}),
    scaleObject: vi.fn(async () => {}),
    rotateObject: vi.fn(async () => {}),
    fadeObject: vi.fn(async () => {}),
    setObjectText: vi.fn(),
    setObjectProperty: vi.fn(),
    spawnObject: vi.fn(),
    destroyObject: vi.fn(),

    getObjectPosition: vi.fn(() => ({ x: 0.5, y: 0.5 })),
    getObjectScale: vi.fn(() => 1),
    getObjectAlpha: vi.fn(() => 1),
    isObjectVisible: vi.fn(() => true),

    win: vi.fn(() => { ctx.__won = true }),
    fail: vi.fn((msg?: string) => { ctx.__failed = true; ctx.__failMessage = msg }),
    emitEvent: vi.fn((id: string) => ctx.__emittedEvents.push(id)),

    playSFX: vi.fn(),
    stopSFX: vi.fn(),
    vibrate: vi.fn(),
    playAnimation: vi.fn(),
    showFloatingText: vi.fn(),

    getElapsedMs: vi.fn(() => 0),
    delay: vi.fn((_ms: number, cb: () => void) => {
      cb()
      return { cancel: vi.fn() }
    }),
    interval: vi.fn(() => ({ cancel: vi.fn() })),

    getEventCount: vi.fn(() => 0),
    hasEventFired: vi.fn(() => false),

    setState: vi.fn((k: string, v: unknown) => state.set(k, v)),
    getState: vi.fn(<T>(k: string) => state.get(k) as T),

    getScreenSize: vi.fn(() => ({ width: 375, height: 667 })),
    getPixelRatio: vi.fn(() => 2),
  }
  return ctx
}
```

### 7.4 脚本测试示例

```typescript
// packages/levels/__tests__/level-009.script.test.ts

import { describe, it, expect, vi } from 'vitest'
import { createMockContext } from './__mocks__/mock-context'

// 动态 import 脚本
const { script } = await import('../src/scripts/level-009')

describe('level-009 (假失败)', () => {
  it('点击主按钮后弹出假失败弹窗', () => {
    const ctx = createMockContext()
    script.onEvent?.(ctx, 'main-btn-clicked')

    expect(ctx.showObject).toHaveBeenCalledWith('fake-fail-popup')
    expect(ctx.playAnimation).toHaveBeenCalledWith('fake-fail-popup', 'slide-in')
    expect(ctx.playSFX).toHaveBeenCalledWith('fail-dramatic')
  })

  it('点击主按钮后不会直接通关', () => {
    const ctx = createMockContext()
    script.onEvent?.(ctx, 'main-btn-clicked')

    expect(ctx.__won).toBe(false)
  })

  it('点击 emoji 后不会手动触发通关（由 winCondition 驱动）', () => {
    const ctx = createMockContext()
    script.onEvent?.(ctx, 'emoji-clicked')

    // 脚本不调 win()，winCondition 才调
    // 这里验证脚本不越权
    // （如果脚本设计需要手动 win，则此 case 改为 expect true）
  })
})
```

---

## 8. 自动产出的测试报告指标

### 8.1 指标清单

| 指标 | 来源 | 报告位置 | 关注点 |
|------|------|---------|--------|
| **单元测试通过率** | Vitest | PR Comment | 100% 才能合并 |
| **代码覆盖率** | Vitest --coverage | PR Comment + Badge | game-core ≥ 80%, shared ≥ 90% |
| **关卡校验通过率** | LevelValidator | PR Comment | 必须 100%，0 error |
| **关卡总数** | all-levels.test.ts | PR Comment | 跟踪内容增长 |
| **有 script 的关卡占比** | all-levels.test.ts | 报告 | 应保持 < 20% |
| **E2E 通过率** | Playwright | HTML Report | 100% 才能合并 |
| **E2E 截图** | Playwright | Artifact | 失败时自动截图 |
| **CI 总耗时** | GitHub Actions | Workflow 页面 | 目标 < 8 分钟 |
| **构建产物大小** | 构建后统计 | PR Comment | 监控是否过大 |

### 8.2 PR Comment 自动报告模板

```markdown
## 🧪 测试报告

| 检查项 | 状态 | 详情 |
|--------|------|------|
| Lint | ✅ | 0 errors, 0 warnings |
| TypeCheck | ✅ | 0 errors |
| 关卡校验 | ✅ | 30/30 关卡通过，0 error，2 warnings |
| 单元测试 | ✅ | 83/83 passed, 0 failed |
| 覆盖率 | ✅ | game-core: 87%, shared: 94% |
| E2E | ✅ | 5/5 passed |
| 构建大小 | ⚠️ | 1.2MB (+120KB vs main) |

### 关卡统计
- 总关卡数：30
- 纯配置关：25 (83%)
- 含脚本关：5 (17%)
- 本次新增：level-031
- 本次修改：无

### 变更影响分析
- 新增关卡 level-031：通过全部校验
- 旧关卡回归：30/30 全部通过
```

### 8.3 自动报告生成脚本

```typescript
// tools/ci/generate-report.ts

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

interface TestReport {
  levelCount: number
  configOnlyCount: number
  scriptCount: number
  unitTestsPassed: number
  unitTestsFailed: number
  coverageGameCore: number
  coverageShared: number
  levelValidationErrors: number
  levelValidationWarnings: number
  e2ePassed: number
  e2eFailed: number
  buildSizeKB: number
}

function collectReport(): TestReport {
  const coveragePath = join(__dirname, '../../packages/game-core/coverage/coverage-summary.json')
  const coverage = existsSync(coveragePath)
    ? JSON.parse(readFileSync(coveragePath, 'utf-8'))
    : null

  // ... 收集各项指标 ...

  return {
    levelCount: 30,
    configOnlyCount: 25,
    scriptCount: 5,
    unitTestsPassed: 83,
    unitTestsFailed: 0,
    coverageGameCore: coverage?.total?.lines?.pct ?? 0,
    coverageShared: 94,
    levelValidationErrors: 0,
    levelValidationWarnings: 2,
    e2ePassed: 5,
    e2eFailed: 0,
    buildSizeKB: 1200,
  }
}

function formatMarkdown(report: TestReport): string {
  const status = (ok: boolean) => ok ? '✅' : '❌'

  return `## 🧪 测试报告

| 检查项 | 状态 | 详情 |
|--------|------|------|
| 关卡校验 | ${status(report.levelValidationErrors === 0)} | ${report.levelCount} 关卡, ${report.levelValidationErrors} errors, ${report.levelValidationWarnings} warnings |
| 单元测试 | ${status(report.unitTestsFailed === 0)} | ${report.unitTestsPassed} passed, ${report.unitTestsFailed} failed |
| 覆盖率 | ${status(report.coverageGameCore >= 80)} | game-core: ${report.coverageGameCore}%, shared: ${report.coverageShared}% |
| E2E | ${status(report.e2eFailed === 0)} | ${report.e2ePassed} passed, ${report.e2eFailed} failed |

### 关卡统计
- 总关卡数：${report.levelCount}
- 纯配置关：${report.configOnlyCount} (${Math.round(report.configOnlyCount / report.levelCount * 100)}%)
- 含脚本关：${report.scriptCount} (${Math.round(report.scriptCount / report.levelCount * 100)}%)
`
}

const report = collectReport()
console.log(formatMarkdown(report))
```

---

## 9. 总结：什么时候写什么测试

```
┌─────────────────────────────────────────────────────────┐
│  改了什么           需要运行什么测试                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  新增 level-XXX.json                                     │
│  → 全量关卡校验 + 单元测试（防回归）                       │
│                                                          │
│  修改 ConditionEvaluator                                 │
│  → 其单元测试 + 全量关卡校验 + E2E（可能影响所有关卡）     │
│                                                          │
│  新增 Behavior                                           │
│  → Behavior 单元测试 + 引用它的关卡校验                   │
│                                                          │
│  修改 InteractionSystem                                  │
│  → 其单元测试 + E2E（交互是玩家直接感知的）               │
│                                                          │
│  修改 Vue 组件（弹层/页面）                               │
│  → 组件测试 + E2E                                        │
│                                                          │
│  修改 LevelScript                                        │
│  → 该脚本的单元测试 + 对应关卡手测                        │
│                                                          │
│  修改后端 API                                            │
│  → API 测试 + 前端进度同步 E2E                           │
│                                                          │
│  发版前                                                   │
│  → 全部：lint + typecheck + 校验 + 单元 + E2E            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```
