<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PROMPT_MODULE_CATEGORIES,
  type PromptModuleCategoryDefinition,
} from '@/defaults/promptModules'
import { composePrompt } from '@/services/promptComposition'
import { usePromptModuleStore } from '@/stores/promptModules'
import { useTemplateStore } from '@/stores/templates'
import { useUiStore } from '@/stores/ui'
import type { PromptModule, PromptModuleCategory, PromptTemplate } from '@/types'

const ui = useUiStore()
const templateStore = useTemplateStore()
const promptModuleStore = usePromptModuleStore()
const route = useRoute()
const router = useRouter()

function createEmptyModuleSelections(): Record<PromptModuleCategory, string[]> {
  const selections = {} as Record<PromptModuleCategory, string[]>
  for (const category of PROMPT_MODULE_CATEGORIES) selections[category.key] = []
  return selections
}

const activeView = ref<'modules' | 'templates'>('modules')
const corePrompt = ref('')
const selectedModuleIds = reactive<Record<PromptModuleCategory, string[]>>(
  createEmptyModuleSelections(),
)

const selectedPromptModules = computed(() => PROMPT_MODULE_CATEGORIES.flatMap(category => (
  selectedModuleIds[category.key]
    .map(moduleId => promptModuleStore.promptModules.find(promptModule => promptModule.id === moduleId))
    .filter((promptModule): promptModule is PromptModule => Boolean(promptModule))
)))
const composedPrompt = computed(() => composePrompt(corePrompt.value, selectedPromptModules.value))
const selectedModuleCount = computed(() => selectedPromptModules.value.length)
const selectedCategoryCount = computed(() => PROMPT_MODULE_CATEGORIES.filter(category => (
  selectedModuleIds[category.key].length > 0
)).length)
const canUseComposition = computed(() => corePrompt.value.trim().length > 0)

function getModulesByCategory(category: PromptModuleCategory): PromptModule[] {
  return promptModuleStore.getByCategory(category)
}

function isModuleSelected(promptModule: PromptModule): boolean {
  return selectedModuleIds[promptModule.category].includes(promptModule.id)
}

function togglePromptModule(
  category: PromptModuleCategoryDefinition,
  promptModule: PromptModule,
) {
  const categorySelections = selectedModuleIds[category.key]
  const selectedIndex = categorySelections.indexOf(promptModule.id)
  if (selectedIndex >= 0) {
    categorySelections.splice(selectedIndex, 1)
    return
  }

  if (category.selectionMode === 'single') {
    selectedModuleIds[category.key] = [promptModule.id]
    return
  }

  if (categorySelections.length >= category.maxSelections) {
    ui.showToast(`${category.label}最多选择 ${category.maxSelections} 项`)
    return
  }
  categorySelections.push(promptModule.id)
}

function clearCategory(category: PromptModuleCategory) {
  selectedModuleIds[category] = []
}

function clearComposition() {
  corePrompt.value = ''
  for (const category of PROMPT_MODULE_CATEGORIES) clearCategory(category.key)
}

function removePromptModule(promptModule: PromptModule) {
  const categorySelections = selectedModuleIds[promptModule.category]
  const selectedIndex = categorySelections.indexOf(promptModule.id)
  if (selectedIndex >= 0) categorySelections.splice(selectedIndex, 1)
}

function getCategoryLabel(category: PromptModuleCategory): string {
  return PROMPT_MODULE_CATEGORIES.find(definition => definition.key === category)?.label ?? category
}

function focusCorePrompt() {
  nextTick(() => document.querySelector<HTMLInputElement>('[data-core-prompt]')?.focus())
}

async function copyComposedPrompt() {
  if (!canUseComposition.value) {
    ui.showToast('请先填写具体人物、对象或事件')
    focusCorePrompt()
    return
  }
  await navigator.clipboard.writeText(composedPrompt.value)
  ui.showToast('模块化提示词已复制')
}

async function useComposedPrompt() {
  if (!canUseComposition.value) {
    ui.showToast('请先填写具体人物、对象或事件')
    focusCorePrompt()
    return
  }
  await promptModuleStore.recordUses(selectedPromptModules.value)
  ui.draftPrompt = composedPrompt.value
  ui.dockOpen = true
  await router.push('/gallery')
  ui.showToast('模块化提示词已带入直接创作')
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
const fillVariables = computed(() => Object.keys(fillValues.value))
const templateReady = computed(() => fillVariables.value.every(variable => fillValues.value[variable]?.trim()))

function getTemplateVariables(template: PromptTemplate): string[] {
  return [...new Set(
    [...template.content.matchAll(/\{\{([^}]+)\}\}/g)].map(match => match[1]),
  )]
}

function useTemplate(template: PromptTemplate) {
  const variables = getTemplateVariables(template)
  if (variables.length) {
    fillTarget.value = template
    fillValues.value = Object.fromEntries(variables.map(variable => [variable, '']))
    return
  }

  ui.useTemplate(template)
  void router.push('/gallery')
  ui.showToast('完整提示词已带入直接创作')
}

