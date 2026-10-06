<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import type { LevelConfig } from '@nicetap/shared'
import PhaserGameContainer from './PhaserGameContainer.vue'
const ToyWarehouse = defineAsyncComponent(() => import('./ToyWarehouse.vue'))
defineProps<{ level: LevelConfig | null; revision: number }>()
defineEmits<{
  win: []
  'win-pending': []
  fail: []
  event: [eventId: string]
  hint: [text: string, highlightObjectId?: string]
  'dismiss-hint': []
}>()
const game = ref<InstanceType<typeof PhaserGameContainer>>()
defineExpose({
  requestHint: () => game.value?.requestHint(),
  pause: () => game.value?.pause(),
  undoPuzzle: () => game.value?.undoPuzzle(),
  resetPuzzle: () => game.value?.resetPuzzle(),
})
</script>
<template>
  <component
    v-if="level"
    :is="level.id === 'level-032' ? ToyWarehouse : PhaserGameContainer"
    :key="level?.id + '-' + revision"
    ref="game"
    :level="level"
    :revision="revision"
    @win="$emit('win')"
    @win-pending="$emit('win-pending')"
    @fail="$emit('fail')"
    @event="$emit('event', $event)"
    @hint="(text: string, id?: string) => $emit('hint', text, id)"
    @dismiss-hint="$emit('dismiss-hint')"
  />
</template>
