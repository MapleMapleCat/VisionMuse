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
      prompt: '以电影摄影语言呈现，强调叙事性画面、受控动态范围、层次化光影和具有情绪的镜头质感',
      sortOrder: 20,
    },
    {
      id: 'module-style-editorial',
      label: '杂志摄影',
      prompt: '以高端杂志编辑摄影呈现，造型与画面秩序精确，视觉表达克制现代，达到可刊登的商业完成度',
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
      prompt: '以手工粘土质感的三维渲染呈现，造型圆润，表面具有细微手作痕迹，并保持柔和真实的体积光影',
      sortOrder: 60,
    },
  ],
} satisfies PromptModuleAssetDefinition
