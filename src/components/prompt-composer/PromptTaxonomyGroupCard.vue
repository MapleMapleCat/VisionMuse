<script setup lang="ts">
import { computed } from 'vue'
import {
  PROMPT_TAXONOMY_INDEX,
  type IndexedPromptTaxonomyGroup,
  type PromptTaxonomyChoiceDefinition,
} from '@/assets/prompt-taxonomy'
import { getPromptChoiceAvailability } from '@/services/promptSelection'
import type { PromptModule } from '@/types'

interface PromptChoiceViewModel {
  choice: PromptTaxonomyChoiceDefinition
  promptModule?: PromptModule
  isSelected: boolean
  isEnabled: boolean
  disabledReason?: string
}

interface PromptChoiceToggleRequest {
  groupId: string
  choiceId: string
  firstChildGroupId?: string
  interactionMode: 'keyboard' | 'pointer'
}

interface VisiblePromptChildBranch {
  choice: PromptTaxonomyChoiceDefinition
  choiceLabel: string
  childGroups: IndexedPromptTaxonomyGroup[]
}

defineOptions({ name: 'PromptTaxonomyGroupCard' })

const props = defineProps<{
  indexedGroup: IndexedPromptTaxonomyGroup
  promptModulesById: ReadonlyMap<string, PromptModule>
  selectedChoiceIds: string[]
  visibleGroupIds: ReadonlySet<string>
  collapsedGroupIds: ReadonlySet<string>
  displayIndex: number
}>()

const emit = defineEmits<{
  toggleChoice: [request: PromptChoiceToggleRequest]
  toggleCollapse: [groupId: string]
  clearGroup: [groupId: string]
  groupAfterEnter: [groupId: string]
}>()

const selectedChoiceSet = computed(() => new Set(props.selectedChoiceIds))
const collapsed = computed(() => props.collapsedGroupIds.has(props.indexedGroup.group.id))

const selectedPromptModules = computed(() => props.indexedGroup.group.choices
  .filter(choice => selectedChoiceSet.value.has(choice.id))
  .sort((firstChoice, secondChoice) => firstChoice.sortOrder - secondChoice.sortOrder)
  .map(choice => props.promptModulesById.get(choice.id))
  .filter((promptModule): promptModule is PromptModule => Boolean(promptModule)))

const groupChoiceIdSet = computed(() => new Set(
  props.indexedGroup.group.choices.map(choice => choice.id),
))

const selectedSubtreePromptModules = computed(() => PROMPT_TAXONOMY_INDEX.orderedChoiceIds
  .filter(choiceId => selectedChoiceSet.value.has(choiceId))
  .filter((choiceId) => {
    const indexedChoice = PROMPT_TAXONOMY_INDEX.choicesById.get(choiceId)
    if (!indexedChoice) return false
    if (indexedChoice.group.id === props.indexedGroup.group.id) return true
    return indexedChoice.ancestorChoiceIds.some(ancestorChoiceId => (
      groupChoiceIdSet.value.has(ancestorChoiceId)
    ))
  })
  .map(choiceId => props.promptModulesById.get(choiceId))
  .filter((promptModule): promptModule is PromptModule => Boolean(promptModule)))

const choiceViewModels = computed<PromptChoiceViewModel[]>(() => (
  [...props.indexedGroup.group.choices]
    .sort((firstChoice, secondChoice) => firstChoice.sortOrder - secondChoice.sortOrder)
    .map((choice) => {
      const isSelected = selectedChoiceSet.value.has(choice.id)
      const availability = getPromptChoiceAvailability(choice.id, props.selectedChoiceIds)
      return {
        choice,
        promptModule: props.promptModulesById.get(choice.id),
        isSelected,
        isEnabled: isSelected || availability.enabled,
        disabledReason: availability.enabled ? undefined : availability.reason,
      }
    })
))

const parentChoiceLabels = computed(() => props.indexedGroup.ancestorChoiceIds
  .map(choiceId => props.promptModulesById.get(choiceId)?.title)
  .filter((label): label is string => Boolean(label)))

const branchContextLabel = computed(() => parentChoiceLabels.value.join(' / '))

const groupLimitLabel = computed(() => (
  props.indexedGroup.group.selectionMode === 'single'
    ? '单选'
    : `最多 ${props.indexedGroup.group.maxSelections} 项`
))

