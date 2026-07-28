<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PROMPT_MODULE_CATEGORIES } from '@/defaults/promptModules'
import { composePrompt } from '@/services/promptComposition'
import { usePromptModuleStore } from '@/stores/promptModules'
import { useTemplateStore } from '@/stores/templates'
import { useUiStore } from '@/stores/ui'
import type { PromptModule, PromptModuleCategory, PromptTemplate } from '@/types'

interface PromptPreset {
  id: string
  title: string
  description: string
  selections: Partial<Record<PromptModuleCategory, string>>
}

const ui = useUiStore()
const templateStore = useTemplateStore()
const promptModuleStore = usePromptModuleStore()
const router = useRouter()

const activeView = ref<'composer' | 'templates'>('composer')
const subject = ref('')
const selectedModuleIds = reactive<Record<PromptModuleCategory, string | undefined>>({
  style: undefined,
  composition: undefined,
  lighting: undefined,
  environment: undefined,
  color: undefined,
  detail: undefined,
})

const promptPresets: PromptPreset[] = [
  {
    id: 'balanced-photo',
    title: '通用摄影',
    description: '自然、耐看，适合人物与日常场景',
    selections: {
      style: 'module-style-cinematic',
      composition: 'module-composition-thirds',
      lighting: 'module-lighting-window',
      color: 'module-color-natural',
      detail: 'module-detail-realistic',
    },
  },
  {
    id: 'commercial-product',
    title: '商业产品',
    description: '干净棚拍与精确材质表现',
    selections: {
      style: 'module-style-editorial',
      composition: 'module-composition-centered',
      lighting: 'module-lighting-studio',
      environment: 'module-environment-studio',
      color: 'module-color-natural',
      detail: 'module-detail-product',
    },
  },
  {
    id: 'illustration-poster',
    title: '插画海报',
    description: '扁平造型、留白与醒目撞色',
    selections: {
      style: 'module-style-flat',
      composition: 'module-composition-centered',
      environment: 'module-environment-paper',
      color: 'module-color-vivid',
      detail: 'module-detail-grain',
    },
  },
  {
    id: 'three-dimensional-scene',
    title: '3D 小场景',
    description: '等距视角与柔和粘土质感',
    selections: {
      style: 'module-style-clay',
      composition: 'module-composition-isometric',
      lighting: 'module-lighting-studio',
      environment: 'module-environment-studio',
      color: 'module-color-warm',
      detail: 'module-detail-polished',
    },
  },
]

const selectedPromptModules = computed(() => PROMPT_MODULE_CATEGORIES
  .map(category => promptModuleStore.promptModules.find(promptModule => (
    promptModule.id === selectedModuleIds[category.key]
  )))
  .filter((promptModule): promptModule is PromptModule => Boolean(promptModule)))
const composedPrompt = computed(() => composePrompt(subject.value, selectedPromptModules.value))
const selectedModuleCount = computed(() => selectedPromptModules.value.length)

function getModulesByCategory(category: PromptModuleCategory): PromptModule[] {
  return promptModuleStore.getByCategory(category)
}

function togglePromptModule(promptModule: PromptModule) {
  selectedModuleIds[promptModule.category] = selectedModuleIds[promptModule.category] === promptModule.id
    ? undefined
    : promptModule.id
}

function clearCategory(category: PromptModuleCategory) {
  selectedModuleIds[category] = undefined
}

function clearComposition() {
  subject.value = ''
  for (const category of PROMPT_MODULE_CATEGORIES) clearCategory(category.key)
}

function applyPreset(promptPreset: PromptPreset) {
  for (const category of PROMPT_MODULE_CATEGORIES) {
    selectedModuleIds[category.key] = promptPreset.selections[category.key]
  }
  ui.showToast(`已应用「${promptPreset.title}」搭配`)
}

async function copyComposedPrompt() {
  if (!composedPrompt.value) return
  await navigator.clipboard.writeText(composedPrompt.value)
  ui.showToast('组合提示词已复制')
}

