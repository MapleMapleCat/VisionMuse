<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PROMPT_TEMPLATE_CATEGORIES,
} from '@/assets/prompt-templates'
import { PROMPT_TAXONOMY_CHOICE_COUNT } from '@/assets/prompt-taxonomy'
import PromptTaxonomySelector from '@/components/prompt-composer/PromptTaxonomySelector.vue'
import PromptTemplateCard from '@/components/prompt-templates/PromptTemplateCard.vue'
import PromptTemplateFillDialog from '@/components/prompt-templates/PromptTemplateFillDialog.vue'
import {
  composePrompt,
  createPromptCompositionInput,
} from '@/services/promptComposition'
import {
  getPromptTemplateVisualPreferenceScore,
  PROMPT_TEMPLATE_VISUAL_PREFERENCES,
  queryPromptTemplateLibrary,
  type PromptTemplateLibraryScope,
  type PromptTemplateLibrarySortMode,
  type PromptTemplateVisualPreferenceId,
} from '@/services/promptTemplateLibrary'
import {
  clearPromptTaxonomyDomain,
  clearPromptTaxonomyGroup,
  getSelectedPromptChoiceDetails,
  togglePromptChoice,
  type PromptSelectionMutationResult,
  type SelectedPromptChoiceDetail,
} from '@/services/promptSelection'
import { usePromptModuleStore } from '@/stores/promptModules'
import { useTemplateStore } from '@/stores/templates'
import { useUiStore } from '@/stores/ui'
import type { PromptTemplate } from '@/types'

const props = defineProps<{
  activeView: 'modules' | 'templates'
}>()

const ui = useUiStore()
const templateStore = useTemplateStore()
const promptModuleStore = usePromptModuleStore()
const route = useRoute()
const router = useRouter()

const activeView = computed(() => props.activeView)
const corePrompt = ref('')
const selectedChoiceIds = ref<string[]>([])
const promptPreviewIsUpdating = ref(false)
let promptPreviewUpdateTimeout: number | undefined

const selectedChoiceDetails = computed(() => getSelectedPromptChoiceDetails(
  selectedChoiceIds.value,
  promptModuleStore.promptModules,
))
const selectedPromptModules = computed(() => selectedChoiceDetails.value.map(
  selectedChoiceDetail => selectedChoiceDetail.promptModule,
))
const promptCompositionInput = computed(() => createPromptCompositionInput(
  corePrompt.value,
  selectedChoiceIds.value,
  promptModuleStore.promptModules,
))
const composedPrompt = computed(() => composePrompt(promptCompositionInput.value))
const selectedModuleCount = computed(() => selectedPromptModules.value.length)
const selectedGroupCount = computed(() => new Set(
  selectedChoiceDetails.value.map(selectedChoiceDetail => selectedChoiceDetail.group.id),
).size)
const canUseComposition = computed(() => corePrompt.value.trim().length > 0)

function applySelectionMutation(
  result: PromptSelectionMutationResult,
  announceRemovedChildren = false,
) {
  if (result.blockedReason) {
    ui.showToast(result.blockedReason)
    return
  }
  selectedChoiceIds.value = result.selectedChoiceIds
  if (announceRemovedChildren && result.removedChoiceIds.length > 1) {
    ui.showToast(`已清除 ${result.removedChoiceIds.length} 项不再适用的下级选择`)
  }
}

function toggleTaxonomyChoice(choiceId: string) {
  const result = togglePromptChoice(selectedChoiceIds.value, choiceId)
  applySelectionMutation(result, true)
}

function clearTaxonomyGroup(groupId: string) {
  applySelectionMutation(clearPromptTaxonomyGroup(selectedChoiceIds.value, groupId), true)
}

function clearTaxonomyDomain(domainId: string) {
  applySelectionMutation(clearPromptTaxonomyDomain(selectedChoiceIds.value, domainId), true)
}

