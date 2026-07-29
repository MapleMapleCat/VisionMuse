import { createPromptChoices } from './helpers'
import type { PromptTaxonomyDomainDefinition } from './types'

const MATERIAL_TARGET_IDS = [
  'module-detail-target-subject',
  'module-detail-target-clothing',
  'module-detail-target-prop',
  'module-detail-target-background',
]

export default {
  id: 'domain-material',
  label: '材质与完成度',
  description: '先指定材质约束作用对象，再选择表面类型；全局质量和成像颗粒保持独立。',
  sortOrder: 90,
  groups: [
    {
      id: 'group-material-overall-quality',
      label: '整体表现目标',
      description: '最多组合两项整体质量要求，不与具体材质表面混为一个类别。',
      outputLabel: '整体表现',
      sortOrder: 10,
      selectionMode: 'multiple',
      maxSelections: 2,
      choices: [
        ...createPromptChoices([
          'module-detail-realistic',
          'module-detail-minimal',
          'module-detail-polished',
        ]),
        {
          id: 'module-detail-skin',
          sortOrder: 40,
          enabledWhen: { allOf: ['module-subject-person'] },
        },
      ],
    },
    {
      id: 'group-material-image-texture',
      label: '成像纹理',
      description: '成像颗粒属于最终影像处理，不属于物体表面材质。',
      outputLabel: '成像纹理',
      sortOrder: 20,
      selectionMode: 'single',
      maxSelections: 1,
      choices: createPromptChoices(['module-detail-grain']),
    },
    {
      id: 'group-material-target',
      label: '材质作用对象',
      description: '先指定后续材质约束应用到主体、服装、道具还是背景。',
      outputLabel: '材质对象',
      sortOrder: 30,
      selectionMode: 'single',
      maxSelections: 1,
      choices: createPromptChoices(MATERIAL_TARGET_IDS),
    },
    {
      id: 'group-material-surface',
      label: '表面材质',
      description: '选择作用对象后，再叠加最多两种明确材质或表面变化。',
      outputLabel: '表面材质',
      sortOrder: 40,
      selectionMode: 'multiple',
      maxSelections: 2,
      visibleWhen: { anyOf: MATERIAL_TARGET_IDS },
      choices: createPromptChoices([
        'module-detail-brushed-metal',
        'module-detail-copper-patina',
        'module-detail-weathered-wood',
        'module-detail-frosted-glass',
        'module-detail-glazed-ceramic',
        'module-detail-woven-fiber',
        'module-detail-aged-paper',
        'module-detail-chipped-paint',
        'module-detail-micro-scratches',
        'module-detail-embossed',
      ]),
    },
    {
      id: 'group-material-global-finish',
      label: '全局表面反射',
      description: '哑光和亮光互斥；不选择时保留各材质自身的自然反射属性。',
      outputLabel: '表面反射',
      sortOrder: 50,
      selectionMode: 'single',
      maxSelections: 1,
      choices: createPromptChoices([
        'module-detail-matte',
        'module-detail-gloss',
      ]),
    },
  ],
} satisfies PromptTaxonomyDomainDefinition
