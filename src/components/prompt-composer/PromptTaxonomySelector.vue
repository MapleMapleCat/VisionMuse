<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import {
  PROMPT_TAXONOMY_DOMAINS,
  PROMPT_TAXONOMY_INDEX,
  type IndexedPromptTaxonomyGroup,
} from '@/assets/prompt-taxonomy'
import {
  getPromptChoiceAvailability,
  getVisiblePromptTaxonomyGroups,
} from '@/services/promptSelection'
import type { PromptModule } from '@/types'

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

const promptModulesById = computed(() => new Map(
  props.promptModules.map(promptModule => [promptModule.id, promptModule]),
))
const selectedChoiceSet = computed(() => new Set(props.selectedChoiceIds))
const activeDomain = computed(() => (
  PROMPT_TAXONOMY_INDEX.domainsById.get(activeDomainId.value)
    ?? PROMPT_TAXONOMY_DOMAINS[0]
))
const visibleGroups = computed(() => activeDomain.value
  ? getVisiblePromptTaxonomyGroups(activeDomain.value.id, props.selectedChoiceIds)
  : [])

function getDomainSelectionCount(domainId: string): number {
  return props.selectedChoiceIds.filter(choiceId => (
    PROMPT_TAXONOMY_INDEX.choicesById.get(choiceId)?.domain.id === domainId
  )).length
}

function getGroupSelectedModules(indexedGroup: IndexedPromptTaxonomyGroup): PromptModule[] {
  return [...indexedGroup.group.choices]
    .sort((firstChoice, secondChoice) => firstChoice.sortOrder - secondChoice.sortOrder)
    .filter(choice => selectedChoiceSet.value.has(choice.id))
    .map(choice => promptModulesById.value.get(choice.id))
    .filter((promptModule): promptModule is PromptModule => Boolean(promptModule))
}

function getChoiceModule(choiceId: string): PromptModule | undefined {
  return promptModulesById.value.get(choiceId)
}

function getChoicePathHint(indexedGroup: IndexedPromptTaxonomyGroup): string {
  const ancestorLabels = indexedGroup.ancestorChoiceIds
    .map(choiceId => promptModulesById.value.get(choiceId)?.title)
    .filter((label): label is string => Boolean(label))
  return [indexedGroup.domain.label, ...ancestorLabels].join(' / ')
}

function getChoiceDisabledReason(choiceId: string): string | undefined {
  const availability = getPromptChoiceAvailability(choiceId, props.selectedChoiceIds)
  return availability.enabled ? undefined : availability.reason
}

function isGroupCollapsed(indexedGroup: IndexedPromptTaxonomyGroup): boolean {
  return collapsedGroupIds.has(indexedGroup.group.id)
    && getGroupSelectedModules(indexedGroup).length > 0
}

function toggleGroupCollapse(groupId: string) {
  if (collapsedGroupIds.has(groupId)) {
    collapsedGroupIds.delete(groupId)
    return
  }
  collapsedGroupIds.add(groupId)
}

function handleChoiceToggle(indexedGroup: IndexedPromptTaxonomyGroup, choiceId: string) {
  const isCurrentlySelected = selectedChoiceSet.value.has(choiceId)
  const disabledReason = getChoiceDisabledReason(choiceId)
  if (!isCurrentlySelected && disabledReason) return

  const firstChildGroupId = indexedGroup.group.choices
    .find(choice => choice.id === choiceId)
    ?.children?.[0]?.id
  emit('toggleChoice', choiceId)
  if (isCurrentlySelected) {
    collapsedGroupIds.delete(indexedGroup.group.id)
    return
  }

  const selectedCountAfterChoice = indexedGroup.group.selectionMode === 'single'
    ? 1
    : getGroupSelectedModules(indexedGroup).length + 1
  if (selectedCountAfterChoice >= indexedGroup.group.maxSelections) {
    collapsedGroupIds.add(indexedGroup.group.id)
  }

  if (firstChildGroupId) {
    void nextTick(() => {
      selectorRoot.value
        ?.querySelector<HTMLButtonElement>(
          `[data-taxonomy-group="${firstChildGroupId}"] .taxonomy-choice:not(:disabled)`,
        )
        ?.focus()
    })
  }
}

function clearGroup(groupId: string) {
  collapsedGroupIds.delete(groupId)
  emit('clearGroup', groupId)
}

function clearActiveDomain() {
  if (!activeDomain.value) return
  for (const indexedGroup of PROMPT_TAXONOMY_INDEX.groupsById.values()) {
    if (indexedGroup.domain.id === activeDomain.value.id) {
      collapsedGroupIds.delete(indexedGroup.group.id)
    }
  }
  emit('clearDomain', activeDomain.value.id)
}
</script>

