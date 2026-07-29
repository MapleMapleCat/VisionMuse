<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  PROMPT_TAXONOMY_DOMAINS,
  PROMPT_TAXONOMY_INDEX,
  type IndexedPromptTaxonomyChoice,
  type IndexedPromptTaxonomyGroup,
} from '@/assets/prompt-taxonomy'
import PromptTaxonomyGroupCard from '@/components/prompt-composer/PromptTaxonomyGroupCard.vue'
import { getVisiblePromptTaxonomyGroups } from '@/services/promptSelection'
import type { PromptModule } from '@/types'

interface PromptChoiceToggleRequest {
  groupId: string
  choiceId: string
  firstChildGroupId?: string
  interactionMode: 'keyboard' | 'pointer'
}

const BRANCH_CONVERGENCE_DELAY_MILLISECONDS = 260
const FOCUS_FALLBACK_DELAY_MILLISECONDS = 320

const props = defineProps<{
  promptModules: PromptModule[]
  selectedChoiceIds: string[]
}>()

const emit = defineEmits<{
  toggleChoice: [choiceId: string]
  clearGroup: [groupId: string]
  clearDomain: [domainId: string]
}>()

const activeDomainId = ref(PROMPT_TAXONOMY_DOMAINS[0]?.id ?? '')
const collapsedGroupIds = reactive(new Set<string>())
const selectorRoot = ref<HTMLElement | null>(null)
const pendingKeyboardFocusGroupId = ref<string>()
const automaticCollapseTimeouts = new Map<string, number>()
let focusFallbackTimeout: number | undefined

const promptModulesById = computed(() => new Map(
  props.promptModules.map(promptModule => [promptModule.id, promptModule]),
))
const selectedChoiceSet = computed(() => new Set(props.selectedChoiceIds))
const activeDomain = computed(() => (
  PROMPT_TAXONOMY_INDEX.domainsById.get(activeDomainId.value)
    ?? PROMPT_TAXONOMY_DOMAINS[0]
))
const visibleDomainGroups = computed(() => activeDomain.value
  ? getVisiblePromptTaxonomyGroups(activeDomain.value.id, props.selectedChoiceIds)
  : [])
const visibleRootGroups = computed(() => visibleDomainGroups.value.filter(indexedGroup => (
  indexedGroup.parentChoiceId === undefined
)))
const visibleDomainGroupIds = computed<ReadonlySet<string>>(() => new Set(
  visibleDomainGroups.value.map(indexedGroup => indexedGroup.group.id),
))
const activeDomainHasExpandedBranch = computed(() => props.selectedChoiceIds.some((choiceId) => {
  const indexedChoice = PROMPT_TAXONOMY_INDEX.choicesById.get(choiceId)
  if (!indexedChoice || indexedChoice.domain.id !== activeDomain.value?.id) return false
  if (!isChoicePathExpanded(indexedChoice)) return false
  return indexedChoice.choice.children?.some(childGroup => (
    visibleDomainGroupIds.value.has(childGroup.id)
  )) ?? false
}))

function isChoicePathExpanded(indexedChoice: IndexedPromptTaxonomyChoice): boolean {
  const ancestorGroupIds = indexedChoice.ancestorChoiceIds
    .map(ancestorChoiceId => PROMPT_TAXONOMY_INDEX.choicesById.get(ancestorChoiceId)?.group.id)
    .filter((groupId): groupId is string => groupId !== undefined)
  return [indexedChoice.group.id, ...ancestorGroupIds].every(groupId => (
    !collapsedGroupIds.has(groupId)
  ))
}

function getDomainSelectionCount(domainId: string): number {
  return props.selectedChoiceIds.filter(choiceId => (
    PROMPT_TAXONOMY_INDEX.choicesById.get(choiceId)?.domain.id === domainId
  )).length
}

function getGroupSelectionCount(indexedGroup: IndexedPromptTaxonomyGroup): number {
  return indexedGroup.group.choices.filter(choice => selectedChoiceSet.value.has(choice.id)).length
}

function groupHasReachedCollapseThreshold(groupId: string): boolean {
  const indexedGroup = PROMPT_TAXONOMY_INDEX.groupsById.get(groupId)
  if (!indexedGroup) return false
  return getGroupSelectionCount(indexedGroup) >= indexedGroup.group.maxSelections
}

