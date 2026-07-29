import type {
  PromptTemplateCategoryId,
  PromptTemplateMedium,
  PromptTemplateStyleId,
} from '@/types'

export interface PromptTemplateTaxonomyItem<Value extends string> {
  id: Value
  label: string
  description: string
}

export const PROMPT_TEMPLATE_SCHEMA_VERSION = 2

export const PROMPT_TEMPLATE_CATEGORIES: PromptTemplateTaxonomyItem<PromptTemplateCategoryId>[] = [
  { id: 'people-characters', label: '人物与角色', description: '肖像、写真、时尚与角色设定' },
  { id: 'products-brands', label: '商品与品牌', description: '产品广告、电商与品牌主视觉' },
  { id: 'food-still-life', label: '美食与静物', description: '食物、饮品、器物与静物创作' },
  { id: 'spaces-architecture', label: '空间与建筑', description: '室内、建筑、城市与微缩空间' },
  { id: 'landscapes-nature', label: '风景与自然', description: '山水、地貌、天气与自然生态' },
  { id: 'narrative-worldbuilding', label: '叙事与世界观', description: '电影场面、科幻、奇幻与动画叙事' },
  { id: 'graphic-communication', label: '平面与传播', description: '海报、封面、社媒与编辑设计' },
  { id: 'experimental-abstract', label: '实验与抽象', description: '超现实、抽象几何与材质实验' },
]

export const PROMPT_TEMPLATE_MEDIA: PromptTemplateTaxonomyItem<PromptTemplateMedium>[] = [
  { id: 'photography', label: '摄影', description: '真实相机、布光与光学成像语言' },
  { id: 'illustration', label: '插画', description: '手绘、绘画与叙事插画语言' },
  { id: 'three-dimensional', label: '3D', description: '三维建模、材质与渲染语言' },
  { id: 'graphic-design', label: '平面设计', description: '版式、字体与传播视觉语言' },
]

export const PROMPT_TEMPLATE_STYLES: PromptTemplateTaxonomyItem<PromptTemplateStyleId>[] = [
  { id: 'realistic', label: '写实', description: '符合真实结构、材质与成像规律' },
  { id: 'cinematic', label: '电影感', description: '强调叙事光线与电影画面层次' },
  { id: 'editorial', label: '编辑设计', description: '具有杂志与编辑出版气质' },
  { id: 'commercial', label: '高级商业', description: '适合广告和品牌传播的完成度' },
  { id: 'minimal', label: '极简', description: '减少元素并强调秩序与留白' },
  { id: 'oriental', label: '国风', description: '采用东方绘画、审美与空间意境' },
  { id: 'science-fiction', label: '科幻', description: '未来技术、城市与工业想象' },
  { id: 'fantasy', label: '奇幻', description: '非现实生物、遗迹与魔法世界' },
  { id: 'healing', label: '治愈', description: '温暖、柔和且具有亲近感' },
  { id: 'retro', label: '复古', description: '历史媒介、年代色彩与旧印刷气质' },
  { id: 'miniature', label: '微缩模型', description: '小比例模型、等距与玩具化空间' },
  { id: 'surreal', label: '超现实', description: '现实元素之间形成不可能关系' },
  { id: 'abstract', label: '抽象', description: '由形状、颜色、节奏和材质主导' },
  { id: 'luxury', label: '奢华', description: '精致材质、克制装饰与高端气质' },
  { id: 'natural', label: '自然', description: '保留有机变化、环境感与真实触感' },
  { id: 'typographic', label: '字体排版', description: '以文字层级和版式结构为核心' },
]

export const PROMPT_TEMPLATE_CATEGORY_IDS = PROMPT_TEMPLATE_CATEGORIES.map(category => category.id)
export const PROMPT_TEMPLATE_MEDIUM_IDS = PROMPT_TEMPLATE_MEDIA.map(medium => medium.id)
export const PROMPT_TEMPLATE_STYLE_IDS = PROMPT_TEMPLATE_STYLES.map(style => style.id)

export const PROMPT_TEMPLATE_CATEGORY_BY_ID = new Map(
  PROMPT_TEMPLATE_CATEGORIES.map(category => [category.id, category]),
)
export const PROMPT_TEMPLATE_MEDIUM_BY_ID = new Map(
  PROMPT_TEMPLATE_MEDIA.map(medium => [medium.id, medium]),
)
export const PROMPT_TEMPLATE_STYLE_BY_ID = new Map(
  PROMPT_TEMPLATE_STYLES.map(style => [style.id, style]),
)
