<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { playSfx } from '@/audio/sfx'
import GameContainer from '@/components/GameContainer.vue'

const router = useRouter()
const route = useRoute()
const game = useGameStore()
const settings = useSettingsStore()

onMounted(async () => {
  settings.load()
  const levelId = route.params.levelId as string | undefined
  if (levelId) {
    await game.startLevel(levelId)
  } else {
    await game.startFirstLevel()
  }
})

function handleWin() {
  playSfx('pass', settings.soundEnabled)
  game.markWin()
}

function handleFail() {
  playSfx('fail', settings.soundEnabled)
  game.markFail()
}

function handleEvent() {
  playSfx('tap', settings.soundEnabled)
}

function handleHint(text: string) {
  game.showHint(text)
}

function handleDismissHint() {
  game.dismissHint()
}

async function handleNext() {
  playSfx('unlock', settings.soundEnabled)
  const next = await game.nextLevel()
  if (!next) {
    router.push('/')
  }
}

async function handleRetry() {
  playSfx('tap', settings.soundEnabled)
  game.dismissHint()
  await game.retryLevel()
}

function handleHome() {
  playSfx('tap', settings.soundEnabled)
  router.push('/')
}

function getRandomFeedback(texts?: string[]): string {
  if (!texts?.length) return ''
  return texts[Math.floor(Math.random() * texts.length)]
}
</script>

<template>
  <div class="game-page">
    <header class="level-header">
      <button class="back-btn" @click="handleHome">←</button>
      <div class="level-info">
        <span class="level-progress">{{ game.progress }}</span>
        <h2 class="level-title">{{ game.currentLevel?.title ?? '' }}</h2>
      </div>
    </header>

    <div v-if="game.status === 'playing'" class="instruction-bar">
      {{ game.currentLevel?.instruction ?? '' }}
    </div>

    <main class="game-area">
      <GameContainer
        :level="game.currentLevel"
        @win="handleWin"
        @fail="handleFail"
        @event="handleEvent"
        @hint="handleHint"
        @dismiss-hint="handleDismissHint"
      />

      <!-- Hint toast -->
      <Transition name="hint-slide">
        <div v-if="game.hintVisible && game.status === 'playing'" class="hint-toast">
          <span class="hint-icon">💡</span>
          <span class="hint-text">{{ game.hintText }}</span>
          <button class="hint-dismiss" @click="handleDismissHint">✕</button>
        </div>
      </Transition>

      <!-- Win overlay -->
      <Transition name="overlay-fade">
        <div v-if="game.status === 'win'" class="result-overlay win-overlay">
          <div class="result-card">
            <div class="result-icon">✅</div>
            <p class="result-text">
              {{ getRandomFeedback(game.currentLevel?.passFeedback?.texts) || 'Pass!' }}
            </p>
            <div class="result-actions">
              <button v-if="game.hasNext" class="btn btn-primary" @click="handleNext">
                下一关
              </button>
              <button v-else class="btn btn-primary" @click="handleHome">
                返回首页
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Fail overlay -->
      <Transition name="overlay-fade">
        <div v-if="game.status === 'fail'" class="result-overlay fail-overlay">
          <div class="result-card">
            <div class="result-icon">❌</div>
            <p class="result-text">
              {{ getRandomFeedback(game.currentLevel?.failFeedback?.texts) || 'Failed!' }}
            </p>
            <div class="result-actions">
              <button class="btn btn-secondary" @click="handleRetry">
                再试一次
              </button>
              <button class="btn btn-ghost" @click="handleHome">
                返回首页
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </main>
  </div>
</template>

<style scoped>
.game-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  overflow: hidden;
}

.level-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  background: white;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.back-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #f0f0f0;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.level-info {
  flex: 1;
}

.level-progress {
  font-size: 12px;
  color: #999;
}

.level-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.instruction-bar {
  padding: 10px 16px;
  text-align: center;
  font-size: 14px;
  color: #555;
  background: #fff8e1;
  border-bottom: 1px solid #fff0b3;
  flex-shrink: 0;
}

.game-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

/* ── Hint Toast ── */

.hint-toast {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.82);
  color: #fff;
  padding: 10px 18px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 50;
  max-width: 80%;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.hint-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.hint-text {
  font-size: 14px;
  line-height: 1.4;
}

.hint-dismiss {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  flex-shrink: 0;
}

.hint-slide-enter-active,
.hint-slide-leave-active {
  transition: all 0.3s ease;
}

.hint-slide-enter-from,
.hint-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* ── Result Overlays ── */

.result-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.win-overlay {
  background: rgba(76, 175, 80, 0.15);
}

.fail-overlay {
  background: rgba(244, 67, 54, 0.15);
}

.result-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  min-width: 240px;
}

.result-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.result-text {
  font-size: 16px;
  color: #333;
  margin: 0 0 24px;
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.1s;
}

.btn:active {
  transform: scale(0.96);
}

.btn-primary {
  background: #4f46e5;
  color: white;
}

.btn-secondary {
  background: #ff9800;
  color: white;
}

.btn-ghost {
  background: transparent;
  color: #666;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>