const groupContentId = computed(() => `taxonomy-group-content-${props.indexedGroup.group.id}`)

const visibleChildBranches = computed<VisiblePromptChildBranch[]>(() => (
  choiceViewModels.value.flatMap((choiceViewModel) => {
    if (!choiceViewModel.isSelected || !choiceViewModel.choice.children?.length) return []

    const childGroups = [...choiceViewModel.choice.children]
      .sort((firstGroup, secondGroup) => firstGroup.sortOrder - secondGroup.sortOrder)
      .map(childGroup => PROMPT_TAXONOMY_INDEX.groupsById.get(childGroup.id))
      .filter((indexedGroup): indexedGroup is IndexedPromptTaxonomyGroup => (
        indexedGroup !== undefined && props.visibleGroupIds.has(indexedGroup.group.id)
      ))
    if (!childGroups.length) return []

    return [{
      choice: choiceViewModel.choice,
      choiceLabel: choiceViewModel.promptModule?.title ?? choiceViewModel.choice.id,
      childGroups,
    }]
  })
))

const activeBranchChoiceIds = computed(() => new Set(
  visibleChildBranches.value.map(childBranch => childBranch.choice.id),
))

const hasVisibleOpenBranch = computed(() => (
  visibleChildBranches.value.length > 0 && !collapsed.value
))

function getChoiceAccessibleLabel(choiceViewModel: PromptChoiceViewModel): string {
  const title = choiceViewModel.promptModule?.title ?? choiceViewModel.choice.id
  if (choiceViewModel.isSelected) return `${title}，已选择，再次操作将取消选择`
  if (choiceViewModel.disabledReason) return `${title}，当前不可用：${choiceViewModel.disabledReason}`
  if (choiceViewModel.choice.children?.length) return `${title}，选择后显示下一级选项`
  return title
}

function requestChoiceToggle(
  choiceViewModel: PromptChoiceViewModel,
  clickEvent: MouseEvent,
) {
  if (!choiceViewModel.isEnabled) return

  emit('toggleChoice', {
    groupId: props.indexedGroup.group.id,
    choiceId: choiceViewModel.choice.id,
    firstChildGroupId: choiceViewModel.choice.children?.[0]?.id,
    interactionMode: clickEvent.detail === 0 ? 'keyboard' : 'pointer',
  })
}

function handleBranchAfterEnter(enteredElement: Element) {
  const firstChildGroupId = enteredElement.getAttribute('data-first-child-group')
  if (firstChildGroupId) emit('groupAfterEnter', firstChildGroupId)
}
</script>

