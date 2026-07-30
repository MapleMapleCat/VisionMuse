import {
  PROMPT_TEMPLATE_CATEGORY_IDS,
  PROMPT_TEMPLATE_MEDIUM_IDS,
  PROMPT_TEMPLATE_SCHEMA_VERSION,
  PROMPT_TEMPLATE_STYLE_IDS,
} from '@/assets/prompt-templates'
import { DEFAULT_TEMPLATES } from '@/defaults/templates'
import type {
  PromptTemplate,
  PromptTemplateCategoryId,
  PromptTemplateMedium,
  PromptTemplateStyleId,
  PromptTemplateVariable,
} from '@/types'
import { cloneForStorage } from './clone'

export interface PromptTemplateFillResult {
  content: string
  missingRequiredVariableKeys: string[]
  unresolvedVariableKeys: string[]
  ready: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isPromptTemplateCategoryId(value: unknown): value is PromptTemplateCategoryId {
  return typeof value === 'string'
    && PROMPT_TEMPLATE_CATEGORY_IDS.some(categoryId => categoryId === value)
}

function isPromptTemplateMedium(value: unknown): value is PromptTemplateMedium {
  return typeof value === 'string'
    && PROMPT_TEMPLATE_MEDIUM_IDS.some(mediumId => mediumId === value)
}

function isPromptTemplateStyleId(value: unknown): value is PromptTemplateStyleId {
  return typeof value === 'string'
    && PROMPT_TEMPLATE_STYLE_IDS.some(styleId => styleId === value)
}

export function extractPromptTemplateVariableKeys(content: string): string[] {
  const variableKeys = [...content.matchAll(/\{\{([^{}]+)\}\}/g)]
    .map(match => match[1].trim())
    .filter(Boolean)
  return [...new Set(variableKeys)]
}

function normalizePromptTemplateVariables(
  content: string,
  value: unknown,
): PromptTemplateVariable[] {
  const rawVariablesByKey = new Map<string, Record<string, unknown>>()
  if (Array.isArray(value)) {
    for (const rawVariable of value) {
      if (!isRecord(rawVariable) || typeof rawVariable.key !== 'string') continue
      rawVariablesByKey.set(rawVariable.key.trim(), rawVariable)
    }
  }

  return extractPromptTemplateVariableKeys(content).map((variableKey) => {
    const rawVariable = rawVariablesByKey.get(variableKey)
    const label = typeof rawVariable?.label === 'string' && rawVariable.label.trim()
      ? rawVariable.label.trim()
      : variableKey
    const placeholder = typeof rawVariable?.placeholder === 'string'
      && rawVariable.placeholder.trim()
      ? rawVariable.placeholder.trim()
      : `填写${label}`
    const example = typeof rawVariable?.example === 'string' && rawVariable.example.trim()
      ? rawVariable.example.trim()
      : undefined

    return {
      key: variableKey,
      label,
      placeholder,
      example,
      required: rawVariable?.required === false ? false : true,
    }
  })
}

export function normalizePromptTemplate(value: unknown): PromptTemplate | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim()
    || typeof value.title !== 'string' || !value.title.trim()
    || typeof value.content !== 'string' || !value.content.trim()) {
    return null
  }

  const useCount = typeof value.useCount === 'number' && Number.isFinite(value.useCount)
    ? Math.max(0, Math.floor(value.useCount))
    : 0
  const styleIds = Array.isArray(value.styleIds)
    ? [...new Set(value.styleIds.filter(isPromptTemplateStyleId))]
    : []

  return {
    id: value.id.trim(),
    title: value.title.trim(),
    summary: typeof value.summary === 'string' && value.summary.trim()
      ? value.summary.trim()
      : '用户保存的成品模板。',
    content: value.content.trim(),
    categoryId: isPromptTemplateCategoryId(value.categoryId) ? value.categoryId : null,
    medium: isPromptTemplateMedium(value.medium) ? value.medium : null,
    styleIds,
    variables: normalizePromptTemplateVariables(value.content.trim(), value.variables),
    origin: value.origin === 'builtin' ? 'builtin' : 'user',
    useCount,
    schemaVersion: PROMPT_TEMPLATE_SCHEMA_VERSION,
  }
}

export function normalizePromptTemplates(values: Iterable<unknown>): PromptTemplate[] {
  const normalizedTemplates: PromptTemplate[] = []
  const templateIds = new Set<string>()
  for (const value of values) {
    const normalizedTemplate = normalizePromptTemplate(value)
    if (!normalizedTemplate || templateIds.has(normalizedTemplate.id)) continue
    normalizedTemplates.push(normalizedTemplate)
    templateIds.add(normalizedTemplate.id)
  }
  return normalizedTemplates
}

export function synchronizePromptTemplates(
  storedTemplates: Iterable<unknown>,
  builtinTemplates: PromptTemplate[] = DEFAULT_TEMPLATES,
): PromptTemplate[] {
  const normalizedStoredTemplates = normalizePromptTemplates(storedTemplates)
  const storedTemplatesById = new Map(
    normalizedStoredTemplates.map(template => [template.id, template]),
  )
  const builtinTemplateIds = new Set(builtinTemplates.map(template => template.id))

  const synchronizedBuiltinTemplates = builtinTemplates.map((builtinTemplate) => {
    const storedTemplate = storedTemplatesById.get(builtinTemplate.id)
    return cloneForStorage({
      ...builtinTemplate,
      origin: 'builtin' as const,
      useCount: storedTemplate?.useCount ?? builtinTemplate.useCount,
      schemaVersion: PROMPT_TEMPLATE_SCHEMA_VERSION,
    })
  })
  const userTemplates = normalizedStoredTemplates
    .filter(template => !builtinTemplateIds.has(template.id))
    .map(template => ({ ...template, origin: 'user' as const }))

  return [...synchronizedBuiltinTemplates, ...userTemplates]
}

export function fillPromptTemplate(
  template: PromptTemplate,
  values: Record<string, string | undefined>,
): PromptTemplateFillResult {
  const missingRequiredVariableKeys = template.variables
    .filter(variable => variable.required && !values[variable.key]?.trim())
    .map(variable => variable.key)

  const content = template.content.replace(/\{\{([^{}]+)\}\}/g, (placeholder, rawKey) => {
    const variableKey = String(rawKey).trim()
    const value = values[variableKey]?.trim()
    return value || placeholder
  })
  const unresolvedVariableKeys = extractPromptTemplateVariableKeys(content)

  return {
    content,
    missingRequiredVariableKeys,
    unresolvedVariableKeys,
    ready: missingRequiredVariableKeys.length === 0 && unresolvedVariableKeys.length === 0,
  }
}

export function createPromptTemplateExampleValues(
  template: PromptTemplate,
): Record<string, string> {
  return Object.fromEntries(template.variables.map(variable => [
    variable.key,
    variable.example?.trim() ?? '',
  ]))
}

export function createUserPromptTemplate(prompt: string, id: string): PromptTemplate {
  const normalizedPrompt = prompt.trim()
  return {
    id,
    title: normalizedPrompt.slice(0, 12) + (normalizedPrompt.length > 12 ? '…' : ''),
    summary: '从生成历史保存的成品模板。',
    content: normalizedPrompt,
    categoryId: null,
    medium: null,
    styleIds: [],
    variables: normalizePromptTemplateVariables(normalizedPrompt, undefined),
    origin: 'user',
    useCount: 0,
    schemaVersion: PROMPT_TEMPLATE_SCHEMA_VERSION,
  }
}
