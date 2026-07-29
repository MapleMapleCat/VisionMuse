import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'subject',
    label: '主体',
    description: '定义主体数量、类型或入镜方式',
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
      prompt: '人物以背对镜头的方式入镜，面部不可见，头部、肩部与躯干朝向保持一致且轮廓清楚',
      sortOrder: 40,
    },
    {
      id: 'module-subject-hands',
      label: '仅手部',
      prompt: '画面仅展示人物手部与手腕区域，不出现面部或躯干，手指数量与关节结构必须自然准确',
      sortOrder: 50,
    },
    {
      id: 'module-subject-crowd',
      label: '大型群像',
      prompt: '画面中安排六位以上人物形成大型群像，个体分布彼此分离，前后遮挡关系清楚',
      sortOrder: 60,
    },
    {
      id: 'module-subject-front-facing',
      label: '正面入镜',
      prompt: '主体正面朝向镜头所在方向，左右结构近似对称，主要识别特征完整可见',
      sortOrder: 70,
    },
    {
      id: 'module-subject-profile',
      label: '侧面入镜',
      prompt: '主体以严格九十度侧面朝向入镜，仅呈现一侧轮廓，避免出现近似正面的双侧特征',
      sortOrder: 80,
    },
    {
      id: 'module-subject-three-quarter',
      label: '三分侧面',
      prompt: '主体相对镜头旋转约三十至四十五度，同时保留正面结构与一侧轮廓特征',
      sortOrder: 90,
    },
    {
      id: 'module-subject-face-obscured',
      label: '遮面入镜',
      prompt: '主体的面部或核心识别区域被完全遮住，仅通过外轮廓与可见局部保留身份线索',
      sortOrder: 100,
    },
    {
      id: 'module-subject-edge-entry',
      label: '边缘入镜',
      prompt: '主体从画面边缘部分进入，仅保留明确可辨的局部，未入镜部分自然延伸至画框之外',
      sortOrder: 110,
    },
    {
      id: 'module-subject-feet-only',
      label: '仅脚部',
      prompt: '画面仅展示人物双脚及脚踝区域，不出现上半身，双脚数量、朝向与承重关系准确',
      sortOrder: 120,
    },
    {
      id: 'module-subject-animal',
      label: '动物主体',
      prompt: '以动物作为主要视觉主体，物种形态与肢体结构清晰，不将其转换为人类外观',
      sortOrder: 130,
    },
    {
      id: 'module-subject-object',
      label: '物件主体',
      prompt: '以物品作为主要视觉主体，不安排人物抢占主体地位，物体外形与部件关系明确',
      sortOrder: 140,
    },
    {
      id: 'module-subject-plant',
      label: '植物主体',
      prompt: '以植物作为主要视觉主体，枝干、叶片或花朵从属关系明确，不出现拟人化肢体',
      sortOrder: 150,
    },
    {
      id: 'module-subject-architecture',
      label: '建筑主体',
      prompt: '以建筑体作为主要视觉主体，主体轮廓完整可读，结构轴线与体块关系保持一致',
      sortOrder: 160,
    },
    {
      id: 'module-subject-creature',
      label: '虚构生物',
      prompt: '以虚构生物作为主要视觉主体，固定其物种特征、肢体数量与身体连接方式',
      sortOrder: 170,
    },
  ],
} satisfies PromptModuleAssetDefinition
