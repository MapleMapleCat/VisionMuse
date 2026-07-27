<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useTaskStore } from '@/stores/tasks'
import { useUiStore } from '@/stores/ui'
import { useGalleryStore } from '@/stores/gallery'
import { SIZE_OPTIONS, QUALITY_OPTIONS, FORMAT_OPTIONS, estimateCost } from '@/types'
import TaskCard from '@/components/TaskCard.vue'

const tasks = useTaskStore()
const ui = useUiStore()
const gallery = useGalleryStore()

const promptEl = ref<HTMLTextAreaElement>()
const showTemplates = ref(false)
const showHistory = ref(false)

const recentPrompts = computed(() => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const img of gallery.alive) {
    if (!seen.has(img.prompt)) { seen.add(img.prompt); out.push(img.prompt) }
    if (out.length >= 8) break
  }
  return out
})

const cost = computed(() => estimateCost(ui.draftParams, ui.referenceThumb ? 'edit' : 'generate'))
const canSubmit = computed(() => ui.draftPrompt.trim().length > 0)

function submit() {
  if (!canSubmit.value) return
  tasks.submit(ui.draftPrompt.trim(), ui.draftParams, ui.referenceThumb)
  ui.referenceThumb = undefined
}

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit() }
}

function pickTemplate(content: string) {
  ui.draftPrompt = content
  showTemplates.value = false
  promptEl.value?.focus()
}

function pickHistory(p: string) {
  ui.draftPrompt = p
  showHistory.value = false
  promptEl.value?.focus()
}

function onPaste(e: ClipboardEvent) {
  const file = [...(e.clipboardData?.files ?? [])].find(f => f.type.startsWith('image/'))
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { ui.referenceThumb = reader.result as string }
  reader.readAsDataURL(file)
}

function onRefPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { ui.referenceThumb = reader.result as string }
  reader.readAsDataURL(file)
  ;(e.target as HTMLInputElement).value = ''
}

