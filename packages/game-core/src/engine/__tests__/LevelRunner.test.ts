import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { LevelConfig } from '@nicetap/shared'
import type { LevelRunnerCallbacks, LevelStatus } from '../LevelRunner'

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

async function setup(configs: LevelConfig[]) {
  vi.resetModules()
  const registry = await import('../levelRegistry')
  registry.registerLevels(configs)

  const { LevelRunner } = await import('../LevelRunner')

  const statuses: LevelStatus[] = []
  const loadedConfigs: LevelConfig[] = []
  const callbacks: LevelRunnerCallbacks = {
    onStatusChange: (s) => statuses.push(s),
    onLevelLoaded: (c) => loadedConfigs.push(c),
  }
  const runner = new LevelRunner(callbacks)
  return { runner, statuses, loadedConfigs }
}

describe('LevelRunner', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should load first level', async () => {
    const configs = [makeConfig('level-001', 1, 1), makeConfig('level-002', 1, 2)]
    const { runner, statuses, loadedConfigs } = await setup(configs)

    await runner.loadFirstLevel()
    expect(statuses).toEqual(['playing'])
    expect(loadedConfigs[0].id).toBe('level-001')
    expect(runner.getCurrentIndex()).toBe(0)
  })

  it('should load next level', async () => {
    const configs = [makeConfig('level-001', 1, 1), makeConfig('level-002', 1, 2)]
    const { runner } = await setup(configs)

    await runner.loadFirstLevel()
    expect(runner.hasNextLevel()).toBe(true)
    const next = await runner.loadNextLevel()
    expect(next!.id).toBe('level-002')
    expect(runner.getCurrentIndex()).toBe(1)
  })

  it('should return null when no more levels', async () => {
    const configs = [makeConfig('level-001', 1, 1)]
    const { runner } = await setup(configs)

    await runner.loadFirstLevel()
    expect(runner.hasNextLevel()).toBe(false)
    const next = await runner.loadNextLevel()
    expect(next).toBeNull()
  })

  it('should retry current level', async () => {
    const configs = [makeConfig('level-001', 1, 1)]
    const { runner, loadedConfigs } = await setup(configs)

    await runner.loadFirstLevel()
    await runner.retryLevel()
    expect(loadedConfigs).toHaveLength(2)
    expect(loadedConfigs[1].id).toBe('level-001')
  })

  it('should mark win/fail correctly', async () => {
    const configs = [makeConfig('level-001', 1, 1)]
    const { runner, statuses } = await setup(configs)

    await runner.loadFirstLevel()
    runner.markWin()
    expect(runner.getStatus()).toBe('win')
    expect(statuses).toEqual(['playing', 'win'])

    await runner.retryLevel()
    runner.markFail()
    expect(runner.getStatus()).toBe('fail')
  })

  it('should throw on invalid level ID', async () => {
    const configs = [makeConfig('level-001', 1, 1)]
    const { runner } = await setup(configs)

    await expect(runner.loadLevel('nope')).rejects.toThrow('关卡未找到')
  })

  it('should throw on out-of-bounds index', async () => {
    const configs = [makeConfig('level-001', 1, 1)]
    const { runner } = await setup(configs)

    await expect(runner.loadLevelByIndex(99)).rejects.toThrow('关卡索引越界')
  })

  it('should report total levels', async () => {
    const configs = [
      makeConfig('level-001', 1, 1),
      makeConfig('level-002', 1, 2),
      makeConfig('level-003', 1, 3),
    ]
    const { runner } = await setup(configs)
    expect(runner.getTotalLevels()).toBe(3)
  })
})
