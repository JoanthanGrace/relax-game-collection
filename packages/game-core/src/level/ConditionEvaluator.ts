/**
 * 条件求值器 - 响应式判定通关/失败
 *
 * 每次事件触发或 tick 时重新求值所有条件树。
 * 零渲染引擎依赖，纯逻辑可独立测试。
 */

import type { Condition, ObjectStateProperty } from '@nicetap/shared'

export interface EvaluatorState {
  firedEvents: Set<string>
  eventCounts: Map<string, number>
  eventTimeline: string[]
  lastActionTime: number
  levelStartTime: number
  getObjectState: (objectId: string, key: string) => unknown
}

export class ConditionEvaluator {
  private state: EvaluatorState

  constructor(getObjectState: (id: string, key: string) => unknown) {
    const now = Date.now()
    this.state = {
      firedEvents: new Set(),
      eventCounts: new Map(),
      eventTimeline: [],
      lastActionTime: now,
      levelStartTime: now,
      getObjectState,
    }
  }

  recordEvent(eventId: string): void {
    this.state.firedEvents.add(eventId)
    this.state.eventCounts.set(eventId, (this.state.eventCounts.get(eventId) ?? 0) + 1)
    this.state.eventTimeline.push(eventId)
    this.state.lastActionTime = Date.now()
  }

  evaluate(condition: Condition): boolean {
    const raw = this.evaluateRaw(condition)
    return condition.negate ? !raw : raw
  }

  evaluateAll(conditions: Condition[], logic: 'and' | 'or' = 'and'): boolean {
    if (conditions.length === 0) return false
    return logic === 'and'
      ? conditions.every((c) => this.evaluate(c))
      : conditions.some((c) => this.evaluate(c))
  }

  getEventCount(eventId: string): number {
    return this.state.eventCounts.get(eventId) ?? 0
  }

  hasEventFired(eventId: string): boolean {
    return this.state.firedEvents.has(eventId)
  }

  reset(): void {
    const now = Date.now()
    this.state.firedEvents.clear()
    this.state.eventCounts.clear()
    this.state.eventTimeline = []
    this.state.lastActionTime = now
    this.state.levelStartTime = now
  }

  private evaluateRaw(condition: Condition): boolean {
    switch (condition.type) {
      case 'event-fired':
        return this.state.firedEvents.has(condition.eventId!)

      case 'event-count': {
        const actual = this.state.eventCounts.get(condition.eventId!) ?? 0
        return this.compare(actual, condition.count ?? 1, condition.comparator ?? 'gte')
      }

      case 'no-action': {
        const idleMs = Date.now() - this.state.lastActionTime
        return idleMs >= (condition.idleDuration ?? 3) * 1000
      }

      case 'timer-expired': {
        const elapsed = (Date.now() - this.state.levelStartTime) / 1000
        return elapsed >= (condition.seconds ?? 0)
      }

      case 'object-state': {
        const prop = condition.property as ObjectStateProperty
        const actual = this.state.getObjectState(condition.objectId!, prop.key)
        return this.compare(actual as number, prop.value as number, prop.comparator ?? 'eq')
      }

      case 'sequence': {
        const seq = condition.eventSequence!
        if (this.state.eventTimeline.length < seq.length) return false
        const recent = this.state.eventTimeline.slice(-seq.length)
        return seq.every((e, i) => recent[i] === e)
      }

      case 'composite':
        return this.evaluateAll(condition.children ?? [], condition.operator ?? 'and')

      default:
        return false
    }
  }

  private compare(actual: number, expected: number, op: string): boolean {
    switch (op) {
      case 'eq':
        return actual === expected
      case 'gte':
        return actual >= expected
      case 'lte':
        return actual <= expected
      case 'gt':
        return actual > expected
      case 'lt':
        return actual < expected
      default:
        return actual === expected
    }
  }
}
