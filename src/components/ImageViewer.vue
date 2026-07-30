<script setup lang="ts">
// 图片详情抽屉 + 全屏灯箱。←/→ 切图、F 收藏、Esc 关闭
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGalleryStore } from '@/stores/gallery'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'
import { estimateCost, sizeToWH } from '@/types'
import { downloadBlob, getImageFileName } from '@/services/download'

const gallery = useGalleryStore()
const ui = useUiStore()
const settings = useSettingsStore()
const router = useRouter()

const rec = computed(() => (ui.viewerId ? gallery.byId(ui.viewerId) : undefined))
const idx = computed(() => (ui.viewerId ? ui.viewerList.indexOf(ui.viewerId) : -1))
const siblings = computed(() => (rec.value ? gallery.siblings(rec.value) : []))
const requestedDimensions = computed(() => {
  if (!rec.value) return undefined
  const { w: width, h: height } = sizeToWH(rec.value.params.size)
  return { width, height }
})
const dimensionsMismatch = computed(() => Boolean(
  rec.value
  && requestedDimensions.value
  && (rec.value.width !== requestedDimensions.value.width || rec.value.height !== requestedDimensions.value.height),
))

const tagInput = ref('')
const drawerEl = ref<HTMLElement>()
const lightboxCloseButton = ref<HTMLButtonElement>()
const lightboxImage = ref<HTMLImageElement>()
const viewerImageButton = ref<HTMLButtonElement>()
const lightboxZoom = ref(1)
const lightboxHorizontalOffset = ref(0)
const lightboxVerticalOffset = ref(0)
const isLightboxDragging = ref(false)
const maximumLightboxZoom = 4
const lightboxSingleClickDelayMilliseconds = 140
const lightboxDragThresholdPixels = 4
const canZoomInLightbox = computed(() => lightboxZoom.value < maximumLightboxZoom)
let previousFocus: HTMLElement | null = null
let previousBodyOverflow = ''
let pendingLightboxClickTimeout: number | undefined
let activeLightboxPointerId: number | undefined
let lightboxDragStartClientX = 0
let lightboxDragStartClientY = 0
let lightboxDragStartHorizontalOffset = 0
let lightboxDragStartVerticalOffset = 0
let hasLightboxDragMoved = false
let shouldSuppressNextLightboxClick = false

function cancelPendingLightboxClick() {
  if (pendingLightboxClickTimeout === undefined) return
  window.clearTimeout(pendingLightboxClickTimeout)
  pendingLightboxClickTimeout = undefined
}

function resetLightboxZoom() {
  cancelPendingLightboxClick()
  lightboxZoom.value = 1
  lightboxHorizontalOffset.value = 0
  lightboxVerticalOffset.value = 0
  activeLightboxPointerId = undefined
  isLightboxDragging.value = false
  hasLightboxDragMoved = false
  shouldSuppressNextLightboxClick = false
}

function setLightboxZoomAt(clientX: number, clientY: number, nextLightboxZoom: number) {
  const currentLightboxZoom = lightboxZoom.value
  if (nextLightboxZoom === currentLightboxZoom || !lightboxImage.value) return

  const imageBounds = lightboxImage.value.getBoundingClientRect()
  const currentImageCenterX = imageBounds.left + imageBounds.width / 2
  const currentImageCenterY = imageBounds.top + imageBounds.height / 2
  const zoomRatio = nextLightboxZoom / currentLightboxZoom

  lightboxHorizontalOffset.value += (1 - zoomRatio) * (clientX - currentImageCenterX)
  lightboxVerticalOffset.value += (1 - zoomRatio) * (clientY - currentImageCenterY)
  lightboxZoom.value = nextLightboxZoom
}

function zoomInLightboxAt(clientX: number, clientY: number) {
  if (!canZoomInLightbox.value) return
  setLightboxZoomAt(clientX, clientY, Math.min(lightboxZoom.value + 1, maximumLightboxZoom))
}