async function useComposedPrompt() {
  if (!composedPrompt.value) {
    ui.showToast('请填写主体或至少选择一个模块')
    return
  }
  await promptModuleStore.recordUses(selectedPromptModules.value)
  ui.draftPrompt = composedPrompt.value
  ui.dockOpen = true
  await router.push('/gallery')
  ui.showToast('组合提示词已带入创作浮窗')
}

const templateFilter = ref('全部')
const templateCategories = computed(() => [
  '全部',
  ...new Set(templateStore.templates.map(template => template.category)),
])
const shownTemplates = computed(() => templateFilter.value === '全部'
  ? templateStore.templates
  : templateStore.templates.filter(template => template.category === templateFilter.value))

function splitTemplateContent(content: string) {
  return content.split(/(\{\{[^}]+\}\})/g).map(segment => ({
    text: segment,
    isVariable: /^\{\{[^}]+\}\}$/.test(segment),
  }))
}

const fillTarget = ref<PromptTemplate | null>(null)
const fillValues = ref<Record<string, string>>({})

function useTemplate(template: PromptTemplate) {
  const variables = [...new Set(
    [...template.content.matchAll(/\{\{([^}]+)\}\}/g)].map(match => match[1]),
  )]
  if (variables.length) {
    fillTarget.value = template
    fillValues.value = Object.fromEntries(variables.map(variable => [variable, '']))
  } else {
    ui.useTemplate(template)
    void router.push('/gallery')
    ui.showToast('模板已带入创作浮窗')
  }
}

async function copyTemplate(template: PromptTemplate) {
  await navigator.clipboard.writeText(template.content)
  ui.showToast('模板已复制')
}

