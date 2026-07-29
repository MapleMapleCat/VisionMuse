import type { PromptModule, PromptModuleCategory } from '@/types'

export interface PromptModuleCategoryDefinition {
  key: PromptModuleCategory
  label: string
  description: string
  selectionMode: 'single' | 'multiple'
  maxSelections: number
}

export const PROMPT_MODULE_CATEGORIES: PromptModuleCategoryDefinition[] = [
  { key: 'subject', label: '人物', description: '只定义人物数量或入镜方式', selectionMode: 'single', maxSelections: 1 },
  { key: 'pose', label: '动作', description: '只定义身体动作，不包含表情', selectionMode: 'single', maxSelections: 1 },
  { key: 'expression', label: '表情与视线', description: '可组合一个表情和一个视线方向', selectionMode: 'multiple', maxSelections: 2 },
  { key: 'environment', label: '场景', description: '只定义人物或主体所在的环境', selectionMode: 'single', maxSelections: 1 },
  { key: 'shot', label: '景别', description: '决定画面收录主体的范围', selectionMode: 'single', maxSelections: 1 },
  { key: 'angle', label: '视角', description: '决定摄影机相对于主体的位置', selectionMode: 'single', maxSelections: 1 },
  { key: 'lens', label: '镜头', description: '只定义焦段与透视特征', selectionMode: 'single', maxSelections: 1 },
  { key: 'composition', label: '构图', description: '只定义画面元素的组织方式', selectionMode: 'single', maxSelections: 1 },
  { key: 'lighting', label: '光线', description: '只定义主要照明方式', selectionMode: 'single', maxSelections: 1 },
  { key: 'style', label: '风格媒介', description: '只定义最终画面的表现媒介', selectionMode: 'single', maxSelections: 1 },
  { key: 'color', label: '色彩', description: '只定义整体配色倾向', selectionMode: 'single', maxSelections: 1 },
  { key: 'detail', label: '质感', description: '可组合最多两种表面或完成度特征', selectionMode: 'multiple', maxSelections: 2 },
]

