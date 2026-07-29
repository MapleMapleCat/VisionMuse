import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'composition',
    label: '构图',
    description: '短名称用于选择，实际组合时注入完整画面组织规则',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-composition-thirds',
      label: '三分法',
      prompt: '采用三分法构图，将主体视觉中心放在三分线交点附近，并为视线或动作方向保留合理空间',
      sortOrder: 10,
    },
    {
      id: 'module-composition-centered',
      label: '中心构图',
      prompt: '采用中心构图，将主要主体稳定放置在画面中心，周围视觉元素保持均衡并服务于中心焦点',
      sortOrder: 20,
    },
    {
      id: 'module-composition-symmetry',
      label: '对称构图',
      prompt: '采用严格对称构图，以明确中轴组织左右画面元素，保持结构、重量和留白的视觉平衡',
      sortOrder: 30,
    },
    {
      id: 'module-composition-diagonal',
      label: '对角线构图',
      prompt: '采用对角线构图，让主体轮廓、动作或环境线条沿画面对角方向展开，形成清晰动态引导',
      sortOrder: 40,
    },
    {
      id: 'module-composition-negative',
      label: '大面积留白',
      prompt: '使用大面积负空间构图，将主体安排在画面局部区域，其余区域保持简洁留白并避免杂乱元素',
      sortOrder: 50,
    },
  ],
} satisfies PromptModuleAssetDefinition