function confirmFill() {
  if (!fillTarget.value) return
  let filledContent = fillTarget.value.content
  for (const [variable, value] of Object.entries(fillValues.value)) {
    filledContent = filledContent.replaceAll(`{{${variable}}}`, value.trim() || `{{${variable}}}`)
  }
  void templateStore.recordUse(fillTarget.value)
  ui.draftPrompt = filledContent
  ui.dockOpen = true
  fillTarget.value = null
  void router.push('/gallery')
  ui.showToast('模板已带入创作浮窗')
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="border-b border-line bg-ink/90 px-6 pb-4 pt-5 backdrop-blur">
      <p class="field-label">Prompt workspace</p>
      <div class="mb-4 mt-1.5 flex flex-wrap items-end gap-3">
        <h1 class="display text-[27px] leading-none">提示词工作台</h1>
        <span class="pb-0.5 font-mono text-[10.5px] text-dim">
          {{ promptModuleStore.promptModules.length }} 个模块 · {{ templateStore.templates.length }} 个完整模板
        </span>
      </div>
      <div class="seg w-full max-w-[340px]" role="tablist" aria-label="提示词工具">
        <button
          :class="{ on: activeView === 'composer' }"
          :aria-selected="activeView === 'composer'"
          role="tab"
          @click="activeView = 'composer'"
        >模块化拼接</button>
        <button
          :class="{ on: activeView === 'templates' }"
          :aria-selected="activeView === 'templates'"
          role="tab"
          @click="activeView = 'templates'"
        >完整模板</button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-44 pt-5">
      <div v-if="activeView === 'composer'" class="mx-auto grid max-w-[1180px] gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div class="min-w-0 space-y-4">
          <section class="rise-in rounded-2xl border border-line bg-well p-5 shadow-card" style="--stagger: 0">
            <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="field-label">1 · Optional subject</p>
                <h2 class="mt-1 text-[15px] font-semibold">先说画什么，也可以留空</h2>
                <p class="mt-1 text-[11.5px] leading-relaxed text-dim">只写核心对象或场景，风格、光线和质感交给下面的模块。</p>
              </div>
              <button class="btn btn-ghost !py-1.5 text-[11px]" @click="clearComposition">全部清空</button>
            </div>
            <input
              v-model="subject"
              class="input !py-3 text-[14px]"
              placeholder="例如：一只戴礼帽的乌鸦 / 海边的现代住宅 / 留空直接组合风格"
              @keydown.ctrl.enter="useComposedPrompt"
              @keydown.meta.enter="useComposedPrompt"
            />
          </section>

          <section class="rise-in rounded-2xl border border-line bg-well p-5 shadow-card" style="--stagger: 1">
            <div class="mb-3">
              <p class="field-label">Quick combinations</p>
              <h2 class="mt-1 text-[14px] font-semibold">不想逐项选择，可以从一套基础搭配开始</h2>
            </div>
            <div class="grid gap-2 sm:grid-cols-2">
              <button
                v-for="promptPreset in promptPresets"
                :key="promptPreset.id"
                class="rounded-xl border border-line bg-ink/35 p-3 text-left transition hover:-translate-y-0.5 hover:border-accent hover:bg-accentsoft/45"
                @click="applyPreset(promptPreset)"
              >
                <strong class="block text-[12.5px]">{{ promptPreset.title }}</strong>
                <span class="mt-1 block text-[11px] leading-relaxed text-dim">{{ promptPreset.description }}</span>
              </button>
            </div>
          </section>

          <section
            v-for="(category, categoryIndex) in PROMPT_MODULE_CATEGORIES"
            :key="category.key"
            class="rise-in rounded-2xl border border-line bg-well p-5 shadow-card"
            :style="{ '--stagger': categoryIndex + 2 }"
          >
            <div class="mb-3 flex items-start justify-between gap-3">
              <div>
                <p class="field-label">{{ categoryIndex + 2 }} · {{ category.key }}</p>
                <div class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h2 class="text-[14px] font-semibold">{{ category.label }}</h2>
                  <span class="text-[11px] text-dim">{{ category.description }}</span>
                </div>
              </div>
              <button
                class="chip !px-2.5 !py-1 text-[10.5px]"
                :class="{ on: !selectedModuleIds[category.key] }"
                :aria-pressed="!selectedModuleIds[category.key]"
                @click="clearCategory(category.key)"
              >跳过</button>
            </div>
            <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <button
                v-for="promptModule in getModulesByCategory(category.key)"
                :key="promptModule.id"
                class="module-option"
                :class="{ 'is-selected': selectedModuleIds[category.key] === promptModule.id }"
                :aria-pressed="selectedModuleIds[category.key] === promptModule.id"
                @click="togglePromptModule(promptModule)"
              >
                <span class="module-option-title">
                  <span>{{ promptModule.title }}</span>
                  <span v-if="selectedModuleIds[category.key] === promptModule.id" aria-hidden="true">✓</span>
                </span>
                <span class="module-option-content">{{ promptModule.content }}</span>
              </button>
            </div>
          </section>
        </div>

        <aside class="xl:sticky xl:top-5 xl:self-start">
          <section class="composer-preview rounded-2xl border border-line bg-well p-5 shadow-lift">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <p class="field-label">Live preview</p>
                <h2 class="mt-1 text-[15px] font-semibold">最终提示词</h2>
              </div>
              <span class="rounded-full bg-accentsoft px-2.5 py-1 font-mono text-[10px] text-accenthi">
                {{ selectedModuleCount }} / {{ PROMPT_MODULE_CATEGORIES.length }} 模块
              </span>
            </div>

            <div class="min-h-36 rounded-xl border border-line bg-ink/45 p-4">
              <p v-if="composedPrompt" class="text-[13px] leading-[1.8] text-paper">{{ composedPrompt }}</p>
              <p v-else class="text-[12px] leading-relaxed text-dim">填写主体，或从任意功能分类中选择模块，这里会自动生成可直接使用的提示词。</p>
            </div>

            <div v-if="subject.trim() || selectedPromptModules.length" class="mt-3 flex flex-wrap gap-1.5">
              <span v-if="subject.trim()" class="preview-token">主体</span>
              <span v-for="promptModule in selectedPromptModules" :key="promptModule.id" class="preview-token">
                {{ promptModule.title }}
              </span>
            </div>

            <div class="mt-5 grid grid-cols-[auto_1fr] gap-2">
              <button class="btn px-3" :disabled="!composedPrompt" @click="copyComposedPrompt">复制</button>
              <button class="btn btn-primary" :disabled="!composedPrompt" @click="useComposedPrompt">带入创作浮窗</button>
            </div>
            <p class="mt-3 text-center font-mono text-[9.5px] text-dim">主体可选 · 每类至多选择一项 · Ctrl/⌘ + Enter</p>
          </section>
        </aside>
      </div>

      <div v-else>
        <div class="mb-4 flex flex-wrap gap-1.5">
          <button
            v-for="category in templateCategories"
            :key="category"
            class="chip"
            :class="{ on: templateFilter === category }"
            :aria-pressed="templateFilter === category"
            @click="templateFilter = category"
          >{{ category }}</button>
        </div>

        <div class="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="(template, templateIndex) in shownTemplates"
            :key="template.id"
            class="rise-in group flex flex-col rounded-2xl border border-line bg-well p-4 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-line2 hover:shadow-lift"
            :style="{ '--stagger': templateIndex }"
          >
            <div class="mb-2 flex items-center gap-2">
              <h2 class="text-[13.5px] font-semibold">{{ template.title }}</h2>
              <span class="rounded-full border border-line2 px-2 py-px text-[10px] text-dim">{{ template.category }}</span>
              <span class="ml-auto font-mono text-[10px] text-dim">用过 {{ template.useCount }} 次</span>
            </div>
            <p class="mb-3.5 flex-1 text-[12.5px] leading-relaxed text-fade">
              <template v-for="(segment, segmentIndex) in splitTemplateContent(template.content)" :key="segmentIndex">
                <mark v-if="segment.isVariable" class="rounded-md bg-amber/10 px-1 py-px font-mono text-[11.5px] text-amberhi">{{ segment.text }}</mark>
                <template v-else>{{ segment.text }}</template>
              </template>
            </p>
            <div class="flex gap-2">
              <button class="btn btn-amber !py-1.5 text-[12px]" @click="useTemplate(template)">带入创作</button>
              <button
                class="btn btn-ghost !py-1.5 text-[12px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                @click="copyTemplate(template)"
              >复制</button>
            </div>
          </article>
        </div>

        <p class="mt-6 text-center text-[12px] text-dim">
          在图库任意图片的详情里点「存为模板」，可以把成功的完整提示词沉淀到这里
        </p>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="fillTarget" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fade-in absolute inset-0 bg-paper/25 backdrop-blur-[3px]" @click="fillTarget = null" />
        <div class="pop-in relative w-[440px] max-w-[90vw] rounded-2xl border border-line bg-well p-5 shadow-pop">
          <h3 class="mb-1 text-[14px] font-semibold">{{ fillTarget.title }}</h3>
          <p class="mb-4 text-[12px] leading-relaxed text-dim">填写模板变量，留空则保留占位符</p>
          <div class="space-y-3">
            <label v-for="(_, variable) in fillValues" :key="variable" class="block">
              <span class="field-label mb-1 block">{{ variable }}</span>
              <input
                v-model="fillValues[variable]"
                class="input"
                :placeholder="`例如：${variable === '主体' ? '一只戴礼帽的乌鸦' : '…'}`"
                @keydown.enter="confirmFill"
              />
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

<style scoped>
.module-option {
  display: flex;
  min-height: 86px;
  flex-direction: column;
  gap: 7px;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-ink) 42%, var(--color-well));
  padding: 11px 12px;
  text-align: left;
  transition: border-color 0.16s, background 0.16s, transform 0.18s var(--ease-out-soft), box-shadow 0.16s;
}
.module-option:hover {
  border-color: var(--color-line2);
  transform: translateY(-1px);
  box-shadow: var(--shadow-card);
}
.module-option.is-selected {
  border-color: var(--color-accent);
  background: var(--color-accentsoft);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent) 18%, transparent);
}
.module-option-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-paper);
}
.module-option.is-selected .module-option-title { color: var(--color-accenthi); }
.module-option-content { font-size: 10.8px; line-height: 1.55; color: var(--color-dim); }
.composer-preview { background: color-mix(in srgb, var(--color-well) 92%, var(--color-accentsoft)); }
.preview-token {
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: var(--color-well);
  padding: 3px 8px;
  font-size: 9.5px;
  color: var(--color-fade);
}
</style>
