<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGalleryStore } from '@/stores/gallery'
import { useTaskStore } from '@/stores/tasks'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { useTemplateStore } from '@/stores/templates'
import { createReferenceImage } from '@/services/imageAssets'
import {
  FORMAT_OPTIONS,
  QUALITY_OPTIONS,
  SIZE_OPTIONS,
  estimateCost,
  type GenerationTask,
  type ImageRecord,
} from '@/types'

const gallery = useGalleryStore()
const tasks = useTaskStore()
const ui = useUiStore()
const settings = useSettingsStore()
const templateStore = useTemplateStore()
const route = useRoute()

const promptEl = ref<HTMLTextAreaElement>()
const showTemplates = ref(false)
const showHistory = ref(false)
const now = ref(Date.now())
const submitting = ref(false)
const seenTerminalTasks = new Set<string>()

const canSubmit = computed(() => ui.draftPrompt.trim().length > 0 && !submitting.value)
const cost = computed(() => estimateCost(
  ui.draftParams,
  ui.referenceImage ? 'edit' : 'generate',
  settings.settings.estimatedCostByQuality,
))
const recentTasks = computed(() => tasks.sessionTasks.slice(0, 4))
const recentPrompts = computed(() => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const image of gallery.alive) {
    if (!seen.has(image.prompt)) {
      seen.add(image.prompt)
      result.push(image.prompt)
    }
    if (result.length >= 8) break
  }
  return result
})
const sizeRatio = computed(() => SIZE_OPTIONS.find(option => option.value === ui.draftParams.size)?.ratio ?? '1:1')
const qualityLabel = computed(() => QUALITY_OPTIONS.find(option => option.value === ui.draftParams.quality)?.label ?? '中')

async function submit() {
  if (!canSubmit.value) return
  if (!settings.apiConfigured) {
    ui.showToast('请先在设置中完成图片接口配置')
    return
  }
  const projectedDailyCost = tasks.todayCost + cost.value
  if (projectedDailyCost > settings.settings.budgetDaily) {
    const confirmed = window.confirm(`本次提交后，今日预估成本将达到 $${projectedDailyCost.toFixed(2)}，超过提醒阈值 $${settings.settings.budgetDaily.toFixed(2)}。仍要继续吗？`)
    if (!confirmed) return
  }
  submitting.value = true
  try {
    await tasks.submit(ui.draftPrompt.trim(), ui.draftParams, ui.referenceImage)
    ui.clearReferenceImage()
    ui.dockOpen = true
    showTemplates.value = false
    showHistory.value = false
    ui.showToast('已加入真实生成队列')
  } catch (error) {
    ui.showToast(error instanceof Error ? error.message : String(error))
  } finally {
    submitting.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    submit()
  }
}

function openDock() {
  ui.dockOpen = true
  nextTick(() => promptEl.value?.focus())
}

function pickTemplate(content: string) {
  const template = templateStore.templates.find(item => item.content === content)
  if (template) void templateStore.recordUse(template)
  ui.draftPrompt = content
  showTemplates.value = false
  nextTick(() => promptEl.value?.focus())
}

function pickHistory(prompt: string) {
  ui.draftPrompt = prompt
  showHistory.value = false
  nextTick(() => promptEl.value?.focus())
}

function onPaste(event: ClipboardEvent) {
  const file = [...(event.clipboardData?.files ?? [])].find(item => item.type.startsWith('image/'))
  if (!file) return
  readReference(file)
}

function onReferencePick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) readReference(file)
  input.value = ''
}

async function readReference(file: File) {
  try {
    ui.setReferenceImage(await createReferenceImage(file))
    ui.dockOpen = true
  } catch (error) {
    ui.showToast(error instanceof Error ? error.message : String(error))
  }
}

function closeMenus(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('[data-dock-menu]')) {
    showTemplates.value = false
    showHistory.value = false
  }
}

function elapsed(task: GenerationTask) {
  const start = task.startedAt ?? task.createdAt
  const end = task.finishedAt ?? now.value
  return Math.max(0, Math.round((end - start) / 1000))
}

function statusText(task: GenerationTask) {
  if (task.status === 'queued') return '排队中'
  if (task.status === 'running') return `生成中 · ${elapsed(task)}s`
  if (task.status === 'done') return `已完成 · ${elapsed(task)}s`
  if (task.status === 'failed') return '生成失败'
  return '已取消'
}

function taskImages(task: GenerationTask): ImageRecord[] {
  return task.imageIds
    .map(id => gallery.byId(id))
    .filter((image): image is ImageRecord => Boolean(image && !image.deletedAt))
}