function getBranchConvergenceGroupId(groupId: string): string {
  const indexedGroup = PROMPT_TAXONOMY_INDEX.groupsById.get(groupId)
  if (!indexedGroup?.parentChoiceId) return groupId
  return PROMPT_TAXONOMY_INDEX.choicesById.get(indexedGroup.parentChoiceId)?.group.id ?? groupId
}

function cancelAutomaticCollapse(groupId: string) {
  const timeout = automaticCollapseTimeouts.get(groupId)
  if (timeout === undefined) return
  window.clearTimeout(timeout)
  automaticCollapseTimeouts.delete(groupId)
}

function cancelAllAutomaticCollapses() {
  for (const groupId of [...automaticCollapseTimeouts.keys()]) {
    cancelAutomaticCollapse(groupId)
  }
}

function collapseGroupWithFocusSafety(groupId: string) {
  const groupElement = selectorRoot.value?.querySelector<HTMLElement>(
    `[data-taxonomy-group="${groupId}"]`,
  )
  const expandedRegion = groupElement?.querySelector<HTMLElement>('.taxonomy-expanded-region')
  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement && expandedRegion?.contains(activeElement)) {
    groupElement
      ?.querySelector<HTMLButtonElement>('[data-taxonomy-collapse]')
      ?.focus({ preventScroll: true })
  }
  collapsedGroupIds.add(groupId)
}

function scheduleBranchConvergence(endpointGroupId: string) {
  cancelAllAutomaticCollapses()
  const timeout = window.setTimeout(() => {
    automaticCollapseTimeouts.delete(endpointGroupId)
    if (!groupHasReachedCollapseThreshold(endpointGroupId)) return
    collapseGroupWithFocusSafety(getBranchConvergenceGroupId(endpointGroupId))
  }, BRANCH_CONVERGENCE_DELAY_MILLISECONDS)
  automaticCollapseTimeouts.set(endpointGroupId, timeout)
}

function clearPendingKeyboardFocus() {
  pendingKeyboardFocusGroupId.value = undefined
  if (focusFallbackTimeout === undefined) return
  window.clearTimeout(focusFallbackTimeout)
  focusFallbackTimeout = undefined
}

function focusFirstAvailableChoice(groupId: string): boolean {
  const groupElement = selectorRoot.value?.querySelector<HTMLElement>(
    `[data-taxonomy-group="${groupId}"]`,
  )
  const firstAvailableChoice = groupElement?.querySelector<HTMLButtonElement>(
    '.taxonomy-choice:not([aria-disabled="true"])',
  )
  if (!firstAvailableChoice) return false
  firstAvailableChoice.focus({ preventScroll: true })
  firstAvailableChoice.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  return true
}

function scheduleKeyboardFocusFallback(groupId: string) {
  if (focusFallbackTimeout !== undefined) window.clearTimeout(focusFallbackTimeout)
  focusFallbackTimeout = window.setTimeout(() => {
    focusFallbackTimeout = undefined
    if (pendingKeyboardFocusGroupId.value !== groupId) return

    focusFirstAvailableChoice(groupId)
    pendingKeyboardFocusGroupId.value = undefined
  }, FOCUS_FALLBACK_DELAY_MILLISECONDS)
}

function handleGroupAfterEnter(enteredGroupId: string) {
  if (pendingKeyboardFocusGroupId.value !== enteredGroupId) return
  if (focusFirstAvailableChoice(enteredGroupId)) {
    pendingKeyboardFocusGroupId.value = undefined
    if (focusFallbackTimeout !== undefined) {
      window.clearTimeout(focusFallbackTimeout)
      focusFallbackTimeout = undefined
    }
  }
}

function handleChoiceToggle(request: PromptChoiceToggleRequest) {
  const indexedGroup = PROMPT_TAXONOMY_INDEX.groupsById.get(request.groupId)
  if (!indexedGroup) return

  const isCurrentlySelected = selectedChoiceSet.value.has(request.choiceId)
  cancelAllAutomaticCollapses()
  clearPendingKeyboardFocus()
  if (
    !isCurrentlySelected
    && request.firstChildGroupId
    && request.interactionMode === 'keyboard'
  ) {
    pendingKeyboardFocusGroupId.value = request.firstChildGroupId
    scheduleKeyboardFocusFallback(request.firstChildGroupId)
  }

  emit('toggleChoice', request.choiceId)

  if (isCurrentlySelected) {
    collapsedGroupIds.delete(request.groupId)
    return
  }

  const selectedCountAfterChoice = indexedGroup.group.selectionMode === 'single'
    ? 1
    : getGroupSelectionCount(indexedGroup) + 1
  const shouldConvergeCompletedBranch = !request.firstChildGroupId
    && selectedCountAfterChoice >= indexedGroup.group.maxSelections
  if (shouldConvergeCompletedBranch) {
    scheduleBranchConvergence(request.groupId)
  }
}

