import { describe, it, expect } from 'vitest'
import { LevelValidator } from '../LevelValidator'
import type { LevelConfig } from '../../types/level'

function makeMinimalConfig(overrides: Partial<LevelConfig> = {}): LevelConfig {
  return {
    id: 'level-test',
    chapter: 1,
    order: 1,
    title: '测试关卡',
    instruction: '测试指令',
    tags: ['text-trick'],
    background: { type: 'color', value: '#fff' },
    objects: [
      {
        id: 'btn',
        type: 'button',
        position: { x: 0.5, y: 0.5 },
        interactions: [{ type: 'click', emits: 'btn-clicked' }],
      },
    ],
    winConditions: [{ type: 'event-fired', eventId: 'btn-clicked' }],
    passFeedback: { texts: ['过关！'] },
    failFeedback: { texts: ['失败！'] },
    ...overrides,
  }
}

describe('LevelValidator', () => {
  const validator = new LevelValidator()

  describe('validate - required fields', () => {
    it('should pass a minimal valid config', () => {
      const errors = validator.validate(makeMinimalConfig())
      const errs = errors.filter((e) => e.severity === 'error')
      expect(errs).toHaveLength(0)
    })

    it('should report missing id', () => {
      const errors = validator.validate(makeMinimalConfig({ id: '' }))
      expect(errors.some((e) => e.path === 'id')).toBe(true)
    })

    it('should report missing title', () => {
      const errors = validator.validate(makeMinimalConfig({ title: '' }))
      expect(errors.some((e) => e.path === 'title')).toBe(true)
    })

    it('should report missing instruction', () => {
      const errors = validator.validate(makeMinimalConfig({ instruction: '' }))
      expect(errors.some((e) => e.path === 'instruction')).toBe(true)
    })

    it('should report empty objects array', () => {
      const errors = validator.validate(makeMinimalConfig({ objects: [] }))
      expect(errors.some((e) => e.path === 'objects')).toBe(true)
    })

    it('should report empty winConditions', () => {
      const errors = validator.validate(makeMinimalConfig({ winConditions: [] }))
      expect(errors.some((e) => e.path === 'winConditions')).toBe(true)
    })

    it('should report missing passFeedback texts', () => {
      const errors = validator.validate(
        makeMinimalConfig({ passFeedback: { texts: [] } }),
      )
      expect(errors.some((e) => e.path === 'passFeedback.texts')).toBe(true)
    })

    it('should warn on missing failFeedback texts', () => {
      const errors = validator.validate(
        makeMinimalConfig({ failFeedback: { texts: [] } }),
      )
      const warn = errors.find((e) => e.path === 'failFeedback.texts')
      expect(warn).toBeDefined()
      expect(warn!.severity).toBe('warning')
    })
  })

  describe('validate - object IDs', () => {
    it('should detect duplicate object IDs', () => {
      const config = makeMinimalConfig({
        objects: [
          { id: 'dup', type: 'button', position: { x: 0, y: 0 }, interactions: [{ type: 'click', emits: 'a' }] },
          { id: 'dup', type: 'text', position: { x: 1, y: 1 } },
        ],
        winConditions: [{ type: 'event-fired', eventId: 'a' }],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('重复'))).toBe(true)
    })

    it('should detect duplicate IDs in nested children', () => {
      const config = makeMinimalConfig({
        objects: [
          {
            id: 'parent',
            type: 'container',
            position: { x: 0, y: 0 },
            children: [
              { id: 'parent', type: 'text', position: { x: 0, y: 0 } },
            ],
          },
        ],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('重复'))).toBe(true)
    })
  })

  describe('validate - interactions', () => {
    it('should reject unknown interaction type', () => {
      const config = makeMinimalConfig({
        objects: [
          {
            id: 'obj',
            type: 'button',
            position: { x: 0.5, y: 0.5 },
            interactions: [{ type: 'fly' as any, emits: 'test' }],
          },
        ],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('未知交互类型'))).toBe(true)
    })

    it('should reject interaction missing emits', () => {
      const config = makeMinimalConfig({
        objects: [
          {
            id: 'obj',
            type: 'button',
            position: { x: 0.5, y: 0.5 },
            interactions: [{ type: 'click', emits: '' }],
          },
        ],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('emits'))).toBe(true)
    })

    it('should require clickCount >= 2 for multi-click', () => {
      const config = makeMinimalConfig({
        objects: [
          {
            id: 'obj',
            type: 'button',
            position: { x: 0.5, y: 0.5 },
            interactions: [{ type: 'multi-click', emits: 'mc', clickCount: 1 }],
          },
        ],
        winConditions: [{ type: 'event-fired', eventId: 'mc' }],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('clickCount'))).toBe(true)
    })

    it('should warn on short long-press duration', () => {
      const config = makeMinimalConfig({
        objects: [
          {
            id: 'obj',
            type: 'button',
            position: { x: 0.5, y: 0.5 },
            interactions: [{ type: 'long-press', emits: 'lp', duration: 50 }],
          },
        ],
        winConditions: [{ type: 'event-fired', eventId: 'lp' }],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('duration'))).toBe(true)
    })

    it('should require waitDuration for wait interaction', () => {
      const config = makeMinimalConfig({
        objects: [
          {
            id: 'obj',
            type: 'button',
            position: { x: 0.5, y: 0.5 },
            interactions: [{ type: 'wait', emits: 'w' }],
          },
        ],
        winConditions: [{ type: 'event-fired', eventId: 'w' }],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('waitDuration'))).toBe(true)
    })

    it('should require targetScale for pinch interaction', () => {
      const config = makeMinimalConfig({
        objects: [
          {
            id: 'obj',
            type: 'button',
            position: { x: 0.5, y: 0.5 },
            interactions: [{ type: 'pinch', emits: 'p' }],
          },
        ],
        winConditions: [{ type: 'event-fired', eventId: 'p' }],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('targetScale'))).toBe(true)
    })
  })

  describe('validate - conditions', () => {
    it('should reject unknown condition type', () => {
      const config = makeMinimalConfig({
        winConditions: [{ type: 'magic' as any }],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('未知条件类型'))).toBe(true)
    })

    it('should require children in composite condition', () => {
      const config = makeMinimalConfig({
        winConditions: [{ type: 'composite', children: [] }],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('children'))).toBe(true)
    })
  })

  describe('validate - event reachability', () => {
    it('should detect unreachable event in winConditions', () => {
      const config = makeMinimalConfig({
        winConditions: [{ type: 'event-fired', eventId: 'ghost-event' }],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('ghost-event'))).toBe(true)
    })

    it('should skip reachability check when scriptId is present', () => {
      const config = makeMinimalConfig({
        scriptId: 'custom-script',
        winConditions: [{ type: 'event-fired', eventId: 'ghost-event' }],
      })
      const errors = validator.validate(config)
      expect(errors.filter((e) => e.message.includes('ghost-event'))).toHaveLength(0)
    })

    it('should detect unreachable event in sequence condition', () => {
      const config = makeMinimalConfig({
        winConditions: [{ type: 'sequence', eventSequence: ['btn-clicked', 'missing'] }],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('missing'))).toBe(true)
    })
  })

  describe('validate - hints', () => {
    it('should detect hint referencing non-existent object', () => {
      const config = makeMinimalConfig({
        hints: [
          { level: 'strong', text: '提示', showAfterFailCount: 1, highlightObjectId: 'no-such-obj' },
        ],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('no-such-obj'))).toBe(true)
    })

    it('should pass when hint references existing object', () => {
      const config = makeMinimalConfig({
        hints: [
          { level: 'strong', text: '提示', showAfterFailCount: 1, highlightObjectId: 'btn' },
        ],
      })
      const errors = validator.validate(config)
      expect(errors.filter((e) => e.path.includes('hints'))).toHaveLength(0)
    })
  })

  describe('validate - reactions', () => {
    it('should require trigger on reaction', () => {
      const config = makeMinimalConfig({
        reactions: [
          { trigger: '', actions: [{ type: 'show', objectId: 'btn' }] },
        ],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('trigger'))).toBe(true)
    })

    it('should require at least one action', () => {
      const config = makeMinimalConfig({
        reactions: [{ trigger: 'btn-clicked', actions: [] }],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('action'))).toBe(true)
    })

    it('should reject unknown action type', () => {
      const config = makeMinimalConfig({
        reactions: [
          { trigger: 'btn-clicked', actions: [{ type: 'explode' as any }] },
        ],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('未知 action 类型'))).toBe(true)
    })

    it('should warn on action referencing non-existent object', () => {
      const config = makeMinimalConfig({
        reactions: [
          { trigger: 'btn-clicked', actions: [{ type: 'show', objectId: 'ghost' }] },
        ],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('ghost'))).toBe(true)
    })

    it('should require eventId/value for emit-event action', () => {
      const config = makeMinimalConfig({
        reactions: [
          { trigger: 'btn-clicked', actions: [{ type: 'emit-event' }] },
        ],
      })
      const errors = validator.validate(config)
      expect(errors.some((e) => e.message.includes('emit-event'))).toBe(true)
    })
  })

  describe('validateAll - cross-level checks', () => {
    it('should detect duplicate level IDs', () => {
      const a = makeMinimalConfig({ id: 'level-dup' })
      const b = makeMinimalConfig({ id: 'level-dup' })
      const results = validator.validateAll([a, b])
      const errorsForDup = results.get('level-dup') ?? []
      expect(errorsForDup.some((e) => e.message.includes('重复'))).toBe(true)
    })

    it('should validate each config independently', () => {
      const good = makeMinimalConfig({ id: 'level-good' })
      const bad = makeMinimalConfig({ id: '', title: '' })
      const results = validator.validateAll([good, bad])
      const goodErrors = results.get('level-good') ?? []
      expect(goodErrors.filter((e) => e.severity === 'error')).toHaveLength(0)
    })
  })
})