<template>
  <article
    :data-taxonomy-group="indexedGroup.group.id"
    class="taxonomy-group-card"
    :class="{
      'is-nested': indexedGroup.ancestorChoiceIds.length > 0,
      'is-collapsed': collapsed,
      'has-open-branch': hasVisibleOpenBranch,
    }"
  >
    <Transition name="taxonomy-branch-backdrop">
      <div v-if="hasVisibleOpenBranch" class="taxonomy-branch-backdrop" aria-hidden="true" />
    </Transition>

    <header class="taxonomy-group-header">
      <div class="taxonomy-group-heading-copy min-w-0 flex-1">
        <p v-if="branchContextLabel" class="taxonomy-branch-context">
          <span aria-hidden="true">↳</span>
          {{ branchContextLabel }}
        </p>
        <div class="taxonomy-group-title-row">
          <span class="taxonomy-level-badge">
            {{ String(displayIndex + 1).padStart(2, '0') }}
          </span>
          <h4 class="truncate text-[12.5px] font-semibold">
            {{ indexedGroup.group.label }}
          </h4>
          <span class="taxonomy-mode-badge">{{ groupLimitLabel }}</span>
        </div>
      </div>

      <div class="taxonomy-group-actions">
        <span class="taxonomy-selection-count" aria-live="polite">
          {{ selectedPromptModules.length }} / {{ indexedGroup.group.maxSelections }}
        </span>
        <button
          v-if="selectedPromptModules.length"
          data-taxonomy-collapse
          class="taxonomy-icon-button"
          :class="{ 'is-expanded': !collapsed }"
          :aria-label="collapsed ? `展开${indexedGroup.group.label}` : `折叠${indexedGroup.group.label}`"
          :aria-expanded="!collapsed"
          :aria-controls="groupContentId"
          @click="emit('toggleCollapse', indexedGroup.group.id)"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <button
          v-if="selectedPromptModules.length"
          class="taxonomy-icon-button is-danger"
          :aria-label="`清除${indexedGroup.group.label}`"
          @click="emit('clearGroup', indexedGroup.group.id)"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="m8 8 8 8M16 8l-8 8" />
          </svg>
        </button>
      </div>
    </header>

    <div
      :id="groupContentId"
      class="taxonomy-expanded-region"
      :aria-hidden="collapsed"
      :inert="collapsed ? true : undefined"
    >
      <div class="taxonomy-region-inner">
        <p class="taxonomy-group-description">
          {{ indexedGroup.group.description }}
        </p>

        <div class="taxonomy-choice-stack">
          <div class="taxonomy-choice-row">
            <div class="taxonomy-choice-grid">
              <button
                v-for="choiceViewModel in choiceViewModels"
                :key="choiceViewModel.choice.id"
                class="taxonomy-choice"
                :class="{
                  'is-selected': choiceViewModel.isSelected,
                  'has-children': choiceViewModel.choice.children?.length,
                  'is-branch-anchor': activeBranchChoiceIds.has(choiceViewModel.choice.id),
                }"
                :aria-pressed="choiceViewModel.isSelected"
                :aria-disabled="!choiceViewModel.isEnabled"
                :aria-label="getChoiceAccessibleLabel(choiceViewModel)"
                :title="choiceViewModel.disabledReason ?? choiceViewModel.promptModule?.content"
                @click="requestChoiceToggle(choiceViewModel, $event)"
              >
                <span class="taxonomy-choice-title">
                  {{ choiceViewModel.promptModule?.title ?? choiceViewModel.choice.id }}
                </span>

                <span
                  v-if="choiceViewModel.isSelected || choiceViewModel.choice.children?.length"
                  class="taxonomy-choice-state"
                  aria-hidden="true"
                >
                  <Transition name="taxonomy-check">
                    <span v-if="choiceViewModel.isSelected" class="taxonomy-check-mark">✓</span>
                    <svg
                      v-else-if="choiceViewModel.choice.children?.length"
                      class="taxonomy-branch-arrow"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </Transition>
                </span>
              </button>
            </div>

            <TransitionGroup
              name="taxonomy-child-branch"
              tag="div"
              class="taxonomy-child-branches"
              @after-enter="handleBranchAfterEnter"
            >
              <section
                v-for="childBranch in visibleChildBranches"
                :key="childBranch.choice.id"
                class="taxonomy-child-branch"
                :data-first-child-group="childBranch.childGroups[0]?.group.id"
                :aria-label="`${childBranch.choiceLabel}的下级细化选项`"
              >
                <div class="taxonomy-child-branch-heading">
                  <span class="taxonomy-child-branch-kicker">继续细化</span>
                  <strong>{{ childBranch.choiceLabel }}</strong>
                  <span class="taxonomy-child-branch-count">
                    {{ childBranch.childGroups.length }} 组
                  </span>
                </div>

                <div class="taxonomy-child-group-list">
                  <PromptTaxonomyGroupCard
                    v-for="(childGroup, childGroupIndex) in childBranch.childGroups"
                    :key="childGroup.group.id"
                    :indexed-group="childGroup"
                    :prompt-modules-by-id="promptModulesById"
                    :selected-choice-ids="selectedChoiceIds"
                    :visible-group-ids="visibleGroupIds"
                    :collapsed-group-ids="collapsedGroupIds"
                    :display-index="childGroupIndex"
                    @toggle-choice="emit('toggleChoice', $event)"
                    @toggle-collapse="emit('toggleCollapse', $event)"
                    @clear-group="emit('clearGroup', $event)"
                    @group-after-enter="emit('groupAfterEnter', $event)"
                  />
                </div>
              </section>
            </TransitionGroup>
          </div>
        </div>
      </div>
    </div>

    <div
      class="taxonomy-summary-region"
      :aria-hidden="!collapsed"
      :inert="collapsed ? undefined : true"
    >
      <div class="taxonomy-region-inner">
        <TransitionGroup name="taxonomy-summary-chip" tag="div" class="taxonomy-summary-list">
          <span
            v-for="promptModule in selectedSubtreePromptModules"
            :key="promptModule.id"
            class="taxonomy-summary-chip"
          >
            <span class="taxonomy-summary-dot" aria-hidden="true" />
            {{ promptModule.title }}
          </span>
        </TransitionGroup>
      </div>
    </div>
  </article>