function toggleGroupCollapse(groupId: string) {
  cancelAllAutomaticCollapses()
  if (collapsedGroupIds.has(groupId)) {
    collapsedGroupIds.delete(groupId)
    return
  }
  collapseGroupWithFocusSafety(groupId)
}

function clearGroup(groupId: string) {
  cancelAllAutomaticCollapses()
  collapsedGroupIds.delete(groupId)
  emit('clearGroup', groupId)
}

function clearActiveDomain() {
  if (!activeDomain.value) return
  cancelAllAutomaticCollapses()
  for (const indexedGroup of PROMPT_TAXONOMY_INDEX.groupsById.values()) {
    if (indexedGroup.domain.id !== activeDomain.value.id) continue
    collapsedGroupIds.delete(indexedGroup.group.id)
  }
  emit('clearDomain', activeDomain.value.id)
}

function selectDomain(domainId: string, clickEvent: MouseEvent) {
  if (domainId === activeDomainId.value) return
  cancelAllAutomaticCollapses()
  activeDomainId.value = domainId
  clearPendingKeyboardFocus()
  const domainButton = clickEvent.currentTarget as HTMLButtonElement | null
  domainButton?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function handleRootGroupAfterEnter(enteredElement: Element) {
  const enteredGroupId = enteredElement.getAttribute('data-taxonomy-group')
  if (enteredGroupId) handleGroupAfterEnter(enteredGroupId)
}

watch(
  () => props.selectedChoiceIds,
  () => {
    for (const pendingGroupId of [...automaticCollapseTimeouts.keys()]) {
      if (groupHasReachedCollapseThreshold(pendingGroupId)) continue
      cancelAutomaticCollapse(pendingGroupId)
    }

    for (const collapsedGroupId of [...collapsedGroupIds]) {
      const indexedGroup = PROMPT_TAXONOMY_INDEX.groupsById.get(collapsedGroupId)
      if (indexedGroup && getGroupSelectionCount(indexedGroup) > 0) continue
      cancelAutomaticCollapse(collapsedGroupId)
      collapsedGroupIds.delete(collapsedGroupId)
    }
  },
)

onBeforeUnmount(() => {
  cancelAllAutomaticCollapses()
  clearPendingKeyboardFocus()
})
</script>

<template>
  <section ref="selectorRoot" class="taxonomy-shell rounded-2xl border border-line bg-well p-4 shadow-card">
    <div class="taxonomy-shell-heading">
      <div>
        <p class="field-label">Progressive taxonomy</p>
        <h2 class="mt-1 text-[15px] font-semibold">分级选择路径</h2>
      </div>
      <p class="taxonomy-shell-hint">沿点击处向下细化，完成末级选择后整条分支自动收拢</p>
    </div>

    <div class="taxonomy-layout mt-4">
      <nav class="taxonomy-domain-rail" aria-label="提示词分类领域">
        <button
          v-for="(domain, domainIndex) in PROMPT_TAXONOMY_DOMAINS"
          :key="domain.id"
          class="taxonomy-domain-button"
          :class="{ 'is-active': activeDomain?.id === domain.id }"
          :aria-pressed="activeDomain?.id === domain.id"
          @click="selectDomain(domain.id, $event)"
        >
          <span class="taxonomy-domain-index">
            {{ String(domainIndex + 1).padStart(2, '0') }}
          </span>
          <span class="taxonomy-domain-label">{{ domain.label }}</span>
          <Transition name="taxonomy-domain-count" mode="out-in">
            <span
              v-if="getDomainSelectionCount(domain.id)"
              :key="getDomainSelectionCount(domain.id)"
              class="taxonomy-domain-count"
            >
              {{ getDomainSelectionCount(domain.id) }}
            </span>
          </Transition>
        </button>
      </nav>

      <main class="min-w-0">
        <Transition name="taxonomy-domain-panel" mode="out-in">
          <div v-if="activeDomain" :key="activeDomain.id" class="taxonomy-domain-panel">
            <div class="taxonomy-domain-heading">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="text-[14px] font-semibold">{{ activeDomain.label }}</h3>
                  <span class="taxonomy-progress-badge">
                    {{ getDomainSelectionCount(activeDomain.id) }} 项
                  </span>
                </div>
                <p class="mt-1 text-[11px] leading-relaxed text-dim">
                  {{ activeDomain.description }}
                </p>
              </div>
              <button
                v-if="getDomainSelectionCount(activeDomain.id)"
                class="btn btn-ghost !px-2.5 !py-1.5 text-[10.5px]"
                @click="clearActiveDomain"
              >
                清除此领域
              </button>
            </div>

            <TransitionGroup
              name="taxonomy-group-list"
              tag="div"
              class="taxonomy-group-list"
              :class="{ 'has-expanded-branch': activeDomainHasExpandedBranch }"
              @after-enter="handleRootGroupAfterEnter"
            >
              <PromptTaxonomyGroupCard
                v-for="(indexedGroup, groupIndex) in visibleRootGroups"
                :key="indexedGroup.group.id"
                :indexed-group="indexedGroup"
                :prompt-modules-by-id="promptModulesById"
                :selected-choice-ids="selectedChoiceIds"
                :visible-group-ids="visibleDomainGroupIds"
                :collapsed-group-ids="collapsedGroupIds"
                :display-index="groupIndex"
                @toggle-choice="handleChoiceToggle"
                @toggle-collapse="toggleGroupCollapse"
                @clear-group="clearGroup"
                @group-after-enter="handleGroupAfterEnter"
              />

              <div v-if="!visibleRootGroups.length" key="empty" class="taxonomy-empty-state">
                <span class="taxonomy-empty-icon" aria-hidden="true">↳</span>
                <span>请先完成关联的上级选择，再进入此领域细化。</span>
              </div>
            </TransitionGroup>
          </div>
        </Transition>
      </main>
    </div>
  </section>
</template>

<style scoped>
.taxonomy-shell {
  background: color-mix(in srgb, var(--color-well) 96%, var(--color-accentsoft));
}

.taxonomy-shell-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.taxonomy-shell-hint {
  max-width: 270px;
  color: var(--color-dim);
  font-size: 10px;
  line-height: 1.5;
  text-align: right;
}

.taxonomy-layout {
  display: grid;
  gap: 16px;
}

.taxonomy-domain-rail {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 2px 7px;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

.taxonomy-domain-rail::-webkit-scrollbar {
  display: none;
}

.taxonomy-domain-button {
  position: relative;
  display: flex;
  min-width: 132px;
  min-height: 38px;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: 9px;
  background: color-mix(in srgb, var(--color-ink) 42%, var(--color-well));
  padding: 7px 9px;
  color: var(--color-fade);
  font-size: 10.75px;
  font-weight: 600;
  scroll-snap-align: start;
  transition:
    border-color var(--motion-fast) ease,
    background var(--motion-fast) ease,
    color var(--motion-fast) ease,
    transform var(--motion-fast) var(--ease-out-soft),
    box-shadow var(--motion-fast) ease;
}

.taxonomy-domain-button::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--color-accent);
  content: '';
  opacity: 0;
  transform: scaleY(0.35);
  transition:
    opacity var(--motion-fast) ease,
    transform var(--motion-normal) var(--ease-out-soft);
}

