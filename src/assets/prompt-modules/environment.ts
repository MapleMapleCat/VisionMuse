import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'environment',
    label: '场景',
    description: '短名称用于选择，实际组合时注入完整空间约束',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-environment-studio',
      label: '极简影棚',
      prompt: '主体置于干净的极简摄影棚内，使用连续无缝背景，环境元素克制且不分散主体注意力',
      sortOrder: 10,
    },
    {
      id: 'module-environment-interior',
      label: '窗边室内',
      prompt: '主体位于靠近大型窗户的室内空间，窗框与少量家具建立真实尺度和清晰空间层次',
      sortOrder: 20,
    },
    {
      id: 'module-environment-city',
      label: '城市街道',
      prompt: '主体置于真实城市街道环境中，建筑立面、道路设施与行人层次共同提供明确都市语境',
      sortOrder: 30,
    },
    {
      id: 'module-environment-nature',
      label: '自然旷野',
      prompt: '主体置于开阔自然旷野，地表、远景与天空形成清晰纵深，避免无关人造物干扰',
      sortOrder: 40,
    },
    {
      id: 'module-environment-rain',
      label: '雨夜街巷',
      prompt: '主体置于夜间雨湿街巷，空气中可见细密雨丝，湿润地面形成真实反射并强化空间纵深',
      sortOrder: 50,
    },
  ],
} satisfies PromptModuleAssetDefinition
