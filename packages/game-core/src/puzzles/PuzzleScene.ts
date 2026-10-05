import Phaser from 'phaser'
import { createProp } from './props'
import {
  connection,
  createPuzzle,
  DELTAS,
  PANEL_PORTS,
  PIPE_PARTS,
  pipePorts,
  ROUTE_BLOCKS,
  ROUTE_PARCELS,
  ROUTE_GOAL,
  RULE_EXIT,
  RULE_GATE,
  RULE_WALLS,
  solved,
  transition,
  type PuzzleAction,
  type PuzzleKind,
  type PuzzleState,
} from './models'

export function createPuzzleScene(
  scene: Phaser.Scene,
  kind: PuzzleKind,
  emit: (event: string) => void,
) {
  let state = createPuzzle(kind)
  const history: PuzzleState[] = []
  let won = false
  const world = scene.add.container(0, 0)
  const controls = scene.add.container(0, 0).setDepth(5)
  const hitAreas = new Map<string, Phaser.GameObjects.Rectangle>()
  const feedback = scene.add
    .text(200, 562, '', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#526874',
      align: 'center',
      wordWrap: { width: 344 },
    })
    .setOrigin(0.5)
  const title = scene.add.text(
    26,
    30,
    {
      rules: '合同可以改，墙不行',
      boxes: '仓库 / 两件待入库',
      pipes: '茶水间 / 今日水压正常',
      route: '夜班快递 / 两件待取',
      panels: '四块街区 / 一座城市',
    }[kind],
    { fontSize: '15px', color: '#536b76', fontFamily: 'sans-serif' },
  )
  scene.cameras.main.setBackgroundColor('#edf3f5')

  const add = <T extends Phaser.GameObjects.GameObject>(object: T): T => {
    world.add(object)
    return object
  }
  const text = (x: number, y: number, value: string, color = '#354f60', size = 17) =>
    add(
      scene.add
        .text(x, y, value, {
          fontFamily: 'sans-serif',
          fontSize: `${size}px`,
          color,
          align: 'center',
        })
        .setOrigin(0.5),
    )
  const prop = (kind: Parameters<typeof createProp>[1], x: number, y: number, w = 54, h = w) =>
    add(createProp(scene, kind, x, y, w, h))
  const hit = (x: number, y: number, w: number, h: number, action: PuzzleAction) => {
    const key = JSON.stringify(action)
    const existing = hitAreas.get(key)
    if (existing) return existing
    const area = scene.add.rectangle(x, y, w, h, 0xffffff, 0.001).setInteractive()
    controls.add(area)
    hitAreas.set(key, area)
    area.on('pointerdown', () => act(action))
    return area
  }
  const act = (action: PuzzleAction) => {
    if (won) return
    const result = transition(state, action)
    if (result.state !== state) {
      history.push(state)
      state = result.state
    }
    feedback.setText(result.feedback)
    render()
    if (solved(state)) {
      won = true
      emit('puzzle-solved')
    }
  }
  const grid = (w: number, h: number, left: number, top: number, cell: number) => {
    const art = add(scene.add.graphics())
    art.fillStyle(0xd1dfe4).fillRoundedRect(left - 5, top - 5, w * cell + 10, h * cell + 10, 8)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        art
          .fillStyle((x + y) % 2 ? 0xfafcfc : 0xf0f6f7)
          .fillRoundedRect(left + x * cell + 2, top + y * cell + 2, cell - 4, cell - 4, 4)
      }
    return {
      art,
      point: (index: number) => ({
        x: left + ((index % w) + 0.5) * cell,
        y: top + (Math.floor(index / w) + 0.5) * cell,
      }),
    }
  }
  const dpad = () => {
    const positions = [
      [200, 472],
      [257, 514],
      [200, 524],
      [143, 514],
    ]
    const directions = ['up', 'right', 'down', 'left'] as const
    positions.forEach(([x, y], index) => {
      const art = add(scene.add.graphics())
      art.fillStyle(0xc3d5dd).fillRoundedRect(x - 25, y - 22, 50, 48, 6)
      art.fillStyle(0xffffff).fillRoundedRect(x - 25, y - 25, 50, 48, 6)
      const [dx, dy] = DELTAS[index]
      art.lineStyle(4, 0x496777).lineBetween(x - dx * 9, y - dy * 9, x + dx * 9, y + dy * 9)
      art.lineBetween(x + dx * 9, y + dy * 9, x + dx * 2 + dy * 7, y + dy * 2 - dx * 7)
      art.lineBetween(x + dx * 9, y + dy * 9, x + dx * 2 - dy * 7, y + dy * 2 + dx * 7)
      hit(x, y, 50, 48, { type: 'move', direction: directions[index] })
    })
  }

  function render() {
    world.removeAll(true)
    if (state.kind === 'rules') {
      const board = grid(6, 4, 32, 216, 56)
      for (const index of RULE_WALLS) {
        const { x, y } = board.point(index)
        board.art.fillStyle(0x8299a6).fillRoundedRect(x - 24, y - 24, 48, 48, 4)
        board.art
          .lineStyle(2, 0x647f8d)
          .lineBetween(x - 22, y, x + 22, y)
          .lineBetween(x, y - 22, x, y)
      }
      for (const [index, label] of [
        [RULE_GATE, '门'],
        [RULE_EXIT, '出口'],
      ] as const) {
        const { x, y } = board.point(index)
        const door = prop('door', x, y, 46)
        door.getData('paintActive')(state.swapped ? index === RULE_GATE : index === RULE_EXIT)
        text(x, y + 18, label, '#355967', 11)
      }
      const { x, y } = board.point(state.player)
      prop('worker', x, y, 48)
      for (const row of [0, 1]) {
        const y = 85 + row * 63
        text(85, y, row === 0 ? '门' : '出口', '#527989', 20)
        text(170, y, '是', '#8097a3')
        const chip = add(scene.add.container(283, y))
        const art = scene.add
          .graphics()
          .fillStyle(0xcedbe2)
          .fillRoundedRect(-54, -22, 108, 48, 6)
          .fillStyle(row === 0 ? 0xf2cf74 : 0xaad5c6)
          .fillRoundedRect(-54, -26, 108, 48, 6)
        const value = (row === 0) !== state.swapped ? '挡路' : '过关'
        const label = scene.add
          .text(0, -2, value, { fontSize: '21px', color: '#344f5f', fontFamily: 'sans-serif' })
          .setOrigin(0.5)
        chip
          .add([art, label])
          .setInteractive(
            new Phaser.Geom.Rectangle(-54, -26, 108, 48),
            Phaser.Geom.Rectangle.Contains,
          )
        scene.input.setDraggable(chip)
        chip.on('drag', (_: Phaser.Input.Pointer, x: number, dy: number) => {
          chip.x = Phaser.Math.Clamp(x, 70, 330)
          chip.y = Phaser.Math.Clamp(dy, 58, 175)
        })
        chip.on('dragend', () => {
          if (Math.abs(chip.y - (85 + (1 - row) * 63)) < 29) act({ type: 'swap', a: 0, b: 1 })
          else render()
        })
      }
      dpad()
    } else if (state.kind === 'boxes') {
      const board = grid(6, 6, 32, 102, 56)
      for (const index of state.level.board.walls) {
        const { x, y } = board.point(index)
        board.art.fillStyle(0x738c9c).fillRoundedRect(x - 26, y - 26, 52, 52, 3)
        board.art.fillStyle(0x91aab6).fillRect(x - 24, y - 24, 48, 8)
      }
      for (const index of state.level.board.goals) {
        const { x, y } = board.point(index)
        board.art.lineStyle(3, 0x4ea991).strokeRoundedRect(x - 20, y - 20, 40, 40, 4)
        board.art.lineBetween(x - 8, y, x - 1, y + 7).lineBetween(x - 1, y + 7, x + 12, y - 8)
      }
      for (const index of state.level.state.boxes) {
        const { x, y } = board.point(index)
        prop('crate', x, y, 46)
      }
      const { x, y } = board.point(state.level.state.player)
      prop('worker', x, y, 48)
      dpad()
    } else if (state.kind === 'pipes') {
      const board = grid(4, 4, 56, 140, 72)
      const turns = state.turns
      const flow = connection(
        PIPE_PARTS.map((_, i) => pipePorts(i, turns)),
        4,
        [4, 3],
        [15, 2],
      )
      for (let index = 0; index < 16; index++) {
        const { x, y } = board.point(index)
        for (const port of pipePorts(index, state.turns)) {
          const [dx, dy] = DELTAS[port]
          board.art.lineStyle(19, 0xa7bbc5).lineBetween(x, y, x + dx * 36, y + dy * 36)
          board.art
            .lineStyle(11, flow.live.has(String(index)) ? 0x5aafc7 : 0xe3eced)
            .lineBetween(x, y, x + dx * 36, y + dy * 36)
        }
        if (PIPE_PARTS[index]) {
          board.art
            .fillStyle(flow.live.has(String(index)) ? 0x68b5cb : 0xcbdade)
            .fillCircle(x, y, 10)
          hit(x, y, 68, 68, { type: 'turn', index })
        }
      }
      board.art.lineStyle(14, 0x5aafc7).lineBetween(28, 248, 56, 248)
      board.art.fillStyle(0x547988).fillRoundedRect(16, 226, 19, 46, 4)
      board.art.lineStyle(6, 0xeb8e77).lineBetween(18, 226, 34, 226)
      board.art.lineStyle(13, flow.complete ? 0x5aafc7 : 0xa7bbc5).lineBetween(308, 428, 308, 458)
      const cup = prop('cup', 308, 488, 70)
      cup.getData('paintActive')(flow.complete)
      text(115, 490, '杯子还空着', '#64838f', 14)
    } else if (state.kind === 'route') {
      const board = grid(5, 5, 50, 125, 60)
      for (const index of ROUTE_BLOCKS) {
        const { x, y } = board.point(index)
        board.art
          .fillStyle(0x9fcbd7)
          .fillEllipse(x, y, 49, 29)
          .fillEllipse(x + 4, y - 6, 25, 20)
        board.art.lineStyle(2, 0xdeeff1).lineBetween(x - 15, y, x + 9, y)
      }
      for (const index of ROUTE_PARCELS) {
        const { x, y } = board.point(index)
        const parcel = prop('parcel', x, y, 42)
        parcel.setAlpha(state.path.includes(index) ? 0.25 : 1)
      }
      const goal = board.point(ROUTE_GOAL)
      prop('door', goal.x, goal.y, 48)
      for (let i = 1; i < state.path.length; i++) {
        const from = board.point(state.path[i - 1]),
          to = board.point(state.path[i])
        board.art.lineStyle(10, 0xf0be65).lineBetween(from.x, from.y, to.x, to.y)
        board.art.lineStyle(2, 0xffe1a6).lineBetween(from.x, from.y, to.x, to.y)
      }
      const last = board.point(state.path.at(-1)!)
      prop('truck', last.x, last.y, 44)
      for (let i = 0; i < 25; i++) {
        const { x, y } = board.point(i)
        hit(x, y, 56, 56, { type: 'visit', index: i })
      }
      text(
        200,
        478,
        `已取件 ${ROUTE_PARCELS.filter((index) => state.kind === 'route' && state.path.includes(index)).length} / 2`,
        '#587b87',
        19,
      )
    } else {
      const centers = [
        { x: 112, y: 199 },
        { x: 288, y: 199 },
        { x: 112, y: 375 },
        { x: 288, y: 375 },
      ]
      const flow = connection(
        state.order.map((tile) => PANEL_PORTS[tile]),
        2,
        [0, 3],
        [1, 1],
      )
      const background = add(scene.add.graphics())
      background
        .lineStyle(26, 0x81929b)
        .lineBetween(17, 199, 42, 199)
        .lineBetween(358, 199, 383, 199)
      background.fillStyle(0x8dcbb7).fillRoundedRect(370, 172, 24, 54, 4)
      text(383, 159, '终点', '#4b8173', 12)
      for (let pos = 0; pos < 4; pos++) {
        const tile = state.order[pos]
        const center = centers[pos]
        const art = scene.add.graphics()
        art.fillStyle(0xbacdd2).fillRoundedRect(-74, -70, 148, 148, 5)
        art
          .fillStyle([0xd7e8db, 0xd3e8ef, 0xefe5cf, 0xe3dde9][tile])
          .fillRoundedRect(-74, -74, 148, 148, 5)
        const direction = PANEL_PORTS[tile]
        for (const port of direction) {
          const [dx, dy] = DELTAS[port]
          art.lineStyle(30, 0x7a8e98).lineBetween(0, 0, dx * 74, dy * 74)
          art.lineStyle(2, 0xf7df9c).lineBetween(0, 0, dx * 72, dy * 72)
        }
        art.fillStyle(0x7a8e98).fillCircle(0, 0, 15)
        // Each tile is a small illustrated district, not a labeled button.
        art.fillStyle(0xffffff, 0.8).fillRect(-59, -54, 32, 28)
        art
          .fillStyle([0xd97d66, 0x46859b, 0xc5a252, 0x8a7aa1][tile])
          .fillTriangle(-63, -54, -43, -68, -23, -54)
        art.fillStyle(0x97b5bc).fillRect(-53, -47, 9, 12).fillRect(-39, -47, 8, 12)
        art.fillStyle(0x7ea593).fillCircle(47, 43, 14).fillCircle(29, 51, 9)
        art.lineStyle(4, 0x719088).lineBetween(47, 54, 47, 65)
        const bounds = scene.add.rectangle(0, 0, 148, 148).setAlpha(0)
        const panel = add(scene.add.container(center.x, center.y, [bounds, art])).setInteractive(
          new Phaser.Geom.Rectangle(-74, -74, 148, 148),
          Phaser.Geom.Rectangle.Contains,
        )
        scene.input.setDraggable(panel)
        panel.on('dragstart', () => panel.setDepth(3))
        panel.on('drag', (_: Phaser.Input.Pointer, x: number, y: number) => {
          panel.x = Phaser.Math.Clamp(x, 74, 326)
          panel.y = Phaser.Math.Clamp(y, 125, 452)
        })
        panel.on('dragend', () => {
          const nearest = centers
            .map((to, index) => ({
              index,
              distance: Phaser.Math.Distance.Between(panel.x, panel.y, to.x, to.y),
            }))
            .sort((a, b) => a.distance - b.distance)[0]
          if (nearest.distance < 88 && nearest.index !== pos)
            act({ type: 'swap', a: pos, b: nearest.index })
          else render()
        })
      }
      for (const cell of flow.live) {
        const pos = Number(cell),
          { x, y } = centers[pos]
        for (const port of PANEL_PORTS[state.order[pos]]) {
          const [dx, dy] = DELTAS[port]
          background.lineStyle(26, 0x81929b).lineBetween(x, y, x + dx * 88, y + dy * 88)
        }
      }
      prop('truck', 24, 199, 37)
      text(200, 496, '城市换个位置，路就不一样。', '#647f8b', 15)
    }
  }
  render()
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    history.length = 0
    title.destroy()
  })
  return {
    undo() {
      if (!won && history.length) {
        state = history.pop()!
        feedback.setText('回到上一步。')
        render()
      }
    },
    reset() {
      if (!won) {
        state = createPuzzle(kind)
        history.length = 0
        feedback.setText('重新来，刚才不算。')
        render()
      }
    },
  }
}
