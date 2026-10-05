<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { LevelConfig } from '@nicetap/shared'
import { GameEngine, type GameEngineCallbacks } from '@nicetap/game-core'

const props = defineProps<{
  level: LevelConfig | null
  revision: number
}>()

const emit = defineEmits<{
  win: []
  fail: []
  event: [eventId: string]
  hint: [text: string, highlightObjectId?: string]
  'dismiss-hint': []
}>()

const containerRef = ref<HTMLDivElement>()
let engine: GameEngine | null = null
let resizeObserver: ResizeObserver | null = null
defineExpose({ requestHint: () => engine?.requestHint(), pause: () => engine?.pauseLevel() })

const GAME_WIDTH = 400
const GAME_HEIGHT = 600

onMounted(() => {
  if (!containerRef.value) return

  const callbacks: GameEngineCallbacks = {
    onWin() {
      emit('win')
    },
    onFail() {
      emit('fail')
    },
    onEvent(eventId: string) {
      emit('event', eventId)
    },
    onHint(text: string, highlightObjectId?: string) {
      emit('hint', text, highlightObjectId)
    },
    onDismissHint() {
      emit('dismiss-hint')
    },
  }

  engine = new GameEngine({
    parent: containerRef.value,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  })
  engine.start(callbacks)
  resizeObserver = new ResizeObserver(() => engine?.refreshSize())
  resizeObserver.observe(containerRef.value)

  if (props.level) {
    engine.loadLevel(props.level)
  }
})

watch(
  () => [props.level, props.revision] as const,
  ([newLevel]) => {
    if (newLevel && engine) {
      engine.loadLevel(newLevel)
    }
  },
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  engine?.destroy()
  engine = null
})
</script>

<template>
  <div ref="containerRef" class="game-canvas-container" />
</template>

<style scoped>
.game-canvas-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.game-canvas-container :deep(canvas) {
  display: block;
  border-radius: 8px;
}
</style>
