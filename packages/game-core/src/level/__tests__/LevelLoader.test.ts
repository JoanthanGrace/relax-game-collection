import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LevelLoader } from '../LevelLoader'
import type { LevelConfig } from '@nicetap/shared'

function makeConfig(id: string): LevelConfig {
  return {
    id,
    chapter: 1,
    order: 1,
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

describe('LevelLoader', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('registry mode', () => {
    it('should load config from registry', async () => {
      const registry = new Map<string, LevelConfig>()
      const config = makeConfig('level-001')
      registry.set('level-001', config)

      const loader = new LevelLoader({ registry })
      const result = await loader.loadConfig('level-001')
      expect(result).toBe(config)
    })

    it('should cache loaded configs', async () => {
      const registry = new Map<string, LevelConfig>()
      registry.set('level-001', makeConfig('level-001'))

      const loader = new LevelLoader({ registry })
      const first = await loader.loadConfig('level-001')
      const second = await loader.loadConfig('level-001')
      expect(first).toBe(second)
    })

    it('should register configs dynamically', () => {
      const loader = new LevelLoader()
      expect(loader.getRegisteredCount()).toBe(0)

      loader.registerConfig(makeConfig('level-001'))
      expect(loader.getRegisteredCount()).toBe(1)
      expect(loader.getRegisteredIds()).toEqual(['level-001'])
    })

    it('should bulk register configs', () => {
      const loader = new LevelLoader()
      loader.registerConfigs([makeConfig('level-001'), makeConfig('level-002')])
      expect(loader.getRegisteredCount()).toBe(2)
    })
  })

  describe('remote fetch mode', () => {
    it('should fetch config when not in registry', async () => {
      const config = makeConfig('level-remote')
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(config),
      })
      vi.stubGlobal('fetch', mockFetch)

      const loader = new LevelLoader({ remoteBasePath: '/api/levels' })
      const result = await loader.loadConfig('level-remote')
      expect(result).toEqual(config)
      expect(mockFetch).toHaveBeenCalledWith('/api/levels/level-remote.json')
    })

    it('should throw on HTTP error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 404 }),
      )

      const loader = new LevelLoader()
      await expect(loader.loadConfig('missing')).rejects.toThrow('关卡配置加载失败')
    })
  })

  describe('clearCache', () => {
    it('should clear both config and script caches', async () => {
      const registry = new Map<string, LevelConfig>()
      registry.set('level-001', makeConfig('level-001'))
      const loader = new LevelLoader({ registry })

      await loader.loadConfig('level-001')
      loader.clearCache()

      const result = await loader.loadConfig('level-001')
      expect(result.id).toBe('level-001')
    })
  })
})