function scheduleLightboxZoomIn(event: MouseEvent) {
  if (shouldSuppressNextLightboxClick) {
    shouldSuppressNextLightboxClick = false
    return
  }

  cancelPendingLightboxClick()
  const { clientX, clientY } = event
  pendingLightboxClickTimeout = window.setTimeout(() => {
    pendingLightboxClickTimeout = undefined
    zoomInLightboxAt(clientX, clientY)
  }, lightboxSingleClickDelayMilliseconds)
}

function zoomOutLightbox(event: MouseEvent) {
  cancelPendingLightboxClick()
  const nextLightboxZoom = Math.max(lightboxZoom.value - 1, 1)
  setLightboxZoomAt(event.clientX, event.clientY, nextLightboxZoom)
}

function startLightboxDrag(event: PointerEvent) {
  if (!event.isPrimary || event.button !== 0) return

  cancelPendingLightboxClick()
  activeLightboxPointerId = event.pointerId
  lightboxDragStartClientX = event.clientX
  lightboxDragStartClientY = event.clientY
  lightboxDragStartHorizontalOffset = lightboxHorizontalOffset.value
  lightboxDragStartVerticalOffset = lightboxVerticalOffset.value
  hasLightboxDragMoved = false
  isLightboxDragging.value = true
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.setPointerCapture(event.pointerId)
  }
}

function moveLightboxDrag(event: PointerEvent) {
  if (event.pointerId !== activeLightboxPointerId) return

  const horizontalDistance = event.clientX - lightboxDragStartClientX
  const verticalDistance = event.clientY - lightboxDragStartClientY
  if (!hasLightboxDragMoved && Math.hypot(horizontalDistance, verticalDistance) < lightboxDragThresholdPixels) return

  hasLightboxDragMoved = true
  lightboxHorizontalOffset.value = lightboxDragStartHorizontalOffset + horizontalDistance
  lightboxVerticalOffset.value = lightboxDragStartVerticalOffset + verticalDistance
}

function finishLightboxDrag(event: PointerEvent) {
  if (event.pointerId !== activeLightboxPointerId) return

  if (hasLightboxDragMoved) shouldSuppressNextLightboxClick = true
  if (event.currentTarget instanceof HTMLElement && event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }
  activeLightboxPointerId = undefined
  isLightboxDragging.value = false
  hasLightboxDragMoved = false
}

function cancelLightboxDrag(event: PointerEvent) {
  if (event.pointerId !== activeLightboxPointerId) return
  activeLightboxPointerId = undefined
  isLightboxDragging.value = false
  hasLightboxDragMoved = false
}

