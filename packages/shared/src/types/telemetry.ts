/**
 * 埋点事件类型定义
 * 详细设计参见 docs/testing-strategy.md
 */

export interface TelemetryEvent {
  name: string
  timestamp: number
  properties?: Record<string, unknown>
}

export type TelemetryDomain = 'level' | 'ui' | 'system' | 'user'

export type TelemetryAction =
  | 'start'
  | 'pass'
  | 'fail'
  | 'retry'
  | 'hint-shown'
  | 'interaction'
  | 'timeout'
