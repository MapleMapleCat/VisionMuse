import type { PromptModuleAssetDefinition } from './types'

export default {
  category: {
    key: 'environment',
    label: '场景',
    description: '短名称用于选择，实际组合时注入完整空间约束',
    selectionMode: 'single',
    maxSelections: 1,
  },
  modules: [
    {
      id: 'module-environment-studio',
      label: '极简影棚',
      prompt: '主体置于干净的极简摄影棚内，使用连续无缝背景，环境元素克制且不分散主体注意力',
      sortOrder: 10,
    },
    {
      id: 'module-environment-interior',
      label: '窗边室内',
      prompt: '主体位于靠近大型窗户的室内空间，窗框与少量家具建立真实尺度和清晰空间层次',
      sortOrder: 20,
    },
    {
      id: 'module-environment-city',
      label: '城市街道',
      prompt: '主体置于真实城市街道环境中，建筑立面、道路设施、路面标记与街区纵深提供明确都市语境',
      sortOrder: 30,
    },
    {
      id: 'module-environment-nature',
      label: '自然旷野',
      prompt: '主体置于开阔自然旷野，地表、远景与天空形成清晰纵深，避免无关人造物干扰',
      sortOrder: 40,
    },
    {
      id: 'module-environment-rain',
      label: '雨夜街巷',
      prompt: '主体置于夜间雨湿街巷，空气中可见细密雨丝，湿润地面形成真实反射并强化空间纵深',
      sortOrder: 50,
    },
    {
      id: 'module-environment-bamboo',
      label: '层叠竹林',
      prompt: '设置为层叠竹林环境，近处竹节与落叶、中段密集竹秆、远处林隙共同建立连续纵深',
      sortOrder: 60,
    },
    {
      id: 'module-environment-alpine-lake',
      label: '高山湖岸',
      prompt: '设置为高山湖岸环境，裸岩、低矮植被、平静水面与远处山脊构成明确地貌层次',
      sortOrder: 70,
    },
    {
      id: 'module-environment-coastal-cliff',
      label: '海岸峭壁',
      prompt: '设置为海岸峭壁环境，风蚀岩层、浪花、潮湿礁石与远方海平线共同界定空间尺度',
      sortOrder: 80,
    },
    {
      id: 'module-environment-dunes',
      label: '连绵沙丘',
      prompt: '设置为连绵沙丘环境，以风纹沙脊、稀疏耐旱植物和远处起伏地平线形成开阔层次',
      sortOrder: 90,
    },
    {
      id: 'module-environment-snow-forest',
      label: '积雪针叶林',
      prompt: '设置为积雪针叶林环境，雪覆地表、密集树干、折断枝条与远处林线呈现寒地生态细节',
      sortOrder: 100,
    },
    {
      id: 'module-environment-wetland',
      label: '浅水湿地',
      prompt: '设置为浅水湿地环境，芦苇群、泥滩、水道与低矮草洲交错分布，空间边界自然延伸',
      sortOrder: 110,
    },
    {
      id: 'module-environment-limestone-cave',
      label: '石灰岩洞',
      prompt: '设置为石灰岩洞穴环境，钟乳石、石笋、湿润岩壁和地下水洼构成立体封闭空间',
      sortOrder: 120,
    },
    {
      id: 'module-environment-workshop',
      label: '工业车间',
      prompt: '设置为工业车间环境，钢梁、管线、操作平台和磨损地面按真实功能关系组织空间',
      sortOrder: 130,
    },
    {
      id: 'module-environment-greenhouse',
      label: '玻璃温室',
      prompt: '设置为玻璃温室环境，金属骨架、种植台、攀援植物与通行步道形成清晰内部结构',
      sortOrder: 140,
    },
    {
      id: 'module-environment-gallery',
      label: '当代展厅',
      prompt: '设置为当代展厅环境，连续展墙、展台、导视标识与宽阔通道保持克制有序的空间关系',
      sortOrder: 150,
    },
    {
      id: 'module-environment-rooftop',
      label: '城市屋顶',
      prompt: '设置为城市屋顶平台环境，女儿墙、通风设备、检修通道与远处建筑天际线建立高度感',
      sortOrder: 160,
    },
    {
      id: 'module-environment-courtyard',
      label: '传统院落',
      prompt: '设置为传统院落环境，围合墙面、木构廊道、石质铺地与少量庭院植物呈现明确空间层级',
      sortOrder: 170,
    },
  ],
} satisfies PromptModuleAssetDefinition
