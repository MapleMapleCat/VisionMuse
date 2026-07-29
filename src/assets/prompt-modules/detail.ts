import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'detail',
    label: '质感',
    description: '可组合最多两项，实际注入完整表面与完成度要求',
    selectionMode: 'multiple',
    maxSelections: 2,
  },
  modules: [
    {
      id: 'module-detail-realistic',
      label: '真实材质',
      prompt: '准确呈现不同材质的粗糙度、反射率、透明度和微小表面变化，使接触关系与物理响应可信',
      sortOrder: 10,
    },
    {
      id: 'module-detail-skin',
      label: '自然皮肤',
      prompt: '保留真实自然的皮肤纹理、毛孔、细小绒毛与轻微肤色变化，避免蜡像感和过度磨皮',
      sortOrder: 20,
    },
    {
      id: 'module-detail-grain',
      label: '细颗粒',
      prompt: '加入均匀克制的细腻胶片颗粒，颗粒尺度细小且不破坏轮廓、文字或面部关键细节',
      sortOrder: 30,
    },
    {
      id: 'module-detail-minimal',
      label: '简洁克制',
      prompt: '减少所有与主体和叙事无关的装饰、纹理与背景物件，保持视觉信息简洁、明确且有秩序',
      sortOrder: 40,
    },
    {
      id: 'module-detail-polished',
      label: '高完成度',
      prompt: '达到高完成度成片标准，边缘干净，细节连贯，局部结构无明显伪影，整体画面精确统一',
      sortOrder: 50,
    },
    {
      id: 'module-detail-brushed-metal',
      label: '金属拉丝',
      prompt: '若画面含金属表面，加入方向一致的细密拉丝纹，粗糙度沿纹理变化，反射保持连续且不过亮',
      sortOrder: 60,
    },
    {
      id: 'module-detail-copper-patina',
      label: '氧化铜锈',
      prompt: '若画面含铜质表面，呈现不规则氧化层、细小斑驳与边缘积垢，保留金属基底的局部反射差异',
      sortOrder: 70,
    },
    {
      id: 'module-detail-weathered-wood',
      label: '风化木纹',
      prompt: '若画面含木质表面，强化年轮、导管孔隙、细裂纹与边缘磨损，纹理顺应构造方向且尺度真实',
      sortOrder: 80,
    },
    {
      id: 'module-detail-frosted-glass',
      label: '磨砂玻璃',
      prompt: '若画面含玻璃表面，赋予均匀细微的磨砂粗糙度，透射轮廓柔化，边缘厚度与反射仍然可辨',
      sortOrder: 90,
    },
    {
      id: 'module-detail-glazed-ceramic',
      label: '釉面陶瓷',
      prompt: '若画面含陶瓷表面，呈现连续釉层、细小橘皮起伏和局部釉裂，曲面反射随形体平滑变化',
      sortOrder: 100,
    },
    {
      id: 'module-detail-woven-fiber',
      label: '编织纤维',
      prompt: '若画面含织物，清楚呈现经纬线交错、纤维粗细、轻微起毛与受力褶皱，编织密度符合尺度',
      sortOrder: 110,
    },
    {
      id: 'module-detail-aged-paper',
      label: '旧纸纤维',
      prompt: '若画面含纸张，呈现可辨纤维、轻微折痕、边缘毛化与局部磨损，避免形成塑料般的表面光泽',
      sortOrder: 120,
    },
    {
      id: 'module-detail-chipped-paint',
      label: '剥落漆层',
      prompt: '若画面含涂漆表面，构建多层漆面的起皮、裂缝与小面积剥落，使下层与基材边界清楚',
      sortOrder: 130,
    },
    {
      id: 'module-detail-micro-scratches',
      label: '微细划痕',
      prompt: '在高频可见表面加入方向随机的微细划痕与擦拭痕，控制出现密度，不破坏主要轮廓连续性',
      sortOrder: 140,
    },
    {
      id: 'module-detail-embossed',
      label: '浅浮雕纹',
      prompt: '若表面含装饰纹样，加入浅浮雕压纹，使纹样高度、边缘圆角和凹槽深度保持一致且无断裂',
      sortOrder: 150,
    },
    {
      id: 'module-detail-matte',
      label: '统一哑光',
      prompt: '让主要非透明表面统一采用哑光处理，提升微观粗糙度、压低镜面反射，同时保留形体明暗',
      sortOrder: 160,
      selectionGroup: 'global-surface-finish',
    },
    {
      id: 'module-detail-gloss',
      label: '统一亮光',
      prompt: '让主要非透明表面统一采用高光泽处理，降低粗糙度并形成连续反射，避免局部反射无故断裂',
      sortOrder: 170,
      selectionGroup: 'global-surface-finish',
    },
  ],
} satisfies PromptModuleAssetDefinition
