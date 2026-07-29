import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'shot',
    label: '景别',
    description: '短名称用于选择，实际组合时注入明确取景范围',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-shot-closeup',
      label: '面部特写',
      prompt: '采用面部特写景别，画面主要覆盖头部与少量肩部，面部五官和神情成为绝对视觉重点',
      sortOrder: 10,
    },
    {
      id: 'module-shot-bust',
      label: '半身',
      prompt: '采用半身景别，画面从人物头部延伸至腰部附近，完整保留上半身动作与手臂关系',
      sortOrder: 20,
    },
    {
      id: 'module-shot-medium',
      label: '中景',
      prompt: '采用中景景别，画面从人物头部延伸至膝部附近，同时清楚呈现人物动作和部分环境',
      sortOrder: 30,
    },
    {
      id: 'module-shot-full',
      label: '全身',
      prompt: '采用全身景别，人物从头到脚完整入镜，脚部不被裁切，并保留适量周围空间',
      sortOrder: 40,
    },
    {
      id: 'module-shot-wide',
      label: '环境远景',
      prompt: '采用环境远景，主体在画面中占比较小，以完整环境规模、空间关系和整体氛围为重点',
      sortOrder: 50,
    },
  ],
} satisfies PromptModuleAssetDefinition
