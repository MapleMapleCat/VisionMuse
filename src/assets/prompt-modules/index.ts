import angleAsset from './angle'
import captureAsset from './capture'
import colorAsset from './color'
import compositionAsset from './composition'
import detailAsset from './detail'
import environmentAsset from './environment'
import expressionAsset from './expression'
import lensAsset from './lens'
import lightingAsset from './lighting'
import poseAsset from './pose'
import shotAsset from './shot'
import styleAsset from './style'
import subjectAsset from './subject'
import type { PromptModule } from '@/types'
import type { PromptModuleAssetDefinition } from './types'

export type { PromptModuleAssetDefinition, PromptModuleAssetItem, PromptModuleCategoryDefinition } from './types'

export const PROMPT_MODULE_ASSETS: PromptModuleAssetDefinition[] = [
  subjectAsset,
  poseAsset,
  expressionAsset,
  environmentAsset,
  captureAsset,
  shotAsset,
  angleAsset,
  lensAsset,
  compositionAsset,
  lightingAsset,
  styleAsset,
  colorAsset,
  detailAsset,
]

export const DEFAULT_PROMPT_MODULES: PromptModule[] = PROMPT_MODULE_ASSETS.flatMap(asset => (
  asset.modules.map(moduleAsset => ({
    id: moduleAsset.id,
    title: moduleAsset.label,
    content: moduleAsset.prompt,
    category: asset.category.key,
    useCount: 0,
    sortOrder: moduleAsset.sortOrder,
    selectionGroup: moduleAsset.selectionGroup,
  }))
))
