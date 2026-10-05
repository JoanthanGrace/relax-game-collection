import { expect, it } from 'vitest'
import { matchesSwipe } from '../swipe'

it('accepts each cardinal direction and free swipes', () => {
  expect(matchesSwipe(-80, 2, 'left', 40)).toBe(true)
  expect(matchesSwipe(80, 2, 'right', 40)).toBe(true)
  expect(matchesSwipe(2, -80, 'up', 40)).toBe(true)
  expect(matchesSwipe(2, 80, 'down', 40)).toBe(true)
  expect(matchesSwipe(50, 50, 'any', 40)).toBe(true)
})
it('rejects taps, wrong directions, and mostly vertical sideways swipes', () => {
  expect(matchesSwipe(10, 10, 'any', 40)).toBe(false)
  expect(matchesSwipe(80, 0, 'left', 40)).toBe(false)
  expect(matchesSwipe(50, 100, 'right', 40)).toBe(false)
})
