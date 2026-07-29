<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PROMPT_TEMPLATE_CATEGORY_BY_ID,
  PROMPT_TEMPLATE_MEDIUM_BY_ID,
} from '@/assets/prompt-templates'
import { useGalleryStore } from '@/stores/gallery'
import { useTaskStore } from '@/stores/tasks'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { useTemplateStore } from '@/stores/templates'
import { createReferenceImage } from '@/services/imageAssets'
import {
  ASPECT_RATIO_OPTIONS,
  FORMAT_OPTIONS,
  QUALITY_OPTIONS,
  RESOLUTION_OPTIONS,
  estimateCost,
  getImageAspectRatio,
  getImageResolution,
  getImageSize,
  parseImageAspectRatio,
  type GenerationTask,
  type ImageAspectRatio,
  type ImageRecord,
  type ImageResolution,
  type PromptTemplate,
} from '@/types'

const gallery = useGalleryStore()
const tasks = useTaskStore()
const ui = useUiStore()
const settings = useSettingsStore()
const templateStore = useTemplateStore()
const route = useRoute()
const router = useRouter()

const promptEl = ref<HTMLTextAreaElement>()
const customAspectRatioEl = ref<HTMLInputElement>()
const showTemplates = ref(false)
const showHistory = ref(false)
const quantityExpanded = ref(false)
const quantityHoveredPosition = ref<number | null>(null)
const quantityDragging = ref(false)
const quantityChangeDirection = ref<'increase' | 'decrease'>('increase')
const customAspectRatioOpen = ref(false)
const customAspectRatioInput = ref('')
const customAspectRatioInvalid = ref(false)
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
const imageAspectRatio = computed(() => getImageAspectRatio(ui.draftParams.size))
const imageResolution = computed(() => getImageResolution(ui.draftParams.size))
const qualityLabel = computed(() => QUALITY_OPTIONS.find(option => option.value === ui.draftParams.quality)?.label ?? '中')
const isCommonAspectRatio = computed(() => ASPECT_RATIO_OPTIONS.some(option => option.value === imageAspectRatio.value))
const quantityRangeStyle = computed(() => {
  const sliderPositions = [
    '18px',
    'calc(33.333% + 6px)',
    'calc(66.667% - 6px)',
    'calc(100% - 18px)',
  ]

  return {
    '--quantity-progress': sliderPositions[ui.draftParams.n - 1],
  }
})

function setImageAspectRatio(aspectRatio: ImageAspectRatio) {
  ui.draftParams.size = getImageSize(aspectRatio, imageResolution.value)
  customAspectRatioOpen.value = false
  customAspectRatioInvalid.value = false
}

function openCustomAspectRatio() {
  customAspectRatioOpen.value = true
  customAspectRatioInvalid.value = false
  if (!isCommonAspectRatio.value) customAspectRatioInput.value = imageAspectRatio.value
  nextTick(() => customAspectRatioEl.value?.focus())
}

function applyCustomAspectRatio() {
  const parsedAspectRatio = parseImageAspectRatio(customAspectRatioInput.value)
  customAspectRatioInvalid.value = !parsedAspectRatio
  if (!parsedAspectRatio) return
  customAspectRatioInput.value = parsedAspectRatio.normalized
  ui.draftParams.size = getImageSize(parsedAspectRatio.normalized, imageResolution.value)
}

function setImageResolution(resolution: ImageResolution) {
  const customAspectRatio = customAspectRatioOpen.value
    ? parseImageAspectRatio(customAspectRatioInput.value)?.normalized
    : undefined
  ui.draftParams.size = getImageSize(customAspectRatio ?? imageAspectRatio.value, resolution)
}

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

function pickTemplate(template: PromptTemplate) {
  if (template.variables.length) {
    showTemplates.value = false
    void router.push({ path: '/prompts', query: { template: template.id } })
    return
  }

  void templateStore.recordUse(template)
  ui.draftPrompt = template.content
  showTemplates.value = false
  nextTick(() => promptEl.value?.focus())
}

