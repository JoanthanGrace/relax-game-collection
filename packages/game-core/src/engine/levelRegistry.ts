import type { LevelConfig } from '@nicetap/shared'

/**
 * 关卡注册表代理
 *
 * game-core 不直接依赖 @nicetap/levels，由消费方（web-app）在启动时注入关卡数据。
 * 这样保持 game-core 的独立性，方便测试和跨平台复用。
 */

const registry = new Map<string, LevelConfig>()
let sortedIds: string[] = []

export function registerLevels(configs: LevelConfig[]) {
  for (const config of configs) {
    registry.set(config.id, config)
  }
  sortedIds = Array.from(registry.values())
    .sort((a, b) => {
      if (a.chapter !== b.chapter) return a.chapter - b.chapter
      return a.order - b.order
    })
    .map((c) => c.id)
}

export function getLevel(id: string): LevelConfig | undefined {
  return registry.get(id)
}

export function getAllLevelIds(): string[] {
  return sortedIds
}

export function getLevelCount(): number {
  return registry.size
}
