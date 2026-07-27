<script setup lang="ts">
// 图片详情抽屉 + 全屏灯箱。←/→ 切图、F 收藏、Esc 关闭
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGalleryStore } from '@/stores/gallery'
import { useUiStore } from '@/stores/ui'
import { estimateCost } from '@/types'

const gallery = useGalleryStore()
const ui = useUiStore()
const router = useRouter()

const rec = computed(() => (ui.viewerId ? gallery.byId(ui.viewerId) : undefined))
const idx = computed(() => (ui.viewerId ? ui.viewerList.indexOf(ui.viewerId) : -1))
const siblings = computed(() => (rec.value ? gallery.siblings(rec.value) : []))

const tagInput = ref('')
const drawerEl = ref<HTMLElement>()
const lightboxCloseButton = ref<HTMLButtonElement>()
const viewerImageButton = ref<HTMLButtonElement>()
let previousFocus: HTMLElement | null = null
let previousBodyOverflow = ''

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
    await nextTick()
    if (open) lightboxCloseButton.value?.focus()
    else if (rec.value) viewerImageButton.value?.focus()
  },
)

function copyPrompt() {
  if (!rec.value) return
  navigator.clipboard.writeText(rec.value.prompt)
  ui.showToast('提示词已复制')
}

function addTag() {
  if (!rec.value || !tagInput.value.trim()) return
  const tags = [...rec.value.tags]
  if (!tags.includes(tagInput.value.trim())) tags.push(tagInput.value.trim())
  gallery.setTags(rec.value.id, tags)
  tagInput.value = ''
}

function removeTag(t: string) {
  if (!rec.value) return
  gallery.setTags(rec.value.id, rec.value.tags.filter(x => x !== t))
}

function doRemix() {
  if (!rec.value) return
  ui.remix(rec.value)
  router.push('/gallery')
  ui.showToast('已回填提示词与参数')
}

function doReference() {
  if (!rec.value) return
  ui.useAsReference(rec.value)
  router.push('/gallery')
  ui.showToast('已设为参考图 · img2img')
}

function doDownload() {
  if (!rec.value) return
  const a = document.createElement('a')
  a.href = rec.value.dataUrl
  a.download = `pic-${rec.value.id}.webp`
  a.click()
}

function doDelete() {
  if (!rec.value) return
  gallery.softDelete([rec.value.id])
  ui.showToast('已移入回收站')
  const next = ui.viewerList[idx.value + 1] ?? ui.viewerList[idx.value - 1]
  if (next) {
    ui.viewerList = ui.viewerList.filter(id => id !== rec.value!.id)
    ui.viewerId = next
  } else ui.closeViewer()
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
              <button class="btn btn-amber text-[12px]" @click="doRemix">↻ Remix</button>
              <button class="btn text-[12px]" @click="doReference">用作参考图</button>
              <button class="btn text-[12px]" @click="doDownload">下载</button>
              <button class="btn text-[12px]" @click="ui.saveAsTemplate(rec)">存为模板</button>
              <button
                class="btn text-[12px]"
                :class="{ 'text-amber': rec.favorite }"
                :aria-pressed="rec.favorite"
                @click="gallery.toggleFavorite(rec.id)"
              >{{ rec.favorite ? '♥ 已收藏' : '♡ 收藏' }}</button>
              <button class="btn btn-danger ml-auto text-[12px]" @click="doDelete">删除</button>
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
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">模型</span><div class="font-mono text-[12px]">gpt-image-2</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">类型</span><div class="font-mono text-[12px]">{{ rec.kind === 'edit' ? 'img2img' : 'text2img' }}</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">尺寸</span><div class="font-mono text-[12px]">{{ rec.width }} × {{ rec.height }}</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">质量</span><div class="font-mono text-[12px]">{{ rec.params.quality }}</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">时间</span><div class="font-mono text-[12px]">{{ dateText }}</div></div>
                <div class="bg-well px-3 py-2"><span class="text-[10.5px] text-dim">成本估算</span><div class="font-mono text-[12px] text-amberhi">≈ ${{ (estimateCost(rec.params, rec.kind) / rec.params.n).toFixed(2) }}</div></div>
              </div>
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
      class="fade-in fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-paper/95"
      @click="ui.lightbox = false"
    >
      <button
        ref="lightboxCloseButton"
        class="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/75 backdrop-blur transition hover:bg-white/20 hover:text-white"
        aria-label="关闭全屏预览"
        @click.stop="ui.lightbox = false"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <img :src="rec.dataUrl" :alt="rec.prompt" class="pop-in max-h-full max-w-full object-contain" />
      <span class="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-white/10 px-3 py-1 font-mono text-[11px] text-white/70">
        {{ rec.width }} × {{ rec.height }} · 点击任意处退出
      </span>
    </div>
  </Teleport>
</template>