function getTemplateContextLabel(template: PromptTemplate): string {
  const categoryLabel = template.categoryId
    ? PROMPT_TEMPLATE_CATEGORY_BY_ID.get(template.categoryId)?.label
    : undefined
  const mediumLabel = template.medium
    ? PROMPT_TEMPLATE_MEDIUM_BY_ID.get(template.medium)?.label
    : undefined
  return [categoryLabel ?? (template.origin === 'user' ? '我的' : '未分类'), mediumLabel]
    .filter(Boolean)
    .join(' · ')
}

function openPromptModules() {
  showTemplates.value = false
  void router.push('/prompts')
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
    quantityExpanded.value = false
  }
}

function toggleQuantityEditor() {
  quantityExpanded.value = !quantityExpanded.value
  showTemplates.value = false
  showHistory.value = false
}

function updateQuantitySliderHover(event: PointerEvent) {
  const sliderElement = event.currentTarget as HTMLInputElement
  const sliderBounds = sliderElement.getBoundingClientRect()
  const sliderThumbRadius = 18
  const availableTrackWidth = sliderBounds.width - sliderThumbRadius * 2
  const pointerOffsetX = event.clientX - sliderBounds.left
  const pointerOffsetY = event.clientY - sliderBounds.top
  const trackCenterY = sliderBounds.height / 2

  let closestPosition: number | null = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (let position = 1; position <= 4; position += 1) {
    const positionCenterX = sliderThumbRadius + availableTrackWidth * ((position - 1) / 3)
    const horizontalDistance = pointerOffsetX - positionCenterX
    const verticalDistance = pointerOffsetY - trackCenterY
    const pointerDistance = Math.hypot(horizontalDistance, verticalDistance)
    const hoverRadius = position === ui.draftParams.n ? sliderThumbRadius + 2 : 10

    if (pointerDistance <= hoverRadius && pointerDistance < closestDistance) {
      closestPosition = position
      closestDistance = pointerDistance
    }
  }

  quantityHoveredPosition.value = closestPosition
}

function startQuantitySliderDrag(event: PointerEvent) {
  quantityDragging.value = true
  updateQuantitySliderHover(event)
}

function finishQuantitySliderDrag(event?: PointerEvent) {
  quantityDragging.value = false

  if (event) {
    updateQuantitySliderHover(event)
    return
  }

  quantityHoveredPosition.value = null
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
  () => ui.draftParams.n,
  (nextQuantity, previousQuantity) => {
    if (nextQuantity === previousQuantity) return
    quantityChangeDirection.value = nextQuantity > previousQuantity
      ? 'increase'
      : 'decrease'
  },
  { flush: 'sync' },
)

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
  () => ui.dockOpen,
  isOpen => {
    if (isOpen) return
    showTemplates.value = false
    showHistory.value = false
    quantityExpanded.value = false
  },
)

