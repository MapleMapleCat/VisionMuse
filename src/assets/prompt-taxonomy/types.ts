export type PromptSelectionMode = 'single' | 'multiple'

export interface PromptSelectionCondition {
  allOf?: string[]
  anyOf?: string[]
  noneOf?: string[]
}

export interface PromptTaxonomyChoiceDefinition {
  /** The choice ID is also the stable prompt module ID emitted by this selection. */
  id: string
  sortOrder: number
  description?: string
  visibleWhen?: PromptSelectionCondition
  enabledWhen?: PromptSelectionCondition
  excludes?: string[]
  children?: PromptTaxonomyGroupDefinition[]
}

export interface PromptTaxonomyGroupDefinition {
  id: string
  label: string
  description: string
  outputLabel: string
  sortOrder: number
  selectionMode: PromptSelectionMode
  maxSelections: number
  visibleWhen?: PromptSelectionCondition
  choices: PromptTaxonomyChoiceDefinition[]
}

export interface PromptTaxonomyDomainDefinition {
  id: string
  label: string
  description: string
  sortOrder: number
  groups: PromptTaxonomyGroupDefinition[]
}

export interface IndexedPromptTaxonomyChoice {
  choice: PromptTaxonomyChoiceDefinition
  group: PromptTaxonomyGroupDefinition
  domain: PromptTaxonomyDomainDefinition
  parentChoiceId?: string
  ancestorChoiceIds: string[]
  pathLabels: string[]
}

export interface IndexedPromptTaxonomyGroup {
  group: PromptTaxonomyGroupDefinition
  domain: PromptTaxonomyDomainDefinition
  parentChoiceId?: string
  ancestorChoiceIds: string[]
  pathLabels: string[]
}

export interface PromptTaxonomyIndex {
  choicesById: Map<string, IndexedPromptTaxonomyChoice>
  groupsById: Map<string, IndexedPromptTaxonomyGroup>
  domainsById: Map<string, PromptTaxonomyDomainDefinition>
  orderedChoiceIds: string[]
}
