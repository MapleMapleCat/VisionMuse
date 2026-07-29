import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'lighting',
    label: '光线',
    description: '短名称用于选择，实际组合时注入光源方向与明暗关系',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-lighting-window',
      label: '柔和窗光',
      prompt: '使用来自单侧窗户的大面积柔和自然光，形成平滑明暗过渡、柔软阴影和真实室内曝光',
      sortOrder: 10,
    },
    {
      id: 'module-lighting-backlight',
      label: '侧逆光',
      prompt: '主光从主体侧后方照射，勾勒清晰轮廓光并保留正面细节，使主体与背景自然分离',
      sortOrder: 20,
    },
    {
      id: 'module-lighting-studio',
      label: '棚拍布光',
      prompt: '采用专业影棚三点布光，以柔和主光塑形、补光控制反差、轮廓光分离主体与背景',
      sortOrder: 30,
    },
    {
      id: 'module-lighting-neon',
      label: '霓虹光',
      prompt: '使用来自不同方向的彩色霓虹光照明，色光在主体与湿润表面形成可辨反射并保持面部细节',
      sortOrder: 40,
    },
    {
      id: 'module-lighting-dramatic',
      label: '戏剧聚光',
      prompt: '使用方向明确的局部硬质聚光照亮主体关键区域，背景压暗，形成高反差戏剧明暗结构',
      sortOrder: 50,
    },
  ],
} satisfies PromptModuleAssetDefinition
