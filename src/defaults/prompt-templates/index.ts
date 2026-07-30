import type { PromptTemplate } from '@/types'
import { EXPERIMENTAL_ABSTRACT_TEMPLATES } from './experimentalAbstract'
import { FOOD_STILL_LIFE_TEMPLATES } from './foodStillLife'
import { GRAPHIC_COMMUNICATION_TEMPLATES } from './graphicCommunication'
import { LANDSCAPES_NATURE_TEMPLATES } from './landscapesNature'
import { NARRATIVE_WORLDBUILDING_TEMPLATES } from './narrativeWorldbuilding'
import { PEOPLE_CHARACTER_TEMPLATES } from './peopleCharacters'
import { PORTRAIT_PHOTOGRAPHY_TEMPLATES } from './portraitPhotography'
import { PRODUCTS_BRANDS_TEMPLATES } from './productsBrands'
import { SPACES_ARCHITECTURE_TEMPLATES } from './spacesArchitecture'

const CATEGORY_TEMPLATE_COLLECTIONS: PromptTemplate[][] = [
  PEOPLE_CHARACTER_TEMPLATES,
  PORTRAIT_PHOTOGRAPHY_TEMPLATES,
  PRODUCTS_BRANDS_TEMPLATES,
  FOOD_STILL_LIFE_TEMPLATES,
  SPACES_ARCHITECTURE_TEMPLATES,
  LANDSCAPES_NATURE_TEMPLATES,
  NARRATIVE_WORLDBUILDING_TEMPLATES,
  GRAPHIC_COMMUNICATION_TEMPLATES,
  EXPERIMENTAL_ABSTRACT_TEMPLATES,
]

function getBuiltinTemplateSequence(template: PromptTemplate): number {
  const sequence = Number(template.id.replace(/^tpl-/, ''))
  return Number.isFinite(sequence) ? sequence : Number.MAX_SAFE_INTEGER
}

// Preserve the established recommendation order while storing data by category.
export const DEFAULT_TEMPLATES: PromptTemplate[] = CATEGORY_TEMPLATE_COLLECTIONS
  .flat()
  .sort((firstTemplate, secondTemplate) => (
    getBuiltinTemplateSequence(firstTemplate) - getBuiltinTemplateSequence(secondTemplate)
  ))

export {
  PORTRAIT_PHOTOGRAPHY_TEMPLATES,
  PORTRAIT_TEMPLATES,
} from './portraitPhotography'
