import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'pose',
    label: '动作',
    description: '短名称用于选择，实际组合时注入完整动作约束',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-pose-standing',
      label: '站立',
      prompt: '人物保持自然站立姿态，身体重心稳定，肩颈放松，四肢位置符合真实人体结构',
      sortOrder: 10,
    },
    {
      id: 'module-pose-seated',
      label: '坐姿',
      prompt: '人物以自然坐姿呈现，躯干与座面关系明确，重心合理，手脚摆放放松且符合人体结构',
      sortOrder: 20,
    },
    {
      id: 'module-pose-walking',
      label: '行走',
      prompt: '捕捉人物正在自然行走的瞬间，前后脚步态清晰，手臂摆动与身体重心变化协调',
      sortOrder: 30,
    },
    {
      id: 'module-pose-running',
      label: '奔跑',
      prompt: '捕捉人物正在奔跑的动态瞬间，躯干前倾、四肢发力与衣物惯性共同体现速度感',
      sortOrder: 40,
    },
    {
      id: 'module-pose-turning',
      label: '侧身回头',
      prompt: '人物身体朝向一侧并自然回头，肩部、颈部与头部转动关系连贯，避免不合理扭曲',
      sortOrder: 50,
    },
  ],
} satisfies PromptModuleAssetDefinition
