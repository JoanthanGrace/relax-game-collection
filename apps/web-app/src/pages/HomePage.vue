<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  Settings,
  ArrowRight,
  RotateCcw,
  LockKeyhole,
  Check,
  SkipForward,
  PawPrint,
  FlaskConical,
  Zap,
  Coffee,
  Wrench,
} from '@lucide/vue'
import { useRouter } from 'vue-router'
import { getAllLevels, getLevelsByChapter, getChapterCount } from '@nicetap/levels'
import { useGameStore } from '@/stores/gameStore'

const router = useRouter()
const game = useGameStore()
const amei = `${import.meta.env.BASE_URL}art/amei-teammate-v1.png`
const themes = [
  { name: '脑洞热身', note: '先别急着相信眼前的一切', icon: PawPrint, color: 'coral' },
  { name: '反套路实验', note: '阿妹说，试试也不会怎样', icon: FlaskConical, color: 'blue' },
  { name: '离谱进行时', note: '认真你就输了，但也不一定', icon: Zap, color: 'mint' },
  { name: '阿妹的摸鱼工坊', note: '工作可以等，队友不能丢', icon: Coffee, color: 'gold' },
  { name: '离谱维修站', note: '工具阿妹带，靠谱靠咱俩', icon: Wrench, color: 'blue' },
]
const chapters = computed(() =>
  Array.from({ length: getChapterCount() }, (_, i) => ({
    chapter: i + 1,
    levels: getLevelsByChapter(i + 1),
    theme: themes[i % themes.length],
  })),
)
function playLevel(id: string) {
  if (!game.isLevelLocked(id)) router.push(`/game/${id}`)
}
function continueGame() {
  router.push(game.continueLevelId ? `/game/${game.continueLevelId}` : '/game')
}
function levelState(id: string) {
  if (game.isLevelSkipped(id)) return 'skipped'
  if (game.isLevelCompleted(id)) return 'completed'
  if (game.isLevelCurrent(id)) return 'current'
  return game.isLevelLocked(id) ? 'locked' : 'open'
}
function chapterCompleted(levels: ReturnType<typeof getAllLevels>) {
  return levels.filter((level) => game.isLevelCompleted(level.id)).length
}
function jumpToChapter(chapter: number) {
  document
    .getElementById(`chapter-${chapter}`)
    ?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
}
onMounted(() => game.init())
</script>

<template>
  <div class="home-page">
    <header class="app-header">
      <div class="wordmark">
        <PawPrint :size="23" />
        <h1>NiceTap</h1>
      </div>
      <button class="icon-btn" aria-label="打开设置" title="设置" @click="router.push('/settings')">
        <Settings :size="21" />
      </button>
    </header>
    <main>
      <section class="amei-intro" aria-label="王阿妹的玩具盒">
        <div class="intro-copy">
          <p class="small-label">王阿妹的玩具盒</p>
          <h2>一起胡闹，<br />不许无聊。</h2>
          <p class="amei-line">“我负责乱来，<br />你负责再试一次。”</p>
        </div>
        <img
          class="amei"
          :src="amei"
          alt="王阿妹，棕白色边牧队友，举着爪子冲你眨眼"
          width="384"
          height="384"
        />
        <span class="teammate-tag"><span /> 队友已就位</span>
      </section>
      <div class="play-bar">
        <div class="progress-summary">
          <span>已通关 {{ game.manualCount }} / {{ game.totalLevels }}</span
          ><span v-if="game.skippedCount" class="skip-summary">已跳过 {{ game.skippedCount }}</span>
          <div
            class="progress-track"
            role="progressbar"
            :aria-valuenow="game.completedCount"
            :aria-valuemax="game.totalLevels"
            aria-valuemin="0"
            aria-label="关卡完成进度"
          >
            <span
              :style="{
                width: `${game.totalLevels ? (game.completedCount / game.totalLevels) * 100 : 0}%`,
              }"
            />
          </div>
        </div>
        <button class="start-btn" @click="continueGame">
          {{ game.hasProgress ? '继续游戏' : '开始游戏' }}<ArrowRight :size="19" />
        </button>
        <button
          v-if="game.hasProgress"
          class="icon-btn"
          aria-label="从头开始"
          title="从头开始"
          @click="router.push('/game')"
        >
          <RotateCcw :size="19" />
        </button>
      </div>
      <nav class="chapter-nav" aria-label="章节导航">
        <button v-for="ch in chapters" :key="ch.chapter" @click="jumpToChapter(ch.chapter)">
          <component :is="ch.theme.icon" :size="17" />第 {{ ch.chapter }} 章
        </button>
      </nav>
      <div class="level-grid">
        <section
          v-for="ch in chapters"
          :id="`chapter-${ch.chapter}`"
          :key="ch.chapter"
          class="chapter-section"
          :class="ch.theme.color"
        >
          <header class="chapter-heading">
            <div class="chapter-symbol"><component :is="ch.theme.icon" :size="24" /></div>
            <div>
              <p class="chapter-number">第 {{ ch.chapter }} 章</p>
              <h2>{{ ch.theme.name }}</h2>
              <p class="chapter-note">{{ ch.theme.note }}</p>
            </div>
            <span class="chapter-count"
              >{{ chapterCompleted(ch.levels) }}/{{ ch.levels.length }}</span
            >
          </header>
          <div class="levels">
            <button
              v-for="level in ch.levels"
              :key="level.id"
              class="level-card"
              :class="`level-card--${levelState(level.id)}`"
              :disabled="game.isLevelLocked(level.id)"
              @click="playLevel(level.id)"
            >
              <span class="level-token"
                ><LockKeyhole v-if="game.isLevelLocked(level.id)" :size="19" /><span v-else>{{
                  level.order.toString().padStart(2, '0')
                }}</span
                ><Check
                  v-if="levelState(level.id) === 'completed'"
                  class="token-badge"
                  :size="15" /><SkipForward
                  v-if="levelState(level.id) === 'skipped'"
                  class="token-badge"
                  :size="15"
              /></span>
              <span class="level-title">{{ level.title }}</span>
              <span class="level-state">{{
                levelState(level.id) === 'skipped'
                  ? '已跳过 · 可补通关'
                  : levelState(level.id) === 'completed'
                    ? '已通关'
                    : levelState(level.id) === 'current'
                      ? '当前关'
                      : game.isLevelLocked(level.id)
                        ? '未解锁'
                        : '可挑战'
              }}</span>
            </button>
          </div>
        </section>
      </div>
      <footer class="home-footer">今天的正经额度，已经用完了。</footer>
    </main>
  </div>
