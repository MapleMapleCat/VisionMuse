import cameraDomain from './camera'
import colorDomain from './color'
import compositionDomain from './composition'
import lightingDomain from './lighting'
import materialDomain from './material'
import mediumDomain from './medium'
import performanceDomain from './performance'
import sceneDomain from './scene'
import subjectDomain from './subject'
import type {
  PromptTaxonomyDomainDefinition,
  PromptTaxonomyGroupDefinition,
  PromptTaxonomyIndex,
} from './types'

export type {
  IndexedPromptTaxonomyChoice,
  IndexedPromptTaxonomyGroup,
  PromptSelectionCondition,
  PromptSelectionMode,
  PromptTaxonomyChoiceDefinition,
  PromptTaxonomyDomainDefinition,
  PromptTaxonomyGroupDefinition,
  PromptTaxonomyIndex,
} from './types'

export const PROMPT_TAXONOMY_DOMAINS: PromptTaxonomyDomainDefinition[] = [
  subjectDomain,
  performanceDomain,
  sceneDomain,
  mediumDomain,
  cameraDomain,
  compositionDomain,
  lightingDomain,
  colorDomain,
  materialDomain,
].sort((firstDomain, secondDomain) => firstDomain.sortOrder - secondDomain.sortOrder)

function createPromptTaxonomyIndex(
  domains: PromptTaxonomyDomainDefinition[],
): PromptTaxonomyIndex {
  const index: PromptTaxonomyIndex = {
    choicesById: new Map(),
    groupsById: new Map(),
    domainsById: new Map(),
    orderedChoiceIds: [],
  }

  function indexGroup(
    group: PromptTaxonomyGroupDefinition,
    domain: PromptTaxonomyDomainDefinition,
    parentChoiceId: string | undefined,
    ancestorChoiceIds: string[],
    parentPathLabels: string[],
  ) {
    if (index.groupsById.has(group.id)) {
      throw new Error(`Duplicate prompt taxonomy group ID: ${group.id}`)
    }

    const groupPathLabels = [...parentPathLabels, group.label]
    index.groupsById.set(group.id, {
      group,
      domain,
      parentChoiceId,
      ancestorChoiceIds,
      pathLabels: groupPathLabels,
    })

    const orderedChoices = [...group.choices].sort((firstChoice, secondChoice) => (
      firstChoice.sortOrder - secondChoice.sortOrder
    ))
    for (const choice of orderedChoices) {
      if (index.choicesById.has(choice.id)) {
        throw new Error(`Duplicate prompt taxonomy choice ID: ${choice.id}`)
      }

      index.choicesById.set(choice.id, {
        choice,
        group,
        domain,
        parentChoiceId,
        ancestorChoiceIds,
        pathLabels: groupPathLabels,
      })
      index.orderedChoiceIds.push(choice.id)

      const childAncestorChoiceIds = [...ancestorChoiceIds, choice.id]
      const orderedChildGroups = [...(choice.children ?? [])].sort((firstGroup, secondGroup) => (
        firstGroup.sortOrder - secondGroup.sortOrder
      ))
      for (const childGroup of orderedChildGroups) {
        indexGroup(
          childGroup,
          domain,
          choice.id,
          childAncestorChoiceIds,
          groupPathLabels,
        )
      }
    }
  }

  for (const domain of domains) {
    if (index.domainsById.has(domain.id)) {
      throw new Error(`Duplicate prompt taxonomy domain ID: ${domain.id}`)
    }
    index.domainsById.set(domain.id, domain)

    const orderedGroups = [...domain.groups].sort((firstGroup, secondGroup) => (
      firstGroup.sortOrder - secondGroup.sortOrder
    ))
    for (const group of orderedGroups) {
      indexGroup(group, domain, undefined, [], [domain.label])
    }
  }

  return index
}

export const PROMPT_TAXONOMY_INDEX = createPromptTaxonomyIndex(PROMPT_TAXONOMY_DOMAINS)

export const PROMPT_TAXONOMY_CHOICE_COUNT = PROMPT_TAXONOMY_INDEX.orderedChoiceIds.length
