import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'lens',
    label: '镜头',
    description: '短名称用于选择，实际组合时注入焦段与透视特征',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-lens-24mm',
      label: '24mm 广角',
      prompt: '使用全画幅等效 24mm 广角镜头，呈现开阔视野和明显空间纵深，同时控制边缘透视变形',
      sortOrder: 10,
    },
    {
      id: 'module-lens-35mm',
      label: '35mm 环境',
      prompt: '使用全画幅等效 35mm 镜头，在自然透视下兼顾主体与环境信息，保持适度空间纵深',
      sortOrder: 20,
    },
    {
      id: 'module-lens-50mm',
      label: '50mm 标准',
      prompt: '使用全画幅等效 50mm 标准镜头，保持接近人眼观感的自然透视与真实主体比例',
      sortOrder: 30,
    },
    {
      id: 'module-lens-85mm',
      label: '85mm 人像',
      prompt: '使用全画幅等效 85mm 人像镜头，呈现自然面部比例、柔和背景虚化和适度空间压缩',
      sortOrder: 40,
    },
    {
      id: 'module-lens-telephoto',
      label: '长焦压缩',
      prompt: '使用全画幅等效 135mm 以上长焦镜头，明显压缩前后景距离并获得集中、干净的主体背景关系',
      sortOrder: 50,
    },
    {
      id: 'module-lens-14mm-rectilinear',
      label: '直线超广角',
      prompt: '使用全画幅等效十四毫米直线型超广角镜头，扩大水平与垂直视野，强化近大远小并保持直线不弯曲',
      sortOrder: 60,
    },
    {
      id: 'module-lens-28mm',
      label: '28mm 广角',
      prompt: '使用全画幅等效二十八毫米广角镜头，获得宽于常规视野的空间覆盖，并保持较自然的主体比例',
      sortOrder: 70,
    },
    {
      id: 'module-lens-40mm',
      label: '40mm 准标准',
      prompt: '使用全画幅等效四十毫米准标准镜头，在比三十五毫米更收敛的视野中保持自然空间透视',
      sortOrder: 80,
    },
    {
      id: 'module-lens-65mm',
      label: '65mm 中焦',
      prompt: '使用全画幅等效六十五毫米中焦镜头，轻度压缩前后距离并保持主体比例，避免明显长焦扁平感',
      sortOrder: 90,
    },
    {
      id: 'module-lens-macro-100mm',
      label: '100mm 微距',
      prompt: '使用全画幅等效百毫米等倍微距镜头，以接近一比一放大率记录微小结构，并限定极浅焦点范围',
      sortOrder: 100,
    },
    {
      id: 'module-lens-fisheye',
      label: '鱼眼镜头',
      prompt: '使用覆盖接近一百八十度视野的鱼眼镜头，保留明显桶形弯曲，使直线随画面位置产生弧形变形',
      sortOrder: 110,
    },
    {
      id: 'module-lens-shift',
      label: '移轴校正',
      prompt: '使用移轴镜头的平移能力校正汇聚线，使建筑或产品的平行边缘在最终成像中保持平行',
      sortOrder: 120,
    },
    {
      id: 'module-lens-tilt',
      label: '摇摆对焦',
      prompt: '使用镜头摇摆改变焦平面方向，使斜向延展的主体表面沿同一倾斜平面保持连续清晰',
      sortOrder: 130,
    },
    {
      id: 'module-lens-telecentric',
      label: '远心镜头',
      prompt: '使用物方远心镜头抑制近大远小和视差变化，使不同深度的同尺寸部件在画面中保持近似等大',
      sortOrder: 140,
    },
    {
      id: 'module-lens-split-diopter',
      label: '分区屈光',
      prompt: '使用分区屈光镜分别锁定近处与远处焦平面，使两个距离层同时清晰，中间允许出现窄幅失焦过渡',
      sortOrder: 150,
    },
    {
      id: 'module-lens-ultra-shallow',
      label: '超浅景深',
      prompt: '使用约一点二至一点八的大光圈，将清晰范围限制在极薄焦平面，主体前后迅速进入离焦状态',
      sortOrder: 160,
    },
    {
      id: 'module-lens-deep-focus',
      label: '全域深焦',
      prompt: '使用约十一至十六的小光圈并将焦点设在超焦距附近，使近处、中距与远处结构同时保持可辨清晰度',
      sortOrder: 170,
    },
    {
      id: 'module-lens-anamorphic',
      label: '变形宽幅',
      prompt: '使用变形宽银幕镜头，拍摄时水平压缩视野，展开后获得更宽的横向覆盖与椭圆形离焦光斑',
      sortOrder: 180,
    },
  ],
} satisfies PromptModuleAssetDefinition