</template>

<style scoped>
.taxonomy-group-card {
  --taxonomy-active-offset: 0px;

  position: relative;
  isolation: isolate;
  margin-inline-start: 0;
  border: 1px solid var(--color-line);
  border-radius: 13px;
  background: color-mix(in srgb, var(--color-ink) 30%, var(--color-well));
  padding: 13px;
  box-shadow: 0 1px 2px rgb(38 35 28 / 0.025);
  transition:
    border-color var(--motion-fast) ease,
    background var(--motion-fast) ease,
    opacity var(--motion-normal) ease,
    box-shadow var(--motion-normal) var(--ease-out-soft),
    padding var(--motion-normal) var(--ease-out-soft);
}

.taxonomy-group-card.has-open-branch {
  border-color: color-mix(in srgb, var(--color-accent) 48%, var(--color-line));
  box-shadow: 0 8px 24px rgb(38 35 28 / 0.08);
}

.taxonomy-group-card.is-nested {
  border-left-color: color-mix(in srgb, var(--color-accent) 72%, var(--color-line));
  background: color-mix(in srgb, var(--color-accentsoft) 28%, var(--color-well));
}

.taxonomy-group-card.is-collapsed {
  padding-block: 10px;
  box-shadow: none;
}

.taxonomy-branch-backdrop {
  position: absolute;
  z-index: 1;
  inset: 0;
  border-radius: inherit;
  background: color-mix(in srgb, var(--color-well) 24%, transparent);
  pointer-events: none;
}

.taxonomy-branch-backdrop-enter-active,
.taxonomy-branch-backdrop-leave-active {
  transition: opacity var(--motion-fast) ease;
}

.taxonomy-branch-backdrop-enter-from,
.taxonomy-branch-backdrop-leave-to {
  opacity: 0;
}

.taxonomy-group-header {
  position: relative;
  z-index: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.taxonomy-branch-context {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  margin-bottom: 5px;
  color: var(--color-accenthi);
  font-family: var(--font-mono);
  font-size: 8.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taxonomy-group-title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.taxonomy-level-badge {
  display: inline-flex;
  min-width: 23px;
  height: 18px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: var(--color-accentsoft);
  color: var(--color-accenthi);
  font-family: var(--font-mono);
  font-size: 8px;
}

.taxonomy-mode-badge {
  flex: none;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  padding: 2px 6px;
  color: var(--color-dim);
  font-family: var(--font-mono);
  font-size: 7.5px;
}

.taxonomy-group-actions {
  position: relative;
  z-index: 2;
  display: flex;
  flex: none;
  align-items: center;
  gap: 5px;
}

.taxonomy-selection-count {
  min-width: 27px;
  color: var(--color-dim);
  font-family: var(--font-mono);
  font-size: 8.5px;
  text-align: right;
}

.taxonomy-icon-button {
  display: inline-flex;
  width: 25px;
  height: 25px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line);
  border-radius: 7px;
  color: var(--color-dim);
  transition:
    border-color var(--motion-fast) ease,
    color var(--motion-fast) ease,
    background var(--motion-fast) ease,
    transform var(--motion-quick) var(--ease-out-soft);
}

.taxonomy-icon-button:hover {
  border-color: var(--color-line2);
  background: var(--color-well);
  color: var(--color-paper);
}

.taxonomy-icon-button:active {
  transform: scale(0.94);
}

.taxonomy-icon-button.is-danger:hover {
  border-color: color-mix(in srgb, var(--color-red) 55%, var(--color-line));
  color: var(--color-red);
}

.taxonomy-icon-button svg {
  width: 12px;
  height: 12px;
  transition: transform var(--motion-fast) var(--ease-out-soft);
}

.taxonomy-icon-button.is-expanded svg {
  transform: rotate(180deg);
}

.taxonomy-expanded-region,
.taxonomy-summary-region {
  display: grid;
  transition:
    grid-template-rows var(--motion-normal) var(--ease-out-soft),
    opacity var(--motion-fast) ease,
    margin-top var(--motion-normal) var(--ease-out-soft);
}

.taxonomy-expanded-region {
  grid-template-rows: 1fr;
  margin-top: 8px;
  opacity: 1;
}

.taxonomy-summary-region {
  grid-template-rows: 0fr;
  margin-top: 0;
  opacity: 0;
  pointer-events: none;
}

.taxonomy-group-card.is-collapsed .taxonomy-expanded-region {
  grid-template-rows: 0fr;
  margin-top: 0;
  opacity: 0;
  pointer-events: none;
}

.taxonomy-group-card.is-collapsed .taxonomy-summary-region {
  grid-template-rows: 1fr;
  margin-top: 8px;
  opacity: 1;
  pointer-events: auto;
}

.taxonomy-region-inner {
  min-height: 0;
  overflow: hidden;
}

.taxonomy-group-description {
  margin-bottom: 10px;
  color: var(--color-dim);
  font-size: 10.5px;
  line-height: 1.55;
}

.taxonomy-choice-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.taxonomy-choice-row {
  position: relative;
}

.taxonomy-choice-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.taxonomy-choice {
  position: relative;
  z-index: 0;
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  min-height: 30px;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  border: 1px solid var(--color-line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-ink) 34%, var(--color-well));
  padding: 4px 10px;
  color: var(--color-paper);
  text-align: left;
  transition:
    border-color var(--motion-fast) ease,
    background var(--motion-fast) ease,
    color var(--motion-fast) ease,
    opacity var(--motion-fast) ease,
    transform var(--motion-fast) var(--ease-out-soft),
    box-shadow var(--motion-fast) ease;
}

