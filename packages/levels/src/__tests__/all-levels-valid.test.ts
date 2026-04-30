/**
 * 关卡配置完整性回归测试
 *
 * 每新增一关都会自动经过此测试：确保全量关卡配置无校验错误、
 * ID 不冲突、排序正确、事件可达。
 * 这是"新增一关不会把旧关搞坏"的第一道防线。
 */
import { describe, it, expect } from 'vitest'
import { LevelValidator } from '@nicetap/shared'
import { ALL_CONFIGS, getAllLevelIds, getLevelsByChapter, getLevelCount } from '../index'

const validator = new LevelValidator()

describe('All level configs regression', () => {
  it('should have at least one level registered', () => {
    expect(ALL_CONFIGS.length).toBeGreaterThan(0)
    expect(getLevelCount()).toBe(ALL_CONFIGS.length)
  })

  it('should have unique IDs across all levels', () => {
    const ids = ALL_CONFIGS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should follow level-XXX ID naming convention', () => {
    for (const config of ALL_CONFIGS) {
      expect(config.id).toMatch(/^level-\d{3}$/)
    }
  })

  it('should have consistent chapter/order (no duplicates within chapter)', () => {
    const seen = new Set<string>()
    for (const config of ALL_CONFIGS) {
      const key = `${config.chapter}:${config.order}`
      expect(seen.has(key), `duplicate chapter:order ${key} on ${config.id}`).toBe(false)
      seen.add(key)
    }
  })

  it('should return sorted IDs from getAllLevelIds', () => {
    const ids = getAllLevelIds()
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i] > ids[i - 1], `${ids[i]} should come after ${ids[i - 1]}`).toBe(true)
    }
  })

  it('should group levels by chapter correctly', () => {
    const chapters = new Set(ALL_CONFIGS.map((c) => c.chapter))
    for (const ch of chapters) {
      const group = getLevelsByChapter(ch)
      expect(group.length).toBeGreaterThan(0)
      for (const config of group) {
        expect(config.chapter).toBe(ch)
      }
    }
  })

  describe('individual config validation', () => {
    for (const config of ALL_CONFIGS) {
      it(`${config.id} should pass validation with zero errors`, () => {
        const errors = validator.validate(config)
        const criticalErrors = errors.filter((e) => e.severity === 'error')
        if (criticalErrors.length > 0) {
          const detail = criticalErrors.map((e) => `  [${e.path}] ${e.message}`).join('\n')
          expect.fail(`${config.id} has ${criticalErrors.length} error(s):\n${detail}`)
        }
      })
    }
  })

  describe('cross-level validateAll', () => {
    it('should produce zero errors across all levels', () => {
      const results = validator.validateAll(ALL_CONFIGS)
      const allErrors: string[] = []
      for (const [id, errors] of results) {
        const critical = errors.filter((e) => e.severity === 'error')
        for (const e of critical) {
          allErrors.push(`${id}: [${e.path}] ${e.message}`)
        }
      }
      if (allErrors.length > 0) {
        expect.fail(`Cross-level validation found ${allErrors.length} error(s):\n${allErrors.join('\n')}`)
      }
    })
  })

  describe('structural invariants', () => {
    for (const config of ALL_CONFIGS) {
      it(`${config.id} objects should have valid positions (0~1)`, () => {
        const walk = (objects: typeof config.objects) => {
          for (const obj of objects) {
            expect(obj.position.x, `${config.id}.${obj.id}.position.x`).toBeGreaterThanOrEqual(0)
            expect(obj.position.x, `${config.id}.${obj.id}.position.x`).toBeLessThanOrEqual(1)
            expect(obj.position.y, `${config.id}.${obj.id}.position.y`).toBeGreaterThanOrEqual(0)
            expect(obj.position.y, `${config.id}.${obj.id}.position.y`).toBeLessThanOrEqual(1)
            if (obj.children) walk(obj.children)
          }
        }
        walk(config.objects)
      })
    }

    for (const config of ALL_CONFIGS) {
      it(`${config.id} should have at least one winCondition`, () => {
        expect(config.winConditions.length).toBeGreaterThan(0)
      })
    }

    for (const config of ALL_CONFIGS) {
      it(`${config.id} should have passFeedback with at least one text`, () => {
        expect(config.passFeedback.texts.length).toBeGreaterThan(0)
      })
    }
  })
})
