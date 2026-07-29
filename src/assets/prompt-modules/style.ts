import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'style',
    label: '风格媒介',
    description: '短名称用于选择，实际组合时注入完整表现媒介要求',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-style-photorealistic',
      label: '真实摄影',
      prompt: '以高可信度真实摄影呈现，遵循真实光学、材质、透视和人体结构，避免插画化、塑料感与过度修饰',
      sortOrder: 10,
    },
    {
      id: 'module-style-cinematic',
      label: '电影摄影',
      prompt: '以电影摄影媒介呈现，保留叙事性取景、受控动态范围和连续色阶，避免插画化边缘与平面色块',
      sortOrder: 20,
    },
    {
      id: 'module-style-editorial',
      label: '杂志摄影',
      prompt: '以杂志编辑摄影媒介呈现，画面秩序精确、视觉表达克制现代，并保留清晰的商业版面适配空间',
      sortOrder: 30,
    },
    {
      id: 'module-style-ink',
      label: '东方水墨',
      prompt: '以东方水墨画媒介呈现，使用有呼吸感的墨色浓淡、自然笔触和宣纸留白，避免摄影写实质感',
      sortOrder: 40,
    },
    {
      id: 'module-style-flat',
      label: '扁平插画',
      prompt: '以现代扁平矢量插画呈现，使用清晰几何轮廓、简化形体和纯净色块，避免真实摄影纹理',
      sortOrder: 50,
    },
    {
      id: 'module-style-clay',
      label: '粘土 3D',
      prompt: '以手工粘土质感的三维渲染呈现，造型圆润，表面具有细微按压、塑形与手作接缝痕迹',
      sortOrder: 60,
    },
    {
      id: 'module-style-documentary',
      label: '纪实摄影',
      prompt: '采用纪实摄影媒介，保留现场环境的自然秩序、未经摆布的瞬间感与真实曝光，不添加绘画笔触',
      sortOrder: 70,
    },
    {
      id: 'module-style-negative-film',
      label: '负片摄影',
      prompt: '采用胶片负片摄影媒介，呈现连续色阶、适度曝光宽容度与化学成像层次，避免数码锐化痕迹',
      sortOrder: 80,
    },
    {
      id: 'module-style-instant-film',
      label: '即时摄影',
      prompt: '采用即时成像摄影媒介，保留相纸显影的不均匀过渡、轻微边缘变化与实体照片质地',
      sortOrder: 90,
    },
    {
      id: 'module-style-oil',
      label: '传统油画',
      prompt: '采用传统油画媒介，以可辨的层叠笔触、覆盖性颜料与干湿交替塑造形体，保留画布承载感',
      sortOrder: 100,
    },
    {
      id: 'module-style-watercolor',
      label: '透明水彩',
      prompt: '采用透明水彩媒介，以水分扩散、颜色叠染和留白控制形体，边缘在清晰与自然晕化之间变化',
      sortOrder: 110,
    },
    {
      id: 'module-style-woodblock',
      label: '木版画',
      prompt: '采用木版画媒介，以刀刻线条、块面套印和纸面压印痕迹组织形体，避免连续摄影渐变',
      sortOrder: 120,
    },
    {
      id: 'module-style-colored-pencil',
      label: '彩铅插画',
      prompt: '采用彩色铅笔插画媒介，以方向明确的排线、叠色和纸纹透出塑造形体，边缘保留手绘触感',
      sortOrder: 130,
    },
    {
      id: 'module-style-paper-collage',
      label: '纸质拼贴',
      prompt: '采用纸质拼贴插画媒介，以裁切纸片、印刷碎片和层叠接缝构成形体，保留真实纸张边缘',
      sortOrder: 140,
    },
    {
      id: 'module-style-halftone-comic',
      label: '网点漫画',
      prompt: '采用现代网点漫画媒介，以清晰墨线、规则半调网点和受控块面阴影表现形体，避免油画式笔触',
      sortOrder: 150,
    },
    {
      id: 'module-style-low-poly',
      label: '低多边形',
      prompt: '采用低多边形三维媒介，以简化几何切面和可辨面片转折构成体积，保持统一网格逻辑',
      sortOrder: 160,
    },
    {
      id: 'module-style-voxel',
      label: '体素艺术',
      prompt: '采用体素数字艺术媒介，以等尺寸立方体单元构建形体与空间，边缘呈阶梯化但结构清楚',
      sortOrder: 170,
    },
    {
      id: 'module-style-pbr',
      label: '物理渲染',
      prompt: '采用物理渲染三维媒介，依据能量守恒计算材质与光照响应，保持几何、阴影和反射一致',
      sortOrder: 180,
    },
  ],
} satisfies PromptModuleAssetDefinition