.taxonomy-choice:hover:not([aria-disabled='true']) {
  z-index: 2;
  border-color: color-mix(in srgb, var(--color-accent) 42%, var(--color-line2));
  background: var(--color-well);
  box-shadow: 0 4px 12px rgb(38 35 28 / 0.09);
  transform: translateY(-1px);
}

.taxonomy-choice:active:not([aria-disabled='true']) {
  box-shadow: none;
  transform: scale(0.98);
  transition-duration: var(--motion-quick);
}

.taxonomy-choice.is-selected {
  border-color: var(--color-accenthi);
  background: var(--color-accent);
  color: var(--color-well);
  box-shadow:
    0 1px 0 rgb(255 255 255 / 0.12) inset,
    0 5px 14px rgb(31 110 98 / 0.2);
  transform: translateY(-1px);
}

.taxonomy-choice.is-branch-anchor {
  z-index: 2;
  border-color: var(--color-accenthi);
  background: var(--color-accent);
  color: var(--color-well);
  box-shadow:
    0 0 0 4px color-mix(in srgb, var(--color-accent) 12%, transparent),
    0 8px 20px rgb(31 110 98 / 0.24);
  transform: translateY(-2px);
}

.taxonomy-group-card.has-open-branch
  > .taxonomy-group-header
  > .taxonomy-group-heading-copy,
.taxonomy-group-card.has-open-branch
  > .taxonomy-expanded-region
  > .taxonomy-region-inner
  > .taxonomy-group-description {
  filter: blur(0.65px) saturate(0.9);
  opacity: 0.72;
}

.taxonomy-group-card.has-open-branch
  > .taxonomy-expanded-region
  > .taxonomy-region-inner
  > .taxonomy-choice-stack
  > .taxonomy-choice-row
  > .taxonomy-choice-grid
  > .taxonomy-choice:not(.is-branch-anchor)
  > * {
  filter: blur(0.75px) saturate(0.88);
  opacity: 0.68;
}

.taxonomy-group-card.has-open-branch
  > .taxonomy-expanded-region
  > .taxonomy-region-inner
  > .taxonomy-choice-stack
  > .taxonomy-choice-row
  > .taxonomy-choice-grid
  > .taxonomy-choice:not(.is-branch-anchor):is(:hover, :focus-visible)
  > * {
  filter: none;
  opacity: 1;
}

.taxonomy-choice.has-children:not(.is-selected) {
  border-style: dashed;
}

.taxonomy-choice[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.4;
}

.taxonomy-choice-title {
  min-width: 0;
  font-size: 10.75px;
  font-weight: 600;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.taxonomy-choice-state {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--color-dim);
}

.taxonomy-check-mark {
  display: inline-flex;
  width: 18px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.16);
  color: var(--color-well);
  font-size: 10px;
  font-weight: 700;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 0.24) inset;
}

