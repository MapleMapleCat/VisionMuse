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
const DOMAIN_ICON_PATHS: Readonly<Record<string, readonly string[]>> = {
  'domain-subject': [
    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'M4.5 20c.7-4 3.2-6 7.5-6s6.8 2 7.5 6',
  ],
  'domain-performance': [
    'M12 5.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z',
    'm8.2 10.5 3.6-3 3.9 2.5M11.8 7.5l.4 5.2-3.3 3.2L7.5 21M12.2 12.7l3.2 3 1.3 5.3',
  ],
  'domain-scene': [
    'M3 19 8.2 12l3.4 4 2.7-3.2L21 19H3Z',
    'M16.8 5.5a2.3 2.3 0 1 0 0 4.6 2.3 2.3 0 0 0 0-4.6Z',
  ],
  'domain-medium': [
    'm12 3 8 4.5-8 4.5-8-4.5L12 3Z',
    'm4 12 8 4.5 8-4.5M4 16.5l8 4.5 8-4.5',
  ],
  'domain-camera': [
    'M4 7h3l1.4-2h7.2L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z',
    'M12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  ],
  'domain-composition': [
    'M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4M16 21h4a1 1 0 0 0 1-1v-4',
    'M8 8h8v8H8z',
  ],
  'domain-lighting': [
    'M12 16a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
    'M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  ],
  'domain-color': [
    'M12 3a9 9 0 1 0 0 18c1.5 0 2.2-.9 2.2-1.9 0-.8-.5-1.5-.5-2.3 0-1.2 1-2.1 2.2-2.1H18A3 3 0 0 0 21 12a9 9 0 0 0-9-9Z',
    'M7.5 10h.01M10 6.7h.01M14.2 6.8h.01M16.8 10.2h.01',
  ],
  'domain-material': [
    'm12 3 7 5-7 13L5 8l7-5Z',
    'm5 8 7 3 7-3M12 11v10M9 4.8 12 11l3-6.2',
  ],
}

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
const taxonomySelectionCount = computed(() => props.selectedChoiceIds.filter(choiceId => (
  PROMPT_TAXONOMY_INDEX.choicesById.has(choiceId)
)).length)
const selectedDomainCount = computed(() => PROMPT_TAXONOMY_DOMAINS.filter(domain => (
  getDomainSelectionCount(domain.id) > 0
)).length)

function getDomainIconPaths(domainId: string): readonly string[] {
  return DOMAIN_ICON_PATHS[domainId] ?? DOMAIN_ICON_PATHS['domain-composition'] ?? []
}

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

function isPromptTaxonomyGroupComplete(groupId: string): boolean {
  const indexedGroup = PROMPT_TAXONOMY_INDEX.groupsById.get(groupId)
  if (!indexedGroup) return false

  const selectedChoices = indexedGroup.group.choices.filter(choice => (
    selectedChoiceSet.value.has(choice.id)
  ))
  if (selectedChoices.length < indexedGroup.group.maxSelections) return false

  return selectedChoices.every(choice => (
    choice.children?.every(childGroup => (
      isPromptTaxonomyGroupComplete(childGroup.id)
    )) ?? true
  ))
}

function getAutomaticCollapseTargetGroupId(groupId: string): string {
  let collapseTargetGroupId = groupId
  let currentGroup = PROMPT_TAXONOMY_INDEX.groupsById.get(groupId)

  while (currentGroup?.parentChoiceId) {
    const parentChoice = PROMPT_TAXONOMY_INDEX.choicesById.get(currentGroup.parentChoiceId)
    if (!parentChoice || !selectedChoiceSet.value.has(parentChoice.choice.id)) break

    const allSiblingGroupsAreComplete = parentChoice.choice.children?.every(childGroup => (
      isPromptTaxonomyGroupComplete(childGroup.id)
    )) ?? true
    if (!allSiblingGroupsAreComplete) break

    collapseTargetGroupId = parentChoice.group.id
    currentGroup = PROMPT_TAXONOMY_INDEX.groupsById.get(collapseTargetGroupId)
  }

  return collapseTargetGroupId
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
    if (!isPromptTaxonomyGroupComplete(endpointGroupId)) return
    collapseGroupWithFocusSafety(getAutomaticCollapseTargetGroupId(endpointGroupId))
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

function activateDomain(domainId: string) {
  if (domainId === activeDomainId.value) return
  cancelAllAutomaticCollapses()
  activeDomainId.value = domainId
  clearPendingKeyboardFocus()
}

function selectDomain(domainId: string, clickEvent: MouseEvent) {
  activateDomain(domainId)
  const domainButton = clickEvent.currentTarget as HTMLButtonElement | null
  domainButton?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function focusDomainAtIndex(requestedDomainIndex: number) {
  const domainCount = PROMPT_TAXONOMY_DOMAINS.length
  if (!domainCount) return

  const normalizedDomainIndex = (requestedDomainIndex + domainCount) % domainCount
  const targetDomain = PROMPT_TAXONOMY_DOMAINS[normalizedDomainIndex]
  if (!targetDomain) return

  activateDomain(targetDomain.id)
  const targetButton = selectorRoot.value?.querySelector<HTMLButtonElement>(
    `[data-taxonomy-domain-index="${normalizedDomainIndex}"]`,
  )
  targetButton?.focus({ preventScroll: true })
  targetButton?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

function handleRootGroupAfterEnter(enteredElement: Element) {
  const enteredGroupId = enteredElement.getAttribute('data-taxonomy-group')
  if (enteredGroupId) handleGroupAfterEnter(enteredGroupId)
}

watch(
  () => props.selectedChoiceIds,
  () => {
    for (const pendingGroupId of [...automaticCollapseTimeouts.keys()]) {
      if (isPromptTaxonomyGroupComplete(pendingGroupId)) continue
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
        <header class="taxonomy-rail-heading">
          <span class="taxonomy-rail-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M6 4v16M6 8h6a3 3 0 0 1 3 3v1M6 16h6a3 3 0 0 0 3-3v-1M15 9l3 3-3 3" />
            </svg>
          </span>
          <span class="taxonomy-rail-heading-copy">
            <small>Path navigator</small>
            <strong>选择领域</strong>
          </span>
          <span class="taxonomy-rail-total">{{ PROMPT_TAXONOMY_DOMAINS.length }}</span>
        </header>

        <div class="taxonomy-rail-progress">
          <div class="taxonomy-rail-progress-copy">
            <span>已选择 {{ taxonomySelectionCount }} 项</span>
            <strong>{{ selectedDomainCount }} / {{ PROMPT_TAXONOMY_DOMAINS.length }} 领域</strong>
          </div>
          <div class="taxonomy-rail-progress-track" aria-hidden="true">
            <span
              v-for="domain in PROMPT_TAXONOMY_DOMAINS"
              :key="domain.id"
              :class="{
                'is-active': activeDomain?.id === domain.id,
                'has-selection': getDomainSelectionCount(domain.id) > 0,
              }"
            />
          </div>
        </div>

        <div class="taxonomy-domain-list">
          <button
            v-for="(domain, domainIndex) in PROMPT_TAXONOMY_DOMAINS"
            :key="domain.id"
            :data-taxonomy-domain-index="domainIndex"
            class="taxonomy-domain-button"
            :class="{
              'is-active': activeDomain?.id === domain.id,
              'has-selection': getDomainSelectionCount(domain.id) > 0,
            }"
            :aria-pressed="activeDomain?.id === domain.id"
            :aria-current="activeDomain?.id === domain.id ? 'step' : undefined"
            :aria-label="`${domain.label}，${domain.groups.length} 个选择组，已选择 ${getDomainSelectionCount(domain.id)} 项`"
            @click="selectDomain(domain.id, $event)"
            @keydown.up.prevent="focusDomainAtIndex(domainIndex - 1)"
            @keydown.left.prevent="focusDomainAtIndex(domainIndex - 1)"
            @keydown.down.prevent="focusDomainAtIndex(domainIndex + 1)"
            @keydown.right.prevent="focusDomainAtIndex(domainIndex + 1)"
            @keydown.home.prevent="focusDomainAtIndex(0)"
            @keydown.end.prevent="focusDomainAtIndex(PROMPT_TAXONOMY_DOMAINS.length - 1)"
          >
            <span class="taxonomy-domain-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">
                <path
                  v-for="iconPath in getDomainIconPaths(domain.id)"
                  :key="iconPath"
                  :d="iconPath"
                />
              </svg>
            </span>
            <span class="taxonomy-domain-copy">
              <span class="taxonomy-domain-title-row">
                <span class="taxonomy-domain-index">
                  {{ String(domainIndex + 1).padStart(2, '0') }}
                </span>
                <strong class="taxonomy-domain-label">{{ domain.label }}</strong>
              </span>
              <small>{{ domain.groups.length }} 个选择组</small>
            </span>
            <Transition name="taxonomy-domain-count" mode="out-in">
              <span
                v-if="getDomainSelectionCount(domain.id)"
                :key="getDomainSelectionCount(domain.id)"
                class="taxonomy-domain-count"
              >
                {{ getDomainSelectionCount(domain.id) }}
              </span>
            </Transition>
            <svg class="taxonomy-domain-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="m6 3.5 4.5 4.5L6 12.5" />
            </svg>
          </button>
        </div>

        <footer class="taxonomy-rail-foot">
          <span class="taxonomy-rail-foot-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M5 5h5M5 12h9M5 19h14" />
              <circle cx="12" cy="5" r="2" />
              <circle cx="16" cy="12" r="2" />
              <circle cx="21" cy="19" r="2" />
            </svg>
          </span>
          <span>
            <strong>跨领域组合</strong>
            <small>选择会实时写入右侧面板</small>
          </span>
        </footer>
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
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  background: color-mix(in srgb, var(--color-ink) 38%, var(--color-well));
  padding: 6px;
}

.taxonomy-rail-heading,
.taxonomy-rail-progress,
.taxonomy-rail-foot {
  display: none;
}

.taxonomy-domain-list {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

.taxonomy-domain-list::-webkit-scrollbar { display: none; }

.taxonomy-rail-mark,
.taxonomy-domain-icon,
.taxonomy-rail-foot-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
}

.taxonomy-domain-button {
  position: relative;
  display: grid;
  min-width: 148px;
  min-height: 44px;
  flex: 0 0 auto;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  padding: 6px 8px;
  color: var(--color-fade);
  scroll-snap-align: start;
  text-align: left;
  transition:
    border-color var(--motion-fast) ease,
    background var(--motion-fast) ease,
    color var(--motion-fast) ease,
    transform var(--motion-fast) var(--ease-out-soft),
    box-shadow var(--motion-fast) ease;
}

.taxonomy-domain-button::before {
  position: absolute;
  inset: auto 10px 0;
  height: 2px;
  background: var(--color-accent);
  content: '';
  opacity: 0;
  transform: scaleX(0.35);
  transition:
    opacity var(--motion-fast) ease,
    transform var(--motion-normal) var(--ease-out-soft);
}

.taxonomy-domain-button:hover {
  background: color-mix(in srgb, var(--color-panel2) 58%, transparent);
  color: var(--color-paper);
  transform: translateY(-1px);
}

.taxonomy-domain-button.is-active {
  border-color: color-mix(in srgb, var(--color-accent) 22%, var(--color-line));
  background: color-mix(in srgb, var(--color-accentsoft) 82%, var(--color-well));
  color: var(--color-accenthi);
  box-shadow: 0 3px 10px rgb(31 110 98 / 0.07);
}

.taxonomy-domain-button.is-active::before {
  opacity: 1;
  transform: scaleX(1);
}

.taxonomy-domain-icon {
  height: 30px;
  width: 30px;
  border: 1px solid var(--color-line);
  border-radius: 9px;
  background: var(--color-well);
  color: var(--color-dim);
  transition:
    border-color var(--motion-fast) ease,
    color var(--motion-fast) ease,
    transform var(--motion-normal) var(--ease-spring);
}

.taxonomy-domain-icon svg { height: 16px; width: 16px; }

.taxonomy-domain-button:hover .taxonomy-domain-icon {
  color: var(--color-paper);
  transform: scale(1.04);
}

.taxonomy-domain-button.is-active .taxonomy-domain-icon {
  border-color: color-mix(in srgb, var(--color-accent) 28%, var(--color-line));
  background: var(--color-well);
  color: var(--color-accent);
}

.taxonomy-domain-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.taxonomy-domain-title-row {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 5px;
}

.taxonomy-domain-index {
  flex: none;
  color: var(--color-dim);
  font-family: var(--font-mono);
  font-size: 7.5px;
}

.taxonomy-domain-label {
  min-width: 0;
  overflow: hidden;
  font-size: 10.75px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taxonomy-domain-copy small {
  display: none;
  overflow: hidden;
  color: var(--color-dim);
  font-size: 8.5px;
  font-weight: 400;
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

.taxonomy-domain-chevron { display: none; }

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
    grid-template-columns: 212px minmax(0, 1fr);
    align-items: start;
    gap: 18px;
  }

  .taxonomy-domain-rail {
    position: sticky;
    top: 12px;
    display: flex;
    flex-direction: column;
    max-height: calc(100svh - 190px);
    overflow: hidden;
    border-color: color-mix(in srgb, var(--color-line2) 82%, transparent);
    border-radius: 16px;
    background:
      linear-gradient(160deg, color-mix(in srgb, var(--color-accentsoft) 38%, transparent), transparent 35%),
      color-mix(in srgb, var(--color-ink) 46%, var(--color-well));
    padding: 10px;
    box-shadow: 0 8px 24px rgb(38 35 28 / 0.055);
  }

  .taxonomy-rail-heading {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    padding: 3px 3px 10px;
  }

  .taxonomy-rail-mark {
    height: 34px;
    width: 34px;
    border-radius: 10px;
    background: var(--color-paper);
    color: var(--color-well);
    box-shadow: 0 5px 13px rgb(38 35 28 / 0.15);
  }

  .taxonomy-rail-mark svg { height: 18px; width: 18px; }

  .taxonomy-rail-heading-copy {
    display: grid;
    min-width: 0;
    gap: 1px;
  }

  .taxonomy-rail-heading-copy small {
    overflow: hidden;
    font-family: var(--font-mono);
    font-size: 7.5px;
    letter-spacing: 0.09em;
    color: var(--color-dim);
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .taxonomy-rail-heading-copy strong {
    font-size: 11.5px;
    font-weight: 650;
  }

  .taxonomy-rail-total {
    display: flex;
    height: 22px;
    min-width: 22px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-line);
    border-radius: 999px;
    background: var(--color-well);
    font-family: var(--font-mono);
    font-size: 8px;
    color: var(--color-dim);
  }

  .taxonomy-rail-progress {
    display: grid;
    gap: 7px;
    border-block: 1px solid var(--color-line);
    padding: 9px 3px;
  }

  .taxonomy-rail-progress-copy {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 8.5px;
    color: var(--color-dim);
  }

  .taxonomy-rail-progress-copy strong {
    font-family: var(--font-mono);
    font-size: 8px;
    font-weight: 500;
    color: var(--color-accenthi);
  }

  .taxonomy-rail-progress-track {
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    gap: 3px;
  }

  .taxonomy-rail-progress-track span {
    height: 3px;
    border-radius: 999px;
    background: var(--color-line2);
    transition: background var(--motion-fast) ease, transform var(--motion-normal) var(--ease-spring);
  }

  .taxonomy-rail-progress-track span.has-selection { background: var(--color-accent); }
  .taxonomy-rail-progress-track span.is-active { transform: scaleY(1.8); }

  .taxonomy-domain-list {
    min-height: 0;
    flex-direction: column;
    gap: 3px;
    overflow-x: hidden;
    overflow-y: auto;
    margin: 5px -3px 0;
    padding: 0 3px 4px;
    scroll-snap-type: none;
    scrollbar-width: thin;
  }

  .taxonomy-domain-button {
    width: 100%;
    min-width: 0;
    min-height: 48px;
    grid-template-columns: 32px minmax(0, 1fr) auto 12px;
    gap: 8px;
    padding: 6px 7px;
    scroll-snap-align: none;
  }

  .taxonomy-domain-button::before {
    inset: 10px auto 10px -4px;
    height: auto;
    width: 3px;
    border-radius: 0 999px 999px 0;
    transform: scaleY(0.35);
  }

  .taxonomy-domain-button.is-active::before {
    transform: scaleY(1);
  }

  .taxonomy-domain-button:hover {
    transform: translateX(2px);
  }

  .taxonomy-domain-icon { height: 32px; width: 32px; }
  .taxonomy-domain-copy small { display: block; }

  .taxonomy-domain-chevron {
    display: block;
    height: 12px;
    width: 12px;
    color: var(--color-line2);
    opacity: 0;
    transform: translateX(-3px);
    transition: opacity var(--motion-fast) ease, transform var(--motion-fast) var(--ease-out-soft);
  }

  .taxonomy-domain-button.is-active .taxonomy-domain-chevron {
    color: var(--color-accent);
    opacity: 1;
    transform: none;
  }

  .taxonomy-domain-button.has-selection:not(.is-active) .taxonomy-domain-icon {
    border-color: color-mix(in srgb, var(--color-accent) 18%, var(--color-line));
    color: var(--color-accenthi);
  }

  .taxonomy-rail-foot {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    border-top: 1px solid var(--color-line);
    padding: 9px 3px 1px;
  }

  .taxonomy-rail-foot-icon {
    height: 30px;
    width: 30px;
    border-radius: 9px;
    background: var(--color-panel2);
    color: var(--color-fade);
  }

  .taxonomy-rail-foot-icon svg { height: 16px; width: 16px; }

  .taxonomy-rail-foot > span:last-child {
    display: grid;
    min-width: 0;
    gap: 1px;
  }

  .taxonomy-rail-foot strong { font-size: 9.5px; font-weight: 600; }
  .taxonomy-rail-foot small { overflow: hidden; color: var(--color-dim); font-size: 7.5px; text-overflow: ellipsis; white-space: nowrap; }
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
