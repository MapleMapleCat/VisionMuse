import type { PromptModuleCategory } from '@/types'

export interface PromptModuleCategoryDefinition {
  key: PromptModuleCategory
  label: string
  description: string
  selectionMode: 'single' | 'multiple'
  maxSelections: number
}

export interface PromptModuleAssetItem {
  id: string
  label: string
  prompt: string
  sortOrder: number
  selectionGroup?: string
}

export interface PromptModuleAssetDefinition {
  category: PromptModuleCategoryDefinition
  modules: PromptModuleAssetItem[]
}
