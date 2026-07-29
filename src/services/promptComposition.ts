import { PROMPT_MODULE_CATEGORIES } from '@/assets/prompt-modules'
import { PROMPT_MODULE_CATEGORY_KEYS, type PromptModule, type PromptModuleCategory } from '@/types'

const CATEGORY_ORDER = new Map(
  PROMPT_MODULE_CATEGORY_KEYS.map((category, categoryIndex) => [category, categoryIndex]),
)
const CATEGORY_LABELS = new Map(
  PROMPT_MODULE_CATEGORIES.map(category => [category.key, category.label]),
)

export interface PromptConstraintInput {
  category: PromptModuleCategory
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
  selectedModules: PromptModule[],
): PromptCompositionInput {
  const orderedModules = [...selectedModules].sort((firstModule, secondModule) => {
    const categoryDifference = (CATEGORY_ORDER.get(firstModule.category) ?? 0)
      - (CATEGORY_ORDER.get(secondModule.category) ?? 0)
    return categoryDifference || firstModule.sortOrder - secondModule.sortOrder
  })

  const promptsByCategory = new Map<PromptModuleCategory, string[]>()
  for (const promptModule of orderedModules) {
    const normalizedPrompt = normalizePromptSegment(promptModule.content)
    if (!normalizedPrompt) continue

    const categoryPrompts = promptsByCategory.get(promptModule.category) ?? []
    categoryPrompts.push(normalizedPrompt)
    promptsByCategory.set(promptModule.category, categoryPrompts)
  }

  const constraints = PROMPT_MODULE_CATEGORY_KEYS.flatMap(category => {
    const categoryPrompts = promptsByCategory.get(category)
    if (!categoryPrompts?.length) return []
    return [{
      category,
      label: CATEGORY_LABELS.get(category) ?? category,
      prompts: categoryPrompts,
    }]
  })

  return {
    overview: normalizePromptSegment(overview),
    constraints,
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
