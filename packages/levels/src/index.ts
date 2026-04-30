/**
 * 关卡注册表 - 所有关卡配置的集中入口
 *
 * 配置文件按 level-XXX.json 命名，自动注册到 registry。
 * 消费方通过 getLevel / getAllLevels 获取配置。
 */

import type { LevelConfig } from '@nicetap/shared'

import level001 from './configs/level-001.json'
import level002 from './configs/level-002.json'
import level003 from './configs/level-003.json'
import level004 from './configs/level-004.json'
import level005 from './configs/level-005.json'
import level006 from './configs/level-006.json'
import level007 from './configs/level-007.json'
import level008 from './configs/level-008.json'
import level009 from './configs/level-009.json'
import level010 from './configs/level-010.json'
import level011 from './configs/level-011.json'
import level012 from './configs/level-012.json'
import level013 from './configs/level-013.json'
import level014 from './configs/level-014.json'
import level015 from './configs/level-015.json'
import level016 from './configs/level-016.json'
import level017 from './configs/level-017.json'
import level018 from './configs/level-018.json'
import level019 from './configs/level-019.json'
import level020 from './configs/level-020.json'
import level021 from './configs/level-021.json'
import level022 from './configs/level-022.json'
import level023 from './configs/level-023.json'
import level024 from './configs/level-024.json'
import level025 from './configs/level-025.json'
import level026 from './configs/level-026.json'
import level027 from './configs/level-027.json'
import level028 from './configs/level-028.json'
import level029 from './configs/level-029.json'
import level030 from './configs/level-030.json'

const levelRegistry: Map<string, LevelConfig> = new Map()

function registerLevel(config: LevelConfig): void {
  levelRegistry.set(config.id, config)
}

const ALL_CONFIGS: LevelConfig[] = [
  level001 as unknown as LevelConfig,
  level002 as unknown as LevelConfig,
  level003 as unknown as LevelConfig,
  level004 as unknown as LevelConfig,
  level005 as unknown as LevelConfig,
  level006 as unknown as LevelConfig,
  level007 as unknown as LevelConfig,
  level008 as unknown as LevelConfig,
  level009 as unknown as LevelConfig,
  level010 as unknown as LevelConfig,
  level011 as unknown as LevelConfig,
  level012 as unknown as LevelConfig,
  level013 as unknown as LevelConfig,
  level014 as unknown as LevelConfig,
  level015 as unknown as LevelConfig,
  level016 as unknown as LevelConfig,
  level017 as unknown as LevelConfig,
  level018 as unknown as LevelConfig,
  level019 as unknown as LevelConfig,
  level020 as unknown as LevelConfig,
  level021 as unknown as LevelConfig,
  level022 as unknown as LevelConfig,
  level023 as unknown as LevelConfig,
  level024 as unknown as LevelConfig,
  level025 as unknown as LevelConfig,
  level026 as unknown as LevelConfig,
  level027 as unknown as LevelConfig,
  level028 as unknown as LevelConfig,
  level029 as unknown as LevelConfig,
  level030 as unknown as LevelConfig,
]

for (const config of ALL_CONFIGS) {
  registerLevel(config)
}

export function getLevel(id: string): LevelConfig | undefined {
  return levelRegistry.get(id)
}

export function getAllLevels(): LevelConfig[] {
  return Array.from(levelRegistry.values()).sort((a, b) => {
    if (a.chapter !== b.chapter) return a.chapter - b.chapter
    return a.order - b.order
  })
}

export function getAllLevelIds(): string[] {
  return getAllLevels().map((l) => l.id)
}

export function getLevelsByChapter(chapter: number): LevelConfig[] {
  return getAllLevels().filter((l) => l.chapter === chapter)
}

export function getLevelCount(): number {
  return levelRegistry.size
}

export function getChapterCount(): number {
  const chapters = new Set(Array.from(levelRegistry.values()).map((l) => l.chapter))
  return chapters.size
}

export { ALL_CONFIGS }
