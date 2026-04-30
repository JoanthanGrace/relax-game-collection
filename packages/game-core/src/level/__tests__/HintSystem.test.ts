import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HintSystem } from '../HintSystem'
import type { HintCallbacks } from '../HintSystem'
import type { HintConfig } from '@nicetap/shared'

function makeCallbacks(): HintCallbacks & {
  showCalls: string[]
  highlightCalls: string[]
  dismissCalls: number
} {
  const result = {
    showCalls: [] as string[],
    highlightCalls: [] as string[],
    dismissCalls: 0,
    showHintText(text: string) {
      result.showCalls.push(text)
    },
    highlightObject(objectId: string) {
      result.highlightCalls.push(objectId)
    },
    dismissHint() {
      result.dismissCalls++
    },
  }
  return result
}

describe('HintSystem', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should show hint when fail count reaches threshold', () => {
    const hints: HintConfig[] = [
      { level: 'weak', text: '提示1', showAfterFailCount: 2 },
    ]
    const cb = makeCallbacks()
    const sys = new HintSystem(hints, cb)

    sys.onFail()
    expect(cb.showCalls).toHaveLength(0)

    sys.onFail()
    expect(cb.showCalls).toEqual(['提示1'])
  })

  it('should show hints in order of showAfterFailCount', () => {
    const hints: HintConfig[] = [
      { level: 'strong', text: '强提示', showAfterFailCount: 4 },
      { level: 'weak', text: '弱提示', showAfterFailCount: 1 },
      { level: 'medium', text: '中提示', showAfterFailCount: 2 },
    ]
    const cb = makeCallbacks()
    const sys = new HintSystem(hints, cb)

    sys.onFail() // count=1, show 弱提示
    expect(cb.showCalls).toEqual(['弱提示'])

    sys.onFail() // count=2, show 中提示
    expect(cb.showCalls).toEqual(['弱提示', '中提示'])

    sys.onFail() // count=3, nothing new
    expect(cb.showCalls).toHaveLength(2)

    sys.onFail() // count=4, show 强提示
    expect(cb.showCalls).toEqual(['弱提示', '中提示', '强提示'])
  })

  it('should not repeat the same hint', () => {
    const hints: HintConfig[] = [
      { level: 'weak', text: '提示1', showAfterFailCount: 1 },
    ]
    const cb = makeCallbacks()
    const sys = new HintSystem(hints, cb)

    sys.onFail()
    sys.onFail()
    sys.onFail()
    expect(cb.showCalls).toEqual(['提示1'])
  })

  it('should highlight object when highlightObjectId is set', () => {
    const hints: HintConfig[] = [
      { level: 'weak', text: '提示1', showAfterFailCount: 1, highlightObjectId: 'btn-1' },
    ]
    const cb = makeCallbacks()
    const sys = new HintSystem(hints, cb)

    sys.onFail()
    expect(cb.highlightCalls).toEqual(['btn-1'])
  })

  it('should auto-dismiss after autoDismissMs', () => {
    const hints: HintConfig[] = [
      { level: 'weak', text: '临时提示', showAfterFailCount: 1, autoDismissMs: 3000 },
    ]
    const cb = makeCallbacks()
    const sys = new HintSystem(hints, cb)

    sys.onFail()
    expect(cb.dismissCalls).toBe(0)

    vi.advanceTimersByTime(3000)
    expect(cb.dismissCalls).toBe(1)
  })

  it('should reset state correctly', () => {
    const hints: HintConfig[] = [
      { level: 'weak', text: '提示1', showAfterFailCount: 1 },
    ]
    const cb = makeCallbacks()
    const sys = new HintSystem(hints, cb)

    sys.onFail()
    expect(cb.showCalls).toHaveLength(1)
    expect(sys.getFailCount()).toBe(1)

    sys.reset()
    expect(sys.getFailCount()).toBe(0)

    sys.onFail()
    expect(cb.showCalls).toHaveLength(2) // hint can be shown again
  })

  it('should handle empty hints gracefully', () => {
    const cb = makeCallbacks()
    const sys = new HintSystem([], cb)

    sys.onFail()
    sys.onFail()
    expect(cb.showCalls).toHaveLength(0)
  })
})