function openTaskResult(task: GenerationTask, imageId: string) {
  const ids = taskImages(task).map(image => image.id)
  if (ids.length) ui.openViewer(imageId, ids)
}

let clock: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  document.addEventListener('click', closeMenus)
  clock = setInterval(() => (now.value = Date.now()), 500)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenus)
  if (clock) clearInterval(clock)
})

watch(
  () => tasks.tasks.map(task => `${task.id}:${task.status}`).join('|'),
  () => {
    for (const task of tasks.tasks) {
      if (task.status !== 'done' && task.status !== 'failed') continue
      const key = `${task.id}:${task.status}`
      if (seenTerminalTasks.has(key)) continue
      seenTerminalTasks.add(key)
      ui.showToast(task.status === 'done' ? `生成完成 · ${task.imageIds.length} 张图片已进入图库` : '生成失败 · 可在创作浮窗中重试')
    }
  },
)

watch(
  () => route.path,
  path => {
    if (path === '/gallery') return
    ui.dockOpen = false
    showTemplates.value = false
    showHistory.value = false
  },
)
</script>

<template>
  <div class="generate-dock" :class="{ 'is-open': ui.dockOpen }">
    <section id="visionmuse-create-panel" class="dock-surface">
      <div v-if="ui.dockOpen" class="dock-expand">
        <header class="dock-heading">
          <div>
            <p class="field-label">VisionMuse create</p>
            <div class="mt-1 flex items-center gap-2.5">
              <h2 class="display text-[20px] leading-none">创作浮窗</h2>
              <span v-if="tasks.activeCount" class="status-pill">
                <span class="pulse-soft h-1.5 w-1.5 rounded-full bg-accent" />
                {{ tasks.activeCount }} 个任务进行中
              </span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="tasks.sessionCost" class="hidden font-mono text-[10.5px] text-dim sm:inline">
              本次完成 ≈ ${{ tasks.sessionCost.toFixed(2) }}
            </span>
            <button class="icon-button" title="收起创作浮窗" aria-label="收起创作浮窗" aria-controls="visionmuse-create-panel" :aria-expanded="ui.dockOpen" @click="ui.dockOpen = false">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </header>

        <div v-if="recentTasks.length" class="task-thread">
          <article v-for="task in recentTasks" :key="task.id" class="task-row">
            <div class="task-state" :class="`is-${task.status}`">
              <span v-if="task.status === 'running'" class="pulse-soft h-2 w-2 rounded-full bg-accent" />
              <span v-else-if="task.status === 'queued'" class="h-2 w-2 rounded-full border border-current" />
              <span v-else-if="task.status === 'done'">✓</span>
              <span v-else-if="task.status === 'failed'">!</span>
              <span v-else>—</span>
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-[10.5px]" :class="task.status === 'failed' ? 'text-red' : 'text-fade'">
                  {{ statusText(task) }}
                </span>
                <span v-if="task.kind === 'edit'" class="text-[9.5px] text-accenthi">参考图编辑</span>
              </div>
              <p class="mt-0.5 truncate text-[12px] text-paper/85" :title="task.prompt">{{ task.prompt }}</p>
              <div v-if="task.status === 'running'" class="progress-line mt-2" />
              <p v-if="task.status === 'failed'" class="mt-1 truncate text-[10.5px] text-red/80">{{ task.error }}</p>
            </div>

            <div v-if="task.status === 'done'" class="flex shrink-0 gap-1.5">
              <button
                v-for="image in taskImages(task).slice(0, 3)"
                :key="image.id"
                class="h-9 w-9 overflow-hidden rounded-lg border border-line transition hover:-translate-y-0.5 hover:border-accent"
                :title="image.prompt"
                :aria-label="`查看生成结果：${image.prompt}`"
                @click="openTaskResult(task, image.id)"
              >
                <img :src="image.dataUrl" :alt="image.prompt" class="h-full w-full object-cover" />
              </button>
            </div>

            <button
              v-if="task.status === 'queued' || task.status === 'running'"
              class="text-button"
              @click="tasks.cancel(task.id)"
            >取消</button>
            <button v-else-if="task.status === 'failed'" class="text-button text-accenthi" @click="tasks.retry(task.id)">重试</button>
            <button v-else class="icon-button !h-7 !w-7" title="移除任务记录" aria-label="移除任务记录" @click="tasks.remove(task.id)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </article>
        </div>

        <div v-else class="inspiration-row">
          <span class="field-label shrink-0">灵感起点</span>
          <button
            v-for="template in templateStore.templates.slice(0, 4)"
            :key="template.id"
            class="inspiration-chip"
            @click="pickTemplate(template.content)"
          >{{ template.title }}</button>
        </div>
      </div>

      <div v-if="ui.referenceImage" class="reference-strip">
        <img :src="ui.referenceImage.previewUrl" alt="当前参考图" />
        <div class="min-w-0 flex-1">
          <p class="text-[11.5px] font-medium">已加入参考图</p>
          <p class="mt-0.5 text-[10.5px] text-dim">本次将使用图片编辑模式，生成 1 张变体</p>
        </div>
        <button class="icon-button !h-7 !w-7" title="移除参考图" aria-label="移除参考图" @click="ui.clearReferenceImage()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>

      <div class="composer-row">
        <div class="composer-mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M12 3c.7 4.7 3.3 7.3 8 8-4.7.7-7.3 3.3-8 8-.7-4.7-3.3-7.3-8-8 4.7-.7 7.3-3.3 8-8Z" />
          </svg>
        </div>
        <textarea
          ref="promptEl"
          v-model="ui.draftPrompt"
          :rows="ui.dockOpen ? 3 : 1"
          aria-label="图片生成提示词"
          placeholder="描述你想看到的画面……"
          @focus="ui.dockOpen = true"
          @keydown="onKeydown"
          @paste="onPaste"
        />
        <button
          v-if="!ui.dockOpen"
          class="parameter-summary"
          title="展开生成参数"
          aria-label="展开生成参数"
          aria-controls="visionmuse-create-panel"
          :aria-expanded="ui.dockOpen"
          @click="openDock"
        >
          {{ sizeRatio }} · {{ qualityLabel }} · {{ ui.draftParams.n }} 张
        </button>
        <button class="send-button" :disabled="!canSubmit" title="生成（Ctrl + Enter）" aria-label="生成图片" @click="submit">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
          </svg>
        </button>
      </div>

      <div class="composer-tools">
        <label class="tool-button cursor-pointer" title="上传参考图，也可以直接粘贴图片">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
            <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            <path d="m6 16 4-5 3 3.5L16 12l3 4H6Z" />
          </svg>
          <span>参考图</span>
          <input type="file" accept="image/*" class="sr-only" aria-label="上传参考图" @change="onReferencePick" />
        </label>

        <div class="relative" data-dock-menu>
          <button class="tool-button" aria-label="打开提示词模板" aria-controls="dock-template-menu" :aria-expanded="showTemplates" @click="showTemplates = !showTemplates; showHistory = false">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 4h10v16H7zM4 7h3m10 0h3M4 12h3m10 0h3M4 17h3m10 0h3" /></svg>
            <span>模板</span>
          </button>
          <div v-if="showTemplates" id="dock-template-menu" class="dock-menu pop-in">
            <p class="menu-title">提示词模板</p>
            <button v-for="template in templateStore.templates" :key="template.id" @click="pickTemplate(template.content)">
              <span>{{ template.title }}</span>
              <small>{{ template.category }}</small>
              <p>{{ template.content }}</p>
            </button>
          </div>
        </div>

        <div class="relative" data-dock-menu>
          <button class="tool-button" aria-label="打开最近提示词" aria-controls="dock-history-menu" :aria-expanded="showHistory" @click="showHistory = !showHistory; showTemplates = false">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 8v5l3 2" /><circle cx="12" cy="12" r="8" /></svg>
            <span>最近</span>
          </button>
          <div v-if="showHistory" id="dock-history-menu" class="dock-menu pop-in !w-[410px] max-w-[76vw]">
            <p class="menu-title">最近使用</p>
            <button v-for="prompt in recentPrompts" :key="prompt" @click="pickHistory(prompt)">
              <p class="!mt-0 line-clamp-2 !whitespace-normal">{{ prompt }}</p>
            </button>
          </div>
        </div>

        <button v-if="!ui.dockOpen" class="tool-button ml-auto" aria-label="展开创作台" aria-controls="visionmuse-create-panel" :aria-expanded="ui.dockOpen" @click="openDock">
          <span>展开创作台</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 15 6-6 6 6" /></svg>
        </button>

        <template v-else>
          <span class="ml-auto hidden font-mono text-[10px] text-dim sm:inline">{{ ui.draftPrompt.length }} 字</span>
          <span class="hidden max-w-48 truncate font-mono text-[10px] text-dim sm:inline" :title="settings.settings.api.generation.url">
            {{ settings.settings.api.model || 'custom' }} · direct
          </span>
        </template>
      </div>

      <div v-if="ui.dockOpen" class="parameter-tray dock-expand">
        <div class="parameter-group size-group">
          <span class="field-label">尺寸</span>
          <div class="seg" role="group" aria-label="图片尺寸">
            <button
              v-for="option in SIZE_OPTIONS"
              :key="option.value"
              :class="{ on: ui.draftParams.size === option.value }"
              :aria-pressed="ui.draftParams.size === option.value"
              :title="option.label"
              @click="ui.draftParams.size = option.value"
            >{{ option.ratio }}</button>
          </div>
        </div>
        <div class="parameter-group">
          <span class="field-label">质量</span>
          <div class="seg" role="group" aria-label="图片质量">
            <button
              v-for="option in QUALITY_OPTIONS"
              :key="option.value"
              :class="{ on: ui.draftParams.quality === option.value }"
              :aria-pressed="ui.draftParams.quality === option.value"
              @click="ui.draftParams.quality = option.value"
            >{{ option.label }}</button>
          </div>
        </div>
        <div class="parameter-group">
          <span class="field-label">数量</span>
          <div class="seg" role="group" aria-label="生成数量">
            <button v-for="count in [1, 2, 3, 4]" :key="count" :class="{ on: ui.draftParams.n === count }" :aria-pressed="ui.draftParams.n === count" @click="ui.draftParams.n = count">
              {{ count }}
            </button>
          </div>
        </div>
        <div class="parameter-group format-group">
          <span class="field-label">格式</span>
          <div class="seg" role="group" aria-label="图片格式">
            <button v-for="format in FORMAT_OPTIONS" :key="format" :class="{ on: ui.draftParams.format === format }" :aria-pressed="ui.draftParams.format === format" @click="ui.draftParams.format = format">
              {{ format }}
            </button>
          </div>
        </div>
        <div class="cost-block">
          <span class="field-label">成本估算</span>
          <strong>≈ ${{ cost.toFixed(2) }}</strong>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.generate-dock {
  position: fixed;
  z-index: 32;
  right: 24px;
  bottom: 20px;
  left: 100px;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.dock-surface {
  width: min(860px, 100%);
  border: 1px solid color-mix(in srgb, var(--color-line2) 86%, transparent);
  border-radius: 24px;
  background: color-mix(in srgb, var(--color-well) 91%, transparent);
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.65) inset, 0 18px 70px rgb(38 35 28 / 0.2);
  backdrop-filter: blur(22px) saturate(1.08);
  pointer-events: auto;
  transition: width 0.35s var(--ease-out-soft), border-radius 0.35s var(--ease-out-soft), box-shadow 0.35s ease;
}