watch(
  () => route.path,
  path => {
    if (path === '/gallery') return
    ui.dockOpen = false
    showTemplates.value = false
    showHistory.value = false
    quantityExpanded.value = false
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
            <div v-else-if="task.status === 'failed'" class="flex shrink-0 items-center gap-1">
              <button class="text-button text-accenthi" @click="tasks.retry(task.id)">重试</button>
              <button
                class="icon-button !h-7 !w-7"
                title="关闭并移除失败任务"
                aria-label="关闭并移除失败任务"
                @click="tasks.remove(task.id)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <button v-else class="icon-button !h-7 !w-7" title="移除任务记录" aria-label="移除任务记录" @click="tasks.remove(task.id)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </article>
        </div>

        <div v-else class="inspiration-row">
          <span class="field-label shrink-0">完整提示词</span>
          <button
            v-for="template in templateStore.templates.slice(0, 4)"
            :key="template.id"
            class="inspiration-chip"
            @click="pickTemplate(template)"
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
          {{ imageAspectRatio }} · {{ imageResolution }} · {{ qualityLabel }} · {{ ui.draftParams.n }} 张
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
          <button class="tool-button" aria-label="打开提示词工具" aria-controls="dock-template-menu" :aria-expanded="showTemplates" @click="showTemplates = !showTemplates; showHistory = false; quantityExpanded = false">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M7 4h10v16H7zM4 7h3m10 0h3M4 12h3m10 0h3M4 17h3m10 0h3" /></svg>
            <span>模块</span>
          </button>
          <div v-if="showTemplates" id="dock-template-menu" class="dock-menu pop-in">
            <p class="menu-title">提示词工具</p>
            <button class="composer-menu-entry" @click="openPromptModules">
              <span>原子模块拼接</span>
              <small>人物 / 场景 / 镜头</small>
              <p>从独立文本片段中自行选择，系统不推荐也不自动搭配</p>
            </button>
            <p class="menu-title !pt-3">完整提示词</p>
            <button v-for="template in templateStore.templates" :key="template.id" @click="pickTemplate(template)">
              <span>{{ template.title }}</span>
              <small>{{ getTemplateContextLabel(template) }}</small>
              <p>{{ template.content }}</p>
            </button>
          </div>
        </div>

        <div class="relative" data-dock-menu>
          <button class="tool-button" aria-label="打开最近提示词" aria-controls="dock-history-menu" :aria-expanded="showHistory" @click="showHistory = !showHistory; showTemplates = false; quantityExpanded = false">
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
        <div class="parameter-group ratio-group">
          <span class="field-label">比例</span>
          <div class="seg" role="group" aria-label="图片比例">
            <button
              v-for="option in ASPECT_RATIO_OPTIONS"
              :key="option.value"
              :class="{ on: imageAspectRatio === option.value }"
              :aria-pressed="imageAspectRatio === option.value"
              @click="setImageAspectRatio(option.value)"
            >{{ option.label }}</button>
            <button
              v-if="!customAspectRatioOpen"
              :class="{ on: customAspectRatioOpen || !isCommonAspectRatio }"
              :aria-pressed="customAspectRatioOpen || !isCommonAspectRatio"
              @click="openCustomAspectRatio"
            >自定义</button>
            <input
              v-else
              ref="customAspectRatioEl"
              v-model="customAspectRatioInput"
              class="custom-ratio-input"
              type="text"
              inputmode="numeric"
              maxlength="7"
              placeholder="21:9"
              title="输入自定义宽高比，例如 21:9"
              aria-label="自定义图片比例，格式为宽比高"
              :aria-invalid="customAspectRatioInvalid"
              :class="{ invalid: customAspectRatioInvalid }"
              @input="applyCustomAspectRatio"
              @blur="applyCustomAspectRatio"
              @keydown.enter.prevent="applyCustomAspectRatio"
            />
          </div>
        </div>
        <div class="parameter-group resolution-group">
          <span class="field-label">分辨率</span>
          <div class="seg" role="group" aria-label="图片分辨率">
            <button
              v-for="option in RESOLUTION_OPTIONS"
              :key="option.value"
              :class="{ on: imageResolution === option.value }"
              :aria-pressed="imageResolution === option.value"
              :title="getImageSize(imageAspectRatio, option.value).replace('x', ' × ')"
              @click="setImageResolution(option.value)"
            >{{ option.label }}</button>
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
        <div class="parameter-group quantity-group" data-dock-menu>
          <span class="field-label">数量</span>
          <div class="quantity-control" :class="{ 'is-expanded': quantityExpanded }">
            <button
              class="quantity-trigger"
              aria-label="修改生成数量"
              aria-controls="quantity-editor"
              :aria-expanded="quantityExpanded"
              @click="toggleQuantityEditor"
            >
              <span class="quantity-compact-value">
                <span class="quantity-number-window">
                  <Transition :name="`quantity-wheel-${quantityChangeDirection}`">
                    <strong :key="ui.draftParams.n">{{ ui.draftParams.n }}</strong>
                  </Transition>
                </span>
                张
              </span>
              <span class="quantity-expanded-heading">
                <span>数量</span>
                <span class="quantity-expanded-value">
                  <span class="quantity-number-window">
                    <Transition :name="`quantity-wheel-${quantityChangeDirection}`">
                      <strong :key="ui.draftParams.n">{{ ui.draftParams.n }}</strong>
                    </Transition>
                  </span>
                  张
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <circle cx="12" cy="12" r="8" />
                    <path d="m8.5 12 2.2 2.2 4.8-5" />
                  </svg>
                </span>
              </span>
            </button>

            <div id="quantity-editor" class="quantity-editor" :aria-hidden="!quantityExpanded">
              <div
                class="quantity-slider-wrap"
                :class="{ 'is-dragging': quantityDragging }"
                :style="quantityRangeStyle"
              >
                <div class="quantity-slider-rail" aria-hidden="true">
                  <div class="quantity-slider-fill" />
                  <div class="quantity-dots">
                    <i
                      v-for="count in [1, 2, 3, 4]"
                      :key="count"
                      :class="{
                        active: count <= ui.draftParams.n,
                        hovered: quantityHoveredPosition === count && count !== ui.draftParams.n,
                      }"
                    />
                  </div>
                  <div
                    class="quantity-slider-thumb"
                    :class="{
                      'is-hovered': quantityHoveredPosition === ui.draftParams.n,
                      'is-dragging': quantityDragging,
                    }"
                  />
                </div>
                <input
                  v-model.number="ui.draftParams.n"
                  class="quantity-slider"
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  aria-label="单次生成张数"
                  :aria-valuetext="`${ui.draftParams.n} 张`"
                  :disabled="!quantityExpanded"
                  @pointermove="updateQuantitySliderHover"
                  @pointerleave="finishQuantitySliderDrag()"
                  @pointerdown="startQuantitySliderDrag"
                  @pointerup="finishQuantitySliderDrag"
                  @pointercancel="finishQuantitySliderDrag()"
                />
              </div>

              <div class="quantity-scale" aria-hidden="true">
                <span v-for="count in [1, 2, 3, 4]" :key="count" :class="{ active: count === ui.draftParams.n }">{{ count }}</span>
              </div>
            </div>
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
.dock-menu > .composer-menu-entry {
  border: 1px solid color-mix(in srgb, var(--color-accent) 28%, var(--color-line));
  background: color-mix(in srgb, var(--color-accentsoft) 62%, var(--color-well));
}
.dock-menu > .composer-menu-entry:hover { background: var(--color-accentsoft); }
.dock-menu > .composer-menu-entry > span { color: var(--color-accenthi); }

