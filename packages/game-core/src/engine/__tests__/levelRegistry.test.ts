import { describe, it, expect, beforeEach } from 'vitest'

/**
 * levelRegistry 使用模块级全局状态，需要在每次测试前
 * 重新 import 以获得干净状态。使用 vi.resetModules 实现隔离。
 */
import { vi } from 'vitest'
import type { LevelConfig } from '@nicetap/shared'

function makeConfig(id: string, chapter: number, order: number): LevelConfig {
  return {
    id,
    chapter,
    order,
    title: `Level ${id}`,
    instruction: 'test',
    tags: ['text-trick'],
    background: { type: 'color', value: '#fff' },
    objects: [{ id: 'obj', type: 'button', position: { x: 0.5, y: 0.5 } }],
    winConditions: [{ type: 'event-fired', eventId: 'x' }],
    passFeedback: { texts: ['pass'] },
    failFeedback: { texts: ['fail'] },
  }
}

async function getCleanRegistry() {
  vi.resetModules()
  return import('../levelRegistry')
}

describe('levelRegistry', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should register and retrieve levels', async () => {
    const { registerLevels, getLevel, getLevelCount } = await getCleanRegistry()
    const configs = [makeConfig('level-001', 1, 1), makeConfig('level-002', 1, 2)]
    registerLevels(configs)

    expect(getLevelCount()).toBe(2)
    expect(getLevel('level-001')).toBeDefined()
    expect(getLevel('level-001')!.id).toBe('level-001')
  })

  it('should return undefined for unregistered level', async () => {
    const { getLevel } = await getCleanRegistry()
    expect(getLevel('nope')).toBeUndefined()
  })

  it('should sort IDs by chapter then order', async () => {
    const { registerLevels, getAllLevelIds } = await getCleanRegistry()
    registerLevels([
      makeConfig('level-003', 2, 1),
      makeConfig('level-001', 1, 1),
      makeConfig('level-002', 1, 2),
    ])
    expect(getAllLevelIds()).toEqual(['level-001', 'level-002', 'level-003'])
  })

  it('should allow re-registering levels (overwrite)', async () => {
    const { registerLevels, getLevel } = await getCleanRegistry()
    registerLevels([makeConfig('level-001', 1, 1)])
    const updated = makeConfig('level-001', 2, 5)
    updated.title = 'Updated'
    registerLevels([updated])
    expect(getLevel('level-001')!.title).toBe('Updated')
  })
})