.is-open .dock-surface {
  width: min(920px, 100%);
  border-radius: 26px;
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.72) inset, 0 26px 90px rgb(38 35 28 / 0.24);
}

.dock-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px 13px;
  border-bottom: 1px solid var(--color-line);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: var(--color-accentsoft);
  padding: 4px 8px;
  font-size: 10.5px;
  color: var(--color-accenthi);
}

.icon-button {
  display: inline-flex;
  height: 32px;
  width: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--color-fade);
  transition: background 0.18s, color 0.18s, transform 0.18s;
}
.icon-button:hover { background: var(--color-panel2); color: var(--color-paper); transform: translateY(-1px); }

.task-thread { max-height: 180px; overflow-y: auto; padding: 4px 20px; }
.task-row {
  display: flex;
  min-height: 54px;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--color-line);
  padding: 8px 0;
}
.task-row:last-child { border-bottom: 0; }
.task-state {
  display: flex;
  height: 26px;
  width: 26px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-panel2);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-dim);
}
.task-state.is-running, .task-state.is-done { background: var(--color-accentsoft); color: var(--color-accenthi); }
.task-state.is-failed { background: color-mix(in srgb, var(--color-red) 10%, transparent); color: var(--color-red); }
.text-button { flex: none; padding: 5px 2px; font-size: 10.5px; color: var(--color-dim); }
.text-button:hover { color: var(--color-paper); }

