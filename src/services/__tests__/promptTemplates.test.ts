import { describe, expect, it } from 'vitest'
import {
  PROMPT_TEMPLATE_CATEGORIES,
  PROMPT_TEMPLATE_CATEGORY_IDS,
  PROMPT_TEMPLATE_MEDIUM_IDS,
  PROMPT_TEMPLATE_SCHEMA_VERSION,
  PROMPT_TEMPLATE_STYLE_IDS,
} from '@/assets/prompt-templates'
import { DEFAULT_TEMPLATES } from '@/defaults/templates'
import {
  extractPromptTemplateVariableKeys,
  fillPromptTemplate,
  normalizePromptTemplate,
  synchronizePromptTemplates,
} from '@/services/promptTemplates'

describe('complete prompt templates', () => {
  it('defines 24 valid built-in templates across all creative categories', () => {
    expect(DEFAULT_TEMPLATES).toHaveLength(24)
    expect(new Set(DEFAULT_TEMPLATES.map(template => template.id)).size).toBe(24)

    for (const category of PROMPT_TEMPLATE_CATEGORIES) {
      expect(DEFAULT_TEMPLATES.filter(template => template.categoryId === category.id)).toHaveLength(3)
    }

    for (const template of DEFAULT_TEMPLATES) {
      expect(template.origin).toBe('builtin')
      expect(template.schemaVersion).toBe(PROMPT_TEMPLATE_SCHEMA_VERSION)
      expect(template.summary.trim().length).toBeGreaterThan(0)
      expect(template.content.trim().length).toBeGreaterThan(100)
      expect(PROMPT_TEMPLATE_CATEGORY_IDS).toContain(template.categoryId)
      expect(PROMPT_TEMPLATE_MEDIUM_IDS).toContain(template.medium)
      expect(template.styleIds.length).toBeGreaterThan(0)
      expect(template.styleIds.every(styleId => PROMPT_TEMPLATE_STYLE_IDS.includes(styleId))).toBe(true)
      expect(template.variables.length).toBeGreaterThanOrEqual(2)
      expect(template.variables.length).toBeLessThanOrEqual(5)
    }
  })

  it('keeps template placeholders and variable definitions in exact agreement', () => {
    for (const template of DEFAULT_TEMPLATES) {
      const placeholderKeys = extractPromptTemplateVariableKeys(template.content)
      const variableKeys = template.variables.map(variable => variable.key)

      expect(variableKeys).toEqual(placeholderKeys)
      expect(new Set(variableKeys).size).toBe(variableKeys.length)
      expect(template.variables.every(variable => (
        variable.label.trim()
        && variable.placeholder.trim()
        && variable.required
      ))).toBe(true)
    }
  })

  it('fills every built-in template without unresolved placeholders', () => {
    for (const template of DEFAULT_TEMPLATES) {
      const values = Object.fromEntries(template.variables.map(variable => [
        variable.key,
        variable.example ?? variable.placeholder,
      ]))
      const result = fillPromptTemplate(template, values)

      expect(result.ready).toBe(true)
      expect(result.missingRequiredVariableKeys).toEqual([])
      expect(result.unresolvedVariableKeys).toEqual([])
      expect(result.content).not.toMatch(/\{\{[^{}]+\}\}/)
    }
  })

  it('normalizes legacy records as uncategorized user templates', () => {
    const normalizedTemplate = normalizePromptTemplate({
      id: 'legacy-user-template',
      title: 'Legacy',
      content: 'A portrait of {{subject}} under {{lighting}}',
      category: '摄影',
      useCount: 4,
    })

    expect(normalizedTemplate).toEqual(expect.objectContaining({
      id: 'legacy-user-template',
      categoryId: null,
      medium: null,
      styleIds: [],
      origin: 'user',
      useCount: 4,
      schemaVersion: PROMPT_TEMPLATE_SCHEMA_VERSION,
    }))
    expect(normalizedTemplate?.variables.map(variable => variable.key)).toEqual([
      'subject',
      'lighting',
    ])
  })

  it('refreshes built-ins while retaining counts and preserving user templates', () => {
    const storedTemplates = [
      {
        id: 'tpl-1',
        title: 'Old built-in title',
        content: 'Old {{subject}} content',
        category: '摄影',
        useCount: 11,
      },
      {
        id: 'custom-template',
        title: 'Custom template',
        content: 'Custom prompt without variables',
        category: '我的',
        useCount: 3,
      },
    ]

    const synchronizedTemplates = synchronizePromptTemplates(storedTemplates)
    const synchronizedBuiltin = synchronizedTemplates.find(template => template.id === 'tpl-1')
    const synchronizedUserTemplate = synchronizedTemplates.find(template => (
      template.id === 'custom-template'
    ))

    expect(synchronizedTemplates).toHaveLength(DEFAULT_TEMPLATES.length + 1)
    expect(synchronizedBuiltin).toEqual(expect.objectContaining({
      title: DEFAULT_TEMPLATES[0].title,
      content: DEFAULT_TEMPLATES[0].content,
      origin: 'builtin',
      useCount: 11,
    }))
    expect(synchronizedUserTemplate).toEqual(expect.objectContaining({
      title: 'Custom template',
      content: 'Custom prompt without variables',
      origin: 'user',
      useCount: 3,
    }))
  })
})
