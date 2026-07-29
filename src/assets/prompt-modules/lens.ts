import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'lens',
    label: '镜头',
    description: '短名称用于选择，实际组合时注入焦段与透视特征',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-lens-24mm',
      label: '24mm 广角',
      prompt: '使用全画幅等效 24mm 广角镜头，呈现开阔视野和明显空间纵深，同时控制边缘透视变形',
      sortOrder: 10,
    },
    {
      id: 'module-lens-35mm',
      label: '35mm 环境',
      prompt: '使用全画幅等效 35mm 镜头，在自然透视下兼顾主体与环境信息，保持适度空间纵深',
      sortOrder: 20,
    },
    {
      id: 'module-lens-50mm',
      label: '50mm 标准',
      prompt: '使用全画幅等效 50mm 标准镜头，保持接近人眼观感的自然透视与真实主体比例',
      sortOrder: 30,
    },
    {
      id: 'module-lens-85mm',
      label: '85mm 人像',
      prompt: '使用全画幅等效 85mm 人像镜头，呈现自然面部比例、柔和背景虚化和适度空间压缩',
      sortOrder: 40,
    },
    {
      id: 'module-lens-telephoto',
      label: '长焦压缩',
      prompt: '使用全画幅等效 135mm 以上长焦镜头，明显压缩前后景距离并获得集中、干净的主体背景关系',
      sortOrder: 50,
    },
  ],
} satisfies PromptModuleAssetDefinition
