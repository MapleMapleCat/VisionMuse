<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PROMPT_TAXONOMY_CHOICE_COUNT } from '@/assets/prompt-taxonomy'
import PromptTaxonomySelector from '@/components/prompt-composer/PromptTaxonomySelector.vue'
import {
  composePrompt,
  createPromptCompositionInput,
} from '@/services/promptComposition'
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

const ui = useUiStore()
const templateStore = useTemplateStore()
const promptModuleStore = usePromptModuleStore()
const route = useRoute()
const router = useRouter()

const activeView = ref<'modules' | 'templates'>('modules')
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
      <p class="field-label">Atomic prompt modules</p>
      <div class="mt-1.5 flex flex-wrap items-end gap-3">
        <h1 class="display text-[27px] leading-none">提示词模块</h1>
        <span class="pb-0.5 font-mono text-[10.5px] text-dim">
          {{ PROMPT_TAXONOMY_CHOICE_COUNT }} 个分级选项 · 条件展开 · 不自动搭配
        </span>
      </div>
      <div class="seg mt-4 w-full max-w-[340px]" aria-label="提示词工具">
        <button
          :class="{ on: activeView === 'modules' }"
          :aria-pressed="activeView === 'modules'"
          @click="activeView = 'modules'"
        >分级模块</button>
        <button
          :class="{ on: activeView === 'templates' }"
          :aria-pressed="activeView === 'templates'"
          @click="activeView = 'templates'"
        >完整提示词</button>
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
                  <label for="prompt-core-content" class="mt-1 block text-[13px] font-semibold">
                    具体人物、对象或事件
                  </label>
                </div>
                <span class="core-content-badge">非模块</span>
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
              <div>
                <p class="field-label">Module track</p>
                <h3 class="mt-1 text-[13px] font-semibold">选择的提示词片段</h3>
              </div>
              <Transition name="composer-count" mode="out-in">
                <span
                  :key="`${selectedModuleCount}-${selectedGroupCount}`"
                  class="rounded-full bg-accentsoft px-2.5 py-1 font-mono text-[10px] text-accenthi"
                >
                  {{ selectedModuleCount }} 项 · {{ selectedGroupCount }} 组
                </span>
              </Transition>
            </div>

            <div class="mt-3 min-h-24 rounded-xl border border-line bg-ink/45 p-3">
              <TransitionGroup
                name="track-segment-list"
                tag="div"
                class="track-segment-list"
              >
                <button
                  v-for="selectedChoiceDetail in selectedChoiceDetails"
                  :key="selectedChoiceDetail.choiceId"
                  class="track-segment"
                  :title="`移除${getSelectionPath(selectedChoiceDetail)}`"
                  @click="removePromptChoice(selectedChoiceDetail.choiceId)"
                >
                  <small>{{ selectedChoiceDetail.group.outputLabel }}</small>
                  {{ getSelectionPath(selectedChoiceDetail) }}
                  <span aria-hidden="true">×</span>
                </button>
                <p
                  v-if="!selectedChoiceDetails.length"
                  key="empty"
                  class="track-empty-state"
                >
                  尚未选择模块
                </p>
              </TransitionGroup>
            </div>

            <div class="mt-5">
              <p class="field-label">Final prompt</p>
              <div
                class="final-prompt-panel mt-2 min-h-36 rounded-xl border border-line bg-well p-4"
                :class="{ 'is-updating': promptPreviewIsUpdating }"
              >
                <p v-if="composedPrompt" class="whitespace-pre-wrap text-[12.5px] leading-[1.8] text-paper">{{ composedPrompt }}</p>
                <p v-else class="text-[11.5px] text-dim">最终提示词将在这里显示</p>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-[auto_1fr] gap-2">
              <button class="btn px-3" :disabled="!canUseComposition" @click="copyComposedPrompt">复制</button>
              <button class="btn btn-primary" :disabled="!canUseComposition" @click="useComposedPrompt">带入直接创作</button>
            </div>
          </section>
        </aside>
      </div>

      <div v-else key="templates" class="mx-auto max-w-[1180px]">
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
      </Transition>
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
  transition:
    border-color var(--motion-fast) ease,
    color var(--motion-fast) ease,
    background var(--motion-fast) ease,
    opacity var(--motion-normal) ease,
    transform var(--motion-normal) var(--ease-out-soft);
}
.track-segment:hover {
  border-color: var(--color-accent);
  color: var(--color-paper);
  transform: translateY(-1px);
}
.track-segment small {
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--color-dim);
  text-transform: uppercase;
}
.track-segment-list {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.track-empty-state {
  color: var(--color-dim);
  font-size: 11.5px;
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
  transform: translateY(5px) scale(0.92);
}
.track-segment-list-leave-active {
  position: absolute;
}
.track-segment-list-leave-to {
  opacity: 0;
  transform: translateY(-3px) scale(0.88);
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
  transition: border-color var(--motion-fast) ease, box-shadow var(--motion-normal) ease;
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
