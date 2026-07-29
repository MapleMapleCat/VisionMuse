import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'angle',
    label: '视角',
    description: '短名称用于选择，实际组合时注入明确机位关系',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-angle-eye',
      label: '平视',
      prompt: '摄影机与主体主要视觉中心保持同一高度，以自然平视角度拍摄，避免明显俯视或仰视变形',
      sortOrder: 10,
    },
    {
      id: 'module-angle-low',
      label: '低机位',
      prompt: '摄影机位于主体视觉中心下方并向上拍摄，形成明确仰视关系，强化主体的高度与力量感',
      sortOrder: 20,
    },
    {
      id: 'module-angle-high',
      label: '高机位',
      prompt: '摄影机位于主体视觉中心上方并向下拍摄，形成明确俯视关系，同时保持主体结构可辨',
      sortOrder: 30,
    },
    {
      id: 'module-angle-overhead',
      label: '正上方俯拍',
      prompt: '摄影机位于场景正上方并垂直向下拍摄，以近九十度顶视角清楚呈现平面位置关系',
      sortOrder: 40,
    },
    {
      id: 'module-angle-shoulder',
      label: '过肩视角',
      prompt: '摄影机从前景人物肩后拍摄，前景保留局部肩部轮廓，焦点落在对面主体并形成对话关系',
      sortOrder: 50,
    },
    {
      id: 'module-angle-front',
      label: '正面机位',
      prompt: '摄影机位于主体正前方，光轴大致垂直于主体正面，左右侧面均不作为主要可见结构',
      sortOrder: 60,
    },
    {
      id: 'module-angle-front-three-quarter',
      label: '前侧四分之三',
      prompt: '摄影机从主体正前方横向偏转约三十至四十五度，同时呈现主体正面与一个相邻侧面',
      sortOrder: 70,
    },
    {
      id: 'module-angle-profile',
      label: '正侧机位',
      prompt: '摄影机位于主体正侧方，光轴与主体正面约成九十度，以侧面轮廓作为主要可见结构',
      sortOrder: 80,
    },
    {
      id: 'module-angle-rear-three-quarter',
      label: '后侧四分之三',
      prompt: '摄影机从主体正后方横向偏转约三十至四十五度，同时呈现主体背面与一个相邻侧面',
      sortOrder: 90,
    },
    {
      id: 'module-angle-rear',
      label: '正后机位',
      prompt: '摄影机位于主体正后方，光轴朝向主体背面中心，正面完全位于遮挡范围或画面之外',
      sortOrder: 100,
    },
    {
      id: 'module-angle-ground-level',
      label: '贴地平拍',
      prompt: '摄影机镜头中心贴近承载表面，光轴基本平行于该表面，以极低高度水平观察主体',
      sortOrder: 110,
    },
    {
      id: 'module-angle-waist-level',
      label: '腰平机位',
      prompt: '摄影机保持在人物腰部或主体中下段高度，光轴水平指向主体，不附加明显向上或向下倾斜',
      sortOrder: 120,
    },
    {
      id: 'module-angle-nadir',
      label: '正下仰视',
      prompt: '摄影机位于主体正下方并垂直向上拍摄，以接近九十度的仰角呈现底部及向外延展结构',
      sortOrder: 130,
    },
    {
      id: 'module-angle-dutch',
      label: '倾斜机位',
      prompt: '摄影机绕光轴旋转约十至二十五度，使画面水平线明确倾斜，其余机位高度与朝向保持不变',
      sortOrder: 140,
    },
    {
      id: 'module-angle-pov',
      label: '主观视角',
      prompt: '摄影机占据观察者眼睛所在位置，光轴与其视线方向重合，不从画外展示观察者自身',
      sortOrder: 150,
    },
    {
      id: 'module-angle-end-on',
      label: '端向视角',
      prompt: '摄影机光轴沿主体主要纵向轴线观察，使靠近镜头的端面可见，主体长度朝画面深处缩短',
      sortOrder: 160,
    },
    {
      id: 'module-angle-tangential',
      label: '切线视角',
      prompt: '摄影机视线接近主体主要轮廓或曲面的切线方向，以窄角度观察侧缘及连续外形变化',
      sortOrder: 170,
    },
    {
      id: 'module-angle-isometric',
      label: '轴测视角',
      prompt: '摄影机从主体上方的前侧方向观察，使顶面与两个相邻侧面同时可见，三个方向均明确展开',
      sortOrder: 180,
    },
  ],
} satisfies PromptModuleAssetDefinition
