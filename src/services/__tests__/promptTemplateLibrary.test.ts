import { describe, expect, it } from 'vitest'
import { DEFAULT_TEMPLATES } from '@/defaults/templates'
import {
  getPromptTemplateVisualPreferenceScore,
  queryPromptTemplateLibrary,
  type PromptTemplateLibraryQuery,
} from '@/services/promptTemplateLibrary'
import { createUserPromptTemplate } from '@/services/promptTemplates'

const DEFAULT_LIBRARY_QUERY: PromptTemplateLibraryQuery = {
  scope: 'all',
  search: '',
  visualPreferenceIds: [],
  sortMode: 'recommended',
}

describe('complete prompt template library', () => {
  it('uses visual preferences for ranking without hiding other templates', () => {
    const foodTemplates = DEFAULT_TEMPLATES.filter(template => (
      template.categoryId === 'food-still-life'
    ))
    const rankedTemplates = queryPromptTemplateLibrary(DEFAULT_TEMPLATES, {
      ...DEFAULT_LIBRARY_QUERY,
      scope: 'food-still-life',
      visualPreferenceIds: ['medium:illustration'],
    })

    expect(rankedTemplates).toHaveLength(foodTemplates.length)
    expect(rankedTemplates[0].medium).toBe('illustration')
    expect(rankedTemplates.map(template => template.id).sort()).toEqual(
      foodTemplates.map(template => template.id).sort(),
    )
  })

  it('ranks templates with more matching preferences first', () => {
    const rankedTemplates = queryPromptTemplateLibrary(DEFAULT_TEMPLATES, {
      ...DEFAULT_LIBRARY_QUERY,
      visualPreferenceIds: [
        'medium:photography',
        'style:commercial',
        'style:minimal',
      ],
    })
    const preferenceScores = rankedTemplates.map(template => (
      getPromptTemplateVisualPreferenceScore(template, [
        'medium:photography',
        'style:commercial',
        'style:minimal',
      ])
    ))

    expect(preferenceScores[0]).toBe(3)
    expect(preferenceScores).toEqual([...preferenceScores].sort((firstScore, secondScore) => (
      secondScore - firstScore
    )))
  })

  it('keeps unlabelled user templates visible when a preference is selected', () => {
    const userTemplate = createUserPromptTemplate('A saved prompt', 'user-template')
    const rankedTemplates = queryPromptTemplateLibrary(
      [...DEFAULT_TEMPLATES, userTemplate],
      {
        ...DEFAULT_LIBRARY_QUERY,
        scope: 'user',
        visualPreferenceIds: ['medium:photography'],
      },
    )

    expect(rankedTemplates).toEqual([userTemplate])
  })

  it('still applies creative direction and search as explicit filters', () => {
    const searchResults = queryPromptTemplateLibrary(DEFAULT_TEMPLATES, {
      ...DEFAULT_LIBRARY_QUERY,
      scope: 'people-characters',
      search: '时尚',
    })

    expect(searchResults.length).toBeGreaterThan(0)
    expect(searchResults.every(template => (
      template.categoryId === 'people-characters'
    ))).toBe(true)
    expect(searchResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '时尚杂志棚拍' }),
    ]))
  })

  it('finds the complete portrait collection with a portrait search', () => {
    const portraitResults = queryPromptTemplateLibrary(DEFAULT_TEMPLATES, {
      ...DEFAULT_LIBRARY_QUERY,
      scope: 'portrait-photography',
      search: '写真',
    })

    expect(portraitResults).toHaveLength(24)
    expect(portraitResults.every(template => template.title.includes('写真'))).toBe(true)
  })
})