function clearComposition() {
  corePrompt.value = ''
  selectedChoiceIds.value = []
}

function removePromptChoice(choiceId: string) {
  applySelectionMutation(togglePromptChoice(selectedChoiceIds.value, choiceId), true)
}

function showPromptPreviewUpdateFeedback() {
  promptPreviewIsUpdating.value = false
  void nextTick(() => {
    promptPreviewIsUpdating.value = true
    if (promptPreviewUpdateTimeout !== undefined) {
      window.clearTimeout(promptPreviewUpdateTimeout)
    }
    promptPreviewUpdateTimeout = window.setTimeout(() => {
      promptPreviewIsUpdating.value = false
    }, 280)
  })
}

function getSelectionPath(selectedChoiceDetail: SelectedPromptChoiceDetail): string {
  const ancestorChoiceLabels = selectedChoiceDetail.ancestorChoiceIds
    .map(choiceId => promptModuleStore.promptModules.find(promptModule => (
      promptModule.id === choiceId
    ))?.title)
    .filter((label): label is string => Boolean(label))
  return [...ancestorChoiceLabels, selectedChoiceDetail.promptModule.title].join(' / ')
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
  ui.showToast('构建结果已复制')
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
  ui.showToast('构建结果已带入直接创作')
}

const templateSearch = ref('')
const templateScopeFilter = ref<PromptTemplateLibraryScope>('all')
const selectedTemplatePreferenceIds = ref<PromptTemplateVisualPreferenceId[]>([])
const templateSortMode = ref<PromptTemplateLibrarySortMode>('recommended')

const fillTarget = ref<PromptTemplate | null>(null)
const templateFiltersAreActive = computed(() => (
  templateSearch.value.trim().length > 0
  || templateScopeFilter.value !== 'all'
  || selectedTemplatePreferenceIds.value.length > 0
  || templateSortMode.value !== 'recommended'
))

const shownTemplates = computed(() => queryPromptTemplateLibrary(
  templateStore.templates,
  {
    scope: templateScopeFilter.value,
    search: templateSearch.value,
    visualPreferenceIds: selectedTemplatePreferenceIds.value,
    sortMode: templateSortMode.value,
  },
))
const templatePreferenceMatchCounts = computed(() => new Map(
  PROMPT_TEMPLATE_VISUAL_PREFERENCES.map(preference => [
    preference.id,
    shownTemplates.value.filter(template => (
      getPromptTemplateVisualPreferenceScore(template, [preference.id]) > 0
    )).length,
  ]),
))
const preferredTemplateCount = computed(() => shownTemplates.value.filter(template => (
  getPromptTemplateVisualPreferenceScore(
    template,
    selectedTemplatePreferenceIds.value,
  ) > 0
)).length)

function toggleTemplateVisualPreference(preferenceId: PromptTemplateVisualPreferenceId) {
  if (selectedTemplatePreferenceIds.value.includes(preferenceId)) {
    selectedTemplatePreferenceIds.value = selectedTemplatePreferenceIds.value.filter(
      selectedPreferenceId => selectedPreferenceId !== preferenceId,
    )
    return
  }

  selectedTemplatePreferenceIds.value = [
    ...selectedTemplatePreferenceIds.value,
    preferenceId,
  ]
}

function clearTemplateVisualPreferences() {
  selectedTemplatePreferenceIds.value = []
}

function useTemplate(template: PromptTemplate) {
  fillTarget.value = template
}

function resetTemplateFilters() {
  templateSearch.value = ''
  templateScopeFilter.value = 'all'
  clearTemplateVisualPreferences()
  templateSortMode.value = 'recommended'
}

async function copyFinalTemplatePrompt(content: string) {
  await navigator.clipboard.writeText(content)
  ui.showToast('成品模板已复制')
  fillTarget.value = null
}

async function useFinalTemplatePrompt(template: PromptTemplate, content: string) {
  await templateStore.recordUse(template)
  ui.draftPrompt = content
  ui.dockOpen = true
  fillTarget.value = null
  ui.showToast('成品模板已带入创作浮窗')
}

