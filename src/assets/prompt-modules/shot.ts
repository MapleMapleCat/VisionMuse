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
    {
      id: 'module-shot-extreme-closeup',
      label: '极近特写',
      prompt: '采用极近特写景别，只截取主体一个微小关键区域，使该区域充满画面，并允许其外缘超出取景边界',
      sortOrder: 60,
    },
    {
      id: 'module-shot-detail',
      label: '局部特写',
      prompt: '采用局部特写景别，完整纳入主体的一个关键部件及其连接处，主体其余部分明确留在画外',
      sortOrder: 70,
    },
    {
      id: 'module-shot-near',
      label: '近景',
      prompt: '采用近景景别，人物取至胸口附近；非人物主体仅保留上部或核心区域，不呈现完整外轮廓',
      sortOrder: 80,
    },
    {
      id: 'module-shot-three-quarter',
      label: '四分之三身',
      prompt: '采用四分之三身景别，人物从头部取至大腿中段，保留手臂动作，并明确裁去膝部以下',
      sortOrder: 90,
    },
    {
      id: 'module-shot-calf',
      label: '小腿景',
      prompt: '采用小腿景景别，人物从头部取至小腿下段，脚踝与足部留在画外，身体主体接近完整',
      sortOrder: 100,
    },
    {
      id: 'module-shot-tight-full',
      label: '紧凑全貌',
      prompt: '采用紧凑全貌景别，将主体完整外轮廓全部收入画面，主体高度或宽度约占画面八成',
      sortOrder: 110,
    },
    {
      id: 'module-shot-loose-full',
      label: '宽松全貌',
      prompt: '采用宽松全貌景别，完整保留主体各侧边界，使主体约占画面一半，并纳入邻近空间范围',
      sortOrder: 120,
    },
    {
      id: 'module-shot-group-full',
      label: '群体全貌',
      prompt: '采用群体全貌景别，将全部成员及群体整体边界完整收入画面，任何成员的头脚或外缘均不裁切',
      sortOrder: 130,
    },
    {
      id: 'module-shot-upper-section',
      label: '上段局部',
      prompt: '采用上段局部景别，只截取主体纵向上部约三分之一，保留顶端边界，并在中段明确结束取景',
      sortOrder: 140,
    },
    {
      id: 'module-shot-middle-section',
      label: '中段局部',
      prompt: '采用中段局部景别，只截取主体纵向中央区域，主体顶端与底端均位于画外，突出中部结构关系',
      sortOrder: 150,
    },
    {
      id: 'module-shot-lower-section',
      label: '下段局部',
      prompt: '采用下段局部景别，只截取主体纵向下部约三分之一，保留底端边界，并从中段开始取景',
      sortOrder: 160,
    },
    {
      id: 'module-shot-horizontal-full',
      label: '横向全貌',
      prompt: '采用横向全貌景别，将横向延展主体从最左端至最右端完整收入画面，上下仅保留必要边界',
      sortOrder: 170,
    },
    {
      id: 'module-shot-vertical-full',
      label: '纵向全貌',
      prompt: '采用纵向全貌景别，将纵向延展主体从最高点至最低点完整收入画面，左右仅保留必要边界',
      sortOrder: 180,
    },
  ],
} satisfies PromptModuleAssetDefinition
