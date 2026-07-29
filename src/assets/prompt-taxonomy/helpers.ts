import type { PromptTaxonomyChoiceDefinition } from './types'

export function createPromptChoices(
  choiceIds: string[],
  startingSortOrder = 10,
): PromptTaxonomyChoiceDefinition[] {
  return choiceIds.map((choiceId, choiceIndex) => ({
    id: choiceId,
    sortOrder: startingSortOrder + choiceIndex * 10,
  }))
}
