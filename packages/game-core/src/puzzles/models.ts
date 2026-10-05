import { Graph, alg } from '@dagrejs/graphlib'
import {
  applyMove,
  isSolved,
  parseLevel,
  type SokobanDirection,
  type SokobanLevel,
} from 'miaoda-game-sokoban-core'

export type PuzzleKind = 'rules' | 'boxes' | 'pipes' | 'route' | 'panels'
export type PuzzleState =
  | { kind: 'rules'; swapped: boolean; player: number }
  | { kind: 'boxes'; level: SokobanLevel }
  | { kind: 'pipes'; turns: number[] }
  | { kind: 'route'; path: number[] }
  | { kind: 'panels'; order: number[] }
export type PuzzleAction =
  | { type: 'move'; direction: SokobanDirection }
  | { type: 'swap'; a: number; b: number }
  | { type: 'turn'; index: number }
  | { type: 'visit'; index: number }

export const BOX_MAP = ['######', '# . .#', '# $$ #', '#    #', '# @  #', '######'].join('\n')
export const RULE_WALLS = [4, 11, 3, 9, 21]
export const RULE_GATE = 15
export const RULE_EXIT = 5
export const ROUTE_BLOCKS = [7, 12, 17]
export const ROUTE_PARCELS = [2, 23]
export const ROUTE_GOAL = 14
export const DELTAS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const
// Ports run clockwise: north, east, south, west.
export const PIPE_PARTS: (number[] | null)[] = [
  [0, 1],
  null,
  [0, 2],
  [0, 1],
  [0, 2],
  [0, 1],
  null,
  [0, 2],
  [0, 1],
  [0, 1],
  [0, 2],
  [0, 1],
  null,
  [0, 2],
  null,
  [0, 2],
]
export const PANEL_PORTS = [
  [3, 2],
  [0, 1],
  [3, 0],
  [2, 1],
]

export function createPuzzle(kind: PuzzleKind): PuzzleState {
  if (kind === 'boxes') {
    const parsed = parseLevel(BOX_MAP)
    if (!parsed.ok) throw new Error('Invalid authored box puzzle')
    return { kind, level: parsed.level }
  }
  if (kind === 'rules') return { kind, swapped: false, player: 12 }
  if (kind === 'pipes') return { kind, turns: [0, 0, 1, 1, 0, 0, 0, 1, 1, 2, 0, 0, 0, 1, 0, 1] }
  if (kind === 'route') return { kind, path: [10] }
  return { kind, order: [2, 0, 3, 1] }
}

export function pipePorts(index: number, turns: number[]) {
  return (PIPE_PARTS[index] ?? []).map((port) => (port + turns[index]) % 4)
}

function neighbor(index: number, direction: number, width: number, height: number): number | null {
  const [dx, dy] = DELTAS[direction]
  const x = (index % width) + dx
  const y = Math.floor(index / width) + dy
  return x < 0 || y < 0 || x >= width || y >= height ? null : y * width + x
}

export function connection(
  ports: number[][],
  width: number,
  source: [number, number],
  sink: [number, number],
) {
  const graph = new Graph({ directed: false })
  ports.forEach((cell, index) => {
    graph.setNode(String(index))
    for (const port of cell) {
      const next = neighbor(index, port, width, ports.length / width)
      if (next !== null && ports[next].includes((port + 2) % 4))
        graph.setEdge(String(index), String(next))
    }
  })
  const live = ports[source[0]].includes(source[1])
    ? new Set(
        alg.components(graph).find((component) => component.includes(String(source[0]))) ?? [],
      )
    : new Set<string>()
  const leaks = [...live].some((cell) => {
    const index = Number(cell)
    return ports[index].some((port) => {
      if ((index === source[0] && port === source[1]) || (index === sink[0] && port === sink[1]))
        return false
      const next = neighbor(index, port, width, ports.length / width)
      return next === null || !ports[next].includes((port + 2) % 4)
    })
  })
  return {
    live,
    leaks,
    complete: live.has(String(sink[0])) && ports[sink[0]].includes(sink[1]) && !leaks,
  }
}

