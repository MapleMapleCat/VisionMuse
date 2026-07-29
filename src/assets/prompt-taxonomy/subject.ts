import { createPromptChoices } from './helpers'
import type { PromptTaxonomyDomainDefinition } from './types'

export default {
  id: 'domain-subject',
  label: '主体与关系',
  description: '先确定主体是什么，再分别控制数量、朝向、可见范围和多主体关系。',
  sortOrder: 10,
  groups: [
    {
      id: 'group-subject-type',
      label: '主体类别',
      description: '只定义主要视觉对象的实体类别，不在此处规定数量或朝向。',
      outputLabel: '主体类别',
      sortOrder: 10,
      selectionMode: 'single',
      maxSelections: 1,
      choices: createPromptChoices([
        'module-subject-person',
        'module-subject-animal',
        'module-subject-object',
        'module-subject-plant',
        'module-subject-architecture',
        'module-subject-creature',
      ]),
    },
    {
      id: 'group-subject-count',
      label: '主体数量',
      description: '数量与主体类别独立，因此人物、动物或物件都能继续选择数量。',
      outputLabel: '主体数量',
      sortOrder: 20,
      selectionMode: 'single',
      maxSelections: 1,
      choices: createPromptChoices([
        'module-subject-single',
        'module-subject-pair',
        'module-subject-group',
        'module-subject-crowd',
      ]),
    },
    {
      id: 'group-subject-orientation',
      label: '主体朝向',
      description: '这里描述主体自身朝向；摄影机从哪里观察将在相机几何中单独选择。',
      outputLabel: '主体朝向',
      sortOrder: 30,
      selectionMode: 'single',
      maxSelections: 1,
      visibleWhen: {
        noneOf: ['module-subject-hands', 'module-subject-feet-only'],
      },
      choices: createPromptChoices([
        'module-subject-front-facing',
        'module-subject-three-quarter',
        'module-subject-profile',
        'module-subject-back',
      ]),
    },
    {
      id: 'group-subject-visibility',
      label: '可见范围',
      description: '控制主体是否完整可见、被遮挡或仅从画面边缘进入。',
      outputLabel: '主体可见范围',
      sortOrder: 40,
      selectionMode: 'single',
      maxSelections: 1,
      choices: [
        {
          id: 'module-subject-face-obscured',
          sortOrder: 10,
        },
        {
          id: 'module-subject-edge-entry',
          sortOrder: 20,
        },
        {
          id: 'module-subject-hands',
          sortOrder: 30,
          enabledWhen: { allOf: ['module-subject-person'] },
        },
        {
          id: 'module-subject-feet-only',
          sortOrder: 40,
          enabledWhen: { allOf: ['module-subject-person'] },
        },
      ],
    },
    {
      id: 'group-subject-interaction',
      label: '多主体关系',
      description: '选择两个或更多主体后，才继续定义它们之间的关系。',
      outputLabel: '主体关系',
      sortOrder: 50,
      selectionMode: 'single',
      maxSelections: 1,
      visibleWhen: {
        anyOf: [
          'module-subject-pair',
          'module-subject-group',
          'module-subject-crowd',
        ],
      },
      choices: createPromptChoices([
        'module-subject-interaction-conversation',
        'module-subject-interaction-cooperation',
        'module-subject-interaction-opposition',
        'module-subject-interaction-parallel',
      ]),
    },
  ],
} satisfies PromptTaxonomyDomainDefinition
