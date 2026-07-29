import {
  PROMPT_TAXONOMY_INDEX,
  type IndexedPromptTaxonomyChoice,
  type IndexedPromptTaxonomyGroup,
  type PromptSelectionCondition,
} from '@/assets/prompt-taxonomy'
import type { PromptModule } from '@/types'

export interface PromptChoiceAvailability {
  enabled: boolean
  reason?: string
}

export interface UnmetPromptSelectionRequirement {
  type: 'select-all' | 'select-any' | 'remove-all'
  choiceIds: string[]
}

export interface PromptSelectionMutationResult {
  selectedChoiceIds: string[]
  removedChoiceIds: string[]
  blockedReason?: string
}

export interface SelectedPromptChoiceDetail {
  choiceId: string
  promptModule: PromptModule
  choice: IndexedPromptTaxonomyChoice['choice']
  group: IndexedPromptTaxonomyChoice['group']
  domain: IndexedPromptTaxonomyChoice['domain']
  pathLabels: string[]
  ancestorChoiceIds: string[]
}

function createSelectedChoiceSet(selectedChoiceIds: Iterable<string>): Set<string> {
  return new Set(selectedChoiceIds)
}

export function matchesPromptSelectionCondition(
  condition: PromptSelectionCondition | undefined,
  selectedChoiceIds: Iterable<string>,
): boolean {
  if (!condition) return true

  const selectedChoiceSet = createSelectedChoiceSet(selectedChoiceIds)
  const satisfiesAllRequiredChoices = !condition.allOf?.length
    || condition.allOf.every(choiceId => selectedChoiceSet.has(choiceId))
  const satisfiesAnyRequiredChoice = !condition.anyOf?.length
    || condition.anyOf.some(choiceId => selectedChoiceSet.has(choiceId))
  const excludesForbiddenChoices = !condition.noneOf?.length
    || condition.noneOf.every(choiceId => !selectedChoiceSet.has(choiceId))

  return satisfiesAllRequiredChoices
    && satisfiesAnyRequiredChoice
    && excludesForbiddenChoices
}

export function getUnmetPromptSelectionRequirements(
  condition: PromptSelectionCondition | undefined,
  selectedChoiceIds: Iterable<string>,
): UnmetPromptSelectionRequirement[] {
  if (!condition) return []

  const selectedChoiceSet = createSelectedChoiceSet(selectedChoiceIds)
  const requirements: UnmetPromptSelectionRequirement[] = []
  const missingRequiredChoiceIds = condition.allOf?.filter(choiceId => (
    !selectedChoiceSet.has(choiceId)
  )) ?? []
  if (missingRequiredChoiceIds.length) {
    requirements.push({
      type: 'select-all',
      choiceIds: missingRequiredChoiceIds,
    })
  }

  const hasAnyAlternativeSelected = condition.anyOf?.some(choiceId => (
    selectedChoiceSet.has(choiceId)
  )) ?? true
  if (condition.anyOf?.length && !hasAnyAlternativeSelected) {
    requirements.push({
      type: 'select-any',
      choiceIds: [...condition.anyOf],
    })
  }

  const selectedForbiddenChoiceIds = condition.noneOf?.filter(choiceId => (
    selectedChoiceSet.has(choiceId)
  )) ?? []
  if (selectedForbiddenChoiceIds.length) {
    requirements.push({
      type: 'remove-all',
      choiceIds: selectedForbiddenChoiceIds,
    })
  }

  return requirements
}

function isIndexedGroupVisible(
  indexedGroup: IndexedPromptTaxonomyGroup,
  selectedChoiceSet: Set<string>,
): boolean {
  const hasSelectedAncestorPath = indexedGroup.ancestorChoiceIds.every(choiceId => (
    selectedChoiceSet.has(choiceId)
  ))
  return hasSelectedAncestorPath
    && matchesPromptSelectionCondition(indexedGroup.group.visibleWhen, selectedChoiceSet)
}

export function isPromptTaxonomyGroupVisible(
  groupId: string,
  selectedChoiceIds: Iterable<string>,
): boolean {
  const indexedGroup = PROMPT_TAXONOMY_INDEX.groupsById.get(groupId)
  if (!indexedGroup) return false
  return isIndexedGroupVisible(indexedGroup, createSelectedChoiceSet(selectedChoiceIds))
}

