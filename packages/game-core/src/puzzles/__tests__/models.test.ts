import { describe, expect, it } from 'vitest'
import { solveSokoban } from 'miaoda-game-sokoban-core'
import {
  connection,
  createPuzzle,
  PANEL_PORTS,
  solved,
  transition,
  type PuzzleAction,
  type PuzzleState,
} from '../models'

const play = (state: PuzzleState, actions: PuzzleAction[]) =>
  actions.reduce((state, action) => transition(state, action).state, state)

describe('five redesigned puzzle mechanisms', () => {
  it('none of the starting states are already solved', () => {
    for (const kind of ['rules', 'boxes', 'pipes', 'route', 'panels'] as const)
      expect(solved(createPuzzle(kind))).toBe(false)
  })
  it('rewrites collision and the goal, rather than merely renaming a button', () => {
    expect(solved({ kind: 'rules', swapped: false, player: 5 })).toBe(true)
    expect(solved({ kind: 'rules', swapped: true, player: 5 })).toBe(false)
    let state = createPuzzle('rules')
    state = play(
      state,
      ['right', 'right', 'right'].map(() => ({ type: 'move', direction: 'right' })),
    )
    expect(state).toMatchObject({ player: 14, swapped: false })
    expect(solved(state)).toBe(false)
    state = play(state, [
      { type: 'swap', a: 0, b: 1 },
      { type: 'move', direction: 'right' },
    ])
    expect(solved(state)).toBe(true)
  })
  it('uses the Sokoban library to prove solvability and a genuine deadlock', () => {
    const start = createPuzzle('boxes')
    if (start.kind !== 'boxes') throw new Error('wrong model')
    const solution = solveSokoban(start.level, { maxNodes: 5000 })
    expect(solution.status).toBe('solved')
    if (solution.status !== 'solved') throw new Error('unsolved')
    expect(solution.pushCount).toBeGreaterThanOrEqual(3)
    expect(
      solved(
        play(
          start,
          solution.directions.map((direction) => ({ type: 'move', direction })),
        ),
      ),
    ).toBe(true)
    const stuck = play(
      start,
      ['up', 'up', 'down', 'right', 'up'].map(
        (direction) => ({ type: 'move', direction }) as PuzzleAction,
      ),
    )
    if (stuck.kind !== 'boxes') throw new Error('wrong model')
    expect(solveSokoban(stuck.level, { maxNodes: 5000 }).status).toBe('unsolved')
    expect(start.level.state.boxes).toEqual([14, 15])
  })
  it('requires reciprocal pipe ports and no active leak; idle decoys do not block victory', () => {
    let state = createPuzzle('pipes')
    for (const [index, count] of [
      [4, 1],
      [5, 2],
      [9, 2],
      [10, 1],
      [11, 2],
      [15, 3],
    ]) {
      state = play(
        state,
        Array.from({ length: count }, () => ({ type: 'turn', index })),
      )
    }
    expect(solved(state)).toBe(true)
    expect(solved(play(state, [{ type: 'turn', index: 10 }]))).toBe(false)
  })
  it('rejects shortcut, water and premature delivery; supports backtracking', () => {
    let state = createPuzzle('route')
    expect(transition(state, { type: 'visit', index: 14 }).state).toBe(state)
    state = play(state, [{ type: 'visit', index: 11 }])
    expect(transition(state, { type: 'visit', index: 12 }).state).toBe(state)
    state = play(state, [{ type: 'visit', index: 10 }])
    expect(state).toMatchObject({ path: [10] })
    const path = [5, 0, 1, 2, 3, 8, 13, 18, 23, 24, 19, 14]
    expect(
      solved(
        play(
          state,
          path.map((index) => ({ type: 'visit', index })),
        ),
      ),
    ).toBe(true)
  })
  it('accepts the connected city, not arbitrary reordered pictures', () => {
    const state = play(createPuzzle('panels'), [
      { type: 'swap', a: 0, b: 1 },
      { type: 'swap', a: 2, b: 3 },
      { type: 'swap', a: 1, b: 3 },
    ])
    expect(solved(state)).toBe(true)
    expect(solved(play(state, [{ type: 'swap', a: 0, b: 2 }]))).toBe(false)
    expect(
      connection(
        [PANEL_PORTS[0], PANEL_PORTS[3], PANEL_PORTS[1], PANEL_PORTS[2]],
        2,
        [0, 3],
        [1, 1],
      ).live.size,
    ).toBe(4)
  })
})
