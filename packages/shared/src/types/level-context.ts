/**
 * LevelContext - 关卡脚本的沙箱 API
 *
 * 脚本通过此接口与引擎交互，永远不直接操作渲染引擎或平台 API。
 * 保证脚本可被测试（mock context）、可跨平台。
 */

import type { Vec2, GameObjectConfig, ObjectStyle } from './level'

export interface LevelContext {
  // ═══ 对象操作 ═══

  showObject(objectId: string): void
  hideObject(objectId: string): void
  setObjectInteractive(objectId: string, interactive: boolean): void
  moveObject(objectId: string, to: Vec2, durationMs?: number): Promise<void>
  scaleObject(objectId: string, scale: number, durationMs?: number): Promise<void>
  rotateObject(objectId: string, degrees: number, durationMs?: number): Promise<void>
  fadeObject(objectId: string, alpha: number, durationMs?: number): Promise<void>
  setObjectText(objectId: string, text: string): void
  setObjectProperty(objectId: string, key: string, value: unknown): void
  spawnObject(config: GameObjectConfig): void
  destroyObject(objectId: string): void

  // ═══ 对象查询 ═══

  getObjectPosition(objectId: string): Vec2
  getObjectScale(objectId: string): number
  getObjectAlpha(objectId: string): number
  isObjectVisible(objectId: string): boolean

  // ═══ 流程控制 ═══

  win(): void
  fail(message?: string): void
  emitEvent(eventId: string): void

  // ═══ 反馈 ═══

  playSFX(key: string): void
  stopSFX(key: string): void
  vibrate(intensity: 'light' | 'medium' | 'heavy'): void
  playAnimation(objectId: string, animation: string): void
  showFloatingText(
    text: string,
    position: Vec2,
    durationMs?: number,
    style?: Partial<ObjectStyle>
  ): void

  // ═══ 时间 ═══

  getElapsedMs(): number
  delay(ms: number, callback: () => void): { cancel: () => void }
  interval(ms: number, callback: () => void): { cancel: () => void }

  // ═══ 状态 ═══

  getEventCount(eventId: string): number
  hasEventFired(eventId: string): boolean
  setState(key: string, value: unknown): void
  getState<T>(key: string): T | undefined

  // ═══ 屏幕信息 ═══

  getScreenSize(): { width: number; height: number }
}