function closeMenus(e: MouseEvent) {
  const t = e.target as HTMLElement
  if (!t.closest('[data-menu]')) { showTemplates.value = false; showHistory.value = false }
}
onMounted(() => document.addEventListener('click', closeMenus))
onBeforeUnmount(() => document.removeEventListener('click', closeMenus))
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- ── 输入区 ── -->
    <section class="border-b border-line bg-well px-6 pb-4 pt-5">
      <div class="mx-auto max-w-[860px]">
        <div class="mb-3 flex items-baseline justify-between">
          <h1 class="text-[15px] font-semibold tracking-wide">生成工作台</h1>
          <span class="font-mono text-[11px] text-dim">gpt-image-2 · mock</span>
        </div>

        <!-- 提示词框 -->
        <div class="rounded-2xl border border-line2 bg-well shadow-card transition-shadow duration-300 focus-within:border-amber focus-within:shadow-lift">
          <textarea
            ref="promptEl"
            v-model="ui.draftPrompt"
            rows="3"
            placeholder="描述你想要的画面…（Ctrl+Enter 生成）"
            class="w-full resize-none bg-transparent px-4 pt-3.5 text-[14px] leading-relaxed placeholder:text-dim focus:outline-none"
            @keydown="onKeydown"
            @paste="onPaste"
          />
          <div class="flex items-center gap-2 px-3 pb-2.5">
            <!-- 参考图缩略 -->
            <div v-if="ui.referenceThumb" class="group relative">
              <img :src="ui.referenceThumb" alt="参考图" class="h-9 w-9 rounded-md border border-amber object-cover" />
              <button
                class="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red text-[10px] text-white group-hover:flex"
                title="移除参考图"
                @click="ui.referenceThumb = undefined"
              >✕</button>
            </div>
            <span v-if="ui.referenceThumb" class="rounded-md bg-amber/10 px-1.5 py-0.5 font-mono text-[10px] text-amberhi">img2img</span>

            <label class="btn btn-ghost cursor-pointer !px-2.5 !py-1.5 text-[12px]" title="上传参考图（或直接粘贴）">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm2 11l4-5 3 3.5L16 12l3 4H6z"/></svg>
              参考图
              <input type="file" accept="image/*" class="hidden" @change="onRefPick" />
            </label>

            <div class="relative" data-menu>
              <button class="btn btn-ghost !px-2.5 !py-1.5 text-[12px]" @click="showTemplates = !showTemplates; showHistory = false">
                模板 <span class="text-[9px]">▾</span>
              </button>
              <div v-if="showTemplates" class="pop-in absolute left-0 top-full z-30 mt-1 max-h-72 w-80 overflow-auto rounded-xl border border-line bg-well py-1 shadow-pop">
                <button
                  v-for="tpl in ui.templates" :key="tpl.id"
                  class="block w-full px-3 py-2 text-left transition-colors hover:bg-panel2"
                  @click="pickTemplate(tpl.content)"
                >
                  <div class="text-[12px] text-paper">{{ tpl.title }} <span class="ml-1 font-mono text-[10px] text-dim">{{ tpl.category }}</span></div>
                  <div class="mt-0.5 truncate text-[11px] text-fade">{{ tpl.content }}</div>
                </button>
              </div>
            </div>

            <div class="relative" data-menu>
              <button class="btn btn-ghost !px-2.5 !py-1.5 text-[12px]" @click="showHistory = !showHistory; showTemplates = false">
                最近 <span class="text-[9px]">▾</span>
              </button>
              <div v-if="showHistory" class="pop-in absolute left-0 top-full z-30 mt-1 max-h-72 w-96 overflow-auto rounded-xl border border-line bg-well py-1 shadow-pop">
                <button
                  v-for="p in recentPrompts" :key="p"
                  class="block w-full truncate px-3 py-2 text-left text-[12px] text-fade transition-colors hover:bg-panel2 hover:text-paper"
                  @click="pickHistory(p)"
                >{{ p }}</button>
              </div>
            </div>

            <span class="ml-auto font-mono text-[11px] text-dim">{{ ui.draftPrompt.length }} 字</span>
            <button class="btn btn-amber !px-5" :disabled="!canSubmit" @click="submit">
              生成
              <span class="font-mono text-[10px] opacity-70">⌃⏎</span>
            </button>
          </div>
        </div>

        <!-- 参数栏 -->
        <div class="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
          <div class="w-44">
            <div class="field-label mb-1.5">尺寸</div>
            <div class="seg">
              <button
                v-for="opt in SIZE_OPTIONS" :key="opt.value"
                :class="{ on: ui.draftParams.size === opt.value }"
                :title="opt.label"
                @click="ui.draftParams.size = opt.value"
              >{{ opt.ratio }}</button>
            </div>
          </div>
          <div class="w-36">
            <div class="field-label mb-1.5">质量</div>
            <div class="seg">
              <button
                v-for="opt in QUALITY_OPTIONS" :key="opt.value"
                :class="{ on: ui.draftParams.quality === opt.value }"
                @click="ui.draftParams.quality = opt.value"
              >{{ opt.label }}</button>
            </div>
          </div>
          <div class="w-36">
            <div class="field-label mb-1.5">数量</div>
            <div class="seg">
              <button
                v-for="n in [1, 2, 3, 4]" :key="n"
                :class="{ on: ui.draftParams.n === n }"
                @click="ui.draftParams.n = n"
              >{{ n }}</button>
            </div>
          </div>
          <div class="w-36">
            <div class="field-label mb-1.5">格式</div>
            <div class="seg">
              <button
                v-for="f in FORMAT_OPTIONS" :key="f"
                :class="{ on: ui.draftParams.format === f }"
                @click="ui.draftParams.format = f"
              >{{ f }}</button>
            </div>
          </div>
          <div class="ml-auto pb-0.5 text-right">
            <div class="field-label mb-1">成本估算</div>
            <div class="font-mono text-[13px] text-amberhi">≈ ${{ cost.toFixed(2) }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 结果流 ── -->
    <section class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
      <div class="mx-auto max-w-[860px]">
        <template v-if="tasks.sessionTasks.length">
          <div class="mb-3 flex items-center justify-between">
            <span class="field-label">本次会话 · {{ tasks.sessionTasks.length }} 个任务</span>
            <span v-if="tasks.sessionCost > 0" class="font-mono text-[11px] text-dim">累计 ≈ ${{ tasks.sessionCost.toFixed(2) }}</span>
          </div>
          <div class="flex flex-col gap-4">
            <TaskCard v-for="task in tasks.sessionTasks" :key="task.id" :task="task" />
          </div>
        </template>

        <!-- 空状态 -->
        <div v-else class="flex flex-col items-center pt-20 text-center">
          <svg width="60" height="60" viewBox="0 0 34 34" fill="none" class="mb-5 opacity-60" style="animation: spin 14s linear infinite">
            <circle cx="17" cy="17" r="12" stroke="#A39E92" stroke-width="1.6" stroke-dasharray="3 4" />
            <circle cx="17" cy="17" r="3.2" fill="#1F6E62" />
          </svg>
          <p class="mb-1.5 text-[14px] text-fade">工作台已就绪</p>
          <p class="max-w-md text-[12.5px] leading-relaxed text-dim">
            在上方写下提示词开始生成。生成过程约需 30 秒到 2 分钟，<br />任务会在这里排队处理，完成后自动存入图库。
          </p>
          <button class="btn mt-5" @click="pickTemplate(ui.templates[3].content)">试试示例：吉卜力场景</button>
        </div>
      </div>
    </section>
  </div>
</template>
