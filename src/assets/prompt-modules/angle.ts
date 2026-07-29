import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'angle',
    label: '视角',
    description: '短名称用于选择，实际组合时注入明确机位关系',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-angle-eye',
      label: '平视',
      prompt: '摄影机与主体主要视觉中心保持同一高度，以自然平视角度拍摄，避免明显俯视或仰视变形',
      sortOrder: 10,
    },
    {
      id: 'module-angle-low',
      label: '低机位',
      prompt: '摄影机位于主体视觉中心下方并向上拍摄，形成明确仰视关系，强化主体的高度与力量感',
      sortOrder: 20,
    },
    {
      id: 'module-angle-high',
      label: '高机位',
      prompt: '摄影机位于主体视觉中心上方并向下拍摄，形成明确俯视关系，同时保持主体结构可辨',
      sortOrder: 30,
    },
    {
      id: 'module-angle-overhead',
      label: '正上方俯拍',
      prompt: '摄影机位于场景正上方并垂直向下拍摄，以近九十度顶视角清楚呈现平面位置关系',
      sortOrder: 40,
    },
    {
      id: 'module-angle-shoulder',
      label: '过肩视角',
      prompt: '摄影机从前景人物肩后拍摄，前景保留局部肩部轮廓，焦点落在对面主体并形成对话关系',
      sortOrder: 50,
    },
  ],
} satisfies PromptModuleAssetDefinition