.taxonomy-branch-arrow {
  width: 13px;
  height: 13px;
  transition: transform var(--motion-fast) var(--ease-out-soft);
}

.taxonomy-choice:hover:not([aria-disabled='true']) .taxonomy-branch-arrow {
  transform: translateX(2px);
}

.taxonomy-child-branches {
  position: relative;
  z-index: 3;
}

.taxonomy-child-branch {
  position: relative;
  margin-top: 17px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 38%, var(--color-line));
  border-radius: 15px;
  background: color-mix(in srgb, var(--color-well) 92%, var(--color-accentsoft));
  padding: 12px;
  box-shadow: var(--shadow-pop);
  transform-origin: 24px top;
}

.taxonomy-child-branch::before {
  position: absolute;
  top: -18px;
  left: 24px;
  width: 1px;
  height: 18px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--color-accent) 12%, transparent),
    var(--color-accent)
  );
  content: '';
  transform: translateX(-50%);
}

.taxonomy-child-branch::after {
  position: absolute;
  top: -21px;
  left: 24px;
  width: 7px;
  height: 7px;
  border: 2px solid var(--color-well);
  border-radius: 999px;
  background: var(--color-accent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-accent) 45%, transparent);
  content: '';
  transform: translateX(-50%);
}

.taxonomy-child-branch-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 11px;
  padding: 0 2px 9px;
  border-bottom: 1px solid color-mix(in srgb, var(--color-accent) 20%, var(--color-line));
  color: var(--color-paper);
  font-size: 11px;
}

.taxonomy-child-branch-kicker {
  border-radius: 999px;
  background: var(--color-accent);
  padding: 3px 7px;
  color: var(--color-well);
  font-family: var(--font-mono);
  font-size: 7.5px;
  letter-spacing: 0.08em;
}

.taxonomy-child-branch-heading strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.taxonomy-child-branch-count {
  flex: none;
  margin-left: auto;
  color: var(--color-dim);
  font-family: var(--font-mono);
  font-size: 8px;
}

.taxonomy-child-group-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.taxonomy-child-branch-enter-active {
  transition:
    opacity var(--motion-slow) ease,
    clip-path var(--motion-slow) var(--ease-out-soft),
    transform var(--motion-slow) var(--ease-spring);
}

.taxonomy-child-branch-leave-active {
  transition:
    opacity var(--motion-fast) ease,
    clip-path var(--motion-fast) ease,
    transform var(--motion-fast) ease;
}

.taxonomy-child-branch-enter-from {
  opacity: 0;
  clip-path: inset(0 0 100% 0 round 15px);
  transform: translateY(-12px) scale(0.965);
}

.taxonomy-child-branch-leave-to {
  opacity: 0;
  clip-path: inset(0 0 72% 0 round 15px);
  transform: translateY(-7px) scale(0.982);
}

.taxonomy-child-branch-move {
  transition: transform var(--motion-normal) var(--ease-out-soft);
}

.taxonomy-check-enter-active,
.taxonomy-check-leave-active {
  transition: opacity var(--motion-fast) ease, transform var(--motion-fast) var(--ease-spring);
}

.taxonomy-check-enter-from,
.taxonomy-check-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

.taxonomy-summary-list {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.taxonomy-summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 40%, var(--color-line));
  border-radius: 999px;
  background: var(--color-accentsoft);
  padding: 3px 8px;
  color: var(--color-accenthi);
  font-size: 9.75px;
}

.taxonomy-summary-dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--color-accent);
}

.taxonomy-summary-chip-enter-active,
.taxonomy-summary-chip-leave-active,
.taxonomy-summary-chip-move {
  transition:
    opacity var(--motion-fast) ease,
    transform var(--motion-fast) var(--ease-out-soft);
}

.taxonomy-summary-chip-leave-active {
  position: absolute;
}

.taxonomy-summary-chip-enter-from,
.taxonomy-summary-chip-leave-to {
  opacity: 0;
  transform: scale(0.86) translateY(-2px);
}

@media (max-width: 480px) {
  .taxonomy-group-card {
    padding: 11px;
  }

  .taxonomy-child-branch {
    margin-inline: -3px;
    padding: 9px;
  }

  .taxonomy-mode-badge {
    display: none;
  }

  .taxonomy-group-actions {
    gap: 3px;
  }
}
</style>