export function solved(state: PuzzleState): boolean {
  if (state.kind === 'rules') return state.player === (state.swapped ? RULE_GATE : RULE_EXIT)
  if (state.kind === 'boxes') return isSolved(state.level)
  if (state.kind === 'route')
    return (
      state.path.at(-1) === ROUTE_GOAL && ROUTE_PARCELS.every((cell) => state.path.includes(cell))
    )
  if (state.kind === 'pipes')
    return connection(
      PIPE_PARTS.map((_, i) => pipePorts(i, state.turns)),
      4,
      [4, 3],
      [15, 2],
    ).complete
  const flow = connection(
    state.order.map((tile) => PANEL_PORTS[tile]),
    2,
    [0, 3],
    [1, 1],
  )
  return flow.complete && flow.live.size === 4
}

export function transition(
  state: PuzzleState,
  action: PuzzleAction,
): { state: PuzzleState; feedback: string } {
  if (state.kind === 'rules') {
    if (action.type === 'swap' && action.a !== action.b)
      return { state: { ...state, swapped: !state.swapped }, feedback: '规则改了，场景也改了。' }
    if (action.type === 'move') {
      const next = neighbor(
        state.player,
        ['up', 'right', 'down', 'left'].indexOf(action.direction),
        6,
        4,
      )
      if (next === null || RULE_WALLS.includes(next))
        return { state, feedback: '这里是固定墙，改合同也没用。' }
      if (next === RULE_GATE && !state.swapped)
        return { state, feedback: '门按合同办事：现在它负责挡路。' }
      if (next === RULE_EXIT && state.swapped) return { state, feedback: '出口现在负责挡路。' }
      return { state: { ...state, player: next }, feedback: '出口很近，又好像很远。' }
    }
  }
  if (state.kind === 'boxes' && action.type === 'move') {
    const move = applyMove(state.level, action.direction)
    return move.ok
      ? {
          state: { ...state, level: move.level },
          feedback:
            move.move.kind === 'push'
              ? '箱子不支持倒车，位置得留余地。'
              : '绕到另一侧，事情可能不一样。',
        }
      : { state, feedback: '这边挤不过去。换个方向，或者撤一步。' }
  }
  if (state.kind === 'pipes' && action.type === 'turn' && PIPE_PARTS[action.index]) {
    const turns = [...state.turns]
    turns[action.index] = (turns[action.index] + 1) % 4
    const next = { ...state, turns }
    const flow = connection(
      PIPE_PARTS.map((_, i) => pipePorts(i, turns)),
      4,
      [4, 3],
      [15, 2],
    )
    return {
      state: next,
      feedback: flow.leaks ? '水还在找出口，有接头没接好。' : '这一段通了，杯子还在等。',
    }
  }
  if (state.kind === 'route' && action.type === 'visit') {
    const last = state.path.at(-1)!
    const next = action.index
    if (next === state.path.at(-2))
      return { state: { ...state, path: state.path.slice(0, -1) }, feedback: '这一步先收回来。' }
    const adjacent = DELTAS.some((_, direction) => neighbor(last, direction, 5, 5) === next)
    if (!adjacent || ROUTE_BLOCKS.includes(next) || state.path.includes(next))
      return { state, feedback: '路线不能跳格、穿水坑或交叉。' }
    const path = [...state.path, next]
    const count = ROUTE_PARCELS.filter((cell) => path.includes(cell)).length
    if (next === ROUTE_GOAL && count < 2)
      return { state, feedback: `还有 ${2 - count} 件包裹没取，不能空手下班。` }
    return { state: { ...state, path }, feedback: `包裹 ${count}/2，收件人还醒着。` }
  }
  if (state.kind === 'panels' && action.type === 'swap' && action.a !== action.b) {
    const order = [...state.order]
    ;[order[action.a], order[action.b]] = [order[action.b], order[action.a]]
    return { state: { ...state, order }, feedback: '街区换了位置，道路也跟着搬家。' }
  }
  return { state, feedback: '' }
}
