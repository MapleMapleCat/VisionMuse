import type { PromptTemplate } from '@/types'

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  { id: 'tpl-1', title: '电影感人像', content: '{{主体}}的电影感人像，{{光线}}，35mm 胶片质感，浅景深，柯达 Portra 400 色调', category: '摄影', useCount: 0 },
  { id: 'tpl-2', title: '国风水墨', content: '水墨画风格的{{主体}}，留白意境，淡墨渲染，宣纸纹理，落款印章', category: '国风', useCount: 0 },
  { id: 'tpl-3', title: '产品广告图', content: '{{产品}}的商业广告摄影，{{背景色}}纯色背景，柔和棚拍光，倒影地面，高级质感', category: '商业', useCount: 0 },
  { id: 'tpl-4', title: '吉卜力场景', content: '吉卜力动画风格的{{场景}}，手绘水彩质感，云朵蓬松，色彩温暖治愈', category: '插画', useCount: 0 },
  { id: 'tpl-5', title: '赛博朋克街景', content: '赛博朋克风格的{{地点}}，霓虹灯牌，雨夜反光路面，蒸汽，电影级打光，广角镜头', category: '科幻', useCount: 0 },
  { id: 'tpl-6', title: '等距小场景', content: '等距视角的迷你{{场景}}立体模型，3D 渲染，柔和环境光，粘土质感，细节丰富', category: '3D', useCount: 0 },
  { id: 'tpl-7', title: '美食特写', content: '{{食物}}的美食摄影特写，热气蒸腾，侧逆光，木质餐桌，景深虚化背景', category: '摄影', useCount: 0 },
  { id: 'tpl-8', title: '扁平插画', content: '{{主题}}的扁平风格插画，几何形状，明快撞色，噪点纹理，杂志封面构图', category: '插画', useCount: 0 },
]