.parameter-tray {
  --parameter-control-height: 36px;
  display: grid;
  grid-template-columns: minmax(250px, 2fr) minmax(96px, 0.8fr) minmax(96px, 0.8fr) 64px minmax(112px, 0.95fr) auto;
  gap: 12px;
  align-items: start;
  border-top: 1px solid var(--color-line);
  padding: 12px 18px 16px;
}
.parameter-group {
  display: grid;
  min-width: 0;
  grid-template-rows: 13px var(--parameter-control-height);
  gap: 6px;
}
.parameter-group > .field-label {
  display: block;
  line-height: 13px;
}
.parameter-group > .seg {
  height: var(--parameter-control-height);
  box-sizing: border-box;
  border-color: var(--color-line);
  border-radius: 10px;
  background: var(--color-panel2);
}
.parameter-group > .seg > button {
  height: 28px;
  padding-block: 0;
  border-radius: 7px;
  font-size: 11px;
  line-height: 28px;
}
.ratio-group .seg {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
.ratio-group .seg > button {
  padding-inline: 2px;
}
.custom-ratio-input {
  min-width: 0;
  height: 28px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--color-accent);
  border-radius: 7px;
  background: var(--color-well);
  padding: 4px 2px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--color-paper);
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.custom-ratio-input::placeholder { color: var(--color-dim); }
.custom-ratio-input.invalid {
  border-color: var(--color-red);
  color: var(--color-red);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-red) 10%, transparent);
}
.quantity-group {
  position: relative;
  width: 64px;
}
.quantity-control {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 7;
  width: 64px;
  max-height: var(--parameter-control-height);
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: 10px;
  background: var(--color-panel2);
  transform-origin: right bottom;
  transition:
    width 0.3s var(--ease-out-soft),
    max-height 0.3s var(--ease-out-soft),
    border-radius 0.24s,
    border-color 0.18s,
    background 0.18s,
    box-shadow 0.2s;
}
.quantity-control:hover {
  border-color: var(--color-line2);
  background: var(--color-panel2);
}
.quantity-control.is-expanded {
  border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-line2));
  background: var(--color-well);
}
.quantity-control.is-expanded {
  width: min(286px, calc(100vw - 48px));
  max-height: 105px;
  border-radius: 16px;
  box-shadow: var(--shadow-pop);
}
.quantity-trigger {
  display: flex;
  height: 34px;
  width: 100%;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  font-size: 12px;
  color: var(--color-fade);
  transition: color 0.16s;
}
.quantity-compact-value {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
}
.quantity-number-window {
  display: inline-grid;
  height: 1.15em;
  width: 1ch;
  overflow: hidden;
  place-items: center;
  line-height: 1;
  vertical-align: middle;
}
.quantity-number-window > strong {
  grid-area: 1 / 1;
  display: block;
  line-height: 1;
  will-change: transform, opacity;
}
.quantity-wheel-increase-enter-active,
.quantity-wheel-increase-leave-active,
.quantity-wheel-decrease-enter-active,
.quantity-wheel-decrease-leave-active {
  transition:
    transform 0.46s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.38s ease;
}
.quantity-wheel-increase-enter-from {
  opacity: 0;
  transform: translateY(180%);
}
.quantity-wheel-increase-leave-to {
  opacity: 0;
  transform: translateY(-180%);
}
.quantity-wheel-decrease-enter-from {
  opacity: 0;
  transform: translateY(-180%);
}
.quantity-wheel-decrease-leave-to {
  opacity: 0;
  transform: translateY(180%);
}
.quantity-compact-value strong {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-paper);
}
.quantity-trigger:hover { color: var(--color-paper); }
.quantity-expanded-heading {
  display: none;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-fade);
}
.quantity-expanded-value {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--color-accenthi);
}
.quantity-expanded-value strong {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 650;
}
.quantity-control.is-expanded .quantity-trigger {
  justify-content: stretch;
  padding-inline: 14px;
}
.quantity-control.is-expanded .quantity-compact-value { display: none; }
.quantity-control.is-expanded .quantity-expanded-heading { display: flex; }
.quantity-control.is-expanded .quantity-expanded-value svg {
  opacity: 0.75;
}
.quantity-editor {
  border-top: 1px solid var(--color-line);
  padding: 8px 14px 10px;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-5px);
  transition:
    opacity 0.16s ease,
    visibility 0s linear 0.18s,
    transform 0.22s var(--ease-out-soft);
}
.quantity-control.is-expanded .quantity-editor {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: none;
  transition-delay: 0.08s, 0s, 0.06s;
}
.quantity-slider-wrap {
  --quantity-slider-duration: 0.34s;
  --quantity-slider-easing: cubic-bezier(0.22, 0.8, 0.24, 1);
  position: relative;
  height: 36px;
}
.quantity-slider-rail {
  position: absolute;
  inset: 0;
  overflow: visible;
  border: 1px solid var(--color-line2);
  border-radius: 999px;
  background: var(--color-panel2);
  box-shadow: inset 0 1px 2px rgb(38 35 28 / 0.08);
}
.quantity-slider-fill {
  position: absolute;
  inset: 0 calc(100% - var(--quantity-progress) - 18px) 0 0;
  border-radius: inherit;
  background: color-mix(in srgb, var(--color-paper) 78%, var(--color-panel2));
  transition: right var(--quantity-slider-duration) var(--quantity-slider-easing);
}
.quantity-slider-thumb {
  position: absolute;
  z-index: 3;
  top: 50%;
  left: var(--quantity-progress);
  height: 36px;
  width: 36px;
  border: 1px solid color-mix(in srgb, var(--color-paper) 8%, transparent);
  border-radius: 50%;
  background: var(--color-well);
  box-shadow:
    0 2px 8px rgb(38 35 28 / 0.2),
    0 0 0 1px rgb(255 255 255 / 0.35) inset;
  transform: translate(-50%, -50%);
  transition:
    left var(--quantity-slider-duration) var(--quantity-slider-easing),
    transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow 0.2s ease;
}
.quantity-slider {
  position: absolute;
  z-index: 5;
  inset: 0;
  display: block;
  height: 36px;
  width: 100%;
  cursor: pointer;
  appearance: none;
  border: 0;
  outline: 0;
  background: transparent;
  opacity: 0;
}
.quantity-slider::-webkit-slider-thumb {
  height: 36px;
  width: 36px;
  appearance: none;
  border: 0;
  background: transparent;
}
.quantity-slider::-moz-range-thumb {
  height: 36px;
  width: 36px;
  border: 0;
  background: transparent;
}
.quantity-slider-thumb.is-hovered {
  box-shadow: 0 4px 12px rgb(38 35 28 / 0.26);
  transform: translate(-50%, -50%) scale(1.22);
}
.quantity-slider-thumb.is-dragging {
  box-shadow: 0 4px 12px rgb(38 35 28 / 0.26);
  transform: translate(-50%, -50%) scale(1.22);
}
.quantity-slider-wrap:has(.quantity-slider:focus-visible) .quantity-slider-thumb:not(.is-hovered):not(.is-dragging) {
  box-shadow: 0 3px 10px rgb(38 35 28 / 0.25);
  transform: translate(-50%, -50%) scale(1.06);
}
.quantity-dots {
  position: absolute;
  z-index: 2;
  top: 50%;
  right: 18px;
  left: 18px;
  display: flex;
  justify-content: space-between;
  transform: translateY(-50%);
  pointer-events: none;
}
.quantity-dots i {
  height: 6px;
  width: 6px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-paper) 32%, transparent);
  transition: background 0.2s, transform 0.2s var(--ease-out-soft);
}
.quantity-dots i.active {
  background: color-mix(in srgb, var(--color-well) 68%, transparent);
}
.quantity-dots i.hovered {
  background: color-mix(in srgb, var(--color-paper) 48%, transparent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-well) 18%, transparent);
  transform: scale(1.55);
}
.quantity-scale { display: flex; justify-content: space-between; padding: 0 2px; }
.quantity-scale span {
  min-width: 16px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 9.5px;
  color: var(--color-dim);
  transition: color 0.15s, font-weight 0.15s;
}
.quantity-scale span.active { font-weight: 700; color: var(--color-accenthi); }
.cost-block {
  display: grid;
  min-width: 88px;
  grid-template-rows: 13px var(--parameter-control-height);
  gap: 6px;
  text-align: right;
}
.cost-block span { display: block; line-height: 13px; }
.cost-block strong {
  display: flex;
  height: var(--parameter-control-height);
  align-items: center;
  justify-content: flex-end;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-accenthi);
}

@media (max-width: 860px) {
  .generate-dock { right: 14px; bottom: 14px; left: 90px; }
  .parameter-tray { grid-template-columns: 1.5fr 1fr 1fr; }
  .quantity-group { grid-column: 3; }
  .quantity-control {
    right: 0;
    left: auto;
    transform-origin: right bottom;
  }
  .format-group { grid-column: 1 / span 2; }
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
  .ratio-group { grid-column: span 2; }
  .format-group { grid-column: 1; }
  .quantity-group { grid-column: 2; }
  .cost-block { text-align: left; }
}

@media (max-width: 460px) {
  .composer-tools .tool-button span { display: none; }
  .composer-tools .ml-auto span { display: inline; }
  .dock-menu { max-width: calc(100vw - 42px); }
}
</style>