export function getVisiblePromptTaxonomyGroups(
  domainId: string,
  selectedChoiceIds: Iterable<string>,
): IndexedPromptTaxonomyGroup[] {
  const selectedChoiceSet = createSelectedChoiceSet(selectedChoiceIds)
  return [...PROMPT_TAXONOMY_INDEX.groupsById.values()].filter(indexedGroup => (
    indexedGroup.domain.id === domainId
      && isIndexedGroupVisible(indexedGroup, selectedChoiceSet)
  ))
}

export function getPromptChoiceAvailability(
  choiceId: string,
  selectedChoiceIds: Iterable<string>,
): PromptChoiceAvailability {
  const indexedChoice = PROMPT_TAXONOMY_INDEX.choicesById.get(choiceId)
  if (!indexedChoice) return { enabled: false, reason: '该选项不存在' }

  const selectedChoiceSet = createSelectedChoiceSet(selectedChoiceIds)
  const indexedGroup = PROMPT_TAXONOMY_INDEX.groupsById.get(indexedChoice.group.id)
  if (!indexedGroup || !isIndexedGroupVisible(indexedGroup, selectedChoiceSet)) {
    return { enabled: false, reason: '请先完成上一级选择' }
  }
  if (!matchesPromptSelectionCondition(indexedChoice.choice.visibleWhen, selectedChoiceSet)) {
    return { enabled: false, reason: '该选项不适用于当前分支' }
  }
  if (!matchesPromptSelectionCondition(indexedChoice.choice.enabledWhen, selectedChoiceSet)) {
    return { enabled: false, reason: '当前主体或数量条件不满足' }
  }

  const selectedGroupChoiceIds = getSelectedChoiceIdsInGroup(
    indexedChoice.group.id,
    selectedChoiceSet,
  )
  const groupHasReachedSelectionLimit = indexedChoice.group.selectionMode === 'multiple'
    && !selectedChoiceSet.has(choiceId)
    && selectedGroupChoiceIds.length >= indexedChoice.group.maxSelections
  if (groupHasReachedSelectionLimit) {
    return {
      enabled: false,
      reason: `${indexedChoice.group.label}最多选择 ${indexedChoice.group.maxSelections} 项`,
    }
  }
  return { enabled: true }
}

function getChoiceAndDescendantIds(choiceId: string): Set<string> {
  const removableChoiceIds = new Set<string>([choiceId])
  for (const indexedChoice of PROMPT_TAXONOMY_INDEX.choicesById.values()) {
    if (indexedChoice.ancestorChoiceIds.includes(choiceId)) {
      removableChoiceIds.add(indexedChoice.choice.id)
    }
  }
  return removableChoiceIds
}

function removeChoicesAndDescendants(
  selectedChoiceSet: Set<string>,
  choiceIdsToRemove: Iterable<string>,
  removedChoiceSet: Set<string>,
) {
  const completeRemovalSet = new Set<string>()
  for (const choiceId of choiceIdsToRemove) {
    for (const removableChoiceId of getChoiceAndDescendantIds(choiceId)) {
      completeRemovalSet.add(removableChoiceId)
    }
  }

  for (const removableChoiceId of completeRemovalSet) {
    if (!selectedChoiceSet.delete(removableChoiceId)) continue
    removedChoiceSet.add(removableChoiceId)
  }
}

function getSelectedChoiceIdsInGroup(
  groupId: string,
  selectedChoiceSet: Set<string>,
): string[] {
  const indexedGroup = PROMPT_TAXONOMY_INDEX.groupsById.get(groupId)
  if (!indexedGroup) return []
  return [...indexedGroup.group.choices]
    .sort((firstChoice, secondChoice) => firstChoice.sortOrder - secondChoice.sortOrder)
    .map(choice => choice.id)
    .filter(choiceId => selectedChoiceSet.has(choiceId))
}

function choicesExcludeEachOther(firstChoiceId: string, secondChoiceId: string): boolean {
  const firstChoice = PROMPT_TAXONOMY_INDEX.choicesById.get(firstChoiceId)?.choice
  const secondChoice = PROMPT_TAXONOMY_INDEX.choicesById.get(secondChoiceId)?.choice
  return Boolean(
    firstChoice?.excludes?.includes(secondChoiceId)
      || secondChoice?.excludes?.includes(firstChoiceId),
  )
}

