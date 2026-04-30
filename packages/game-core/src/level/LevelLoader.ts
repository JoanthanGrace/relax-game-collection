/**
 * 关卡加载器 - 从注册表或远程获取关卡配置
 *
 * 支持两种模式：
 * 1. 本地注册表模式（开发期、小程序）：直接从 import 的 JSON 获取
 * 2. 远程加载模式（Web 生产环境）：按需 fetch JSON
 *
 * 配置和脚本分开缓存，避免加载不必要的 JS 代码。
 */

import type { LevelConfig, LevelScript } from '@nicetap/shared'

export interface LevelLoaderOptions {
  /** 本地关卡注册表（优先查找） */
  registry?: Map<string, LevelConfig>
  /** 远程配置基础路径，如 '/levels/configs' */
  remoteBasePath?: string
}

export class LevelLoader {
  private configCache = new Map<string, LevelConfig>()
  private scriptCache = new Map<string, LevelScript>()
  private registry: Map<string, LevelConfig>
  private remoteBasePath: string

  constructor(options: LevelLoaderOptions = {}) {
    this.registry = options.registry ?? new Map()
    this.remoteBasePath = options.remoteBasePath ?? '/levels/configs'
  }

  async loadConfig(levelId: string): Promise<LevelConfig> {
    const cached = this.configCache.get(levelId)
    if (cached) return cached

    const fromRegistry = this.registry.get(levelId)
    if (fromRegistry) {
      this.configCache.set(levelId, fromRegistry)
      return fromRegistry
    }

    const config = await this.fetchConfig(levelId)
    this.configCache.set(levelId, config)
    return config
  }

  async loadScript(scriptId: string): Promise<LevelScript | null> {
    if (!scriptId) return null

    const cached = this.scriptCache.get(scriptId)
    if (cached) return cached

    try {
      const module = await import(
        /* @vite-ignore */
        `@nicetap/levels/scripts/${scriptId}`
      )
      const script: LevelScript = module.script ?? module.default
      this.scriptCache.set(scriptId, script)
      return script
    } catch {
      throw new Error(`关卡脚本加载失败: ${scriptId}，请确认脚本文件存在`)
    }
  }

  getRegisteredIds(): string[] {
    return Array.from(this.registry.keys())
  }

  getRegisteredCount(): number {
    return this.registry.size
  }

  registerConfig(config: LevelConfig): void {
    this.registry.set(config.id, config)
  }

  registerConfigs(configs: LevelConfig[]): void {
    for (const config of configs) {
      this.registry.set(config.id, config)
    }
  }

  clearCache(): void {
    this.configCache.clear()
    this.scriptCache.clear()
  }

  private async fetchConfig(levelId: string): Promise<LevelConfig> {
    const url = `${this.remoteBasePath}/${levelId}.json`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`关卡配置加载失败: ${levelId} (HTTP ${response.status})`)
    }
    return response.json() as Promise<LevelConfig>
  }
}