<template>
  <section ref="selectorRoot" class="taxonomy-shell rounded-2xl border border-line bg-well p-4 shadow-card">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="field-label">Progressive taxonomy</p>
        <h2 class="mt-1 text-[15px] font-semibold">分级选择路径</h2>
      </div>
      <button
        v-if="activeDomain && getDomainSelectionCount(activeDomain.id)"
        class="btn btn-ghost !px-2.5 !py-1.5 text-[10.5px]"
        @click="clearActiveDomain"
      >清除此领域</button>
    </div>

    <nav class="taxonomy-domain-grid mt-4" aria-label="提示词分类领域">
      <button
        v-for="(domain, domainIndex) in PROMPT_TAXONOMY_DOMAINS"
        :key="domain.id"
        class="taxonomy-domain-button"
        :class="{ 'is-active': activeDomain?.id === domain.id }"
        :aria-current="activeDomain?.id === domain.id ? 'step' : undefined"
        @click="activeDomainId = domain.id"
      >
        <span class="taxonomy-domain-index">{{ String(domainIndex + 1).padStart(2, '0') }}</span>
        <span class="min-w-0 flex-1 truncate text-left">{{ domain.label }}</span>
        <span v-if="getDomainSelectionCount(domain.id)" class="taxonomy-domain-count">
          {{ getDomainSelectionCount(domain.id) }}
        </span>
      </button>
    </nav>

    <div v-if="activeDomain" class="mt-5">
      <div class="taxonomy-domain-heading">
        <div>
          <h3 class="text-[14px] font-semibold">{{ activeDomain.label }}</h3>
          <p class="mt-1 text-[11px] leading-relaxed text-dim">{{ activeDomain.description }}</p>
        </div>
        <span class="taxonomy-progress-badge">
          {{ getDomainSelectionCount(activeDomain.id) }} 项
        </span>
      </div>

      <div class="mt-4 space-y-2.5">
        <article
          v-for="(indexedGroup, groupIndex) in visibleGroups"
          :key="indexedGroup.group.id"
          :data-taxonomy-group="indexedGroup.group.id"
          class="taxonomy-group"
          :class="{
            'is-nested': indexedGroup.ancestorChoiceIds.length > 0,
            'is-collapsed': isGroupCollapsed(indexedGroup),
          }"
        >
          <header class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="taxonomy-path">{{ getChoicePathHint(indexedGroup) }}</p>
              <div class="mt-1 flex items-center gap-2">
                <span class="taxonomy-level">{{ String(groupIndex + 1).padStart(2, '0') }}</span>
                <h4 class="text-[12.5px] font-semibold">{{ indexedGroup.group.label }}</h4>
              </div>
              <p
                v-if="!isGroupCollapsed(indexedGroup)"
                class="mt-1.5 text-[10.5px] leading-relaxed text-dim"
              >{{ indexedGroup.group.description }}</p>
            </div>

            <div class="flex shrink-0 items-center gap-1.5">
              <span class="font-mono text-[9px] text-dim">
                {{ getGroupSelectedModules(indexedGroup).length }} / {{ indexedGroup.group.maxSelections }}
              </span>
              <button
                v-if="getGroupSelectedModules(indexedGroup).length"
                class="taxonomy-icon-button"
                :class="{ 'is-expanded': !isGroupCollapsed(indexedGroup) }"
                :aria-label="isGroupCollapsed(indexedGroup) ? `展开${indexedGroup.group.label}` : `折叠${indexedGroup.group.label}`"
                @click="toggleGroupCollapse(indexedGroup.group.id)"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <button
                v-if="getGroupSelectedModules(indexedGroup).length"
                class="taxonomy-icon-button is-danger"
                :aria-label="`清除${indexedGroup.group.label}`"
                @click="clearGroup(indexedGroup.group.id)"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="m8 8 8 8M16 8l-8 8" />
                </svg>
              </button>
            </div>
          </header>

          <div v-if="isGroupCollapsed(indexedGroup)" class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="promptModule in getGroupSelectedModules(indexedGroup)"
              :key="promptModule.id"
              class="taxonomy-collapsed-choice"
            >{{ promptModule.title }}</span>
          </div>

          <div v-else class="taxonomy-choice-grid mt-3">
            <button
              v-for="choice in indexedGroup.group.choices"
              :key="choice.id"
              class="taxonomy-choice"
              :class="{
                'is-selected': selectedChoiceSet.has(choice.id),
                'has-children': choice.children?.length,
              }"
              :disabled="!selectedChoiceSet.has(choice.id) && Boolean(getChoiceDisabledReason(choice.id))"
              :aria-pressed="selectedChoiceSet.has(choice.id)"
              :title="getChoiceDisabledReason(choice.id) ?? getChoiceModule(choice.id)?.content"
              @click="handleChoiceToggle(indexedGroup, choice.id)"
            >
              <span class="taxonomy-choice-title">
                <span>{{ getChoiceModule(choice.id)?.title ?? choice.id }}</span>
                <span v-if="selectedChoiceSet.has(choice.id)" aria-hidden="true">✓</span>
              </span>
              <small v-if="choice.children?.length">选择后继续细化</small>
              <small v-else-if="getChoiceDisabledReason(choice.id)">{{ getChoiceDisabledReason(choice.id) }}</small>
            </button>
          </div>
        </article>
        <div v-if="!visibleGroups.length" class="taxonomy-empty-state">
          请先完成关联的上级选择，再进入此领域细化。
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.taxonomy-shell {
  background: color-mix(in srgb, var(--color-well) 96%, var(--color-accentsoft));
}
.taxonomy-domain-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.taxonomy-domain-button {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--color-line);
  border-radius: 9px;
  background: color-mix(in srgb, var(--color-ink) 42%, var(--color-well));
  padding: 7px 9px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-fade);
  transition: border-color 0.16s, background 0.16s, color 0.16s;
}
.taxonomy-domain-button:hover {
  border-color: var(--color-line2);
  color: var(--color-paper);
}
.taxonomy-domain-button.is-active {
  border-color: var(--color-accent);
  background: var(--color-accentsoft);
  color: var(--color-accenthi);
}
.taxonomy-domain-index {
  font-family: var(--font-mono);
  font-size: 8.5px;
  color: var(--color-dim);
}
.taxonomy-domain-count,
.taxonomy-progress-badge {
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-accent) 16%, transparent);
  padding: 2px 6px;
  font-family: var(--font-mono);
  font-size: 8.5px;
  color: var(--color-accenthi);
}
.taxonomy-domain-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--color-line);
  padding-bottom: 12px;
}
.taxonomy-group {
  border: 1px solid var(--color-line);
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-ink) 32%, var(--color-well));
  padding: 13px;
  transition: border-color 0.16s, background 0.16s;
}
.taxonomy-group.is-nested {
  margin-left: 12px;
  border-left-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accentsoft) 32%, var(--color-well));
}
.taxonomy-group.is-collapsed {
  padding-block: 10px;
}
.taxonomy-path {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 8.5px;
  color: var(--color-dim);
}
.taxonomy-level {
  display: inline-flex;
  min-width: 23px;
  height: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: var(--color-accentsoft);
  font-family: var(--font-mono);
  font-size: 8px;
  color: var(--color-accenthi);
}
.taxonomy-icon-button {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line);
  border-radius: 7px;
  color: var(--color-dim);
}
.taxonomy-icon-button:hover {
  border-color: var(--color-line2);
  color: var(--color-paper);
}
.taxonomy-icon-button.is-danger:hover {
  border-color: color-mix(in srgb, var(--color-red) 55%, var(--color-line));
  color: var(--color-red);
}
.taxonomy-icon-button svg {
  width: 12px;
  height: 12px;
  transition: transform 0.18s var(--ease-out-soft);
}
.taxonomy-icon-button.is-expanded svg {
  transform: rotate(180deg);
}
.taxonomy-choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.taxonomy-choice {
  display: flex;
  min-height: 36px;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-ink) 45%, var(--color-well));
  padding: 7px 9px;
  text-align: left;
  transition: border-color 0.16s, background 0.16s, transform 0.16s;
}
.taxonomy-choice:hover:not(:disabled) {
  border-color: var(--color-line2);
  transform: translateY(-1px);
}
.taxonomy-choice.is-selected {
  border-color: var(--color-accent);
  background: var(--color-accentsoft);
}
.taxonomy-choice.has-children:not(.is-selected) {
  border-style: dashed;
}
.taxonomy-choice:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}
.taxonomy-choice-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-paper);
}
.taxonomy-choice.is-selected .taxonomy-choice-title {
  color: var(--color-accenthi);
}
.taxonomy-choice small {
  font-size: 8.5px;
  color: var(--color-dim);
}
.taxonomy-collapsed-choice {
  border: 1px solid color-mix(in srgb, var(--color-accent) 42%, var(--color-line));
  border-radius: 999px;
  background: var(--color-accentsoft);
  padding: 3px 8px;
  font-size: 10px;
  color: var(--color-accenthi);
}
.taxonomy-empty-state {
  border: 1px dashed var(--color-line2);
  border-radius: 11px;
  padding: 18px;
  text-align: center;
  font-size: 11px;
  color: var(--color-dim);
}
@media (min-width: 640px) {
  .taxonomy-domain-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .taxonomy-choice-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .taxonomy-choice-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
