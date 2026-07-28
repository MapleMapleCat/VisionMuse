import type { PromptModule, PromptModuleCategory } from '@/types'

export interface PromptModuleCategoryDefinition {
  key: PromptModuleCategory
  label: string
  description: string
}

export const PROMPT_MODULE_CATEGORIES: PromptModuleCategoryDefinition[] = [
  { key: 'style', label: '风格媒介', description: '决定画面的整体表达方式' },
  { key: 'composition', label: '构图镜头', description: '安排主体位置与观看视角' },
  { key: 'lighting', label: '光线', description: '塑造明暗关系与空间层次' },
  { key: 'environment', label: '场景氛围', description: '补充背景与环境语境' },
  { key: 'color', label: '色彩情绪', description: '统一配色和情感倾向' },
  { key: 'detail', label: '细节质感', description: '控制材质、纹理与完成度' },
]

export const DEFAULT_PROMPT_MODULES: PromptModule[] = [
  { id: 'module-style-cinematic', title: '电影摄影', content: '电影感摄影，35mm 胶片质感', category: 'style', useCount: 0, sortOrder: 10 },
  { id: 'module-style-editorial', title: '杂志摄影', content: '高端杂志编辑摄影风格', category: 'style', useCount: 0, sortOrder: 20 },
  { id: 'module-style-ink', title: '东方水墨', content: '东方水墨画风格，宣纸晕染', category: 'style', useCount: 0, sortOrder: 30 },
  { id: 'module-style-flat', title: '扁平插画', content: '现代扁平插画风格，几何化造型', category: 'style', useCount: 0, sortOrder: 40 },
  { id: 'module-style-clay', title: '粘土 3D', content: '精致粘土质感的 3D 渲染', category: 'style', useCount: 0, sortOrder: 50 },

  { id: 'module-composition-thirds', title: '三分法', content: '三分法构图，视觉重心明确', category: 'composition', useCount: 0, sortOrder: 10 },
  { id: 'module-composition-centered', title: '中心特写', content: '中心构图，近距离特写', category: 'composition', useCount: 0, sortOrder: 20 },
  { id: 'module-composition-wide', title: '环境广角', content: '广角环境构图，空间纵深明显', category: 'composition', useCount: 0, sortOrder: 30 },
  { id: 'module-composition-overhead', title: '俯拍平铺', content: '正上方俯拍，秩序感平铺构图', category: 'composition', useCount: 0, sortOrder: 40 },
  { id: 'module-composition-isometric', title: '等距视角', content: '等距视角，微缩场景构图', category: 'composition', useCount: 0, sortOrder: 50 },

  { id: 'module-lighting-window', title: '柔和窗光', content: '柔和自然窗光，细腻明暗过渡', category: 'lighting', useCount: 0, sortOrder: 10 },
  { id: 'module-lighting-backlight', title: '金色逆光', content: '金色侧逆光，清晰轮廓光', category: 'lighting', useCount: 0, sortOrder: 20 },
  { id: 'module-lighting-studio', title: '棚拍布光', content: '专业棚拍布光，柔和阴影', category: 'lighting', useCount: 0, sortOrder: 30 },
  { id: 'module-lighting-neon', title: '霓虹光影', content: '霓虹灯光交错，湿润反射', category: 'lighting', useCount: 0, sortOrder: 40 },
  { id: 'module-lighting-dramatic', title: '戏剧明暗', content: '戏剧化明暗对比，局部聚光', category: 'lighting', useCount: 0, sortOrder: 50 },

  { id: 'module-environment-studio', title: '极简影棚', content: '极简影棚背景，画面干净', category: 'environment', useCount: 0, sortOrder: 10 },
  { id: 'module-environment-nature', title: '自然户外', content: '开阔自然环境，空气感通透', category: 'environment', useCount: 0, sortOrder: 20 },
  { id: 'module-environment-city', title: '城市街道', content: '具有生活细节的城市街道背景', category: 'environment', useCount: 0, sortOrder: 30 },
  { id: 'module-environment-dream', title: '梦境空间', content: '超现实梦境空间，漂浮元素', category: 'environment', useCount: 0, sortOrder: 40 },
  { id: 'module-environment-paper', title: '纸张留白', content: '大面积纸张留白，安静克制', category: 'environment', useCount: 0, sortOrder: 50 },

  { id: 'module-color-natural', title: '自然色彩', content: '自然真实的色彩，白平衡准确', category: 'color', useCount: 0, sortOrder: 10 },
  { id: 'module-color-warm', title: '低饱和暖调', content: '低饱和暖色调，温柔平静', category: 'color', useCount: 0, sortOrder: 20 },
  { id: 'module-color-cool', title: '冷调胶片', content: '冷调胶片配色，克制疏离', category: 'color', useCount: 0, sortOrder: 30 },
  { id: 'module-color-vivid', title: '明快撞色', content: '明快高饱和撞色，视觉冲击强', category: 'color', useCount: 0, sortOrder: 40 },
  { id: 'module-color-monochrome', title: '单色层次', content: '统一单色体系，丰富明度层次', category: 'color', useCount: 0, sortOrder: 50 },

  { id: 'module-detail-realistic', title: '真实细节', content: '细节丰富，真实材质与细腻纹理', category: 'detail', useCount: 0, sortOrder: 10 },
  { id: 'module-detail-product', title: '精致材质', content: '材质表现精确，边缘干净，质感高级', category: 'detail', useCount: 0, sortOrder: 20 },
  { id: 'module-detail-grain', title: '印刷颗粒', content: '细腻印刷颗粒与轻微纸张纹理', category: 'detail', useCount: 0, sortOrder: 30 },
  { id: 'module-detail-minimal', title: '简洁克制', content: '减少无关元素，视觉语言简洁克制', category: 'detail', useCount: 0, sortOrder: 40 },
  { id: 'module-detail-polished', title: '高完成度', content: '高完成度，结构准确，细节清晰', category: 'detail', useCount: 0, sortOrder: 50 },
]