function finalizePromptSelectionMutation(
  initialSelectionSet: Set<string>,
  selectedChoiceSet: Set<string>,
  removedChoiceSet: Set<string>,
): PromptSelectionMutationResult {
  const normalizedChoiceIds = normalizePromptSelections(selectedChoiceSet)
  const normalizedChoiceSet = new Set(normalizedChoiceIds)
  for (const initiallySelectedChoiceId of initialSelectionSet) {
    if (!normalizedChoiceSet.has(initiallySelectedChoiceId)) {
      removedChoiceSet.add(initiallySelectedChoiceId)
    }
  }

  return {
    selectedChoiceIds: normalizedChoiceIds,
    removedChoiceIds: [...removedChoiceSet],
  }
}

export function normalizePromptSelections(selectedChoiceIds: Iterable<string>): string[] {
  const normalizedChoiceSet = new Set(
    [...selectedChoiceIds].filter(choiceId => PROMPT_TAXONOMY_INDEX.choicesById.has(choiceId)),
  )

  let didRemoveInvalidChoice = true
  while (didRemoveInvalidChoice) {
    didRemoveInvalidChoice = false

    for (const choiceId of [...normalizedChoiceSet]) {
      const indexedChoice = PROMPT_TAXONOMY_INDEX.choicesById.get(choiceId)
      if (!indexedChoice) {
        normalizedChoiceSet.delete(choiceId)
        didRemoveInvalidChoice = true
        continue
      }

      const indexedGroup = PROMPT_TAXONOMY_INDEX.groupsById.get(indexedChoice.group.id)
      const choiceRemainsAvailable = Boolean(indexedGroup)
        && isIndexedGroupVisible(indexedGroup!, normalizedChoiceSet)
        && matchesPromptSelectionCondition(indexedChoice.choice.visibleWhen, normalizedChoiceSet)
        && matchesPromptSelectionCondition(indexedChoice.choice.enabledWhen, normalizedChoiceSet)
      if (!choiceRemainsAvailable) {
        normalizedChoiceSet.delete(choiceId)
        didRemoveInvalidChoice = true
      }
    }

    for (const indexedGroup of PROMPT_TAXONOMY_INDEX.groupsById.values()) {
      const selectedGroupChoiceIds = getSelectedChoiceIdsInGroup(
        indexedGroup.group.id,
        normalizedChoiceSet,
      )
      const excessChoiceIds = selectedGroupChoiceIds.slice(indexedGroup.group.maxSelections)
      if (!excessChoiceIds.length) continue
      for (const excessChoiceId of excessChoiceIds) normalizedChoiceSet.delete(excessChoiceId)
      didRemoveInvalidChoice = true
    }

    const orderedSelectedChoiceIds = PROMPT_TAXONOMY_INDEX.orderedChoiceIds.filter(choiceId => (
      normalizedChoiceSet.has(choiceId)
    ))
    for (let firstIndex = 0; firstIndex < orderedSelectedChoiceIds.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < orderedSelectedChoiceIds.length;
        secondIndex += 1
      ) {
        const firstChoiceId = orderedSelectedChoiceIds[firstIndex]
        const secondChoiceId = orderedSelectedChoiceIds[secondIndex]
        if (!choicesExcludeEachOther(firstChoiceId, secondChoiceId)) continue
        normalizedChoiceSet.delete(secondChoiceId)
        didRemoveInvalidChoice = true
      }
    }
  }

  return PROMPT_TAXONOMY_INDEX.orderedChoiceIds.filter(choiceId => (
    normalizedChoiceSet.has(choiceId)
  ))
}

