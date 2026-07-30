import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROMPT_MODULES,
  PROMPT_MODULE_ASSETS,
} from '@/assets/prompt-modules'
import {
  PROMPT_TAXONOMY_CHOICE_COUNT,
  PROMPT_TAXONOMY_DOMAINS,
  PROMPT_TAXONOMY_INDEX,
  type PromptSelectionCondition,
} from '@/assets/prompt-taxonomy'
import { PROMPT_MODULE_CATEGORY_KEYS } from '@/types'

describe('prompt module assets', () => {
  it('defines one independently editable asset for every prompt category', () => {
    expect(PROMPT_MODULE_ASSETS.map(asset => asset.category.key))
      .toEqual([...PROMPT_MODULE_CATEGORY_KEYS])
    expect(PROMPT_MODULE_ASSETS.every(asset => asset.modules.length >= 15)).toBe(true)
    expect(DEFAULT_PROMPT_MODULES.length).toBeGreaterThanOrEqual(200)
  })

  it('organizes every prompt module exactly once in the progressive taxonomy', () => {
    const promptModuleIds = DEFAULT_PROMPT_MODULES.map(promptModule => promptModule.id)
    const taxonomyChoiceIds = PROMPT_TAXONOMY_INDEX.orderedChoiceIds

    expect(PROMPT_TAXONOMY_DOMAINS).toHaveLength(9)
    expect(PROMPT_TAXONOMY_CHOICE_COUNT).toBe(DEFAULT_PROMPT_MODULES.length)
    expect(new Set(taxonomyChoiceIds).size).toBe(taxonomyChoiceIds.length)
    expect(new Set(taxonomyChoiceIds)).toEqual(new Set(promptModuleIds))
  })

  it('maps short labels to substantially longer precision prompts', () => {
    for (const promptModule of DEFAULT_PROMPT_MODULES) {
      expect(promptModule.title.trim().length).toBeGreaterThan(0)
      expect(promptModule.title.trim().length).toBeLessThanOrEqual(10)
      expect(promptModule.content.trim().length).toBeGreaterThan(promptModule.title.trim().length * 2)
    }
  })

  it('keeps module identifiers unique across all asset files', () => {
    const moduleIds = DEFAULT_PROMPT_MODULES.map(promptModule => promptModule.id)
    expect(new Set(moduleIds).size).toBe(moduleIds.length)
  })

  it('uses category-specific identifiers and unique sort positions', () => {
    for (const asset of PROMPT_MODULE_ASSETS) {
      const sortOrders = asset.modules.map(promptModule => promptModule.sortOrder)

      expect(asset.modules.every(promptModule => (
        promptModule.id.startsWith(`module-${asset.category.key}-`)
      ))).toBe(true)
      expect(new Set(sortOrders).size).toBe(sortOrders.length)
      expect(sortOrders).toEqual([...sortOrders].sort((firstOrder, secondOrder) => (
        firstOrder - secondOrder
      )))
    }
  })

  it('only uses selection groups in categories that support multiple selections', () => {
    for (const asset of PROMPT_MODULE_ASSETS) {
      const hasSelectionGroups = asset.modules.some(promptModule => promptModule.selectionGroup)
      if (hasSelectionGroups) expect(asset.category.selectionMode).toBe('multiple')
    }
  })

  it('uses valid hierarchical selection limits and references', () => {
    const allChoiceIds = new Set(PROMPT_TAXONOMY_INDEX.orderedChoiceIds)

    function expectConditionReferencesToExist(condition: PromptSelectionCondition | undefined) {
      for (const referencedChoiceId of [
        ...(condition?.allOf ?? []),
        ...(condition?.anyOf ?? []),
        ...(condition?.noneOf ?? []),
      ]) {
        expect(allChoiceIds.has(referencedChoiceId)).toBe(true)
      }
    }

    for (const indexedGroup of PROMPT_TAXONOMY_INDEX.groupsById.values()) {
      expect(indexedGroup.group.maxSelections).toBeGreaterThan(0)
      expect(indexedGroup.group.maxSelections).toBeLessThanOrEqual(
        indexedGroup.group.choices.length,
      )
      if (indexedGroup.group.selectionMode === 'single') {
        expect(indexedGroup.group.maxSelections).toBe(1)
      }
      expectConditionReferencesToExist(indexedGroup.group.visibleWhen)
    }

    for (const indexedChoice of PROMPT_TAXONOMY_INDEX.choicesById.values()) {
      expectConditionReferencesToExist(indexedChoice.choice.visibleWhen)
      expectConditionReferencesToExist(indexedChoice.choice.enabledWhen)
      for (const excludedChoiceId of indexedChoice.choice.excludes ?? []) {
        expect(allChoiceIds.has(excludedChoiceId)).toBe(true)
        expect(excludedChoiceId).not.toBe(indexedChoice.choice.id)
      }
    }
  })
})
