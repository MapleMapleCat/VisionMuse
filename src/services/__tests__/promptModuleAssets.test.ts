import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROMPT_MODULES,
  PROMPT_MODULE_ASSETS,
  PROMPT_MODULE_CATEGORIES,
} from '@/assets/prompt-modules'
import { PROMPT_MODULE_CATEGORY_KEYS } from '@/types'

describe('prompt module assets', () => {
  it('defines one independently editable asset for every prompt category', () => {
    expect(PROMPT_MODULE_ASSETS.map(asset => asset.category.key))
      .toEqual([...PROMPT_MODULE_CATEGORY_KEYS])
    expect(PROMPT_MODULE_CATEGORIES).toHaveLength(PROMPT_MODULE_CATEGORY_KEYS.length)
    expect(PROMPT_MODULE_ASSETS.every(asset => asset.modules.length > 0)).toBe(true)
  })

  it('maps short labels to substantially longer precision prompts', () => {
    for (const promptModule of DEFAULT_PROMPT_MODULES) {
      expect(promptModule.title.trim().length).toBeGreaterThan(0)
      expect(promptModule.content.trim().length).toBeGreaterThan(promptModule.title.trim().length * 2)
    }
  })

  it('keeps module identifiers unique across all asset files', () => {
    const moduleIds = DEFAULT_PROMPT_MODULES.map(promptModule => promptModule.id)
    expect(new Set(moduleIds).size).toBe(moduleIds.length)
  })
})
