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
      prompt: '使用来自不同方向的彩色霓虹光照明，明确区分主色光与辅色光，并保留受光面和背光面的明暗层次',
      sortOrder: 40,
    },
    {
      id: 'module-lighting-dramatic',
      label: '戏剧聚光',
      prompt: '使用方向明确的局部硬质聚光照亮主体关键区域，背景压暗，形成高反差戏剧明暗结构',
      sortOrder: 50,
    },
    {
      id: 'module-lighting-overhead-soft',
      label: '顶置柔光',
      prompt: '主光从正上方以大面积柔光垂直落下，阴影边缘平缓，明暗光比控制在二比一左右',
      sortOrder: 60,
    },
    {
      id: 'module-lighting-frontal-soft',
      label: '正面柔光',
      prompt: '大面积柔光从正前方略高位置照射，近轴补光压低阴影，整体光比保持在一点五比一',
      sortOrder: 70,
    },
    {
      id: 'module-lighting-split',
      label: '分割侧光',
      prompt: '单一硬光从水平侧方九十度照射，另一侧几乎不补光，形成约八比一的分割明暗',
      sortOrder: 80,
    },
    {
      id: 'module-lighting-upper-side',
      label: '斜上侧光',
      prompt: '中等偏硬主光从侧前上方四十五度照射，弱补光保留暗部，主辅光比约为四比一',
      sortOrder: 90,
    },
    {
      id: 'module-lighting-top-front',
      label: '顶前中硬光',
      prompt: '中等偏硬主光从正前上方三十至四十五度下压，正面轻补，整体光比约为三比一',
      sortOrder: 100,
    },
    {
      id: 'module-lighting-underlight',
      label: '下方硬光',
      prompt: '小面积硬光从下方向上照射，顶部不设补光，近处快速衰减并形成六比一以上反差',
      sortOrder: 110,
    },
    {
      id: 'module-lighting-overcast',
      label: '阴天漫射',
      prompt: '阴天漫射光从整个上半球均匀包围，方向性较弱、阴影极软，环境光比接近二比一',
      sortOrder: 120,
    },
    {
      id: 'module-lighting-noon',
      label: '正午直射',
      prompt: '正午直射光从近乎垂直的高位落下，光质坚硬、阴影短而清晰，光比保持六比一',
      sortOrder: 130,
    },
    {
      id: 'module-lighting-dawn',
      label: '黎明低光',
      prompt: '黎明时的低角度光从单侧地平线方向掠入，光质偏软、阴影较长，光比约为三比一',
      sortOrder: 140,
    },
    {
      id: 'module-lighting-afterglow',
      label: '暮后天光',
      prompt: '日落后保留来自天空顶部的大范围残照，光质极软、方向微弱，整体反差不超过二比一',
      sortOrder: 150,
    },
    {
      id: 'module-lighting-low-point',
      label: '低位点光',
      prompt: '小型点光源从侧前方低位照射，光质偏硬且衰减迅速，近处与远处亮度形成五比一反差',
      sortOrder: 160,
    },
    {
      id: 'module-lighting-blinds',
      label: '百叶条光',
      prompt: '硬光从单侧穿过狭窄平行缝隙，投下边缘清晰的条带阴影，受光与遮蔽区域约六比一',
      sortOrder: 170,
    },
  ],
} satisfies PromptModuleAssetDefinition
