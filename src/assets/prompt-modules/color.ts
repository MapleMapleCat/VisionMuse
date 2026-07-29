import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'color',
    label: '色彩',
    description: '短名称用于选择，实际组合时注入完整配色与色调约束',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-color-natural',
      label: '自然色彩',
      prompt: '采用接近真实环境观感的自然色彩，白平衡准确，肤色与材质颜色可信，避免明显偏色',
      sortOrder: 10,
    },
    {
      id: 'module-color-warm',
      label: '低饱和暖调',
      prompt: '采用低饱和暖色调，以柔和米色、棕色和暖灰为主，控制色彩浓度并保持层次清晰',
      sortOrder: 20,
    },
    {
      id: 'module-color-cool',
      label: '低饱和冷调',
      prompt: '采用低饱和冷色调，以蓝灰、青灰和中性暗色为主，保持克制、统一且不过度偏蓝',
      sortOrder: 30,
    },
    {
      id: 'module-color-vivid',
      label: '高饱和撞色',
      prompt: '采用高饱和对比配色，以两至三种明确互补色形成视觉冲击，同时保持主体层级和颜色边界清楚',
      sortOrder: 40,
    },
    {
      id: 'module-color-monochrome',
      label: '单色',
      prompt: '采用统一单色体系，通过同一色相的明度与饱和度变化建立层次，避免混入明显竞争色',
      sortOrder: 50,
    },
  ],
} satisfies PromptModuleAssetDefinition