function useFilledTemplatePrompt(content: string) {
  if (!fillTarget.value) return
  void useFinalTemplatePrompt(fillTarget.value, content)
}

watch(
  () => [props.activeView, route.query.template] as const,
  ([requestedView, requestedTemplateId]) => {
    if (requestedView !== 'templates' || typeof requestedTemplateId !== 'string') return
    const requestedTemplate = templateStore.templates.find(template => template.id === requestedTemplateId)
    if (requestedTemplate) useTemplate(requestedTemplate)
  },
  { immediate: true },
)

watch(selectedChoiceIds, showPromptPreviewUpdateFeedback)

onBeforeUnmount(() => {
  if (promptPreviewUpdateTimeout !== undefined) {
    window.clearTimeout(promptPreviewUpdateTimeout)
  }
})
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="border-b border-line bg-ink/90 px-6 pb-4 pt-5 backdrop-blur">
      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-center">
        <div>
          <p class="field-label">{{ activeView === 'modules' ? 'Prompt builder' : 'Ready-made prompt templates' }}</p>
          <div class="mt-1.5 flex flex-wrap items-end gap-3">
            <h1 class="display text-[27px] leading-none">
              {{ activeView === 'modules' ? '提示词构建' : '成品模板' }}
            </h1>
            <span class="pb-0.5 font-mono text-[10.5px] text-dim">
              <template v-if="activeView === 'modules'">
                {{ PROMPT_TAXONOMY_CHOICE_COUNT }} 个分级选项 · 条件展开 · 不自动搭配
              </template>
              <template v-else>
                {{ templateStore.templates.length }} 条模板 ·
                {{ PROMPT_TEMPLATE_CATEGORIES.length }} 个创作方向 ·
                {{ PROMPT_TEMPLATE_VISUAL_PREFERENCES.length }} 个视觉取向
              </template>
            </span>
          </div>
        </div>

        <Transition name="template-header-search">
          <div v-if="activeView === 'templates'" class="relative lg:justify-self-end lg:w-full">
            <svg
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              v-model="templateSearch"
              type="search"
              class="input w-full !py-2.5 !pl-9 !pr-9"
              placeholder="搜索标题、用途、媒介或风格"
              aria-label="搜索成品模板"
            />
            <button
              v-if="templateSearch"
              class="template-search-clear"
              aria-label="清空成品模板搜索"
              @click="templateSearch = ''"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="m7 7 10 10M17 7 7 17" />
              </svg>
            </button>
          </div>
        </Transition>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-44 pt-5">
      <Transition name="prompt-tool-view" mode="out-in">
      <div
        v-if="activeView === 'modules'"
        key="modules"
        class="mx-auto grid max-w-[1220px] gap-5 xl:grid-cols-[minmax(0,1fr)_370px]"
      >
        <div class="order-2 min-w-0 xl:order-1">
          <PromptTaxonomySelector
            :prompt-modules="promptModuleStore.promptModules"
            :selected-choice-ids="selectedChoiceIds"
            @toggle-choice="toggleTaxonomyChoice"
            @clear-group="clearTaxonomyGroup"
            @clear-domain="clearTaxonomyDomain"
          />
        </div>

        <aside class="order-1 min-w-0 xl:order-2 xl:sticky xl:top-5 xl:self-start">
          <section class="composer-preview rounded-2xl border border-line bg-well p-5 shadow-lift">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="field-label">Composition</p>
                <h2 class="mt-1 text-[15px] font-semibold">组合面板</h2>
              </div>
              <button class="btn btn-ghost !px-2.5 !py-1.5 text-[10.5px]" @click="clearComposition">
                全部清空
              </button>
            </div>

            <div class="core-content-panel mt-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="field-label">Core content</p>
                  <label for="prompt-core-content" class="mt-1 block text-[13px] font-semibold">
                    具体人物、对象或事件
                  </label>
                </div>
                <span class="core-content-badge">必填内容</span>
              </div>
              <input
                id="prompt-core-content"
                v-model="corePrompt"
                data-core-prompt
                class="input mt-3 !py-3 text-[13px]"
                placeholder="例如：短发女性建筑师"
                @keydown.ctrl.enter="useComposedPrompt"
                @keydown.meta.enter="useComposedPrompt"
              />
            </div>

            <div class="mt-5 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="field-label">Selected elements</p>
                <h3 class="mt-1 text-[13px] font-semibold">已选构建元素</h3>
              </div>
              <Transition name="composer-count" mode="out-in">
                <span
                  :key="`${selectedModuleCount}-${selectedGroupCount}`"
                  class="shrink-0 rounded-full bg-accentsoft px-2.5 py-1 font-mono text-[10px] text-accenthi"
                >
                  {{ selectedModuleCount }} 项 · {{ selectedGroupCount }} 组
                </span>
              </Transition>
            </div>

            <div class="selected-module-panel mt-3">
              <TransitionGroup name="track-segment-list" tag="div" class="selected-module-list">
                <button
                  v-for="selectedChoiceDetail in selectedChoiceDetails"
                  :key="selectedChoiceDetail.choiceId"
                  class="selected-module-row"
                  :title="`移除${getSelectionPath(selectedChoiceDetail)}`"
                  :aria-label="`移除${getSelectionPath(selectedChoiceDetail)}`"
                  @click="removePromptChoice(selectedChoiceDetail.choiceId)"
                >
                  <span class="selected-module-copy">
                    <small>{{ selectedChoiceDetail.group.outputLabel }}</small>
                    <strong>{{ getSelectionPath(selectedChoiceDetail) }}</strong>
                  </span>
                  <span class="selected-module-remove" aria-hidden="true">×</span>
                </button>
                <p
                  v-if="!selectedChoiceDetails.length"
                  key="empty"
                  class="selected-module-empty"
                >
                  尚未选择元素，请从左侧分类中添加。
                </p>
              </TransitionGroup>
            </div>

            <div class="mt-5">
              <p class="field-label">Final prompt</p>
              <div
                class="final-prompt-panel mt-2"
                :class="{ 'is-updating': promptPreviewIsUpdating }"
              >
                <p
                  v-if="composedPrompt"
                  class="final-prompt-natural-language whitespace-pre-wrap"
                >{{ composedPrompt }}</p>
                <p v-else class="text-[11.5px] text-dim">最终提示词将在这里显示</p>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-[auto_1fr] gap-2">
              <button class="btn px-3" :disabled="!canUseComposition" @click="copyComposedPrompt">复制</button>
              <button class="btn btn-primary" :disabled="!canUseComposition" @click="useComposedPrompt">
                带入直接创作
              </button>
            </div>
          </section>
        </aside>
      </div>

      <div v-else key="templates" class="mx-auto max-w-[1180px]">
        <section class="mb-4 space-y-3 rounded-xl border border-line bg-ink/25 px-3.5 py-3">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="mr-1 text-[10px] font-semibold text-fade">创作方向</span>
            <button
              class="chip"
              :class="{ on: templateScopeFilter === 'all' }"
              :aria-pressed="templateScopeFilter === 'all'"
              @click="templateScopeFilter = 'all'"
            >全部</button>
            <button
              v-for="category in PROMPT_TEMPLATE_CATEGORIES"
              :key="category.id"
              class="chip"
              :class="{ on: templateScopeFilter === category.id }"
              :aria-pressed="templateScopeFilter === category.id"
              :title="category.description"
              @click="templateScopeFilter = category.id"
            >{{ category.label }}</button>
            <button
              class="chip"
              :class="{ on: templateScopeFilter === 'user' }"
              :aria-pressed="templateScopeFilter === 'user'"
              @click="templateScopeFilter = 'user'"
            >我的</button>
          </div>

          <div class="border-t border-line pt-3">
            <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span class="text-[10px] font-semibold text-fade">视觉取向</span>
                <span class="text-[9.5px] text-dim">可多选，只调整推荐顺序，不隐藏模板</span>
              </div>
              <button
                v-if="selectedTemplatePreferenceIds.length"
                class="text-[9.5px] text-dim transition-colors hover:text-paper focus-visible:text-paper"
                @click="clearTemplateVisualPreferences"
              >清除偏好</button>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              <button
                class="chip"
                :class="{ on: !selectedTemplatePreferenceIds.length }"
                :aria-pressed="!selectedTemplatePreferenceIds.length"
                @click="clearTemplateVisualPreferences"
              >默认推荐</button>
              <button
                v-for="preference in PROMPT_TEMPLATE_VISUAL_PREFERENCES"
                :key="preference.id"
                class="chip template-preference-chip"
                :class="{ on: selectedTemplatePreferenceIds.includes(preference.id) }"
                :aria-pressed="selectedTemplatePreferenceIds.includes(preference.id)"
                :aria-label="`${preference.label}，当前范围 ${templatePreferenceMatchCounts.get(preference.id) ?? 0} 条相关模板`"
                :title="preference.description"
                @click="toggleTemplateVisualPreference(preference.id)"
              >
                <span>{{ preference.label }}</span>
                <small>{{ templatePreferenceMatchCounts.get(preference.id) ?? 0 }}</small>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <span class="font-mono text-[9.5px] text-dim">
              <template v-if="selectedTemplatePreferenceIds.length && preferredTemplateCount">
                {{ preferredTemplateCount }} 条相关模板优先 ·
                {{ shownTemplates.length - preferredTemplateCount }} 条仍保留
              </template>
              <template v-else-if="selectedTemplatePreferenceIds.length">
                当前范围暂无直接匹配 · 仍保留 {{ shownTemplates.length }} 条
              </template>
              <template v-else>
                显示 {{ shownTemplates.length }} / {{ templateStore.templates.length }}
              </template>
            </span>
            <div class="flex flex-wrap items-center gap-2">
              <select v-model="templateSortMode" class="input !w-auto !py-1.5" aria-label="成品模板排序">
                <option value="recommended">推荐顺序</option>
                <option value="most-used">最常使用</option>
              </select>
              <button
                v-if="templateFiltersAreActive"
                class="btn btn-ghost !px-2.5 !py-1.5 text-[10px]"
                @click="resetTemplateFilters"
              >重置</button>
            </div>
          </div>
        </section>

        <div class="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          <PromptTemplateCard
            v-for="(template, templateIndex) in shownTemplates"
            :key="template.id"
            :template="template"
            :stagger-index="templateIndex"
            @open="useTemplate"
          />
        </div>

        <section
          v-if="!shownTemplates.length"
          class="rounded-2xl border border-dashed border-line2 bg-well/45 px-5 py-12 text-center"
        >
          <p class="text-[13px] font-semibold">没有找到相关模板</p>
          <p class="mt-1 text-[11px] text-dim">尝试缩短搜索词，或清除创作方向筛选。</p>
          <button class="btn mt-4 !py-1.5 text-[11px]" @click="resetTemplateFilters">重置筛选</button>
        </section>
      </div>
      </Transition>
    </div>

    <PromptTemplateFillDialog
      :template="fillTarget"
      @close="fillTarget = null"
      @copy="copyFinalTemplatePrompt"
      @use="useFilledTemplatePrompt"
    />
  </div>
