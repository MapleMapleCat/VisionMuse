import {
  PROMPT_TAXONOMY_DOMAINS,
  type PromptTaxonomyGroupDefinition,
} from '@/assets/prompt-taxonomy'
import {
  getSelectedPromptChoiceDetails,
  type SelectedPromptChoiceDetail,
} from '@/services/promptSelection'
import type { PromptModule } from '@/types'

export interface PromptConstraintInput {
  category: string
  label: string
  prompts: string[]
  children: PromptConstraintInput[]
}

export interface PromptCompositionSectionInput {
  category: string
  label: string
  constraints: PromptConstraintInput[]
}

export interface PromptCompositionInput {
  overview: string
  sections: PromptCompositionSectionInput[]
}

function normalizePromptSegment(segment: string): string {
  return segment
    .trim()
    .replace(/^[,，。;；\s]+/, '')
    .replace(/[,，。;；\s]+$/, '')
}

export function createPromptCompositionInput(
  overview: string,
  selectedChoiceIds: Iterable<string>,
  promptModules: PromptModule[],
): PromptCompositionInput {
  const selectedChoiceDetails = getSelectedPromptChoiceDetails(selectedChoiceIds, promptModules)
  const selectedChoiceDetailsByGroupId = new Map<string, SelectedPromptChoiceDetail[]>()

  for (const selectedChoiceDetail of selectedChoiceDetails) {
    const groupChoiceDetails = selectedChoiceDetailsByGroupId.get(selectedChoiceDetail.group.id)
      ?? []
    groupChoiceDetails.push(selectedChoiceDetail)
    selectedChoiceDetailsByGroupId.set(selectedChoiceDetail.group.id, groupChoiceDetails)
  }

  function createConstraintTree(
    group: PromptTaxonomyGroupDefinition,
  ): PromptConstraintInput | undefined {
    const selectedGroupChoiceDetails = [
      ...(selectedChoiceDetailsByGroupId.get(group.id) ?? []),
    ].sort((firstChoiceDetail, secondChoiceDetail) => (
      firstChoiceDetail.choice.sortOrder - secondChoiceDetail.choice.sortOrder
    ))
    if (!selectedGroupChoiceDetails.length) return undefined

    const prompts = selectedGroupChoiceDetails
      .map(selectedChoiceDetail => normalizePromptSegment(
        selectedChoiceDetail.promptModule.content,
      ))
      .filter(Boolean)

    const childConstraintIds = new Set<string>()
    const children = selectedGroupChoiceDetails.flatMap(selectedChoiceDetail => (
      [...(selectedChoiceDetail.choice.children ?? [])]
        .sort((firstChildGroup, secondChildGroup) => (
          firstChildGroup.sortOrder - secondChildGroup.sortOrder
        ))
        .flatMap((childGroup) => {
          if (childConstraintIds.has(childGroup.id)) return []
          const childConstraint = createConstraintTree(childGroup)
          if (!childConstraint) return []
          childConstraintIds.add(childGroup.id)
          return [childConstraint]
        })
    ))

    if (!prompts.length && !children.length) return undefined
    return {
      category: group.id,
      label: group.outputLabel,
      prompts,
      children,
    }
  }

  const sections = PROMPT_TAXONOMY_DOMAINS.flatMap((domain) => {
    const constraints = [...domain.groups]
      .sort((firstGroup, secondGroup) => firstGroup.sortOrder - secondGroup.sortOrder)
      .flatMap((group) => {
        const constraint = createConstraintTree(group)
        return constraint ? [constraint] : []
      })
    if (!constraints.length) return []
    return [{
      category: domain.id,
      label: domain.label,
      constraints,
    }]
  })

  return {
    overview: normalizePromptSegment(overview),
    sections,
  }
}

function joinNaturalLanguageClauses(clauses: string[]): string {
  return clauses.join('；')
}

function composeConstraintNarrative(
  constraint: PromptConstraintInput,
): string {
  const ownDescription = joinNaturalLanguageClauses(constraint.prompts)
  const childDescriptions = constraint.children.map(childConstraint => (
    composeConstraintNarrative(childConstraint)
  ))
  return [ownDescription, ...childDescriptions].filter(Boolean).join('；')
}

function ensureChineseSentenceEnding(description: string): string {
  if (!description) return ''
  return /[。！？]$/.test(description) ? description : `${description}。`
}

export function composePrompt(input: PromptCompositionInput): string {
  const narrativeParagraphs = input.sections
    .map(section => section.constraints
      .map(constraint => composeConstraintNarrative(constraint))
      .filter(Boolean)
      .map(ensureChineseSentenceEnding)
      .join(''))
    .filter(Boolean)

  const overview = narrativeParagraphs.length
    ? ensureChineseSentenceEnding(input.overview)
    : input.overview
  return [overview, narrativeParagraphs.join('\n\n')]
    .filter(Boolean)
    .join('\n\n')
}
