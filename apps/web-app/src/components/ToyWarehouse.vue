<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, PackageCheck } from '@lucide/vue'
import type { LevelConfig } from '@nicetap/shared'
import { createPuzzle, transition, solved, HintSystem, type PuzzleState } from '@nicetap/game-core'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import PhaserGameContainer from './PhaserGameContainer.vue'

const props = defineProps<{ level: LevelConfig | null; revision: number }>()
const emit = defineEmits<{
  win: []
  'win-pending': []
  fail: []
  event: [eventId: string]
  hint: [text: string, highlightObjectId?: string]
  'dismiss-hint': []
}>()
const host = ref<HTMLDivElement>()
const fallback = ref(false)
const backup = ref<InstanceType<typeof PhaserGameContainer>>()
const feedback = ref('箱子可以推，不能拉。')
const count = ref(0)
const stored = ref(0)
const animating = ref(false)
let state = createPuzzle('boxes')
let history: PuzzleState[] = []
let renderer: THREE.WebGLRenderer | undefined
let observer: ResizeObserver | undefined
let frame = 0
let paused = false
let busy = false
let finishAt = 0
const scene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-4.5, 4.5, 6, -6, 0.1, 80)
const robot = new THREE.Group()
const crates: THREE.Group[] = []
const pads: THREE.Mesh[] = []
const motions: { object: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3; start: number }[] =
  []
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const hints = new HintSystem(props.level?.hints ?? [], {
  showHintText: (text) => emit('hint', text),
  highlightObject: () => {},
  dismissHint: () => emit('dismiss-hint'),
})
const material = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.72 })
function box(
  parent: THREE.Object3D,
  size: number[],
  position: number[],
  color: number,
  radius = 0.07,
) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(size[0], size[1], size[2], 3, radius),
    material(color),
  )
  mesh.position.set(position[0], position[1], position[2])
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
function sphere(parent: THREE.Object3D, radius: number, position: number[], color: number) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 12), material(color))
  mesh.position.set(position[0], position[1], position[2])
  mesh.castShadow = true
  parent.add(mesh)
}
function position(index: number) {
  return new THREE.Vector3((index % 6) - 2.5, 0, Math.floor(index / 6) - 2.5)
}
function sync(animate = false) {
  if (state.kind !== 'boxes') return
  const now = performance.now()
  const move = (object: THREE.Object3D, index: number) => {
    const to = position(index)
    if (animate && !reducedMotion && !object.position.equals(to))
      motions.push({ object, from: object.position.clone(), to, start: now })
    else object.position.copy(to)
  }
  move(robot, state.level.state.player)
  // Preserve mesh identities when the immutable model sorts its crate indices.
  const available = [...crates],
    pending: number[] = []
  for (const index of state.level.state.boxes) {
    const match = available.find((c) => c.userData.index === index)
    if (match) available.splice(available.indexOf(match), 1)
    else pending.push(index)
  }
  pending.forEach((index, i) => {
    available[i].userData.index = index
    move(available[i], index)
  })
  stored.value = state.level.state.boxes.filter(
    (i) => state.kind === 'boxes' && state.level.board.goals.includes(i),
  ).length
  pads.forEach((pad) => {
    const active = state.kind === 'boxes' && state.level.state.boxes.includes(pad.userData.index)
    ;(pad.material as THREE.MeshStandardMaterial).color.setHex(active ? 0x49c9a0 : 0x9bdcca)
  })
  count.value = history.length
}
function move(direction: 'up' | 'right' | 'down' | 'left') {
  if (paused || busy || fallback.value) return
  const result = transition(state, { type: 'move', direction })
  feedback.value = result.feedback
  if (result.state === state) return
  history.push(state)
  state = result.state
  robot.rotation.y = { up: Math.PI, right: Math.PI / 2, down: 0, left: -Math.PI / 2 }[direction]
  sync(true)
  busy = motions.length > 0
  animating.value = busy
  if (solved(state)) {
    paused = true
    finishAt = performance.now() + (reducedMotion ? 1 : 280)
    emit('event', 'puzzle-solved')
    emit('win-pending')
  }
}
function restore(reset: boolean) {
  if (paused) return
  motions.length = 0
  busy = false
  animating.value = false
  state = reset ? createPuzzle('boxes') : (history.pop() ?? state)
  if (reset) {
    history = []
    hints.reset()
    emit('dismiss-hint')
  }
  feedback.value = reset ? '重新开工。箱子不会自己下班。' : '这一步不算，继续。'
  sync()
}
const keydown = (event: KeyboardEvent) => {
  const directions: Record<string, 'up' | 'right' | 'down' | 'left'> = {
    ArrowUp: 'up',
    ArrowRight: 'right',
    ArrowDown: 'down',
    ArrowLeft: 'left',
  }
  if (directions[event.key] && !event.repeat) {
    event.preventDefault()
    move(directions[event.key])
  }
}
function contextLost(event: Event) {
  event.preventDefault()
  fallback.value = true
  paused = true
  renderer?.setAnimationLoop(null)
}
onMounted(() => {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true })
  } catch {
    fallback.value = true
    return
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  renderer.domElement.setAttribute('aria-label', '立体玩具仓库')
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  host.value!.appendChild(renderer.domElement)
  scene.background = new THREE.Color(0xe6edf0)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x94a6b5, 2.5))
  const sun = new THREE.DirectionalLight(0xfff3e2, 4)
  sun.position.set(-3, 8, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -6
  sun.shadow.camera.right = 6
  sun.shadow.camera.top = 6
  sun.shadow.camera.bottom = -6
  sun.shadow.normalBias = 0.025
  sun.shadow.radius = 4
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0xd7f1ff, 1.5)
  fill.position.set(5, 4, -4)
  scene.add(fill)
  camera.position.set(5, 9, 8)
  camera.lookAt(0, 0, 0)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), material(0xe6edf0))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.48
  ground.receiveShadow = true
  scene.add(ground)
  box(scene, [6.4, 0.4, 6.4], [0, -0.26, 0], 0x526b7a, 0.14)
  if (state.kind !== 'boxes') return
  for (let i = 0; i < 36; i++) {
    const p = position(i),
      wall = state.level.board.walls.includes(i)
    box(
      scene,
      [0.97, wall ? 0.3 : 0.08, 0.97],
      [p.x, wall ? 0.13 : 0, p.z],
      wall ? 0x76959f : (i + Math.floor(i / 6)) % 2 ? 0xd4dfe0 : 0xe7eeee,
    )
  }
  // Low scenery never hides playable cells behind tall walls.
  box(scene, [6, 0.62, 0.18], [0, 0.37, -2.9], 0x76959f)
  box(scene, [1.4, 0.08, 0.36], [-1.8, 0.7, -2.78], 0xf3be87)
  for (let i = 0; i < 3; i++)
    box(scene, [0.25, 0.3, 0.24], [-2.2 + i * 0.37, 0.88, -2.78], [0xe88b82, 0xf4d779, 0xa5d4cc][i])
  for (const index of state.level.board.goals) {
    const p = position(index),
      pad = box(scene, [0.83, 0.065, 0.83], [p.x, 0.08, p.z], 0x9bdcca)
    pad.userData.index = index
    pads.push(pad)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.025, 8, 32), material(0x368575))
    ring.rotation.x = Math.PI / 2
    ring.position.set(p.x, 0.12, p.z)
    scene.add(ring)
  }
  for (const index of state.level.state.boxes) {
    const crate = new THREE.Group()
    crate.userData.index = index
    crate.position.copy(position(index))
    box(crate, [0.77, 0.72, 0.77], [0, 0.44, 0], 0xf1b47b, 0.08)
    for (const z of [-0.396, 0.396]) {
      box(crate, [0.77, 0.08, 0.035], [0, 0.19, z], 0xce8b5d, 0.01)
      box(crate, [0.77, 0.08, 0.035], [0, 0.68, z], 0xce8b5d, 0.01)
      const slat = box(crate, [0.66, 0.08, 0.035], [0, 0.43, z], 0xce8b5d, 0.01)
      slat.rotation.z = Math.PI / 4
    }
    box(crate, [0.17, 0.02, 0.78], [0, 0.81, 0], 0xffe1af, 0.01)
    crates.push(crate)
    scene.add(crate)
  }
  box(robot, [0.5, 0.47, 0.37], [0, 0.48, 0], 0xe87b75, 0.12)
  box(robot, [0.48, 0.37, 0.42], [0, 0.86, 0], 0xffd7bf, 0.1)
  box(robot, [0.34, 0.16, 0.035], [0, 0.88, 0.217], 0x344654, 0.05)
  for (const x of [-0.09, 0.09]) sphere(robot, 0.034, [x, 0.89, 0.24], 0xaaf3e0)
  for (const x of [-0.16, 0.16]) {
    box(robot, [0.16, 0.15, 0.26], [x, 0.14, 0], 0x344654, 0.04)
    sphere(robot, 0.105, [x * 1.8, 0.49, 0], 0xffd7bf)
  }
  sphere(robot, 0.065, [0, 1.13, 0], 0xf4d779)
  scene.add(robot)
  sync()
  const resize = () => {
    if (!host.value || !renderer) return
    const { width, height } = host.value.getBoundingClientRect()
    if (!width || !height) return
    renderer.setSize(width, height)
    const aspect = width / height,
      horizontal = Math.max(4.45, 3.75 * aspect)
    camera.left = -horizontal
    camera.right = horizontal
    camera.top = horizontal / aspect
    camera.bottom = -horizontal / aspect
    camera.updateProjectionMatrix()
  }
  observer = new ResizeObserver(resize)
  observer.observe(host.value!)
  resize()
  window.addEventListener('keydown', keydown)
  renderer.setAnimationLoop((now) => {
    frame++
    for (let i = motions.length - 1; i >= 0; i--) {
      const m = motions[i],
        t = Math.min(1, (now - m.start) / 180)
      m.object.position.lerpVectors(m.from, m.to, 1 - (1 - t) ** 3)
      if (m.object === robot) m.object.position.y += Math.sin(t * Math.PI) * 0.08
      if (t === 1) {
        m.object.position.copy(m.to)
        motions.splice(i, 1)
      }
    }
    busy = motions.length > 0
    animating.value = busy
    if (finishAt && now >= finishAt) {
      finishAt = 0
      emit('win')
    }
    renderer!.render(scene, camera)
    renderer!.domElement.dataset.frame = String(frame)
  })
})
onUnmounted(() => {
  observer?.disconnect()
  hints.reset()
  window.removeEventListener('keydown', keydown)
  renderer?.setAnimationLoop(null)
  renderer?.domElement.removeEventListener('webglcontextlost', contextLost)
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((m) => m.dispose())
    }
  })
  renderer?.dispose()
})
defineExpose({
  requestHint: () => (fallback.value ? backup.value?.requestHint() : hints.requestHint()),
  pause: () => {
    paused = true
    finishAt = 0
    backup.value?.pause()
  },
  undoPuzzle: () => (fallback.value ? backup.value?.undoPuzzle() : restore(false)),
  resetPuzzle: () => (fallback.value ? backup.value?.resetPuzzle() : restore(true)),
})
</script>
<template>
  <PhaserGameContainer
    v-if="fallback"
    ref="backup"
    :level="level"
    :revision="revision"
    @win="$emit('win')"
    @win-pending="$emit('win-pending')"
    @fail="$emit('fail')"
    @event="$emit('event', $event)"
    @hint="(text: string, id?: string) => $emit('hint', text, id)"
    @dismiss-hint="$emit('dismiss-hint')"
  />
  <section v-else class="warehouse" aria-label="玩具仓库关卡">
    <div class="warehouse-status">
      <span>夜班 · 微型仓库</span
      ><span><PackageCheck :size="16" /> {{ stored }} / 2 <i /> {{ count }} 步</span>
    </div>
    <div ref="host" class="warehouse-scene" />
    <div class="warehouse-bottom">
      <p aria-live="polite">{{ feedback }}</p>
      <div class="warehouse-controls">
        <button
          v-for="(icon, direction) in {
            up: ArrowUp,
            left: ArrowLeft,
            down: ArrowDown,
            right: ArrowRight,
          }"
          :key="direction"
          :data-direction="direction"
          :aria-label="
            { up: '向上移动', left: '向左移动', down: '向下移动', right: '向右移动' }[direction]
          "
          :title="
            { up: '向上移动', left: '向左移动', down: '向下移动', right: '向右移动' }[direction]
          "
          :disabled="paused || animating"
          @click="move(direction)"
        >
          <component :is="icon" :size="23" />
        </button>
      </div>
    </div>
  </section>
