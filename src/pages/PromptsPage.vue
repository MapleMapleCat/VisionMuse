<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useTemplateStore } from '@/stores/templates'
import type { PromptTemplate } from '@/types'

const ui = useUiStore()
const templateStore = useTemplateStore()
const router = useRouter()

const filter = ref('全部')
const categories = computed(() => ['全部', ...new Set(templateStore.templates.map(t => t.category))])
const shown = computed(() =>
  filter.value === '全部' ? templateStore.templates : templateStore.templates.filter(t => t.category === filter.value),
)

// {{变量}} 高亮拆分
function parts(content: string) {
  return content.split(/(\{\{[^}]+\}\})/g).map(seg => ({
    text: seg,
    isVar: /^\{\{[^}]+\}\}$/.test(seg),
  }))
}

const fillTarget = ref<PromptTemplate | null>(null)
const fillValues = ref<Record<string, string>>({})

function useTpl(tpl: PromptTemplate) {
  const vars = [...new Set([...tpl.content.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]))]
  if (vars.length) {
    fillTarget.value = tpl
    fillValues.value = Object.fromEntries(vars.map(v => [v, '']))
  } else {
    ui.useTemplate(tpl)
    router.push('/gallery')
    ui.showToast('模板已带入创作浮窗')
  }
}

function copyTpl(tpl: PromptTemplate) {
  navigator.clipboard.writeText(tpl.content)
  ui.showToast('已复制')
}

function confirmFill() {
  if (!fillTarget.value) return
  let content = fillTarget.value.content
  for (const [k, v] of Object.entries(fillValues.value)) {
    content = content.replaceAll(`{{${k}}}`, v.trim() || `{{${k}}}`)
  }
  void templateStore.recordUse(fillTarget.value)
  ui.draftPrompt = content
  ui.dockOpen = true
  fillTarget.value = null
  router.push('/gallery')
  ui.showToast('模板已带入创作浮窗')
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="border-b border-line bg-ink/90 px-6 pb-4 pt-5 backdrop-blur">
      <p class="field-label">Prompt library</p>
      <div class="mb-3 mt-1.5 flex items-end gap-3">
        <h1 class="display text-[27px] leading-none">提示词模板</h1>
        <span class="pb-0.5 font-mono text-[10.5px] text-dim">{{ templateStore.templates.length }} 个</span>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="c in categories" :key="c"
          class="chip"
          :class="{ on: filter === c }"
          :aria-pressed="filter === c"
          @click="filter = c"
        >{{ c }}</button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-44 pt-5">
      <div class="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="(tpl, ti) in shown" :key="tpl.id"
          class="rise-in group flex flex-col rounded-2xl border border-line bg-well p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-line2 hover:shadow-lift"
          :style="{ '--stagger': ti }"
        >
          <div class="mb-2 flex items-center gap-2">
            <h2 class="text-[13.5px] font-semibold">{{ tpl.title }}</h2>
            <span class="rounded-full border border-line2 px-2 py-px text-[10px] text-dim">{{ tpl.category }}</span>
            <span class="ml-auto font-mono text-[10px] text-dim">用过 {{ tpl.useCount }} 次</span>
          </div>
          <p class="mb-3.5 flex-1 text-[12.5px] leading-relaxed text-fade">
            <template v-for="(seg, i) in parts(tpl.content)" :key="i">
              <mark v-if="seg.isVar" class="rounded-md bg-amber/10 px-1 py-px font-mono text-[11.5px] text-amberhi">{{ seg.text }}</mark>
              <template v-else>{{ seg.text }}</template>
            </template>
          </p>
          <div class="flex gap-2">
            <button class="btn btn-amber !py-1.5 text-[12px]" @click="useTpl(tpl)">带入创作</button>
            <button
              class="btn btn-ghost !py-1.5 text-[12px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
              @click="copyTpl(tpl)"
            >复制</button>
          </div>
        </article>
      </div>

      <p class="mt-6 text-center text-[12px] text-dim">
        在图库任意图片的详情里点「存为模板」，可以把成功的提示词沉淀到这里
      </p>
    </div>

    <!-- 变量填空弹窗 -->
    <Teleport to="body">
      <div v-if="fillTarget" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fade-in absolute inset-0 bg-paper/25 backdrop-blur-[3px]" @click="fillTarget = null" />
        <div class="pop-in relative w-[440px] max-w-[90vw] rounded-2xl border border-line bg-well p-5 shadow-pop">
          <h3 class="mb-1 text-[14px] font-semibold">{{ fillTarget.title }}</h3>
          <p class="mb-4 text-[12px] leading-relaxed text-dim">填写模板变量，留空则保留占位符</p>
          <div class="space-y-3">
            <label v-for="(_, key) in fillValues" :key="key" class="block">
              <span class="field-label mb-1 block">{{ key }}</span>
              <input v-model="fillValues[key]" class="input" :placeholder="`例如：${key === '主体' ? '一只戴礼帽的乌鸦' : '…'}`" @keydown.enter="confirmFill" />
            </label>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button class="btn" @click="fillTarget = null">取消</button>
            <button class="btn btn-amber" @click="confirmFill">带入创作浮窗</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