export const DEFAULT_PROMPT_MODULES: PromptModule[] = [
  { id: 'module-subject-single', title: '单人', content: '单人主体', category: 'subject', useCount: 0, sortOrder: 10 },
  { id: 'module-subject-pair', title: '双人', content: '两人同框', category: 'subject', useCount: 0, sortOrder: 20 },
  { id: 'module-subject-group', title: '小型群像', content: '三到五人小型群像', category: 'subject', useCount: 0, sortOrder: 30 },
  { id: 'module-subject-back', title: '人物背影', content: '人物背影入镜', category: 'subject', useCount: 0, sortOrder: 40 },
  { id: 'module-subject-hands', title: '仅手部', content: '仅手部入镜', category: 'subject', useCount: 0, sortOrder: 50 },

  { id: 'module-pose-standing', title: '站立', content: '自然站立', category: 'pose', useCount: 0, sortOrder: 10 },
  { id: 'module-pose-seated', title: '坐姿', content: '自然坐姿', category: 'pose', useCount: 0, sortOrder: 20 },
  { id: 'module-pose-walking', title: '行走', content: '行走中', category: 'pose', useCount: 0, sortOrder: 30 },
  { id: 'module-pose-running', title: '奔跑', content: '奔跑中', category: 'pose', useCount: 0, sortOrder: 40 },
  { id: 'module-pose-turning', title: '回头', content: '侧身回头', category: 'pose', useCount: 0, sortOrder: 50 },

  { id: 'module-expression-camera', title: '直视镜头', content: '直视镜头', category: 'expression', useCount: 0, sortOrder: 10 },
  { id: 'module-expression-offscreen', title: '看向画外', content: '视线看向画外', category: 'expression', useCount: 0, sortOrder: 20 },
  { id: 'module-expression-calm', title: '平静', content: '神情平静', category: 'expression', useCount: 0, sortOrder: 30 },
  { id: 'module-expression-smile', title: '微笑', content: '轻微微笑', category: 'expression', useCount: 0, sortOrder: 40 },
  { id: 'module-expression-serious', title: '严肃', content: '神情严肃', category: 'expression', useCount: 0, sortOrder: 50 },

  { id: 'module-environment-studio', title: '极简影棚', content: '极简影棚', category: 'environment', useCount: 0, sortOrder: 10 },
  { id: 'module-environment-interior', title: '窗边室内', content: '窗边室内空间', category: 'environment', useCount: 0, sortOrder: 20 },
  { id: 'module-environment-city', title: '城市街道', content: '城市街道', category: 'environment', useCount: 0, sortOrder: 30 },
  { id: 'module-environment-nature', title: '自然旷野', content: '开阔自然旷野', category: 'environment', useCount: 0, sortOrder: 40 },
  { id: 'module-environment-rain', title: '雨夜街巷', content: '雨夜街巷', category: 'environment', useCount: 0, sortOrder: 50 },

  { id: 'module-shot-closeup', title: '面部特写', content: '面部特写', category: 'shot', useCount: 0, sortOrder: 10 },
  { id: 'module-shot-bust', title: '半身', content: '半身景别', category: 'shot', useCount: 0, sortOrder: 20 },
  { id: 'module-shot-medium', title: '中景', content: '中景景别', category: 'shot', useCount: 0, sortOrder: 30 },
  { id: 'module-shot-full', title: '全身', content: '全身景别', category: 'shot', useCount: 0, sortOrder: 40 },
  { id: 'module-shot-wide', title: '环境远景', content: '环境远景', category: 'shot', useCount: 0, sortOrder: 50 },

  { id: 'module-angle-eye', title: '平视', content: '平视视角', category: 'angle', useCount: 0, sortOrder: 10 },
  { id: 'module-angle-low', title: '低机位', content: '低机位仰视', category: 'angle', useCount: 0, sortOrder: 20 },
  { id: 'module-angle-high', title: '高机位', content: '高机位俯视', category: 'angle', useCount: 0, sortOrder: 30 },
  { id: 'module-angle-overhead', title: '正上方俯拍', content: '正上方俯拍', category: 'angle', useCount: 0, sortOrder: 40 },
  { id: 'module-angle-shoulder', title: '过肩视角', content: '过肩视角', category: 'angle', useCount: 0, sortOrder: 50 },

  { id: 'module-lens-24mm', title: '24mm 广角', content: '24mm 广角镜头', category: 'lens', useCount: 0, sortOrder: 10 },
  { id: 'module-lens-35mm', title: '35mm', content: '35mm 镜头', category: 'lens', useCount: 0, sortOrder: 20 },
  { id: 'module-lens-50mm', title: '50mm 标准', content: '50mm 标准镜头', category: 'lens', useCount: 0, sortOrder: 30 },
  { id: 'module-lens-85mm', title: '85mm 人像', content: '85mm 人像镜头', category: 'lens', useCount: 0, sortOrder: 40 },
  { id: 'module-lens-telephoto', title: '长焦压缩', content: '长焦镜头压缩空间', category: 'lens', useCount: 0, sortOrder: 50 },

  { id: 'module-composition-thirds', title: '三分法', content: '三分法构图', category: 'composition', useCount: 0, sortOrder: 10 },
  { id: 'module-composition-centered', title: '中心构图', content: '中心构图', category: 'composition', useCount: 0, sortOrder: 20 },
  { id: 'module-composition-symmetry', title: '对称构图', content: '对称构图', category: 'composition', useCount: 0, sortOrder: 30 },
  { id: 'module-composition-diagonal', title: '对角线构图', content: '对角线构图', category: 'composition', useCount: 0, sortOrder: 40 },
  { id: 'module-composition-negative', title: '大面积留白', content: '大面积负空间留白', category: 'composition', useCount: 0, sortOrder: 50 },

  { id: 'module-lighting-window', title: '柔和窗光', content: '柔和自然窗光', category: 'lighting', useCount: 0, sortOrder: 10 },
  { id: 'module-lighting-backlight', title: '侧逆光', content: '侧逆光', category: 'lighting', useCount: 0, sortOrder: 20 },
  { id: 'module-lighting-studio', title: '棚拍布光', content: '专业棚拍布光', category: 'lighting', useCount: 0, sortOrder: 30 },
  { id: 'module-lighting-neon', title: '霓虹光', content: '霓虹灯光', category: 'lighting', useCount: 0, sortOrder: 40 },
  { id: 'module-lighting-dramatic', title: '戏剧聚光', content: '戏剧化局部聚光', category: 'lighting', useCount: 0, sortOrder: 50 },

  { id: 'module-style-photorealistic', title: '真实摄影', content: '真实摄影风格', category: 'style', useCount: 0, sortOrder: 10 },
  { id: 'module-style-cinematic', title: '电影摄影', content: '电影摄影风格', category: 'style', useCount: 0, sortOrder: 20 },
  { id: 'module-style-editorial', title: '杂志摄影', content: '杂志编辑摄影风格', category: 'style', useCount: 0, sortOrder: 30 },
  { id: 'module-style-ink', title: '东方水墨', content: '东方水墨画风格', category: 'style', useCount: 0, sortOrder: 40 },
  { id: 'module-style-flat', title: '扁平插画', content: '现代扁平插画风格', category: 'style', useCount: 0, sortOrder: 50 },
  { id: 'module-style-clay', title: '粘土 3D', content: '粘土质感 3D 渲染', category: 'style', useCount: 0, sortOrder: 60 },

  { id: 'module-color-natural', title: '自然色彩', content: '自然色彩', category: 'color', useCount: 0, sortOrder: 10 },
  { id: 'module-color-warm', title: '低饱和暖调', content: '低饱和暖色调', category: 'color', useCount: 0, sortOrder: 20 },
  { id: 'module-color-cool', title: '冷调', content: '低饱和冷色调', category: 'color', useCount: 0, sortOrder: 30 },
  { id: 'module-color-vivid', title: '高饱和撞色', content: '高饱和撞色', category: 'color', useCount: 0, sortOrder: 40 },
  { id: 'module-color-monochrome', title: '单色', content: '单色配色', category: 'color', useCount: 0, sortOrder: 50 },

  { id: 'module-detail-realistic', title: '真实材质', content: '真实材质', category: 'detail', useCount: 0, sortOrder: 10 },
  { id: 'module-detail-skin', title: '皮肤纹理', content: '自然皮肤纹理', category: 'detail', useCount: 0, sortOrder: 20 },
  { id: 'module-detail-grain', title: '细颗粒', content: '细腻颗粒纹理', category: 'detail', useCount: 0, sortOrder: 30 },
  { id: 'module-detail-minimal', title: '简洁克制', content: '减少无关细节', category: 'detail', useCount: 0, sortOrder: 40 },
  { id: 'module-detail-polished', title: '高完成度', content: '高完成度', category: 'detail', useCount: 0, sortOrder: 50 },
]
