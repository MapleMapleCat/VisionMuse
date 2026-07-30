import { PROMPT_TEMPLATE_SCHEMA_VERSION } from '@/assets/prompt-templates'
import type { PromptTemplate, PromptTemplateVariable } from '@/types'

export type BuiltinPromptTemplateInput = Omit<
  PromptTemplate,
  'origin' | 'useCount' | 'schemaVersion'
>

export function createRequiredVariable(
  key: string,
  label: string,
  placeholder: string,
  example: string = placeholder,
): PromptTemplateVariable {
  return {
    key,
    label,
    placeholder,
    example,
    required: true,
  }
}

export function createBuiltinPromptTemplate(
  template: BuiltinPromptTemplateInput,
): PromptTemplate {
  return {
    ...template,
    origin: 'builtin',
    useCount: 0,
    schemaVersion: PROMPT_TEMPLATE_SCHEMA_VERSION,
  }
}
