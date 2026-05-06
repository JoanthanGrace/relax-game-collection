<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { playSfx } from '@/audio/sfx'

const router = useRouter()
const game = useGameStore()
const settings = useSettingsStore()

onMounted(() => {
  game.init()
  settings.load()
})

function goHome() {
  router.push('/')
}

function handleClearProgress() {
  if (!window.confirm('确定清除所有通关进度吗？')) return
  game.clearProgress()
}

function previewSound() {
  playSfx('pass', settings.soundEnabled)
}
</script>

<template>
  <div class="settings-page">
    <header class="settings-header">
      <button class="back-btn" @click="goHome">←</button>
      <div>
        <h1 class="title">设置</h1>
        <p class="subtitle">调一调，别让游戏太得意。</p>
      </div>
    </header>

    <main class="settings-content">
      <section class="settings-section">
        <h2 class="section-title">游戏</h2>

        <div class="setting-row">
          <div class="setting-copy">
            <span class="setting-title">音效</span>
            <span class="setting-desc">控制点击、通关和失败反馈音。</span>
          </div>
          <button
            class="toggle"
            :class="{ 'toggle--on': settings.soundEnabled }"
            aria-label="切换音效"
            :aria-pressed="settings.soundEnabled"
            @click="settings.toggleSound"
          >
            <span class="toggle-knob" />
          </button>
          <button class="preview-btn" @click="previewSound">试听</button>
        </div>

        <div class="setting-row">
          <div class="setting-copy">
            <span class="setting-title">通关进度</span>
            <span class="setting-desc">已通关 {{ game.completedCount }} / {{ game.totalLevels }} 关。</span>
          </div>
          <button class="danger-btn" :disabled="!game.hasProgress" @click="handleClearProgress">
            清除
          </button>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">关于</h2>
        <div class="about-box">
          <span>NiceTap</span>
          <span>无厘头反套路关卡小游戏</span>
          <span>当前版本：MVP</span>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.settings-page {
  min-height: 100%;
  background: #fafafa;
  color: #222;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 16px 14px;
  background: #fff;
  border-bottom: 1px solid #ececf2;
}

.back-btn {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 8px;
  background: #f0f0f0;
  color: #333;
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
}

.title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
}

.subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.86rem;
  color: #666;
}

.settings-content {
  padding: 18px 16px 28px;
}

.settings-section {
  margin-bottom: 22px;
}

.section-title {
  margin: 0 0 10px;
  padding-left: 2px;
  font-size: 0.95rem;
  font-weight: 800;
  color: #333;
}

.setting-row,
.about-box {
  background: #fff;
  border: 1px solid #ececf2;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 72px;
  padding: 12px 14px;
}

.setting-row:first-of-type {
  border-radius: 10px 10px 0 0;
}

.setting-row:last-of-type {
  border-top: none;
  border-radius: 0 0 10px 10px;
}

.setting-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.setting-title {
  font-size: 0.98rem;
  font-weight: 700;
}

.setting-desc {
  font-size: 0.8rem;
  line-height: 1.35;
  color: #777;
}

.toggle {
  width: 48px;
  height: 28px;
  border: none;
  border-radius: 999px;
  background: #d8d8df;
  padding: 3px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.16s;
}

.toggle-knob {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.16s;
}

.toggle--on {
  background: #4f46e5;
}

.toggle--on .toggle-knob {
  transform: translateX(20px);
}

.preview-btn {
  height: 32px;
  border: 1px solid #d7d7e5;
  border-radius: 8px;
  background: white;
  color: #4f46e5;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

.danger-btn {
  min-width: 68px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #fee2e2;
  color: #b91c1c;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

.danger-btn:disabled {
  background: #f0f0f0;
  color: #aaa;
  cursor: not-allowed;
}

.about-box {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 14px;
  border-radius: 10px;
  font-size: 0.88rem;
  color: #666;
}

.about-box span:first-child {
  color: #333;
  font-size: 1rem;
  font-weight: 800;
}
</style>