</template>

<style scoped>
.template-search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  display: grid;
  height: 24px;
  width: 24px;
  transform: translateY(-50%);
  place-items: center;
  border-radius: 7px;
  color: var(--color-dim);
  transition:
    background var(--motion-fast) ease,
    color var(--motion-fast) ease;
}
.template-search-clear:hover,
.template-search-clear:focus-visible {
  background: color-mix(in srgb, var(--color-paper) 7%, transparent);
  color: var(--color-paper);
}
input[type='search']::-webkit-search-cancel-button { display: none; }
.template-preference-chip small {
  display: inline-grid;
  min-width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-paper) 6%, transparent);
  padding: 0 4px;
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--color-dim);
}
.template-preference-chip.on small {
  background: color-mix(in srgb, var(--color-accent) 13%, transparent);
  color: var(--color-accenthi);
}
.template-header-search-enter-active,
.template-header-search-leave-active {
  transition:
    opacity 160ms ease,
    transform 180ms var(--ease-out-soft);
}
.template-header-search-enter-from,
.template-header-search-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
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
.selected-module-panel {
  min-height: 96px;
  max-height: 240px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-ink) 45%, var(--color-well));
  padding: 7px;
}
.selected-module-list {
  position: relative;
  display: grid;
  gap: 6px;
}
.selected-module-row {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) 24px;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--color-line);
  border-radius: 9px;
  background: var(--color-well);
  padding: 7px 7px 7px 9px;
  color: var(--color-paper);
  cursor: pointer;
  text-align: left;
  transition:
    border-color var(--motion-fast) ease,
    background var(--motion-fast) ease,
    opacity var(--motion-normal) ease,
    transform var(--motion-normal) var(--ease-out-soft);
}
.selected-module-row:hover,
.selected-module-row:focus-visible {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accentsoft) 45%, var(--color-well));
}
.selected-module-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}
.selected-module-copy small,
.selected-module-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.selected-module-copy small {
  font-family: var(--font-mono);
  font-size: 8px;
  font-weight: 400;
  color: var(--color-dim);
  text-transform: uppercase;
}
.selected-module-copy strong {
  font-size: 10.5px;
  font-weight: 600;
}
.selected-module-remove {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 6px;
  color: var(--color-dim);
  font-size: 15px;
  line-height: 1;
}
.selected-module-row:hover .selected-module-remove,
.selected-module-row:focus-visible .selected-module-remove {
  background: color-mix(in srgb, var(--color-red) 8%, transparent);
  color: var(--color-red);
}
.selected-module-empty {
  align-self: center;
  padding: 30px 10px;
  color: var(--color-dim);
  font-size: 10.5px;
  text-align: center;
}
.track-segment-list-enter-active,
.track-segment-list-leave-active,
.track-segment-list-move {
  transition:
    opacity var(--motion-normal) ease,
    transform var(--motion-normal) var(--ease-out-soft);
}
.track-segment-list-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.track-segment-list-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.composer-count-enter-active,
.composer-count-leave-active {
  transition: opacity var(--motion-fast) ease, transform var(--motion-fast) var(--ease-out-soft);
}
.composer-count-enter-from {
  opacity: 0;
  transform: translateY(3px);
}
.composer-count-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}
.final-prompt-panel {
  min-height: 144px;
  max-height: 200px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: var(--color-well);
  padding: 16px;
  transition: border-color var(--motion-fast) ease, box-shadow var(--motion-normal) ease;
}
.final-prompt-natural-language {
  color: var(--color-paper);
  font-size: 12.25px;
  line-height: 1.85;
}
.final-prompt-panel.is-updating {
  animation: prompt-preview-update 280ms var(--ease-out-soft);
}
.prompt-tool-view-enter-active {
  transition: opacity 190ms ease, transform 190ms var(--ease-out-soft);
}
.prompt-tool-view-leave-active {
  transition: opacity 110ms ease, transform 110ms ease;
}
.prompt-tool-view-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.prompt-tool-view-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@keyframes prompt-preview-update {
  0%, 100% {
    border-color: var(--color-line);
    box-shadow: none;
  }
  45% {
    border-color: color-mix(in srgb, var(--color-accent) 62%, var(--color-line));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 10%, transparent);
  }
}
</style>
