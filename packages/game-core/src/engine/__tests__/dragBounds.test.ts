import { describe, expect, it } from 'vitest'
import { constrainDrag } from '../dragBounds'

describe('drag bounds', () => {
  const origin = { x: 100, y: 200 }
  const bounds = { left: 60, right: 140, top: 170, bottom: 230 }
  it('keeps the entire object within the viewport', () => {
    expect(constrainDrag(origin, bounds, { x: -100, y: 900 }, 400, 600)).toEqual({ x: 40, y: 570 })
    expect(constrainDrag(origin, bounds, { x: 900, y: -100 }, 400, 600)).toEqual({ x: 360, y: 30 })
  })
  it('does not move valid targets', () => {
    expect(constrainDrag(origin, bounds, { x: 200, y: 300 }, 400, 600)).toEqual({ x: 200, y: 300 })
  })
})
