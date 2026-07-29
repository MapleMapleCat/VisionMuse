import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'subject',
    label: '人物',
    description: '短名称用于选择，实际组合时注入完整人物约束',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-subject-single',
      label: '单人',
      prompt: '画面中仅保留一个清晰、完整且可辨识的主要人物，不出现重复人物或无关人物',
      sortOrder: 10,
    },
    {
      id: 'module-subject-pair',
      label: '双人',
      prompt: '画面中安排两位主要人物共同入镜，确保二者身份清晰、比例自然且互动关系可读',
      sortOrder: 20,
    },
    {
      id: 'module-subject-group',
      label: '小型群像',
      prompt: '画面中安排三至五位人物组成小型群像，每个人物轮廓可辨且前后层次清楚',
      sortOrder: 30,
    },
    {
      id: 'module-subject-back',
      label: '人物背影',
      prompt: '人物以背对镜头的方式入镜，面部不可见，通过轮廓、姿态和环境关系表达身份与情绪',
      sortOrder: 40,
    },
    {
      id: 'module-subject-hands',
      label: '仅手部',
      prompt: '画面仅展示人物手部及其正在接触的对象，手指数量、关节结构和动作关系必须自然准确',
      sortOrder: 50,
    },
  ],
} satisfies PromptModuleAssetDefinition