export function togglePromptChoice(
  selectedChoiceIds: Iterable<string>,
  choiceId: string,
): PromptSelectionMutationResult {
  const initialSelectionSet = new Set(normalizePromptSelections(selectedChoiceIds))
  const selectedChoiceSet = new Set(initialSelectionSet)
  const removedChoiceSet = new Set<string>()

  if (selectedChoiceSet.has(choiceId)) {
    removeChoicesAndDescendants(selectedChoiceSet, [choiceId], removedChoiceSet)
    return finalizePromptSelectionMutation(
      initialSelectionSet,
      selectedChoiceSet,
      removedChoiceSet,
    )
  }

  const availability = getPromptChoiceAvailability(choiceId, selectedChoiceSet)
  if (!availability.enabled) {
    return {
      selectedChoiceIds: [...initialSelectionSet],
      removedChoiceIds: [],
      blockedReason: availability.reason,
    }
  }

  const indexedChoice = PROMPT_TAXONOMY_INDEX.choicesById.get(choiceId)!
  const selectedGroupChoiceIds = getSelectedChoiceIdsInGroup(
    indexedChoice.group.id,
    selectedChoiceSet,
  )

  if (indexedChoice.group.selectionMode === 'single') {
    removeChoicesAndDescendants(selectedChoiceSet, selectedGroupChoiceIds, removedChoiceSet)
  } else if (selectedGroupChoiceIds.length >= indexedChoice.group.maxSelections) {
    return {
      selectedChoiceIds: [...initialSelectionSet],
      removedChoiceIds: [],
      blockedReason: `${indexedChoice.group.label}最多选择 ${indexedChoice.group.maxSelections} 项`,
    }
  }

  const conflictingChoiceIds = [...selectedChoiceSet].filter(selectedChoiceId => (
    choicesExcludeEachOther(choiceId, selectedChoiceId)
  ))
  removeChoicesAndDescendants(selectedChoiceSet, conflictingChoiceIds, removedChoiceSet)

  selectedChoiceSet.add(choiceId)
  return finalizePromptSelectionMutation(
    initialSelectionSet,
    selectedChoiceSet,
    removedChoiceSet,
  )
}

export function clearPromptTaxonomyGroup(
  selectedChoiceIds: Iterable<string>,
  groupId: string,
): PromptSelectionMutationResult {
  const initialSelectionSet = new Set(normalizePromptSelections(selectedChoiceIds))
  const selectedChoiceSet = new Set(initialSelectionSet)
  const removedChoiceSet = new Set<string>()
  const selectedGroupChoiceIds = getSelectedChoiceIdsInGroup(groupId, selectedChoiceSet)
  removeChoicesAndDescendants(selectedChoiceSet, selectedGroupChoiceIds, removedChoiceSet)
  return finalizePromptSelectionMutation(
    initialSelectionSet,
    selectedChoiceSet,
    removedChoiceSet,
  )
}

export function clearPromptTaxonomyDomain(
  selectedChoiceIds: Iterable<string>,
  domainId: string,
): PromptSelectionMutationResult {
  const initialSelectionSet = new Set(normalizePromptSelections(selectedChoiceIds))
  const selectedChoiceSet = new Set(initialSelectionSet)
  const removedChoiceSet = new Set<string>()
  const selectedDomainChoiceIds = [...selectedChoiceSet].filter(choiceId => (
    PROMPT_TAXONOMY_INDEX.choicesById.get(choiceId)?.domain.id === domainId
  ))
  removeChoicesAndDescendants(selectedChoiceSet, selectedDomainChoiceIds, removedChoiceSet)
  return finalizePromptSelectionMutation(
    initialSelectionSet,
    selectedChoiceSet,
    removedChoiceSet,
  )
}

export function getSelectedPromptChoiceDetails(
  selectedChoiceIds: Iterable<string>,
  promptModules: PromptModule[],
): SelectedPromptChoiceDetail[] {
  const normalizedChoiceIds = normalizePromptSelections(selectedChoiceIds)
  const promptModulesById = new Map(promptModules.map(promptModule => [promptModule.id, promptModule]))

  return normalizedChoiceIds.flatMap(choiceId => {
    const indexedChoice = PROMPT_TAXONOMY_INDEX.choicesById.get(choiceId)
    const promptModule = promptModulesById.get(choiceId)
    if (!indexedChoice || !promptModule) return []

    return [{
      choiceId,
      promptModule,
      choice: indexedChoice.choice,
      group: indexedChoice.group,
      domain: indexedChoice.domain,
      pathLabels: indexedChoice.pathLabels,
      ancestorChoiceIds: indexedChoice.ancestorChoiceIds,
    }]
  })
}
