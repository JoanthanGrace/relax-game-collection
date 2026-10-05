interface Point { x: number; y: number }
interface Bounds { left: number; right: number; top: number; bottom: number }

export function constrainDrag(origin: Point, bounds: Bounds, target: Point, width: number, height: number): Point {
  const clamp = (value: number, min: number, max: number) => min > max ? (min + max) / 2 : Math.max(min, Math.min(max, value))
  return {
    x: clamp(target.x, origin.x - bounds.left, width - (bounds.right - origin.x)),
    y: clamp(target.y, origin.y - bounds.top, height - (bounds.bottom - origin.y)),
  }
}