async function copyTemplate(template: PromptTemplate) {
  await navigator.clipboard.writeText(template.content)
  ui.showToast('完整提示词已复制')
}

function confirmFill() {
  if (!fillTarget.value || !templateReady.value) {
    ui.showToast('请填写全部模板变量')
    return
  }

  let filledContent = fillTarget.value.content
  for (const [variable, value] of Object.entries(fillValues.value)) {
    filledContent = filledContent.replaceAll(`{{${variable}}}`, value.trim())
  }

  void templateStore.recordUse(fillTarget.value)
  ui.draftPrompt = filledContent
  ui.dockOpen = true
  fillTarget.value = null
  void router.push('/gallery')
  ui.showToast('完整提示词已带入直接创作')
}

onMounted(() => {
  const requestedTemplateId = typeof route.query.template === 'string'
    ? route.query.template
    : undefined
  const requestedTemplate = templateStore.templates.find(template => template.id === requestedTemplateId)
  if (!requestedTemplate) return
  activeView.value = 'templates'
  useTemplate(requestedTemplate)
})
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="border-b border-line bg-ink/90 px-6 pb-4 pt-5 backdrop-blur">
      <p class="field-label">Atomic prompt modules</p>
      <div class="mt-1.5 flex flex-wrap items-end gap-3">
        <h1 class="display text-[27px] leading-none">提示词模块</h1>
        <span class="pb-0.5 font-mono text-[10.5px] text-dim">
          {{ promptModuleStore.promptModules.length }} 个原子片段 · 不含预设 · 不自动搭配
        </span>
      </div>
      <div class="seg mt-4 w-full max-w-[340px]" role="tablist" aria-label="提示词工具">
        <button
          :class="{ on: activeView === 'modules' }"
          :aria-selected="activeView === 'modules'"
          role="tab"
          @click="activeView = 'modules'"
        >原子模块</button>
        <button
          :class="{ on: activeView === 'templates' }"
          :aria-selected="activeView === 'templates'"
          role="tab"
          @click="activeView = 'templates'"
        >完整提示词</button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-44 pt-5">
      <div v-if="activeView === 'modules'" class="mx-auto grid max-w-[1220px] gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div class="order-2 min-w-0 space-y-4 xl:order-1">
          <section
            v-for="(category, categoryIndex) in PROMPT_MODULE_CATEGORIES"
            :key="category.key"
            class="rise-in rounded-2xl border border-line bg-well p-5 shadow-card"
            :style="{ '--stagger': categoryIndex }"
          >
            <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="field-label">{{ String(categoryIndex + 1).padStart(2, '0') }} · {{ category.key }}</p>
                <div class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h2 class="text-[14px] font-semibold">{{ category.label }}</h2>
                  <span class="text-[11px] text-dim">{{ category.description }}</span>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-[9.5px] text-dim">
                  {{ selectedModuleIds[category.key].length }} / {{ category.maxSelections }}
                </span>
                <button
                  v-if="selectedModuleIds[category.key].length"
                  class="text-button"
                  @click="clearCategory(category.key)"
                >清除</button>
              </div>
            </div>

            <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <button
                v-for="promptModule in getModulesByCategory(category.key)"
                :key="promptModule.id"
                class="module-option"
                :class="{ 'is-selected': isModuleSelected(promptModule) }"
                :aria-pressed="isModuleSelected(promptModule)"
                @click="togglePromptModule(category, promptModule)"
              >
                <span class="module-option-title">
                  <span>{{ promptModule.title }}</span>
                  <span v-if="isModuleSelected(promptModule)" aria-hidden="true">✓</span>
                </span>
                <span class="module-option-content">{{ promptModule.content }}</span>
              </button>
            </div>
          </section>
        </div>

        <aside class="order-1 xl:order-2 xl:sticky xl:top-5 xl:self-start">
          <section class="composer-preview rounded-2xl border border-line bg-well p-5 shadow-lift">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="field-label">Composition</p>
                <h2 class="mt-1 text-[15px] font-semibold">组合面板</h2>
              </div>
              <button class="btn btn-ghost !px-2.5 !py-1.5 text-[10.5px]" @click="clearComposition">全部清空</button>
            </div>

            <div class="core-content-panel mt-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="field-label">Core content</p>
                  <h3 class="mt-1 text-[13px] font-semibold">具体人物、对象或事件</h3>
                </div>
                <span class="core-content-badge">非模块</span>
              </div>
              <p class="mt-1.5 text-[10.5px] leading-relaxed text-dim">这是最终提示词的内容锚点，与左侧可选片段分开。</p>
              <input
                v-model="corePrompt"
                data-core-prompt
                class="input mt-3 !py-3 text-[13px]"
                placeholder="例如：短发女性建筑师"
                @keydown.ctrl.enter="useComposedPrompt"
                @keydown.meta.enter="useComposedPrompt"
              />
            </div>

            <div class="mt-5 flex items-center justify-between gap-3">
              <div>
                <p class="field-label">Module track</p>
                <h3 class="mt-1 text-[13px] font-semibold">选择的提示词片段</h3>
              </div>
              <span class="rounded-full bg-accentsoft px-2.5 py-1 font-mono text-[10px] text-accenthi">
                {{ selectedModuleCount }} 项 · {{ selectedCategoryCount }} 类
              </span>
            </div>

            <div class="mt-3 min-h-24 rounded-xl border border-line bg-ink/45 p-3">
              <div v-if="selectedPromptModules.length" class="flex flex-wrap gap-1.5">
                <button
                  v-for="promptModule in selectedPromptModules"
                  :key="promptModule.id"
                  class="track-segment"
                  :title="`移除${promptModule.title}`"
                  @click="removePromptModule(promptModule)"
                >
                  <small>{{ getCategoryLabel(promptModule.category) }}</small>
                  {{ promptModule.title }}
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <p v-else class="text-[11.5px] leading-relaxed text-dim">尚未选择提示词片段。左侧每个模块只负责一个独立维度。</p>
            </div>

            <div class="mt-5">
              <p class="field-label">Final prompt</p>
              <div class="mt-2 min-h-36 rounded-xl border border-line bg-well p-4">
                <p v-if="composedPrompt" class="text-[12.5px] leading-[1.8] text-paper">{{ composedPrompt }}</p>
                <p v-else class="text-[11.5px] leading-relaxed text-dim">最终提示词只按固定模块顺序拼接，不进行改写、推荐或补全。</p>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-[auto_1fr] gap-2">
              <button class="btn px-3" :disabled="!canUseComposition" @click="copyComposedPrompt">复制</button>
              <button class="btn btn-primary" :disabled="!canUseComposition" @click="useComposedPrompt">带入直接创作</button>
            </div>
            <p class="mt-2.5 text-center font-mono text-[9.5px] text-dim">纯文本模块 · 固定顺序拼接 · Ctrl/⌘ + Enter</p>
          </section>
        </aside>
      </div>

      <div v-else class="mx-auto max-w-[1180px]">
        <section class="mb-4 rounded-2xl border border-line bg-well p-4 shadow-card">
          <p class="text-[12.5px] font-semibold">完整提示词独立保留</p>
          <p class="mt-1 text-[11px] leading-relaxed text-dim">它们不会参与模块推荐。含变量的提示词必须填写完整后才能进入创作。</p>
        </section>

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
              <button class="btn btn-primary !py-1.5 text-[12px]" @click="useTemplate(template)">填写并使用</button>
              <button
                class="btn btn-ghost !py-1.5 text-[12px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                @click="copyTemplate(template)"
              >复制</button>
            </div>
          </article>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="fillTarget" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="fade-in absolute inset-0 bg-paper/25 backdrop-blur-[3px]" @click="fillTarget = null" />
        <div class="pop-in relative w-[440px] max-w-[90vw] rounded-2xl border border-line bg-well p-5 shadow-pop">
          <h3 class="mb-1 text-[14px] font-semibold">{{ fillTarget.title }}</h3>
          <p class="mb-4 text-[12px] leading-relaxed text-dim">填写全部变量后才能进入创作，未替换的占位符不会被提交。</p>
          <div class="space-y-3">
            <label v-for="variable in fillVariables" :key="variable" class="block">
              <span class="field-label mb-1 block">{{ variable }}</span>
              <input
                v-model="fillValues[variable]"
                class="input"
                :placeholder="`填写${variable}`"
                @keydown.enter="confirmFill"
              />
            </label>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button class="btn" @click="fillTarget = null">取消</button>
            <button class="btn btn-primary" :disabled="!templateReady" @click="confirmFill">带入直接创作</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.module-option {
  display: flex;
  min-height: 72px;
  flex-direction: column;
  gap: 6px;
  border: 1px solid var(--color-line);
  border-radius: 11px;
  background: color-mix(in srgb, var(--color-ink) 38%, var(--color-well));
  padding: 10px 11px;
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
.module-option-content { font-family: var(--font-mono); font-size: 9.8px; line-height: 1.5; color: var(--color-dim); }
.composer-preview { background: color-mix(in srgb, var(--color-well) 94%, var(--color-accentsoft)); }
.core-content-panel {
  border: 1px solid var(--color-paper);
  border-radius: 12px;
  background: var(--color-well);
  padding: 13px;
}
.core-content-badge {
  border-radius: 999px;
  background: var(--color-paper);
  padding: 3px 7px;
  font-family: var(--font-mono);
  font-size: 8.5px;
  color: var(--color-well);
}
.track-segment {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid var(--color-line2);
  border-radius: 8px;
  background: var(--color-well);
  padding: 5px 7px;
  font-size: 10px;
  color: var(--color-fade);
}
.track-segment:hover { border-color: var(--color-accent); color: var(--color-paper); }
.track-segment small {
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--color-dim);
  text-transform: uppercase;
}
</style>