</template>

<style scoped>
.home-page {
  height: 100%;
  overflow-y: auto;
  background: #f7f9fa;
  color: #26363a;
}
.home-page main,
.app-header {
  max-width: 760px;
  margin: 0 auto;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px 12px;
}
.wordmark {
  display: flex;
  align-items: center;
  gap: 8px;
}
.wordmark svg {
  color: #ed6b58;
}
.wordmark h1 {
  font-size: 25px;
  font-weight: 850;
}
.icon-btn {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9e1e4;
  border-radius: 8px;
  background: #fff;
  color: #42555b;
  cursor: pointer;
  flex-shrink: 0;
}
.amei-intro {
  position: relative;
  margin: 0 22px;
  min-height: 230px;
  border-bottom: 2px solid #d5e7eb;
  overflow: hidden;
  background: #eaf4f7;
}
.intro-copy {
  position: relative;
  z-index: 1;
  padding: 22px 0 28px 18px;
  width: 52%;
}
.small-label {
  font-size: 12px;
  color: #55787e;
  margin-bottom: 12px;
  font-weight: 700;
}
.intro-copy h2 {
  font-size: 29px;
  line-height: 1.25;
  margin: 0 0 14px;
  font-weight: 850;
}
.amei-line {
  font-size: 13px;
  line-height: 1.6;
  color: #557079;
}
.amei {
  position: absolute;
  right: 0;
  bottom: 8px;
  width: 51%;
  height: 218px;
  object-fit: contain;
  filter: drop-shadow(0 7px 3px #364c4b18);
  transform-origin: 50% 100%;
  animation: hello 550ms ease-out;
}
.teammate-tag {
  position: absolute;
  right: 12px;
  bottom: 8px;
  background: #fff;
  color: #456260;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 7px;
  border: 1px solid #cbdeda;
  border-radius: 4px;
}
.teammate-tag > span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #42a78a;
}
.play-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 22px;
}
.progress-summary {
  min-width: 0;
  flex: 1;
  font-size: 12px;
  color: #62747a;
}
.skip-summary {
  display: block;
  font-size: 11px;
  margin-top: 4px;
}
.progress-track {
  width: 100%;
  height: 5px;
  margin-top: 9px;
  background: #dde5e8;
  overflow: hidden;
  border-radius: 3px;
}
.progress-track > span {
  display: block;
  height: 100%;
  background: #37a086;
}
.start-btn {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 17px;
  font-size: 14px;
  font-weight: 750;
  background: #e96251;
  color: #fff;
  border: 1px solid #d04f3f;
  border-radius: 8px;
  box-shadow: 0 3px 0 #c44b3c;
  cursor: pointer;
  flex-shrink: 0;
}
.start-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #c44b3c;
}
.chapter-nav {
  overflow-x: auto;
  display: flex;
  gap: 10px;
  padding: 0 22px 20px;
  border-bottom: 1px solid #e0e8ea;
}
.chapter-nav button {
  display: flex;
  flex: 0 0 auto;
  min-width: 94px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  min-height: 38px;
  border: 1px solid #dce5e8;
  border-radius: 6px;
  color: #536a70;
  background: #fff;
  cursor: pointer;
}
.level-grid {
  padding: 0 22px;
}
.chapter-section {
  padding: 25px 0 12px;
  border-bottom: 1px solid #e0e8ea;
  scroll-margin-top: 12px;
  --accent: #e96251;
  --tint: #fbe8e3;
}
.blue {
  --accent: #377fa0;
  --tint: #e2f1f7;
}
.mint {
  --accent: #368b75;
  --tint: #e3f2e9;
}
.gold { --accent: #a98932; --tint: #f6edcf; }
.chapter-heading {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
}
.chapter-symbol {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: var(--accent);
  background: var(--tint);
}
.chapter-number {
  font-size: 10px;
  color: #84949a;
  margin-bottom: 2px;
}
.chapter-heading h2 {
  font-size: 19px;
  line-height: 1.3;
}
.chapter-note {
  font-size: 11px;
  color: #788b91;
  margin-top: 4px;
}
.chapter-count {
  margin-left: auto;
  font-size: 12px;
  color: #8a9b9f;
  white-space: nowrap;
}
.levels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px 12px;
}
.level-card {
  min-height: 112px;
  width: 100%;
  min-width: 0;
  padding: 5px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: none;
  background: transparent;
  color: #42565d;
  cursor: pointer;
}
.level-token {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 19px;
  font-weight: 850;
  border: 2px solid #cbd9dd;
  background: #fff;
  box-shadow: 0 4px 0 #d3dfe2;
}
.level-title {
  display: block;
  font-size: 12px;
  line-height: 1.4;
  margin: 9px 0 3px;
  overflow-wrap: anywhere;
  text-align: center;
}
.level-state {
  font-size: 10px;
  color: #7b9197;
  line-height: 1.5;
}
.level-card--current .level-token {
  color: white;
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 4px 0 color-mix(in srgb, var(--accent), #26363a 25%);
}
.level-card--current .level-state {
  color: var(--accent);
  font-weight: 700;
}
.level-card--completed .level-token {
  background: #e3f3ec;
  border-color: #7dbcaa;
  color: #2d8a70;
}
.level-card--skipped .level-token {
  background: #fff3cd;
  border-color: #d9bc65;
  color: #8c732e;
}
.level-card--locked {
  cursor: default;
  color: #93a2a7;
}
.level-card--locked .level-token {
  background: #edf1f2;
  border-color: #dce4e6;
  color: #a4b5ba;
  box-shadow: 0 3px 0 #e1e8ea;
}
.token-badge {
  position: absolute;
  bottom: -3px;
  right: -4px;
  background: white;
  border: 1px solid currentColor;
  border-radius: 50%;
  box-sizing: content-box;
  padding: 3px;
}
.level-card:not(:disabled):active .level-token {
  transform: translateY(3px);
  box-shadow: none;
}
.home-footer {
  text-align: center;
  padding: 28px 20px max(28px, env(safe-area-inset-bottom));
  color: #92a3a8;
  font-size: 11px;
}
button:focus-visible {
  outline: 3px solid #dfb241;
  outline-offset: 4px;
}
@keyframes hello {
  from {
    transform: rotate(-5deg) translateY(12px);
  }
  to {
    transform: none;
  }
}
@media (min-width: 600px) {
  .levels {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .amei-intro {
    min-height: 245px;
  }
  .amei {
    right: 12%;
    height: 238px;
    width: 38%;
  }
  .intro-copy {
    padding-left: 42px;
  }
  .intro-copy h2 {
    font-size: 32px;
  }
}
@media (max-width: 350px) {
  .app-header {
    padding-left: 16px;
    padding-right: 16px;
  }
  .amei-intro {
    margin: 0 16px;
  }
  .intro-copy {
    padding-left: 12px;
  }
  .intro-copy h2 {
    font-size: 25px;
  }
  .play-bar {
    padding: 18px 16px;
    gap: 8px;
  }
  .start-btn {
    padding: 0 12px;
    gap: 6px;
  }
  .chapter-nav,
  .level-grid {
    padding-left: 16px;
    padding-right: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .amei {
    animation: none;
  }
}
</style>
