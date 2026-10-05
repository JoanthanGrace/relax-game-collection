import type { SwipeDirection } from '@nicetap/shared'

export function matchesSwipe(
  dx: number,
  dy: number,
  direction: SwipeDirection,
  threshold: number,
): boolean {
  if (Math.hypot(dx, dy) < threshold) return false
  if (direction === 'any') return true
  if (direction === 'left') return dx < 0 && Math.abs(dx) >= Math.abs(dy)
  if (direction === 'right') return dx > 0 && Math.abs(dx) >= Math.abs(dy)
  if (direction === 'up') return dy < 0 && Math.abs(dy) >= Math.abs(dx)
  return dy > 0 && Math.abs(dy) >= Math.abs(dx)
}