.inspiration-row {
  display: flex;
  align-items: center;
  gap: 7px;
  overflow-x: auto;
  padding: 13px 20px 5px;
}
.inspiration-chip {
  flex: none;
  border-bottom: 1px solid var(--color-line2);
  padding: 4px 2px;
  font-size: 11.5px;
  color: var(--color-fade);
  transition: color 0.16s, border-color 0.16s;
}
.inspiration-chip:hover { border-color: var(--color-accent); color: var(--color-accenthi); }

.reference-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 14px 0;
  border: 1px solid color-mix(in srgb, var(--color-accent) 28%, var(--color-line));
  border-radius: 14px;
  background: color-mix(in srgb, var(--color-accentsoft) 58%, var(--color-well));
  padding: 7px 9px;
}
.reference-strip img { height: 42px; width: 42px; flex: none; border-radius: 9px; object-fit: cover; }

.composer-row { display: flex; align-items: flex-end; gap: 10px; padding: 12px 14px 7px; }
.composer-mark {
  display: flex;
  height: 36px;
  width: 36px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-accentsoft);
  color: var(--color-accenthi);
}
.composer-row textarea {
  min-height: 36px;
  max-height: 124px;
  flex: 1;
  resize: none;
  border: 0;
  background: transparent;
  padding: 7px 0;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.55;
  color: var(--color-paper);
  outline: none;
}
.composer-row textarea::placeholder { color: var(--color-dim); }
.parameter-summary {
  flex: none;
  margin-bottom: 4px;
  border-radius: 999px;
  background: var(--color-panel2);
  padding: 6px 9px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--color-fade);
}
.parameter-summary:hover { color: var(--color-paper); }
.send-button {
  display: flex;
  height: 40px;
  width: 40px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--color-paper);
  color: var(--color-well);
  box-shadow: 0 6px 18px rgb(38 35 28 / 0.24);
  transition: transform 0.2s var(--ease-out-soft), background 0.18s, opacity 0.18s;
}
.send-button:hover:not(:disabled) { background: #3a362c; transform: translateY(-2px); }
.send-button:disabled { cursor: not-allowed; opacity: 0.28; box-shadow: none; }

.composer-tools { display: flex; align-items: center; gap: 2px; padding: 0 14px 10px 58px; }
.tool-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 8px;
  padding: 5px 7px;
  font-size: 10.5px;
  color: var(--color-fade);
  transition: background 0.16s, color 0.16s;
}
.tool-button:hover { background: var(--color-panel2); color: var(--color-paper); }