.taxonomy-domain-button:hover {
  border-color: var(--color-line2);
  color: var(--color-paper);
  transform: translateY(-1px);
}

.taxonomy-domain-button.is-active {
  border-color: color-mix(in srgb, var(--color-accent) 70%, var(--color-line));
  background: var(--color-accentsoft);
  color: var(--color-accenthi);
  box-shadow: 0 4px 12px rgb(31 110 98 / 0.08);
}

.taxonomy-domain-button.is-active::before {
  opacity: 1;
  transform: scaleY(1);
}

.taxonomy-domain-index {
  flex: none;
  color: var(--color-dim);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.taxonomy-domain-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taxonomy-domain-count,
.taxonomy-progress-badge {
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-accent) 16%, transparent);
  padding: 2px 6px;
  color: var(--color-accenthi);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.taxonomy-domain-count {
  flex: none;
}

.taxonomy-domain-count-enter-active,
.taxonomy-domain-count-leave-active {
  transition: opacity var(--motion-fast) ease, transform var(--motion-fast) var(--ease-spring);
}

.taxonomy-domain-count-enter-from,
.taxonomy-domain-count-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

.taxonomy-domain-panel {
  min-width: 0;
}

.taxonomy-domain-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--color-line);
  padding-bottom: 12px;
}