</template>
<style scoped>
.warehouse {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #e6edf0;
  color: #354b59;
}
.warehouse-status {
  position: absolute;
  z-index: 1;
  top: 16px;
  left: 16px;
  right: 16px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}
.warehouse-status span:last-child {
  display: flex;
  align-items: center;
  gap: 6px;
}
.warehouse-status i {
  height: 12px;
  width: 1px;
  background: #9caeb7;
  margin: 0 2px;
}
.warehouse-scene {
  position: absolute;
  inset: 36px 0 110px;
}
.warehouse-scene :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
.warehouse-bottom {
  position: absolute;
  bottom: 16px;
  left: 12px;
  right: 12px;
  text-align: center;
}
.warehouse-bottom p {
  font-size: 13px;
  min-height: 20px;
  margin: 0 0 14px;
}
.warehouse-controls {
  display: flex;
  justify-content: center;
  gap: 10px;
}
.warehouse-controls button {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  color: #425866;
  background: #fafcfd;
  border: 1px solid #bdcdd3;
  box-shadow: 0 3px 0 #b0c2ca;
  touch-action: manipulation;
  cursor: pointer;
}
.warehouse-controls button:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #b0c2ca;
}
.warehouse-controls button:focus-visible {
  outline: 3px solid #db7d75;
  outline-offset: 3px;
}
.warehouse-controls button:disabled {
  opacity: 0.5;
}
</style>
