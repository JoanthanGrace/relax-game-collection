import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConditionEvaluator } from '../ConditionEvaluator'
import type { Condition } from '@nicetap/shared'

describe('ConditionEvaluator', () => {
  let evaluator: ConditionEvaluator
  const stubGetObjectState = vi.fn((_id: string, _key: string) => undefined as unknown)

  beforeEach(() => {
    evaluator = new ConditionEvaluator(stubGetObjectState)
    stubGetObjectState.mockReset()
  })

  describe('recordEvent', () => {
    it('should track fired events', () => {
      evaluator.recordEvent('click')
      expect(evaluator.hasEventFired('click')).toBe(true)
      expect(evaluator.hasEventFired('other')).toBe(false)
    })

    it('should count events', () => {
      evaluator.recordEvent('click')
      evaluator.recordEvent('click')
      evaluator.recordEvent('click')
      expect(evaluator.getEventCount('click')).toBe(3)
      expect(evaluator.getEventCount('other')).toBe(0)
    })
  })

  describe('evaluate - event-fired', () => {
    it('should return false before event is fired', () => {
      const cond: Condition = { type: 'event-fired', eventId: 'click' }
      expect(evaluator.evaluate(cond)).toBe(false)
    })

    it('should return true after event is fired', () => {
      evaluator.recordEvent('click')
      const cond: Condition = { type: 'event-fired', eventId: 'click' }
      expect(evaluator.evaluate(cond)).toBe(true)
    })
  })

  describe('evaluate - event-count', () => {
    it('should use gte comparator by default', () => {
      const cond: Condition = { type: 'event-count', eventId: 'click', count: 3 }
      evaluator.recordEvent('click')
      evaluator.recordEvent('click')
      expect(evaluator.evaluate(cond)).toBe(false)
      evaluator.recordEvent('click')
      expect(evaluator.evaluate(cond)).toBe(true)
    })

    it('should support eq comparator', () => {
      const cond: Condition = { type: 'event-count', eventId: 'click', count: 2, comparator: 'eq' }
      evaluator.recordEvent('click')
      expect(evaluator.evaluate(cond)).toBe(false)
      evaluator.recordEvent('click')
      expect(evaluator.evaluate(cond)).toBe(true)
      evaluator.recordEvent('click')
      expect(evaluator.evaluate(cond)).toBe(false)
    })

    it('should support lt comparator', () => {
      const cond: Condition = { type: 'event-count', eventId: 'click', count: 2, comparator: 'lt' }
      expect(evaluator.evaluate(cond)).toBe(true)
      evaluator.recordEvent('click')
      expect(evaluator.evaluate(cond)).toBe(true)
      evaluator.recordEvent('click')
      expect(evaluator.evaluate(cond)).toBe(false)
    })
  })

  describe('evaluate - no-action', () => {
    it('should detect idle when enough time has passed', () => {
      const cond: Condition = { type: 'no-action', idleDuration: 0.001 }

      vi.useFakeTimers()
      evaluator = new ConditionEvaluator(stubGetObjectState)
      vi.advanceTimersByTime(10)
      expect(evaluator.evaluate(cond)).toBe(true)
      vi.useRealTimers()
    })

    it('should return false when action was recent', () => {
      const cond: Condition = { type: 'no-action', idleDuration: 10 }
      evaluator.recordEvent('something')
      expect(evaluator.evaluate(cond)).toBe(false)
    })
  })

  describe('evaluate - timer-expired', () => {
    it('should detect timer expiry', () => {
      const cond: Condition = { type: 'timer-expired', seconds: 0.001 }

      vi.useFakeTimers()
      evaluator = new ConditionEvaluator(stubGetObjectState)
      vi.advanceTimersByTime(10)
      expect(evaluator.evaluate(cond)).toBe(true)
      vi.useRealTimers()
    })
  })

  describe('evaluate - object-state', () => {
    it('should delegate to getObjectState callback', () => {
      stubGetObjectState.mockReturnValue(true)
      const cond: Condition = {
        type: 'object-state',
        objectId: 'btn',
        property: { key: 'visible', value: 1, comparator: 'eq' },
      }
      evaluator.evaluate(cond)
      expect(stubGetObjectState).toHaveBeenCalledWith('btn', 'visible')
    })
  })

  describe('evaluate - sequence', () => {
    it('should match exact event sequence at the end', () => {
      const cond: Condition = {
        type: 'sequence',
        eventSequence: ['a', 'b', 'c'],
      }
      evaluator.recordEvent('a')
      evaluator.recordEvent('b')
      expect(evaluator.evaluate(cond)).toBe(false)
      evaluator.recordEvent('c')
      expect(evaluator.evaluate(cond)).toBe(true)
    })

    it('should fail on wrong order', () => {
      const cond: Condition = {
        type: 'sequence',
        eventSequence: ['a', 'b'],
      }
      evaluator.recordEvent('b')
      evaluator.recordEvent('a')
      expect(evaluator.evaluate(cond)).toBe(false)
    })

    it('should match the last N events, ignoring earlier ones', () => {
      const cond: Condition = {
        type: 'sequence',
        eventSequence: ['a', 'b'],
      }
      evaluator.recordEvent('x')
      evaluator.recordEvent('y')
      evaluator.recordEvent('a')
      evaluator.recordEvent('b')
      expect(evaluator.evaluate(cond)).toBe(true)
    })
  })

  describe('evaluate - composite', () => {
    it('should AND children by default', () => {
      const cond: Condition = {
        type: 'composite',
        children: [
          { type: 'event-fired', eventId: 'a' },
          { type: 'event-fired', eventId: 'b' },
        ],
      }
      evaluator.recordEvent('a')
      expect(evaluator.evaluate(cond)).toBe(false)
      evaluator.recordEvent('b')
      expect(evaluator.evaluate(cond)).toBe(true)
    })

    it('should OR children when operator=or', () => {
      const cond: Condition = {
        type: 'composite',
        operator: 'or',
        children: [
          { type: 'event-fired', eventId: 'a' },
          { type: 'event-fired', eventId: 'b' },
        ],
      }
      evaluator.recordEvent('a')
      expect(evaluator.evaluate(cond)).toBe(true)
    })
  })

  describe('evaluate - negate', () => {
    it('should negate the result when negate=true', () => {
      const cond: Condition = { type: 'event-fired', eventId: 'click', negate: true }
      expect(evaluator.evaluate(cond)).toBe(true)
      evaluator.recordEvent('click')
      expect(evaluator.evaluate(cond)).toBe(false)
    })
  })

  describe('evaluateAll', () => {
    it('should AND multiple conditions by default', () => {
      const conditions: Condition[] = [
        { type: 'event-fired', eventId: 'a' },
        { type: 'event-fired', eventId: 'b' },
      ]
      evaluator.recordEvent('a')
      expect(evaluator.evaluateAll(conditions)).toBe(false)
      evaluator.recordEvent('b')
      expect(evaluator.evaluateAll(conditions)).toBe(true)
    })

    it('should OR multiple conditions when logic=or', () => {
      const conditions: Condition[] = [
        { type: 'event-fired', eventId: 'a' },
        { type: 'event-fired', eventId: 'b' },
      ]
      evaluator.recordEvent('b')
      expect(evaluator.evaluateAll(conditions, 'or')).toBe(true)
    })

    it('should return false for empty conditions', () => {
      expect(evaluator.evaluateAll([])).toBe(false)
    })
  })

  describe('reset', () => {
    it('should clear all state', () => {
      evaluator.recordEvent('click')
      evaluator.reset()
      expect(evaluator.hasEventFired('click')).toBe(false)
      expect(evaluator.getEventCount('click')).toBe(0)
    })
  })

  describe('unknown condition type', () => {
    it('should return false for unrecognized type', () => {
      const cond = { type: 'does-not-exist' } as unknown as Condition
      expect(evaluator.evaluate(cond)).toBe(false)
    })
  })
})
