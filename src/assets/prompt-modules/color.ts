import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'color',
    label: '色彩',
    description: '短名称用于选择，实际组合时注入完整配色与色调约束',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-color-natural',
      label: '自然色彩',
      prompt: '采用接近真实环境观感的自然色彩，白平衡准确，物体固有色与材质颜色可信，避免明显偏色',
      sortOrder: 10,
    },
    {
      id: 'module-color-warm',
      label: '低饱和暖调',
      prompt: '采用低饱和暖色调，以柔和米色、棕色和暖灰为主，控制色彩浓度并保持层次清晰',
      sortOrder: 20,
    },
    {
      id: 'module-color-cool',
      label: '低饱和冷调',
      prompt: '采用低饱和冷色调，以蓝灰、青灰和中性暗色为主，保持克制、统一且不过度偏蓝',
      sortOrder: 30,
    },
    {
      id: 'module-color-vivid',
      label: '高饱和撞色',
      prompt: '采用高饱和对比配色，以两至三种明确互补色形成视觉冲击，同时保持主体层级和颜色边界清楚',
      sortOrder: 40,
    },
    {
      id: 'module-color-monochrome',
      label: '单色',
      prompt: '采用统一单色体系，通过同一色相的明度与饱和度变化建立层次，避免混入明显竞争色',
      sortOrder: 50,
    },
    {
      id: 'module-color-grayscale',
      label: '黑白灰阶',
      prompt: '仅使用黑、白与中性灰，饱和度降为零，通过从深黑到亮白的完整明度阶梯区分层次',
      sortOrder: 60,
    },
    {
      id: 'module-color-pastel',
      label: '浅色粉彩',
      prompt: '以浅粉、淡蓝和柔黄为主，饱和度控制在低至中等范围，整体明度偏高且色差柔和',
      sortOrder: 70,
    },
    {
      id: 'module-color-earth',
      label: '大地色系',
      prompt: '以赭石、陶土、橄榄绿和沙褐为主，保持中低饱和度与中等明度，冷色仅作少量平衡',
      sortOrder: 80,
    },
    {
      id: 'module-color-jewel',
      label: '宝石深彩',
      prompt: '以宝石红、深蓝和祖母绿为主，保持高饱和度与中低明度，并以少量暗中性色稳定画面',
      sortOrder: 90,
    },
    {
      id: 'module-color-primary-triad',
      label: '三原配色',
      prompt: '使用红、黄、蓝三元配色，三种色相面积形成明确主次，饱和度中高、明度彼此拉开',
      sortOrder: 100,
    },
    {
      id: 'module-color-split-complementary',
      label: '分裂互补',
      prompt: '选择一个主色相，并使用其互补色两侧的邻近色作辅色，主辅面积约为六比三比一',
      sortOrder: 110,
    },
    {
      id: 'module-color-cyan-analogous',
      label: '青绿邻近',
      prompt: '限定在蓝、青与蓝绿色的邻近色区间，采用中等饱和度与递进明度，避免引入暖色竞争',
      sortOrder: 120,
    },
    {
      id: 'module-color-purple-yellow',
      label: '紫黄互补',
      prompt: '以紫色与黄色构成互补关系，紫色占主要面积，黄色控制在两成以内，二者饱和度中等',
      sortOrder: 130,
    },
    {
      id: 'module-color-red-cyan',
      label: '红青双色',
      prompt: '以红色和青色建立双极配色，保持相近饱和度并拉开明度差，用中性灰缓冲交界',
      sortOrder: 140,
    },
    {
      id: 'module-color-high-luminance',
      label: '高明低彩',
      prompt: '整体采用高明度、低饱和配色，最暗区域不低于中灰，依靠细微明度差而非浓色分层',
      sortOrder: 150,
    },
    {
      id: 'module-color-low-luminance',
      label: '低明浓彩',
      prompt: '整体采用低明度、中高饱和配色，亮色面积控制在一成以内，以深色层级维持可读性',
      sortOrder: 160,
    },
    {
      id: 'module-color-neutral-accent',
      label: '中性点缀',
      prompt: '画面八成以上使用黑白灰与低彩中性色，仅保留一种高饱和点缀色集中于关键区域',
      sortOrder: 170,
    },
  ],
} satisfies PromptModuleAssetDefinition