.taxonomy-domain-panel-enter-active {
  transition: opacity 180ms ease, transform 180ms var(--ease-out-soft);
}

.taxonomy-domain-panel-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}

.taxonomy-domain-panel-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.taxonomy-domain-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.taxonomy-group-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.taxonomy-group-list.has-expanded-branch > :deep(.taxonomy-group-card:not(.has-open-branch)) {
  opacity: 0.74;
}

.taxonomy-group-list.has-expanded-branch > :deep(.taxonomy-group-card:not(.has-open-branch):hover) {
  opacity: 1;
}

.taxonomy-group-list.has-expanded-branch
  > :deep(.taxonomy-group-card:not(.has-open-branch) > .taxonomy-group-header > .taxonomy-group-heading-copy),
.taxonomy-group-list.has-expanded-branch
  > :deep(.taxonomy-group-card:not(.has-open-branch) > .taxonomy-expanded-region > .taxonomy-region-inner > .taxonomy-group-description),
.taxonomy-group-list.has-expanded-branch
  > :deep(.taxonomy-group-card:not(.has-open-branch) > .taxonomy-expanded-region > .taxonomy-region-inner > .taxonomy-choice-stack > .taxonomy-choice-row > .taxonomy-choice-grid > .taxonomy-choice > *) {
  filter: blur(0.65px) saturate(0.9);
}

.taxonomy-group-list.has-expanded-branch
  > :deep(.taxonomy-group-card:not(.has-open-branch):hover > .taxonomy-group-header > .taxonomy-group-heading-copy),
.taxonomy-group-list.has-expanded-branch
  > :deep(.taxonomy-group-card:not(.has-open-branch):hover > .taxonomy-expanded-region > .taxonomy-region-inner > .taxonomy-group-description),
.taxonomy-group-list.has-expanded-branch
  > :deep(.taxonomy-group-card:not(.has-open-branch):hover > .taxonomy-expanded-region > .taxonomy-region-inner > .taxonomy-choice-stack > .taxonomy-choice-row > .taxonomy-choice-grid > .taxonomy-choice > *) {
  filter: none;
}

:deep(.taxonomy-group-list-enter-active) {
  transition:
    opacity var(--motion-normal) ease,
    transform var(--motion-normal) var(--ease-out-soft);
}

:deep(.taxonomy-group-list-leave-active) {
  position: absolute;
  inset-inline-start: var(--taxonomy-active-offset, 0px);
  width: calc(100% - var(--taxonomy-active-offset, 0px));
  margin-inline-start: 0;
  transition:
    opacity var(--motion-fast) ease,
    transform var(--motion-fast) ease;
}

:deep(.taxonomy-group-list-enter-from) {
  opacity: 0;
  transform: translateY(10px) scale(0.992);
}

:deep(.taxonomy-group-list-leave-to) {
  opacity: 0;
  transform: translateY(-6px) scale(0.992);
}

:deep(.taxonomy-group-list-move) {
  transition: transform var(--motion-normal) var(--ease-out-soft);
}

.taxonomy-empty-state {
  display: flex;
  min-height: 84px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px dashed var(--color-line2);
  border-radius: 11px;
  padding: 18px;
  color: var(--color-dim);
  font-size: 11px;
  text-align: center;
}

.taxonomy-empty-icon {
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: 15px;
}

@media (min-width: 880px) {
  .taxonomy-layout {
    grid-template-columns: 166px minmax(0, 1fr);
    align-items: start;
  }

  .taxonomy-domain-rail {
    position: sticky;
    top: 12px;
    display: flex;
    flex-direction: column;
    overflow: visible;
    padding: 0 12px 0 0;
    border-right: 1px solid var(--color-line);
  }

  .taxonomy-domain-button {
    width: 100%;
    min-width: 0;
  }

  .taxonomy-domain-button:hover {
    transform: translateX(2px);
  }
}

@media (max-width: 520px) {
  .taxonomy-shell-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .taxonomy-shell-hint {
    max-width: none;
    text-align: left;
  }

  .taxonomy-domain-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .taxonomy-domain-heading .btn {
    align-self: flex-start;
  }
}
</style>
