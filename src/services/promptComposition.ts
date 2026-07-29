import { PROMPT_MODULE_CATEGORY_KEYS, type PromptModule } from '@/types'

const CATEGORY_ORDER = new Map(
  PROMPT_MODULE_CATEGORY_KEYS.map((category, categoryIndex) => [category, categoryIndex]),
)

function normalizePromptSegment(segment: string): string {
  return segment
    .trim()
    .replace(/^[,，。;；\s]+/, '')
    .replace(/[,，。;；\s]+$/, '')
}

export function composePrompt(coreContent: string, selectedModules: PromptModule[]): string {
  const orderedModules = [...selectedModules].sort((firstModule, secondModule) => {
    const categoryDifference = (CATEGORY_ORDER.get(firstModule.category) ?? 0)
      - (CATEGORY_ORDER.get(secondModule.category) ?? 0)
    return categoryDifference || firstModule.sortOrder - secondModule.sortOrder
  })

  return [coreContent, ...orderedModules.map(module => module.content)]
    .map(normalizePromptSegment)
    .filter(Boolean)
    .join('，')
}
