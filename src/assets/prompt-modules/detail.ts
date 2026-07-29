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
  ],
} satisfies PromptModuleAssetDefinition