.dock-menu {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 0;
  z-index: 5;
  max-height: 330px;
  width: 350px;
  max-width: 76vw;
  overflow-y: auto;
  border: 1px solid var(--color-line);
  border-radius: 16px;
  background: var(--color-well);
  padding: 6px;
  box-shadow: var(--shadow-pop);
}
.menu-title { padding: 7px 9px 5px; font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.12em; color: var(--color-dim); text-transform: uppercase; }
.dock-menu > button { display: block; width: 100%; border-radius: 10px; padding: 8px 9px; text-align: left; }
.dock-menu > button:hover { background: var(--color-panel2); }
.dock-menu > button > span { font-size: 11.5px; font-weight: 600; }
.dock-menu > button > small { margin-left: 6px; font-family: var(--font-mono); font-size: 9.5px; color: var(--color-dim); }
.dock-menu > button > p { margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10.5px; color: var(--color-fade); }

.parameter-tray {
  display: grid;
  grid-template-columns: 1.35fr 1fr 1fr 1.1fr auto;
  gap: 12px;
  align-items: end;
  border-top: 1px solid var(--color-line);
  padding: 12px 18px 16px;
}
.parameter-group { min-width: 0; }
.parameter-group > .field-label { display: block; margin-bottom: 6px; }
.cost-block { min-width: 88px; padding-bottom: 2px; text-align: right; }
.cost-block span { display: block; margin-bottom: 5px; }
.cost-block strong { font-family: var(--font-mono); font-size: 12px; font-weight: 500; color: var(--color-accenthi); }

@media (max-width: 860px) {
  .generate-dock { right: 14px; bottom: 14px; left: 90px; }
  .parameter-tray { grid-template-columns: 1.3fr 1fr 1fr; }
  .format-group { grid-column: span 2; }
  .cost-block { align-self: center; }
}

@media (max-width: 720px) {
  .generate-dock { right: 10px; bottom: 10px; left: 10px; }
  .dock-surface { max-height: calc(100svh - 82px); overflow-y: auto; border-radius: 20px; }
  .is-open .dock-surface { border-radius: 22px; }
  .dock-heading { padding: 14px 14px 11px; }
  .task-thread { padding-inline: 14px; }
  .task-row { align-items: flex-start; }
  .task-row > .flex.shrink-0 { display: none; }
  .inspiration-row { padding-inline: 14px; }
  .composer-row { gap: 8px; padding-inline: 10px; }
  .composer-mark { height: 32px; width: 32px; }
  .composer-tools { padding-left: 44px; }
  .parameter-summary { display: none; }
  .parameter-tray { grid-template-columns: 1fr 1fr; padding: 11px 12px 14px; }
  .size-group, .format-group { grid-column: span 2; }
  .cost-block { text-align: left; }
}

@media (max-width: 460px) {
  .composer-tools .tool-button span { display: none; }
  .composer-tools .ml-auto span { display: inline; }
  .dock-menu { max-width: calc(100vw - 42px); }
}
</style>
