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
      label: '自然白平衡',
      prompt: '采用中性自然白平衡，使灰色保持中性，物体固有色与材质颜色可信，不增加整体冷暖偏移',
      sortOrder: 10,
    },
    {
      id: 'module-color-warm',
      label: '暖色倾向',
      prompt: '让整体白平衡和主要中性色轻微偏暖，暖色倾向明确，但不在此项中限定饱和度或明度',
      sortOrder: 20,
    },
    {
      id: 'module-color-cool',
      label: '冷色倾向',
      prompt: '让整体白平衡和主要中性色轻微偏冷，冷色倾向明确，但不在此项中限定饱和度或明度',
      sortOrder: 30,
    },
    {
      id: 'module-color-vivid',
      label: '高饱和度',
      prompt: '整体使用高饱和度色彩，主要颜色保持鲜明浓度，同时避免通道溢出和颜色边界污染',
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
      label: '高明度',
      prompt: '整体采用高明度分布，大部分区域位于中灰以上，并通过细微亮度差维持结构层次',
      sortOrder: 150,
    },
    {
      id: 'module-color-low-luminance',
      label: '低明度',
      prompt: '整体采用低明度分布，大部分区域位于中灰以下，以深色层级维持可读性并限制高亮面积',
      sortOrder: 160,
    },
    {
      id: 'module-color-neutral-accent',
      label: '中性点缀',
      prompt: '画面八成以上使用黑白灰与低彩中性色，仅保留一种高饱和点缀色集中于关键区域',
      sortOrder: 170,
    },
    {
      id: 'module-color-low-saturation',
      label: '低饱和度',
      prompt: '整体降低色彩饱和度，保留可辨色相但使颜色趋于克制，不改变既定冷暖倾向和明度结构',
      sortOrder: 180,
    },
    {
      id: 'module-color-medium-saturation',
      label: '中等饱和度',
      prompt: '整体保持中等饱和度，颜色清楚但不过分浓烈，在自然还原与风格化色彩之间保持平衡',
      sortOrder: 190,
    },
    {
      id: 'module-color-medium-luminance',
      label: '中等明度',
      prompt: '整体以中等明度为主，同时保留必要高光和暗部，使亮度分布均衡且结构易于辨识',
      sortOrder: 200,
    },
  ],
} satisfies PromptModuleAssetDefinition