function trapFocus(event: KeyboardEvent) {
  if (ui.lightbox) {
    event.preventDefault()
    lightboxCloseButton.value?.focus()
    return
  }
  const root = drawerEl.value
  if (!root) return
  const focusable = [...root.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter(element => element.offsetParent !== null)
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement as HTMLElement | null
  if (!active || !root.contains(active)) {
    event.preventDefault()
    first.focus()
  } else if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

function onKey(e: KeyboardEvent) {
  if (!rec.value) return
  const inInput = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA'
  if (e.key === 'Escape') {
    if (ui.lightbox) ui.lightbox = false
    else ui.closeViewer()
  }
  if (e.key === 'Tab') {
    trapFocus(e)
    return
  }
  if (inInput) return
  if (e.key === 'ArrowLeft') ui.stepViewer(-1)
  if (e.key === 'ArrowRight') ui.stepViewer(1)
  if (e.key === 'f' || e.key === 'F') gallery.toggleFavorite(rec.value.id)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  cancelPendingLightboxClick()
  document.body.style.overflow = previousBodyOverflow
  previousFocus?.focus()
})

watch(() => ui.viewerId, () => (tagInput.value = ''))
watch(
  () => Boolean(rec.value),
  async open => {
    if (open) {
      previousFocus = document.activeElement as HTMLElement | null
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      await nextTick()
      drawerEl.value?.focus()
      return
    }
    document.body.style.overflow = previousBodyOverflow
    previousFocus?.focus()
    previousFocus = null
  },
)
watch(
  () => ui.lightbox,
  async open => {
    if (open) resetLightboxZoom()
    else cancelPendingLightboxClick()
    await nextTick()
    if (open) lightboxCloseButton.value?.focus()
    else if (rec.value) viewerImageButton.value?.focus()
  },
)
watch(() => rec.value?.id, resetLightboxZoom)

function copyPrompt() {
  if (!rec.value) return
  navigator.clipboard.writeText(rec.value.prompt)
  ui.showToast('提示词已复制')
}

async function addTag() {
  if (!rec.value || !tagInput.value.trim()) return
  const tags = [...rec.value.tags]
  if (!tags.includes(tagInput.value.trim())) tags.push(tagInput.value.trim())
  await gallery.setTags(rec.value.id, tags)
  tagInput.value = ''
}

async function removeTag(t: string) {
  if (!rec.value) return
  await gallery.setTags(rec.value.id, rec.value.tags.filter(x => x !== t))
}

function doRemix() {
  if (!rec.value) return
  ui.remix(rec.value)
  router.push('/gallery')
  ui.showToast('已回填提示词与参数')
}

function doReference() {
  if (!rec.value) return
  const referenceWasAdded = ui.useAsReference(rec.value)
  if (!referenceWasAdded) return
  router.push('/gallery')
  ui.showToast('已加入参考图 · img2img')
}

function doDownload() {
  if (!rec.value) return
  downloadBlob(rec.value.originalBlob, getImageFileName(rec.value))
}

async function doDelete() {
  if (!rec.value) return
  const imageId = rec.value.id
  if (rec.value.deletedAt) {
    if (!window.confirm('将永久删除这张图片，此操作无法撤销。继续吗？')) return
    await gallery.purge([imageId])
    ui.showToast('图片已永久删除')
  } else {
    await gallery.softDelete([imageId])
    ui.showToast('已移入回收站')
  }
  const next = ui.viewerList[idx.value + 1] ?? ui.viewerList[idx.value - 1]
  if (next) {
    ui.viewerList = ui.viewerList.filter(id => id !== imageId)
    ui.viewerId = next
  } else ui.closeViewer()
}

async function doRestore() {
  if (!rec.value) return
  await gallery.restore([rec.value.id])
  ui.showToast('图片已恢复到图库')
  ui.closeViewer()
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const dateText = computed(() => {
  if (!rec.value) return ''
  const d = new Date(rec.value.createdAt)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})
</script>

<template>
  <!-- 抽屉遮罩 -->
  <Teleport to="body">
    <div v-if="rec" class="fixed inset-0 z-40 flex justify-end">
      <div class="fade-in absolute inset-0 bg-paper/25 backdrop-blur-[3px]" @click="ui.closeViewer()" />

      <aside
        ref="drawerEl"
        role="dialog"
        aria-modal="true"
        aria-label="图片详情"
        tabindex="-1"
        class="drawer-in relative flex h-full w-[520px] max-w-[92vw] flex-col border-l border-line bg-ink shadow-pop focus:outline-none"
      >
        <!-- 顶部：位置与关闭 -->
        <header class="flex items-center gap-2 border-b border-line bg-well px-4 py-2.5">
          <span class="font-mono text-[11px] text-dim">{{ idx + 1 }} / {{ ui.viewerList.length }}</span>
          <div class="ml-1 flex gap-1">
            <button class="btn btn-ghost !p-1.5" title="上一张 ←" aria-label="上一张图片" :disabled="idx <= 0" @click="ui.stepViewer(-1)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m14 6-6 6 6 6" /></svg>
            </button>
            <button class="btn btn-ghost !p-1.5" title="下一张 →" aria-label="下一张图片" :disabled="idx >= ui.viewerList.length - 1" @click="ui.stepViewer(1)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m10 6 6 6-6 6" /></svg>
            </button>
          </div>
          <button class="btn btn-ghost ml-auto !p-1.5" title="关闭 Esc" aria-label="关闭图片详情" @click="ui.closeViewer()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <!-- 大图 -->
          <button ref="viewerImageButton" class="block w-full cursor-zoom-in bg-panel2" title="点击全屏查看" aria-label="全屏查看图片" @click="ui.lightbox = true">
            <img :key="rec.id" :src="rec.dataUrl" :alt="rec.prompt" class="develop-in mx-auto max-h-[46vh] w-auto max-w-full object-contain" style="animation-duration: 0.4s" />
          </button>

          <div class="space-y-4 px-4 py-4">
            <!-- 操作行 -->
            <div class="flex flex-wrap gap-2">
              <button
                v-if="!rec.deletedAt"
                class="btn btn-amber text-[12px]"
                aria-controls="visionmuse-create-panel"
                @click="doRemix"
              >↻ Remix</button>
              <button
                v-if="!rec.deletedAt"
                class="btn text-[12px]"
                aria-controls="visionmuse-create-panel"
                @click="doReference"
              >用作参考图</button>
              <button class="btn text-[12px]" @click="doDownload">下载</button>
              <button v-if="!rec.deletedAt" class="btn text-[12px]" @click="ui.saveAsTemplate(rec)">存为模板</button>
              <button
                class="btn text-[12px]"
                :class="{ 'text-amber': rec.favorite }"
                :aria-pressed="rec.favorite"
                @click="gallery.toggleFavorite(rec.id)"
              >{{ rec.favorite ? '♥ 已收藏' : '♡ 收藏' }}</button>
              <button v-if="rec.deletedAt" class="btn ml-auto text-[12px]" @click="doRestore">恢复</button>
              <button class="btn btn-danger text-[12px]" :class="{ 'ml-auto': !rec.deletedAt }" @click="doDelete">{{ rec.deletedAt ? '永久删除' : '删除' }}</button>
            </div>

            <!-- 提示词 -->
            <div>
              <div class="mb-1.5 flex items-center justify-between">
                <span class="field-label">提示词</span>
                <button class="text-[11px] text-dim hover:text-amberhi" @click="copyPrompt">复制</button>
              </div>
              <p class="rounded-xl border border-line bg-well px-3.5 py-3 text-[13px] leading-relaxed text-paper/90 shadow-card">
                {{ rec.prompt }}
              </p>
            </div>

            <!-- 参数表 -->
            <div>
              <div class="field-label mb-1.5">生成参数</div>
              <div class="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line shadow-card">
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">模型</span><div class="truncate font-mono text-[12px]" :title="rec.model">{{ rec.model }}</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">类型</span><div class="font-mono text-[12px]">{{ rec.kind === 'edit' ? 'img2img' : 'text2img' }}</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">实际尺寸</span><div class="font-mono text-[12px]" :class="{ 'text-red': dimensionsMismatch }">{{ rec.width }} × {{ rec.height }}</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">请求尺寸</span><div class="font-mono text-[12px]">{{ requestedDimensions?.width }} × {{ requestedDimensions?.height }}</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">质量</span><div class="font-mono text-[12px]">{{ rec.params.quality }}</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">时间</span><div class="font-mono text-[12px]">{{ dateText }}</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">格式 / 大小</span><div class="font-mono text-[12px]">{{ rec.fileExtension }} · {{ formatBytes(rec.byteSize) }}</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">成本估算</span><div class="font-mono text-[12px] text-amberhi">≈ ${{ (estimateCost(rec.params, rec.kind, settings.settings.estimatedCostByQuality) / rec.params.n).toFixed(2) }}</div></div>
                <div class="col-span-2 bg-well px-3 py-2"><span class="text-[10.5px] text-dim">请求地址</span><div class="truncate font-mono text-[11px]" :title="rec.requestEndpoint">{{ rec.requestEndpoint }}</div></div>
              </div>
              <p v-if="dimensionsMismatch" class="mt-2 rounded-lg border border-red/20 bg-red/4 px-3 py-2 text-[10.5px] leading-relaxed text-red/85">
                接口返回的图片尺寸与请求不一致。通常表示当前模型不支持该尺寸，或请求模板中的尺寸字段未被接口识别。
              </p>
            </div>

            <!-- 标签 -->
            <div>
              <div class="field-label mb-1.5">标签</div>
              <div class="flex flex-wrap items-center gap-1.5">
                <span v-for="t in rec.tags" :key="t" class="chip on !cursor-default !py-1">
                  {{ t }}
                  <button class="ml-0.5 opacity-60 hover:opacity-100" title="移除" :aria-label="`移除标签：${t}`" @click="removeTag(t)">✕</button>
                </span>
                <input
                  v-model="tagInput"
                  class="input !w-28 !px-2.5 !py-1 !text-[12px]"
                  placeholder="+ 标签"
                  @keydown.enter="addTag"
                />
              </div>
            </div>

            <!-- 同任务兄弟图 -->
            <div v-if="siblings.length > 1">
              <div class="field-label mb-1.5">同一任务 · {{ siblings.length }} 张</div>
              <div class="flex gap-2 overflow-x-auto pb-1">
                <button
                  v-for="s in siblings" :key="s.id"
                  class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card"
                  :class="s.id === rec.id ? 'border-amber ring-2 ring-amber/25' : 'border-line hover:border-line2'"
                  :aria-label="`查看同任务图片：${s.prompt}`"
                  :aria-current="s.id === rec.id ? 'true' : undefined"
                  @click="ui.viewerId = s.id"
                >
                  <img :src="s.dataUrl" :alt="s.prompt" class="h-full w-full object-cover" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer class="border-t border-line bg-well px-4 py-2 text-center font-mono text-[10px] text-dim">
          ← → 切换 · F 收藏 · Esc 关闭
        </footer>
      </aside>
    </div>

    <!-- 全屏灯箱 -->
    <div
      v-if="rec && ui.lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="全屏图片预览"
      tabindex="-1"
      class="fade-in fixed inset-0 z-50 flex touch-none select-none items-center justify-center overflow-hidden bg-paper/95"
      :class="isLightboxDragging ? 'cursor-grabbing' : 'cursor-grab'"
      @click="scheduleLightboxZoomIn"
      @dblclick.prevent="zoomOutLightbox"
      @pointerdown="startLightboxDrag"
      @pointermove="moveLightboxDrag"
      @pointerup="finishLightboxDrag"
      @pointercancel="cancelLightboxDrag"
    >
      <button
        ref="lightboxCloseButton"
        class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/75 backdrop-blur transition hover:bg-white/20 hover:text-white"
        aria-label="关闭全屏预览"
        @pointerdown.stop
        @click.stop="ui.lightbox = false"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <img
        ref="lightboxImage"
        :src="rec.dataUrl"
        :alt="rec.prompt"
        class="pointer-events-none max-h-full max-w-full select-none object-contain will-change-transform"
        :class="{ 'transition-transform duration-300 ease-out': !isLightboxDragging }"
        :style="{
          transform: `translate3d(${lightboxHorizontalOffset}px, ${lightboxVerticalOffset}px, 0) scale(${lightboxZoom})`,
        }"
      />
      <span class="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-white/10 px-3 py-1 font-mono text-[11px] text-white/70">
        {{ rec.width }} × {{ rec.height }} · 拖动查看 · {{ canZoomInLightbox ? '单击放大' : '已达最大倍率' }} · 快速双击缩小 · {{ lightboxZoom }}× · Esc 退出
      </span>
    </div>
  </Teleport>
</template>
