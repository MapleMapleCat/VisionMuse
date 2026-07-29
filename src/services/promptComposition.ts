import { getSelectedPromptChoiceDetails } from '@/services/promptSelection'
import type { PromptModule } from '@/types'

export interface PromptConstraintInput {
  category: string
  label: string
  prompts: string[]
}

export interface PromptCompositionInput {
  overview: string
  constraints: PromptConstraintInput[]
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
  const constraintsByGroupId = new Map<string, PromptConstraintInput>()

  for (const selectedChoiceDetail of selectedChoiceDetails) {
    const normalizedPrompt = normalizePromptSegment(selectedChoiceDetail.promptModule.content)
    if (!normalizedPrompt) continue

    const existingConstraint = constraintsByGroupId.get(selectedChoiceDetail.group.id)
    if (existingConstraint) {
      existingConstraint.prompts.push(normalizedPrompt)
      continue
    }

    constraintsByGroupId.set(selectedChoiceDetail.group.id, {
      category: selectedChoiceDetail.group.id,
      label: selectedChoiceDetail.group.outputLabel,
      prompts: [normalizedPrompt],
    })
  }

  return {
    overview: normalizePromptSegment(overview),
    constraints: [...constraintsByGroupId.values()],
  }
}

export function composePrompt(input: PromptCompositionInput): string {
  const constraintBlocks = input.constraints
    .filter(constraint => constraint.prompts.length > 0)
    .map(constraint => `{${constraint.label}：${constraint.prompts.join('；')}}`)

  return [input.overview, constraintBlocks.join('\n')]
    .filter(Boolean)
    .join('\n\n')
}
