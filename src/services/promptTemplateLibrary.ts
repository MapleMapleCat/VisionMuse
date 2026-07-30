import {
  PROMPT_TEMPLATE_CATEGORY_BY_ID,
  PROMPT_TEMPLATE_MEDIA,
  PROMPT_TEMPLATE_MEDIUM_BY_ID,
  PROMPT_TEMPLATE_STYLES,
  PROMPT_TEMPLATE_STYLE_BY_ID,
} from '@/assets/prompt-templates'
import type {
  PromptTemplate,
  PromptTemplateCategoryId,
  PromptTemplateMedium,
  PromptTemplateStyleId,
} from '@/types'

export type PromptTemplateLibraryScope = 'all' | 'user' | PromptTemplateCategoryId
export type PromptTemplateLibrarySortMode = 'recommended' | 'most-used'
export type PromptTemplateVisualPreferenceId =
  | `medium:${PromptTemplateMedium}`
  | `style:${PromptTemplateStyleId}`

export interface PromptTemplateVisualPreference {
  id: PromptTemplateVisualPreferenceId
  label: string
  description: string
}

export interface PromptTemplateLibraryQuery {
  scope: PromptTemplateLibraryScope
  search: string
  visualPreferenceIds: readonly PromptTemplateVisualPreferenceId[]
  sortMode: PromptTemplateLibrarySortMode
}

function createMediumPreferenceId(
  mediumId: PromptTemplateMedium,
): PromptTemplateVisualPreferenceId {
  return `medium:${mediumId}`
}

function createStylePreferenceId(
  styleId: PromptTemplateStyleId,
): PromptTemplateVisualPreferenceId {
  return `style:${styleId}`
}

export const PROMPT_TEMPLATE_VISUAL_PREFERENCES: PromptTemplateVisualPreference[] = [
  ...PROMPT_TEMPLATE_MEDIA.map(medium => ({
    id: createMediumPreferenceId(medium.id),
    label: medium.label,
    description: medium.description,
  })),
  ...PROMPT_TEMPLATE_STYLES.map(style => ({
    id: createStylePreferenceId(style.id),
    label: style.label,
    description: style.description,
  })),
]

function templateMatchesScope(
  template: PromptTemplate,
  scope: PromptTemplateLibraryScope,
): boolean {
  if (scope === 'all') return true
  if (scope === 'user') return template.origin === 'user'
  return template.categoryId === scope
}

function templateMatchesSearch(template: PromptTemplate, normalizedSearch: string): boolean {
  if (!normalizedSearch) return true

  const categoryLabel = template.categoryId
    ? PROMPT_TEMPLATE_CATEGORY_BY_ID.get(template.categoryId)?.label ?? ''
    : '未分类'
  const mediumLabel = template.medium
    ? PROMPT_TEMPLATE_MEDIUM_BY_ID.get(template.medium)?.label ?? ''
    : '视觉语言未标注'
  const styleLabels = template.styleIds.map(styleId => (
    PROMPT_TEMPLATE_STYLE_BY_ID.get(styleId)?.label ?? ''
  ))
  const searchableTexts = [
    template.title,
    template.summary,
    template.content,
    categoryLabel,
    mediumLabel,
    ...styleLabels,
  ]

  return searchableTexts.some(searchableText => (
    searchableText.toLocaleLowerCase().includes(normalizedSearch)
  ))
}

export function getPromptTemplateVisualPreferenceIds(
  template: PromptTemplate,
): PromptTemplateVisualPreferenceId[] {
  const mediumPreferenceIds = template.medium
    ? [createMediumPreferenceId(template.medium)]
    : []
  const stylePreferenceIds = template.styleIds.map(createStylePreferenceId)
  return [...mediumPreferenceIds, ...stylePreferenceIds]
}

export function getPromptTemplateVisualPreferenceScore(
  template: PromptTemplate,
  selectedPreferenceIds: readonly PromptTemplateVisualPreferenceId[],
): number {
  if (!selectedPreferenceIds.length) return 0

  const templatePreferenceIds = new Set(getPromptTemplateVisualPreferenceIds(template))
  return selectedPreferenceIds.reduce((matchingPreferenceCount, preferenceId) => (
    matchingPreferenceCount + (templatePreferenceIds.has(preferenceId) ? 1 : 0)
  ), 0)
}

export function queryPromptTemplateLibrary(
  templates: readonly PromptTemplate[],
  query: PromptTemplateLibraryQuery,
): PromptTemplate[] {
  const normalizedSearch = query.search.trim().toLocaleLowerCase()
  const matchingTemplates = templates.filter(template => (
    templateMatchesScope(template, query.scope)
    && templateMatchesSearch(template, normalizedSearch)
  ))

  return matchingTemplates
    .map((template, originalIndex) => ({
      template,
      originalIndex,
      visualPreferenceScore: getPromptTemplateVisualPreferenceScore(
        template,
        query.visualPreferenceIds,
      ),
    }))
    .sort((firstEntry, secondEntry) => {
      const preferenceScoreDifference = secondEntry.visualPreferenceScore
        - firstEntry.visualPreferenceScore
      if (preferenceScoreDifference !== 0) return preferenceScoreDifference

      if (query.sortMode === 'most-used') {
        const useCountDifference = secondEntry.template.useCount - firstEntry.template.useCount
        if (useCountDifference !== 0) return useCountDifference
      }

      return firstEntry.originalIndex - secondEntry.originalIndex
    })
    .map(entry => entry.template)
}
