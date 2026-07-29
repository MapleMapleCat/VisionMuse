import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'expression',
    label: '表情与视线',
    description: '可组合一个表情和一个视线方向，实际注入完整面部指令',
    selectionMode: 'multiple',
    maxSelections: 2,
  },
  modules: [
    {
      id: 'module-expression-camera',
      label: '直视镜头',
      prompt: '人物双眼目光明确对准镜头，与观看者建立直接视觉联系，双眼方向保持一致',
      sortOrder: 10,
      selectionGroup: 'gaze',
    },
    {
      id: 'module-expression-offscreen',
      label: '看向画外',
      prompt: '人物目光自然投向画面之外，视线方向清晰统一，不与镜头发生直接对视',
      sortOrder: 20,
      selectionGroup: 'gaze',
    },
    {
      id: 'module-expression-calm',
      label: '平静',
      prompt: '人物保持平静克制的面部神情，眉眼放松、嘴角自然，不表现夸张情绪',
      sortOrder: 30,
      selectionGroup: 'emotion',
    },
    {
      id: 'module-expression-smile',
      label: '轻微微笑',
      prompt: '人物呈现自然且轻微的微笑，嘴角小幅上扬，眼神柔和，避免僵硬或过度夸张',
      sortOrder: 40,
      selectionGroup: 'emotion',
    },
    {
      id: 'module-expression-serious',
      label: '严肃',
      prompt: '人物呈现专注严肃的面部神情，眉眼收敛、嘴唇自然闭合，情绪明确但不过度愤怒',
      sortOrder: 50,
      selectionGroup: 'emotion',
    },
  ],
} satisfies PromptModuleAssetDefinition
